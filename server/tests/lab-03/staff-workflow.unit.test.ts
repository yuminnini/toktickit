import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import { staffRouter } from "../../src/routes/staff.js";
import { communicationsRouter } from "../../src/routes/communications.js";
import * as prismaModule from "../../src/prisma.js";

describe("Staff Workflow & Communications Concurrency & Reliability (Unit/Simulation)", () => {
  const allowedOrigin = "http://localhost:5173";

  // Helper app setup mocking auth session
  function createTestApp(userRole: "IT_STAFF" | "REQUESTER" | "ADMINISTRATOR", userId = 100) {
    const app = express();
    app.use(express.json());
    // Simulate auth & CSRF middleware
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as any).user = {
        id: userId,
        name: "Test User",
        email: "test@example.com",
        role: userRole,
        active: true,
        mustChangePassword: false,
      };
      (req as any).session = {
        tokenHash: "mock-hash",
        userId,
        sessionVersion: 1,
        csrfToken: "mock-csrf",
        expiresAt: new Date(Date.now() + 3600000),
      };
      next();
    });
    app.use("/api/staff", staffRouter);
    app.use("/api/tickets", communicationsRouter);
    return app;
  }

  // 1. [P1] Concurrent Claim Ticket
  it("P1: concurrent claim calls with expectedVersion result in exactly one 200 and one 409", async () => {
    let state = {
      id: 42,
      ticketNumber: "TKT-2026-000042",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Test Ticket",
      description: "Test Desc",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "NEW",
      ticketOwnerId: null as number | null,
      version: 1,
      appearsResolvedAt: null,
      appearsResolvedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      requester: { id: 1, name: "Req", email: "req@example.com" },
      category: { id: 1, name: "Cat" },
      relatedSystem: { id: 1, name: "Sys" },
      ticketOwner: null,
      appearsResolvedBy: null,
      attachments: [],
    };

    const mockPrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          ticket: {
            findUnique: vi.fn().mockImplementation(async () => ({ ...state })),
            updateMany: vi.fn().mockImplementation(async ({ where, data }: any) => {
              // If conditions match current state
              if (where.id === state.id && where.version === state.version && state.ticketOwnerId === null) {
                state = {
                  ...state,
                  ticketOwnerId: data.ticketOwnerId,
                  version: state.version + 1,
                  ticketOwner: { id: data.ticketOwnerId, name: "Staff User" } as any,
                };
                return { count: 1 };
              }
              return { count: 0 };
            }),
            findUniqueOrThrow: vi.fn().mockImplementation(async () => ({ ...state })),
          },
        };
        return cb(tx);
      },
    };

    vi.spyOn(prismaModule, "getPrisma").mockReturnValue(mockPrisma as any);

    const appA = createTestApp("IT_STAFF", 101);
    const appB = createTestApp("IT_STAFF", 102);

    const [resA, resB] = await Promise.all([
      request(appA)
        .post("/api/staff/tickets/42/claim")
        .set("Origin", allowedOrigin)
        .send({ expectedVersion: 1 }),
      request(appB)
        .post("/api/staff/tickets/42/claim")
        .set("Origin", allowedOrigin)
        .send({ expectedVersion: 1 }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([200, 409]);

    const successRes = resA.status === 200 ? resA : resB;
    const conflictRes = resA.status === 409 ? resA : resB;

    expect(successRes.body.version).toBe(2);
    expect(["ALREADY_CLAIMED", "VERSION_CONFLICT"]).toContain(conflictRes.body.error);
    expect(state.version).toBe(2);
  });

  // 2. [P2] Concurrent "Appears Resolved"
  it("P2: concurrent appears-resolved calls increment version only once (1 -> 2) and return 200", async () => {
    let state = {
      id: 55,
      ticketNumber: "TKT-2026-000055",
      requesterId: 100, // owned by current requester
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Resolution Ticket",
      description: "Test",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "OPEN",
      ticketOwnerId: 10,
      version: 1,
      appearsResolvedAt: null as Date | null,
      appearsResolvedById: null as number | null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockPrisma = {
      ticket: {
        findUnique: vi.fn().mockImplementation(async () => ({ ...state })),
      },
      $transaction: async (cb: any) => {
        const tx = {
          ticket: {
            findUnique: vi.fn().mockImplementation(async () => ({ ...state })),
            updateMany: vi.fn().mockImplementation(async ({ where, data }: any) => {
              if (where.id === state.id && state.appearsResolvedAt === null && where.currentStatus.in.includes(state.currentStatus)) {
                state = {
                  ...state,
                  appearsResolvedAt: data.appearsResolvedAt,
                  appearsResolvedById: data.appearsResolvedById,
                  version: state.version + 1,
                };
                return { count: 1 };
              }
              return { count: 0 };
            }),
            findUniqueOrThrow: vi.fn().mockImplementation(async () => ({ ...state })),
          },
        };
        return cb(tx);
      },
    };

    vi.spyOn(prismaModule, "getPrisma").mockReturnValue(mockPrisma as any);

    const app = createTestApp("REQUESTER", 100);

    const [res1, res2] = await Promise.all([
      request(app).post("/api/tickets/55/appears-resolved"),
      request(app).post("/api/tickets/55/appears-resolved"),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.version).toBe(2);
    expect(res2.body.version).toBe(2);
    expect(state.version).toBe(2);
  });

  // 3. [P2] Ineligible owner on status transition
  it("P2: status transition to OPEN is rejected with 400 OWNER_REQUIRED when owner is inactive or not Staff/Admin", async () => {
    // Ticket owned by an inactive staff
    const stateInactive = {
      id: 77,
      ticketNumber: "TKT-2026-000077",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Inactive Owner Ticket",
      description: "Test",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "NEW",
      ticketOwnerId: 99,
      version: 1,
      appearsResolvedAt: null,
      appearsResolvedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      requester: { id: 1, name: "Req", email: "req@example.com" },
      category: { id: 1, name: "Cat" },
      relatedSystem: { id: 1, name: "Sys" },
      ticketOwner: { id: 99, name: "Deactivated Staff", active: false, role: "IT_STAFF" },
      appearsResolvedBy: null,
      attachments: [],
    };

    const mockPrisma = {
      $transaction: async (cb: any) => {
        const tx = {
          ticket: {
            findUnique: vi.fn().mockResolvedValue(stateInactive),
          },
        };
        return cb(tx);
      },
    };

    vi.spyOn(prismaModule, "getPrisma").mockReturnValue(mockPrisma as any);

    const app = createTestApp("IT_STAFF", 101);

    const res = await request(app)
      .patch("/api/staff/tickets/77/status")
      .set("Origin", allowedOrigin)
      .send({ currentStatus: "OPEN", expectedVersion: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("OWNER_REQUIRED");
  });

  // 4. [P2] DB Error in loadTicketForAccess middleware
  it("P2: loadTicketForAccess catches DB errors and returns 500 INTERNAL_ERROR instead of unhandled rejection", async () => {
    const mockPrisma = {
      ticket: {
        findUnique: vi.fn().mockRejectedValue(new Error("Simulated database timeout")),
      },
    };

    vi.spyOn(prismaModule, "getPrisma").mockReturnValue(mockPrisma as any);

    const app = createTestApp("IT_STAFF", 101);

    const res = await request(app).get("/api/tickets/999/comments");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("INTERNAL_ERROR");
    expect(res.body.message).toBe("Failed to access ticket");
  });
});
