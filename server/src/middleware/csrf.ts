import type { Request, Response, NextFunction } from "express";

/**
 * Validates if the given origin is an allowed client origin.
 */
export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return false;

  const configuredOrigin = process.env.APP_ORIGIN;
  if (configuredOrigin && origin === configuredOrigin) {
    return true;
  }

  // Common local test/dev origins
  const devOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
  ];

  return devOrigins.includes(origin);
}

/**
 * Enforces Origin verification and CSRF token verification on state-changing requests.
 */
export function verifyCsrf(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (safeMethods.includes(method)) {
    return next();
  }

  const origin = req.headers.origin;

  // State-changing requests must have a valid Origin
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({
      error: "CSRF_INVALID",
      message: "Invalid or missing Origin header",
    });
  }

  // /api/auth/login does not have a session yet; requires valid Origin + Content-Type
  if (req.path === "/api/auth/login" || req.path === "/login") {
    return next();
  }

  // For logout: if no active session, allowed origin alone is sufficient
  if ((req.path === "/api/auth/logout" || req.path === "/logout") && !req.session) {
    return next();
  }

  // Authenticated state-changing mutations require X-CSRF-Token matching session csrfToken
  if (req.session) {
    const csrfHeader = req.headers["x-csrf-token"];
    const providedToken = Array.isArray(csrfHeader) ? csrfHeader[0] : csrfHeader;

    if (!providedToken || providedToken !== req.session.csrfToken) {
      return res.status(403).json({
        error: "CSRF_INVALID",
        message: "Invalid or missing X-CSRF-Token",
      });
    }
  }

  return next();
}
