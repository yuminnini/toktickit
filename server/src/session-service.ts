import crypto from "node:crypto";
import type { CookieOptions } from "express";
import { getPrisma } from "./prisma.js";
import type { SafeUser, SessionData } from "./auth-types.js";
import type { User } from "@prisma/client";

export const SESSION_COOKIE_NAME = "toktickit_session";
export const SESSION_MAX_AGE_SECONDS = 28800; // 8 hours

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
  };
}

export function getSessionCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS * 1000,
    secure: isProd,
  };
}

export function getClearedCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    secure: isProd,
  };
}

export async function createSession(
  userId: number,
  sessionVersion: number
): Promise<{ rawToken: string; csrfToken: string; expiresAt: Date; user: SafeUser }> {
  const prisma = getPrisma();
  const rawToken = crypto.randomBytes(32).toString("hex");
  const csrfToken = crypto.randomBytes(24).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const session = await prisma.session.create({
    data: {
      tokenHash,
      userId,
      sessionVersion,
      csrfToken,
      expiresAt,
    },
    include: {
      user: true,
    },
  });

  return {
    rawToken,
    csrfToken,
    expiresAt,
    user: toSafeUser(session.user),
  };
}

export async function getSessionAndUser(
  rawToken: string
): Promise<{ sessionData: SessionData; user: SafeUser } | null> {
  if (!rawToken || typeof rawToken !== "string") return null;

  const prisma = getPrisma();
  const tokenHash = hashToken(rawToken);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;

  // Check expiration
  if (session.expiresAt.getTime() <= Date.now()) {
    // Delete expired session asynchronously
    prisma.session.delete({ where: { tokenHash } }).catch(() => {});
    return null;
  }

  // Invalidate if user was deactivated or sessionVersion changed (e.g. password changed or role updated)
  if (!session.user.active || session.sessionVersion !== session.user.sessionVersion) {
    prisma.session.delete({ where: { tokenHash } }).catch(() => {});
    return null;
  }

  return {
    sessionData: {
      tokenHash: session.tokenHash,
      csrfToken: session.csrfToken,
      expiresAt: session.expiresAt,
      sessionVersion: session.sessionVersion,
    },
    user: toSafeUser(session.user),
  };
}

export async function revokeSession(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const prisma = getPrisma();
  const tokenHash = hashToken(rawToken);
  try {
    await prisma.session.delete({ where: { tokenHash } });
  } catch {
    // Ignore if already deleted
  }
}

export async function revokeAllUserSessions(userId: number): Promise<void> {
  const prisma = getPrisma();
  try {
    await prisma.session.deleteMany({ where: { userId } });
  } catch {
    // Ignore
  }
}
