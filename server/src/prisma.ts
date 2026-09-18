import { PrismaClient } from "@prisma/client";

// Lazy singleton: the client is created on first use, not at import time.
// This keeps route modules and tests that don't touch the DB (e.g. /api/health)
// free of database side effects.
export type ExtendedPrismaClient = PrismaClient & {
  requesterUser: PrismaClient["user"];
};

let client: ExtendedPrismaClient | null = null;

export function getPrisma(): ExtendedPrismaClient {
  if (!client) {
    const rawClient = new PrismaClient();
    // Backward compatibility alias for legacy tests and routes
    (rawClient as any).requesterUser = rawClient.user;

    // BR-13: ticket itPriority defaults to requestedPriority on creation
    rawClient.$use(async (params, next) => {
      if (params.model === "Ticket" && params.action === "create") {
        if (params.args?.data && !params.args.data.itPriority && params.args.data.requestedPriority) {
          params.args.data.itPriority = params.args.data.requestedPriority;
        }
      }
      return next(params);
    });

    client = rawClient as ExtendedPrismaClient;
  }
  return client;
}
