import type { Request, Response, NextFunction } from "express";
import { SESSION_COOKIE_NAME, getSessionAndUser } from "./session-service.js";
import type { Role } from "@prisma/client";

/**
 * Middleware that parses session cookie and populates req.user & req.sessionData.
 */
export async function authenticateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (token) {
    const authResult = await getSessionAndUser(token);
    if (authResult) {
      req.user = authResult.user;
      req.sessionData = authResult.sessionData;
    }
  }
  next();
}

/**
 * Middleware ensuring the request comes from an authenticated user.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.sessionData) {
    res.status(401).json({
      error: "UNAUTHENTICATED",
      message: "Authentication required.",
    });
    return;
  }
  next();
}

/**
 * Middleware ensuring the user has completed their initial mandatory password change.
 */
export function requireCompletedPasswordChange(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.sessionData) {
    res.status(401).json({
      error: "UNAUTHENTICATED",
      message: "Authentication required.",
    });
    return;
  }

  if (req.user.mustChangePassword) {
    res.status(403).json({
      error: "PASSWORD_CHANGE_REQUIRED",
      message: "You must change your password before accessing this feature.",
    });
    return;
  }

  next();
}

/**
 * Middleware enforcing Role-Based Access Control (RBAC).
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !req.sessionData) {
      res.status(401).json({
        error: "UNAUTHENTICATED",
        message: "Authentication required.",
      });
      return;
    }

    if (req.user.mustChangePassword) {
      res.status(403).json({
        error: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password before accessing this feature.",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      });
      return;
    }

    next();
  };
}

/**
 * Validates Origin and CSRF token for state-changing requests.
 */
export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  // Only check state-changing methods
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Verify origin if provided
  const origin = req.headers["origin"] || req.headers["referer"];
  const allowedHost = req.headers["host"];

  if (origin && typeof origin === "string") {
    try {
      const parsed = new URL(origin);
      // In dev/test, allow localhost with any port or matching host
      if (allowedHost && !parsed.host.includes("localhost") && !parsed.host.includes("127.0.0.1") && parsed.host !== allowedHost) {
        res.status(403).json({
          error: "CSRF_INVALID",
          message: "Request origin does not match server host.",
        });
        return;
      }
    } catch {
      res.status(403).json({
        error: "CSRF_INVALID",
        message: "Invalid origin header.",
      });
      return;
    }
  }

  // If request has an active session, verify X-CSRF-Token
  if (req.sessionData) {
    const clientCsrf = req.headers["x-csrf-token"];
    if (!clientCsrf || clientCsrf !== req.sessionData.csrfToken) {
      res.status(403).json({
        error: "CSRF_INVALID",
        message: "Invalid or missing CSRF token.",
      });
      return;
    }
  }

  next();
}
