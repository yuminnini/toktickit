import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getAuthSessionForUser } from "../helpers/auth.js";

describe("Phase F2 / P05: Ticket Workflow, Resolution Gate & Concurrency Control (T10–T15)", () => {
  const allowedOrigin = process.env.APP_ORIGIN || "http://localhost:5173";
  let staffAlice: { id: number; cookie: string; csrfToken: string };
  let adminUser: { id: number; cookie: string; csrfToken: string };
  let requesterOwner: { id: number; cookie: string; csrfToken: string };
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

    // Staff Alice
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

    // Admin
    let admin = await prisma.user.findFirst({ where: { role: "ADMINISTRATOR" } });
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

    // Requester Owner
    let jennifer = await prisma.user.findFirst({ where: { email: "jennifer.anderson@example.com" } });
    if (!jennifer) {
      jennifer = await prisma.user.create({
        data: {
          name: "Jennifer Anderson",
          email: "jennifer.anderson@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
        },
      });
    } else {
      jennifer = await prisma.user.update({
        where: { id: jennifer.id },
        data: { active: true, mustChangePassword: false },
      });
    }
    const jenniferSession = await getAuthSessionForUser(jennifer.id);
    requesterOwner = { id: jennifer.id, ...jenniferSession };

    let cat = await prisma.category.findFirst();
    if (!cat) {
      cat = await prisma.category.create({ data: { name: "Network" } });
    }
    categoryId = cat.id;

    let sys = await prisma.relatedSystem.findFirst();
    if (!sys) {
      sys = await prisma.relatedSystem.create({ data: { name: "Campus Wi-Fi" } });
    }
    relatedSystemId = sys.id;
  });

  async function createTestTicket(status = "OPEN", ownerId: number | null = staffAlice.id, version = 1) {
    const prisma = getPrisma();
    const ticketNumber = `TKT-2026-W${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId: requesterOwner.id,
        categoryId,
        relatedSystemId,
        summary: "Test Ticket for Workflow",
        description: "Detailed description for test ticket.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: status as any,
        ticketOwnerId: ownerId,
        version,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  // T10 / AC-10: Resolution gate
  it("T10 / AC-10: Requester cannot resolve ticket; Staff cannot resolve with 0 Actions Taken (ACTION_REQUIRED)", async () => {
    const ticket = await createTestTicket("IN_PROGRESS");

    // 1. Requester cannot access staff status endpoint -> 403
    const reqRes = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterOwner.cookie)
      .set("X-CSRF-Token", requesterOwner.csrfToken)
      .send({ currentStatus: "RESOLVED", expectedVersion: 1 });
    expect(reqRes.status).toBe(403);

    // 2. Staff attempts transition to RESOLVED with 0 Actions Taken -> 400 ACTION_REQUIRED (Decision D2)
    const staffNoActionRes = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({ currentStatus: "RESOLVED", expectedVersion: 1 });
    expect(staffNoActionRes.status).toBe(400);
    expect(staffNoActionRes.body.error).toBe("ACTION_REQUIRED");
  });

  // T11 / AC-11: Requester "appears resolved" advisory behavior
  it("T11 / AC-11: Requester advisory indication records appearsResolvedAt without altering formal currentStatus", async () => {
    const ticket = await createTestTicket("IN_PROGRESS");

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/appears-resolved`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterOwner.cookie)
      .set("X-CSRF-Token", requesterOwner.csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("IN_PROGRESS");
    expect(res.body.appearsResolvedAt).toBeDefined();

    // Verify in database
    const prisma = getPrisma();
    const fresh = await prisma.ticket.findUnique({ where: { id: ticket.id } });
    expect(fresh?.currentStatus).toBe("IN_PROGRESS");
    expect(fresh?.appearsResolvedAt).not.toBeNull();
  });

  // T12 / AC-12: Permitted status transitions by IT Staff & Admin (Decision D6 & D2)
  it("T12 / AC-12: Permitted status transitions succeed for IT Staff and Admin when prerequisites are met", async () => {
    const prisma = getPrisma();
    const ticket = await createTestTicket("IN_PROGRESS", staffAlice.id, 1);

    // Add required Action Taken per Decision D2
    await prisma.actionTaken.create({
      data: {
        ticketId: ticket.id,
        description: "Replaced faulty router cable.",
        result: "Full connectivity restored.",
        performedById: staffAlice.id,
      },
    });

    // 1. Staff transitions IN_PROGRESS -> RESOLVED (succeeds, version becomes 2)
    const resolveRes = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({ currentStatus: "RESOLVED", expectedVersion: 1 });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.currentStatus).toBe("RESOLVED");
    expect(resolveRes.body.version).toBe(2);

    // 2. Admin transitions RESOLVED -> CLOSED (Decision D6: Admin permitted on status endpoint)
    const closeRes = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Origin", allowedOrigin)
      .set("Cookie", adminUser.cookie)
      .set("X-CSRF-Token", adminUser.csrfToken)
      .send({ currentStatus: "CLOSED", expectedVersion: 2 });

    expect(closeRes.status).toBe(200);
    expect(closeRes.body.currentStatus).toBe("CLOSED");
    expect(closeRes.body.version).toBe(3);
  });

  // T13 / AC-13: Disallowed status transitions rejection
  it("T13 / AC-13: Illegal transitions return 400 INVALID_TRANSITION", async () => {
    const ticket = await createTestTicket("NEW", null, 1);

    // NEW cannot transition directly to RESOLVED
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({ currentStatus: "RESOLVED", expectedVersion: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_TRANSITION");
  });

  // T14 / AC-14: OCC matching version
  it("T14 / AC-14: Mutation with matching expectedVersion increments version by 1", async () => {
    const ticket = await createTestTicket("OPEN", staffAlice.id, 3);

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({ currentStatus: "IN_PROGRESS", expectedVersion: 3 });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("IN_PROGRESS");
    expect(res.body.version).toBe(4);
  });

  // T15 / AC-15: OCC stale conflict
  it("T15 / AC-15: Mutation with outdated expectedVersion returns 409 VERSION_CONFLICT", async () => {
    const ticket = await createTestTicket("OPEN", staffAlice.id, 5);

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({ currentStatus: "IN_PROGRESS", expectedVersion: 4 }); // submitted 4, actual is 5

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("VERSION_CONFLICT");
  });
});
