import { createSession } from "../../src/services/session.js";
import { getPrisma } from "../../src/prisma.js";

/**
 * Creates an active session in the database for a given user ID
 * and returns cookie string, csrfToken, and rawToken.
 */
export async function getAuthSessionForUser(userId: number): Promise<{
  cookie: string;
  csrfToken: string;
  rawToken: string;
}> {
  const prisma = getPrisma();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const sessionVersion = user?.sessionVersion ?? 1;
  const { rawToken, session } = await createSession(userId, sessionVersion);
  return {
    cookie: `toktickit_session=${rawToken}`,
    csrfToken: session.csrfToken,
    rawToken,
  };
}

/**
 * Creates an active session in the database for a given user ID
 * and returns the Cookie header string `toktickit_session=<token>`.
 */
export async function getAuthCookieForUser(userId: number): Promise<string> {
  const { cookie } = await getAuthSessionForUser(userId);
  return cookie;
}

