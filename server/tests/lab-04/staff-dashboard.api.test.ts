import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getAuthSessionForUser } from "../helpers/auth.js";

describe("Phase F3 / P07: IT Staff & Admin Dashboard API (T19, T21, T22)", () => {
  let staffAlice: { id: number; cookie: string; csrfToken: string };
  let inactiveStaff: { id: number; cookie: string; csrfToken: string };
  let adminUser: { id: number; cookie: string; csrfToken: string };
  let requesterUser: { id: number; cookie: string; csrfToken: string };
  let categoryId: number;
  let relatedSystemId: number;
  const createdTicketIds: number[] = [];

  afterAll(async () => {
    const prisma = getPrisma();
    if (createdTicketIds.length > 0) {
      await prisma.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
  });

  beforeEach(async () => {
    const prisma = getPrisma();

    if (createdTicketIds.length > 0) {
      await prisma.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
      createdTicketIds.length = 0;
    }

    const cat = await prisma.category.findFirst();
    categoryId = cat!.id;
    const sys = await prisma.relatedSystem.findFirst({ where: { active: true } });
    relatedSystemId = sys!.id;

    // 1. Active IT Staff (Alice)
    let alice = await prisma.user.findFirst({ where: { email: "staff.alice@example.com" } });
    if (!alice) {
      alice = await prisma.user.create({
        data: {
          name: "Alice IT Support",
          email: "staff.alice@example.com",
          role: "IT_STAFF",
          active: true,
          mustChangePassword: false,
        },
      });
    } else {
      alice = await prisma.user.update({
        where: { id: alice.id },
        data: { active: true, role: "IT_STAFF", mustChangePassword: false },
      });
    }
    const aliceSession = await getAuthSessionForUser(alice.id);
    staffAlice = { id: alice.id, ...aliceSession };

    // 2. Inactive IT Staff (Dana)
    let dana = await prisma.user.findFirst({ where: { email: "staff.dana@example.com" } });
    if (!dana) {
      dana = await prisma.user.create({
        data: {
          name: "Dana Former Staff",
          email: "staff.dana@example.com",
          role: "IT_STAFF",
          active: false,
          mustChangePassword: false,
        },
      });
    } else {
      dana = await prisma.user.update({
        where: { id: dana.id },
        data: { active: false, role: "IT_STAFF", mustChangePassword: false },
      });
    }
    const danaSession = await getAuthSessionForUser(dana.id);
    inactiveStaff = { id: dana.id, ...danaSession };

    // 3. Active Administrator
    let admin = await prisma.user.findFirst({ where: { role: "ADMINISTRATOR", active: true } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: "Admin Super",
          email: "admin.super@example.com",
          role: "ADMINISTRATOR",
          active: true,
          mustChangePassword: false,
        },
      });
    } else {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: { active: true, mustChangePassword: false },
      });
    }
    const adminSession = await getAuthSessionForUser(admin.id);
    adminUser = { id: admin.id, ...adminSession };

    // 4. Active Requester
    let requester = await prisma.user.findFirst({ where: { email: "jennifer.anderson@example.com" } });
    if (!requester) {
      requester = await prisma.user.create({
        data: {
          name: "Jennifer Anderson",
          email: "jennifer.anderson@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
        },
      });
    }
    const reqSession = await getAuthSessionForUser(requester.id);
    requesterUser = { id: requester.id, ...reqSession };
  });

  // T19 / AC-19: IT Staff Dashboard authoritative metrics
  it("T19 / AC-19: returns accurate new, open, inProgress, waitingForRequester, myAssigned, byStatus, byPriority, and recentQueue matching database queries", async () => {
    const prisma = getPrisma();

    // Create explicit fixture tickets so recentQueue and active counts are guaranteed non-empty even on an empty DB
    const tNew = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-SD-NEW-${Date.now()}`,
        requesterId: requesterUser.id,
        categoryId,
        relatedSystemId,
        summary: "Staff Dash Fixture Unassigned NEW",
        description: "Fixture ticket in NEW status without owner",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "NEW",
        ticketOwnerId: null,
      },
    });
    createdTicketIds.push(tNew.id);

    const tInProgress = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-SD-INP-${Date.now()}`,
        requesterId: requesterUser.id,
        categoryId,
        relatedSystemId,
        summary: "Staff Dash Fixture Assigned IN_PROGRESS",
        description: "Fixture ticket in IN_PROGRESS assigned to Alice",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "IN_PROGRESS",
        ticketOwnerId: staffAlice.id,
      },
    });
    createdTicketIds.push(tInProgress.id);

    // Compute expected authoritative values directly from DB
    const [
      expectedNew,
      expectedOpen,
      expectedInProgress,
      expectedWaiting,
      expectedResolved,
      expectedClosed,
      expectedReopened,
      expectedCancelled,
      expectedMyAssigned,
      expectedHigh,
      expectedMedium,
      expectedLow,
      expectedRecentQueue,
    ] = await Promise.all([
      prisma.ticket.count({ where: { currentStatus: "NEW" } }),
      prisma.ticket.count({ where: { currentStatus: "OPEN" } }),
      prisma.ticket.count({ where: { currentStatus: "IN_PROGRESS" } }),
      prisma.ticket.count({ where: { currentStatus: "WAITING_FOR_REQUESTER" } }),
      prisma.ticket.count({ where: { currentStatus: "RESOLVED" } }),
      prisma.ticket.count({ where: { currentStatus: "CLOSED" } }),
      prisma.ticket.count({ where: { currentStatus: "REOPENED" } }),
      prisma.ticket.count({ where: { currentStatus: "CANCELLED" } }),
      prisma.ticket.count({
        where: {
          ticketOwnerId: staffAlice.id,
          currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
        },
      }),
      prisma.ticket.count({
        where: {
          currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
          itPriority: "HIGH",
        },
      }),
      prisma.ticket.count({
        where: {
          currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
          itPriority: "MEDIUM",
        },
      }),
      prisma.ticket.count({
        where: {
          currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
          itPriority: "LOW",
        },
      }),
      prisma.ticket.findMany({
        where: {
          currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 5,
        include: {
          ticketOwner: { select: { id: true, name: true } },
        },
      }),
    ]);

    const res = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", staffAlice.cookie);

    expect(res.status).toBe(200);
    expect(res.body.new).toBe(expectedNew);
    expect(res.body.open).toBe(expectedOpen);
    expect(res.body.inProgress).toBe(expectedInProgress);
    expect(res.body.waitingForRequester).toBe(expectedWaiting);
    expect(res.body.myAssigned).toBe(expectedMyAssigned);

    expect(res.body.byStatus).toEqual({
      NEW: expectedNew,
      OPEN: expectedOpen,
      IN_PROGRESS: expectedInProgress,
      WAITING_FOR_REQUESTER: expectedWaiting,
      RESOLVED: expectedResolved,
      CLOSED: expectedClosed,
      REOPENED: expectedReopened,
      CANCELLED: expectedCancelled,
    });

    expect(res.body.byPriority).toEqual({
      HIGH: expectedHigh,
      MEDIUM: expectedMedium,
      LOW: expectedLow,
    });

    expect(Array.isArray(res.body.recentQueue)).toBe(true);
    expect(res.body.recentQueue.length).toBeGreaterThan(0);
    expect(res.body.recentQueue.length).toBe(expectedRecentQueue.length);
    expect(res.body.recentQueue.map((t: any) => t.id)).toEqual(
      expectedRecentQueue.map((t) => t.id)
    );

    const first = res.body.recentQueue[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("ticketNumber");
    expect(first).toHaveProperty("summary");
    expect(first).toHaveProperty("currentStatus");
    expect(first).toHaveProperty("requestedPriority");
    expect(first).toHaveProperty("itPriority");
    expect(first).toHaveProperty("ticketOwner");
    expect(first).toHaveProperty("updatedAt");

    // IT Staff response must NOT include userStats
    expect(res.body.userStats).toBeUndefined();
  });

  // T21 / AC-21: Administrator Dashboard user statistics
  it("T21 / AC-21: returns staff metrics plus userStats (totalUsers, activeStaff, inactiveUsers) when requested by an Administrator", async () => {
    const prisma = getPrisma();

    const [expectedTotalUsers, expectedActiveStaff, expectedInactiveUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "IT_STAFF", active: true } }),
      prisma.user.count({ where: { active: false } }),
    ]);

    const res = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", adminUser.cookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("new");
    expect(res.body).toHaveProperty("open");
    expect(res.body).toHaveProperty("inProgress");
    expect(res.body).toHaveProperty("waitingForRequester");
    expect(res.body).toHaveProperty("myAssigned");
    expect(res.body).toHaveProperty("byStatus");
    expect(res.body).toHaveProperty("byPriority");
    expect(res.body).toHaveProperty("recentQueue");

    expect(res.body.userStats).toEqual({
      totalUsers: expectedTotalUsers,
      activeStaff: expectedActiveStaff,
      inactiveUsers: expectedInactiveUsers,
    });
  });

  // Authorization & T22 / AC-22
  it("T22 / AC-22 & Role Guard: rejects unauthenticated with 401 and Requester or inactive staff with 403", async () => {
    // 1. Unauthenticated -> 401
    const unauthRes = await request(app).get("/api/dashboard/staff");
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.error).toBe("UNAUTHENTICATED");

    // 2. Requester -> 403 FORBIDDEN
    const reqRes = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", requesterUser.cookie);
    expect(reqRes.status).toBe(403);
    expect(reqRes.body.error).toBe("FORBIDDEN");

    // 3. Inactive IT Staff -> 403 FORBIDDEN
    const inactiveRes = await request(app)
      .get("/api/dashboard/staff")
      .set("Cookie", inactiveStaff.cookie);
    expect(inactiveRes.status).toBe(403);
    expect(inactiveRes.body.error).toBe("FORBIDDEN");
  });
});

