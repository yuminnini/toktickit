import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
} from "../services/password.js";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  recordLoginSuccess,
} from "../services/rateLimiter.js";
import {
  createSession,
  setSessionCookie,
  clearSessionCookie,
  revokeSessionByHash,
  revokeAllUserSessions,
  toSafeUser,
  SESSION_COOKIE_NAME,
  hashSessionToken,
} from "../services/session.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

/**
 * Extracts client IP address safely using Express's validated req.ip.
 * Express determines req.ip based on configured trusted proxies, preventing
 * clients from bypassing rate limiting by sending spoofed X-Forwarded-For headers.
 */
function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

/**
 * POST /api/auth/login
 * Validates credentials, checks rate limits, issues HTTP-only cookie
 */
authRouter.post("/login", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  const { email, password } = req.body || {};

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Email and password are required",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const clientIp = getClientIp(req);

  // Check rate limit
  const rateLimitStatus = checkLoginRateLimit(normalizedEmail, clientIp);
  if (!rateLimitStatus.allowed) {
    res.setHeader("Retry-After", String(rateLimitStatus.retryAfterSeconds || 60));
    return res.status(429).json({
      error: "TOO_MANY_ATTEMPTS",
      message: `Too many failed login attempts. Please try again in ${rateLimitStatus.retryAfterSeconds} seconds.`,
    });
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Uniform 401 response if user not found, inactive, or unprovisioned password
    if (!user || !user.active || !user.passwordHash) {
      const failureStatus = recordLoginFailure(normalizedEmail, clientIp);
      if (!failureStatus.allowed) {
        res.setHeader("Retry-After", String(failureStatus.retryAfterSeconds || 60));
        return res.status(429).json({
          error: "TOO_MANY_ATTEMPTS",
          message: "Too many failed login attempts.",
        });
      }
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await verifyPassword(user.passwordHash, password);
    if (!isPasswordValid) {
      const failureStatus = recordLoginFailure(normalizedEmail, clientIp);
      if (!failureStatus.allowed) {
        res.setHeader("Retry-After", String(failureStatus.retryAfterSeconds || 60));
        return res.status(429).json({
          error: "TOO_MANY_ATTEMPTS",
          message: "Too many failed login attempts.",
        });
      }
      return res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
      });
    }

    // Success: reset rate limiter
    recordLoginSuccess(normalizedEmail, clientIp);

    // Create session and set cookie
    const { rawToken } = await createSession(user.id, user.sessionVersion);
    setSessionCookie(res, rawToken);

    return res.status(200).json({
      user: toSafeUser(user),
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred during login",
    });
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user
 */
authRouter.get("/me", (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  if (!req.user) {
    return res.status(401).json({
      error: "UNAUTHENTICATED",
      message: "No active session",
    });
  }
  return res.status(200).json({
    user: toSafeUser(req.user),
  });
});

/**
 * GET /api/auth/csrf
 * Returns CSRF token for current active session
 */
authRouter.get("/csrf", (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  if (!req.session) {
    return res.status(401).json({
      error: "UNAUTHENTICATED",
      message: "Active session required to obtain CSRF token",
    });
  }
  return res.status(200).json({
    csrfToken: req.session.csrfToken,
  });
});

/**
 * POST /api/auth/change-password
 * Enforces policy, updates hash, rotates session and clears mustChangePassword
 */
authRouter.post("/change-password", requireAuth, async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Current password, new password, and confirmation are required",
    });
  }

  // Validate policy
  const policyResult = validatePasswordPolicy(newPassword, confirmPassword, currentPassword);
  if (!policyResult.valid) {
    return res.status(400).json({
      error: "VALIDATION_ERROR",
      message: policyResult.error,
    });
  }

  try {
    const prisma = getPrisma();
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!currentUser || !currentUser.passwordHash) {
      return res.status(401).json({
        error: "UNAUTHENTICATED",
        message: "User not found or unprovisioned",
      });
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(currentUser.passwordHash, currentPassword);
    if (!isCurrentValid) {
      return res.status(400).json({
        error: "INVALID_CURRENT_PASSWORD",
        message: "Current password is incorrect",
      });
    }

    const newHash = await hashPassword(newPassword);
    const newSessionVersion = currentUser.sessionVersion + 1;

    try {
      // Atomically update user, invalidate previous sessions, and create new session in a single transaction
      const [updatedUser, newSession] = await prisma.$transaction(async (tx) => {
        // 1. Optimistic concurrency check on user sessionVersion to prevent racing requests
        const updateResult = await tx.user.updateMany({
          where: {
            id: currentUser.id,
            sessionVersion: currentUser.sessionVersion,
          },
          data: {
            passwordHash: newHash,
            mustChangePassword: false,
            sessionVersion: newSessionVersion,
          },
        });

        if (updateResult.count === 0) {
          throw new Error("CONCURRENT_PASSWORD_CHANGE");
        }

        // 2. Invalidate old sessions
        await tx.session.deleteMany({ where: { userId: currentUser.id } });

        // 3. Create new session inside the SAME transaction
        const sessionData = await createSession(currentUser.id, newSessionVersion, tx);

        const refreshedUser = await tx.user.findUniqueOrThrow({
          where: { id: currentUser.id },
        });

        return [refreshedUser, sessionData];
      });

      setSessionCookie(res, newSession.rawToken);

      return res.status(200).json({
        user: toSafeUser(updatedUser),
      });
    } catch (txErr: any) {
      if (txErr?.message === "CONCURRENT_PASSWORD_CHANGE") {
        return res.status(409).json({
          error: "CONCURRENT_MODIFICATION",
          message: "A concurrent password change request was detected. Please retry.",
        });
      }
      throw txErr;
    }
  } catch (err) {
    console.error("Change password error:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred during password change",
    });
  }
});

/**
 * POST /api/auth/logout
 * Revokes session from database and clears cookie
 */
authRouter.post("/logout", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.session) {
      await revokeSessionByHash(req.session.tokenHash);
    } else {
      const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
      if (rawToken && typeof rawToken === "string") {
        const tokenHash = hashSessionToken(rawToken);
        await revokeSessionByHash(tokenHash);
      }
    }
    clearSessionCookie(res);
    return res.status(204).end();
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "An unexpected error occurred during session revocation",
    });
  }
});
