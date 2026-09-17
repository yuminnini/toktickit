import { Router } from "express";
import type { Request, Response } from "express";
import { getPrisma } from "./prisma.js";
import { hashPassword, verifyPassword, validatePasswordPolicy } from "./password.js";
import {
  SESSION_COOKIE_NAME,
  createSession,
  getSessionCookieOptions,
  getClearedCookieOptions,
  revokeSession,
  revokeAllUserSessions,
  toSafeUser,
} from "./session-service.js";
import { loginRateLimiter } from "./rate-limiter.js";
import { requireAuth, verifyCsrf } from "./auth-middleware.js";

export const authRouter = Router();

// Cache-Control: no-store on all auth responses
authRouter.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

/**
 * POST /api/auth/login
 */
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Email and password are required.",
    });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
  const rateLimitKey = `${normalizedEmail}::${clientIp}`;

  // Check rate limit
  const rateLimitCheck = loginRateLimiter.check(rateLimitKey);
  if (!rateLimitCheck.allowed) {
    res.setHeader("Retry-After", String(rateLimitCheck.retryAfterSeconds || 60));
    res.status(429).json({
      error: "TOO_MANY_ATTEMPTS",
      message: "Too many failed login attempts. Please try again later.",
    });
    return;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Safe uniform failure for missing user, inactive account, missing passwordHash, or mismatched password
  if (!user || !user.active || !user.passwordHash) {
    loginRateLimiter.recordFailure(rateLimitKey);
    res.status(401).json({
      error: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    });
    return;
  }

  const isValidPassword = await verifyPassword(user.passwordHash, password);
  if (!isValidPassword) {
    loginRateLimiter.recordFailure(rateLimitKey);
    res.status(401).json({
      error: "INVALID_CREDENTIALS",
      message: "Invalid email or password.",
    });
    return;
  }

  // Credentials are valid; reset rate limit
  loginRateLimiter.reset(rateLimitKey);

  // Create session and set cookie
  const sessionResult = await createSession(user.id, user.sessionVersion);
  res.cookie(SESSION_COOKIE_NAME, sessionResult.rawToken, getSessionCookieOptions());

  res.status(200).json({
    user: sessionResult.user,
  });
});

/**
 * GET /api/auth/me
 */
authRouter.get("/me", requireAuth, (req: Request, res: Response): void => {
  res.status(200).json({
    user: req.user,
  });
});

/**
 * GET /api/auth/csrf
 */
authRouter.get("/csrf", requireAuth, (req: Request, res: Response): void => {
  res.status(200).json({
    csrfToken: req.sessionData!.csrfToken,
  });
});

/**
 * POST /api/auth/change-password
 */
authRouter.post("/change-password", requireAuth, verifyCsrf, async (req: Request, res: Response): Promise<void> => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};

  if (!currentPassword || typeof currentPassword !== "string") {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: "Current password is required.",
    });
    return;
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user || !user.passwordHash) {
    res.status(401).json({
      error: "UNAUTHENTICATED",
      message: "User account not found.",
    });
    return;
  }

  const isCurrentValid = await verifyPassword(user.passwordHash, currentPassword);
  if (!isCurrentValid) {
    res.status(400).json({
      error: "INVALID_CURRENT_PASSWORD",
      message: "Current password is incorrect.",
    });
    return;
  }

  const policyCheck = validatePasswordPolicy(newPassword, confirmPassword, currentPassword);
  if (!policyCheck.valid) {
    res.status(400).json({
      error: "VALIDATION_ERROR",
      message: policyCheck.error,
    });
    return;
  }

  const newHash = await hashPassword(newPassword);
  const newSessionVersion = user.sessionVersion + 1;

  // Update user and increment sessionVersion (invalidating old sessions atomically)
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      sessionVersion: newSessionVersion,
    },
  });

  // Remove old sessions
  await revokeAllUserSessions(user.id);

  // Issue new session for current connection
  const newSession = await createSession(user.id, newSessionVersion);
  res.cookie(SESSION_COOKIE_NAME, newSession.rawToken, getSessionCookieOptions());

  res.status(200).json({
    user: toSafeUser(updatedUser),
  });
});

/**
 * POST /api/auth/logout
 */
authRouter.post("/logout", verifyCsrf, async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (token) {
    await revokeSession(token);
  }

  res.cookie(SESSION_COOKIE_NAME, "", getClearedCookieOptions());
  res.status(204).end();
});
