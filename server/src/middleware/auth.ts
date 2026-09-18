import type { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";
import {
  SESSION_COOKIE_NAME,
  hashSessionToken,
  revokeSessionByHash,
  toSafeUser,
  type SafeUser,
} from "../services/session.js";

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser & { passwordHash?: string | null; sessionVersion: number };
      session?: {
        tokenHash: string;
        userId: number;
        sessionVersion: number;
        csrfToken: string;
        expiresAt: Date;
      };
    }
  }
}

/**
 * Middleware that extracts session cookie, checks validity, expiration,
 * and user status. Attaches `req.user` and `req.session` if valid.
 */
export async function authenticateSession(req: Request, _res: Response, next: NextFunction) {
  const rawToken = req.cookies?.[SESSION_COOKIE_NAME];
  if (!rawToken || typeof rawToken !== "string") {
    return next();
  }

  try {
    const tokenHash = hashSessionToken(rawToken);
    const prisma = getPrisma();

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      return next();
    }

    const now = new Date();
    // Check session expiration
    if (session.expiresAt < now) {
      await revokeSessionByHash(tokenHash);
      return next();
    }

    // Check user active status and session version
    if (!session.user.active || session.sessionVersion !== session.user.sessionVersion) {
      await revokeSessionByHash(tokenHash);
      return next();
    }

    req.user = {
      ...toSafeUser(session.user),
      passwordHash: session.user.passwordHash,
      sessionVersion: session.user.sessionVersion,
    };
    req.session = {
      tokenHash: session.tokenHash,
      userId: session.userId,
      sessionVersion: session.sessionVersion,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
    };

    return next();
  } catch (err) {
    console.error("Session authentication error:", err);
    return next();
  }
}

/**
 * Ensures user has an active, authenticated session.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.session) {
    return res.status(401).json({
      error: "UNAUTHENTICATED",
      message: "Authentication required",
    });
  }
  return next();
}

/**
 * Blocks users who must change their password from accessing business APIs (BR-02, AC-02).
 */
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({
      error: "PASSWORD_CHANGE_REQUIRED",
      message: "Password change is required before accessing resources",
    });
  }
  return next();
}

/**
 * Enforces role-based access control.
 */
export function requireRole(...allowedRoles: Array<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHENTICATED",
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Access denied: insufficient permissions",
      });
    }

    return next();
  };
}
