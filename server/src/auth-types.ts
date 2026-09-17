import type { Role } from "@prisma/client";

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
}

export interface SessionData {
  tokenHash: string;
  csrfToken: string;
  expiresAt: Date;
  sessionVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
      sessionData?: SessionData;
    }
  }
}
