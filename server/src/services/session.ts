import crypto from "node:crypto";
import type { Response } from "express";
import { getPrisma } from "../prisma.js";

export const SESSION_COOKIE_NAME = "toktickit_session";
export const SESSION_DURATION_SECONDS = 28800; // 8 hours (BR-10, AC-01)

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  active: boolean;
  mustChangePassword: boolean;
}

/**
 * Strips sensitive fields like passwordHash and sessionVersion from user model.
 */
export function toSafeUser(user: {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
}): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as SafeUser["role"],
    active: user.active,
    mustChangePassword: user.mustChangePassword,
  };
}

/**
 * Generates a cryptographically secure random session token (>= 32 bytes).
 */
export function generateRawToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes SHA-256 hash of a session token for storage and lookup.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generates a cryptographically secure CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Creates a new active session record in the database.
 */
export async function createSession(userId: number, sessionVersion: number) {
  const prisma = getPrisma();
  const rawToken = generateRawToken();
  const tokenHash = hashSessionToken(rawToken);
  const csrfToken = generateCsrfToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      tokenHash,
      userId,
      sessionVersion,
      csrfToken,
      expiresAt,
    },
  });

  return { rawToken, session };
}

/**
 * Sets the HttpOnly session cookie on the response.
 */
export function setSessionCookie(res: Response, rawToken: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS * 1000,
    secure: isProd,
  });
}

/**
 * Clears the session cookie on the response.
 */
export function clearSessionCookie(res: Response) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

/**
 * Deletes a session from the database by its token hash.
 */
export async function revokeSessionByHash(tokenHash: string) {
  const prisma = getPrisma();
  try {
    await prisma.session.delete({ where: { tokenHash } });
  } catch {
    // Already deleted or nonexistent
  }
}

/**
 * Deletes all sessions for a specific user (BR-12).
 */
export async function revokeAllUserSessions(userId: number) {
  const prisma = getPrisma();
  await prisma.session.deleteMany({ where: { userId } });
}
