import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getAuthSessionForUser } from "../helpers/auth.js";

describe("Phase F3 / P06: Requester Dashboard API (T16, T17, T22)", () => {
  let requesterA: { id: number; cookie: string; csrfToken: string };
  let requesterB: { id: number; cookie: string; csrfToken: string };
  let emptyRequester: { id: number; cookie: string; csrfToken: string };
  let staffAlice: { id: number; cookie: string; csrfToken: string };
  let categoryId: number;
  let relatedSystemId: number;
  const createdTicketIds: number[] = [];
  const createdUserIds: number[] = [];

  afterAll(async () => {
    const prisma = getPrisma();
    if (createdTicketIds.length > 0) {
      await prisma.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  beforeEach(async () => {
    const prisma = getPrisma();

    // Clean previous test tickets created in this suite
    if (createdTicketIds.length > 0) {
      await prisma.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
      createdTicketIds.length = 0;
    }

    const cat = await prisma.category.findFirst();
    categoryId = cat!.id;
    const sys = await prisma.relatedSystem.findFirst({ where: { active: true } });
    relatedSystemId = sys!.id;

    // Staff Alice for ticket ownership
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
    }
    const aliceSession = await getAuthSessionForUser(alice.id);
    staffAlice = { id: alice.id, ...aliceSession };

    // Dedicated Requester A
    let reqA = await prisma.user.findFirst({ where: { email: "req.dash.a@example.com" } });
    if (!reqA) {
      reqA = await prisma.user.create({
        data: {
          name: "Requester Dash A",
          email: "req.dash.a@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
        },
      });
      createdUserIds.push(reqA.id);
    }
    await prisma.ticket.deleteMany({ where: { requesterId: reqA.id } });
    const sessionA = await getAuthSessionForUser(reqA.id);
    requesterA = { id: reqA.id, ...sessionA };

    // Dedicated Requester B (foreign requester to verify strict isolation)
    let reqB = await prisma.user.findFirst({ where: { email: "req.dash.b@example.com" } });
    if (!reqB) {
      reqB = await prisma.user.create({
        data: {
          name: "Requester Dash B",
          email: "req.dash.b@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
        },
      });
      createdUserIds.push(reqB.id);
    }
    await prisma.ticket.deleteMany({ where: { requesterId: reqB.id } });
    const sessionB = await getAuthSessionForUser(reqB.id);
    requesterB = { id: reqB.id, ...sessionB };

    // Dedicated Empty Requester (zero tickets)
    let reqEmpty = await prisma.user.findFirst({ where: { email: "req.dash.empty@example.com" } });
    if (!reqEmpty) {
      reqEmpty = await prisma.user.create({
        data: {
          name: "Requester Dash Empty",
          email: "req.dash.empty@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
        },
      });
      createdUserIds.push(reqEmpty.id);
    }
    await prisma.ticket.deleteMany({ where: { requesterId: reqEmpty.id } });
    const sessionEmpty = await getAuthSessionForUser(reqEmpty.id);
    emptyRequester = { id: reqEmpty.id, ...sessionEmpty };
  });

  async function createTicketForRequester(
    requesterId: number,
    status: "NEW" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_REQUESTER" | "RESOLVED" | "CLOSED" | "REOPENED" | "CANCELLED",
    summary: string,
    updatedAt: Date
  ) {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-RD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        requesterId,
        categoryId,
        relatedSystemId,
        summary,
        description: `Description for ${summary}`,
        requestedPriority: "MEDIUM",
        itPriority: "HIGH",
        currentStatus: status,
        ticketOwnerId: status === "NEW" ? null : staffAlice.id,
        updatedAt,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  // T16 / AC-16: Requester Dashboard authoritative metrics & data isolation
  it("T16 / AC-16: returns accurate myOpenTickets, inProgress, resolved, closed, waitingForRequester, and top 5 recentlyUpdated tickets exclusively for the requester", async () => {
    const baseTime = Date.now();
    // Create 8 tickets for Requester A across statuses:
    // Active open statuses ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'):
    // 1 NEW, 1 OPEN, 2 IN_PROGRESS, 1 WAITING_FOR_REQUESTER, 1 REOPENED => myOpenTickets = 6
    // Plus 2 RESOLVED, 1 CLOSED, 1 CANCELLED
    await createTicketForRequester(requesterA.id, "NEW", "ReqA Ticket 1 NEW", new Date(baseTime - 90000));
    await createTicketForRequester(requesterA.id, "OPEN", "ReqA Ticket 2 OPEN", new Date(baseTime - 80000));
    await createTicketForRequester(requesterA.id, "IN_PROGRESS", "ReqA Ticket 3 IN_PROGRESS", new Date(baseTime - 70000));
    await createTicketForRequester(requesterA.id, "IN_PROGRESS", "ReqA Ticket 4 IN_PROGRESS", new Date(baseTime - 60000));
    await createTicketForRequester(requesterA.id, "WAITING_FOR_REQUESTER", "ReqA Ticket 5 WAITING", new Date(baseTime - 50000));
    const t6 = await createTicketForRequester(requesterA.id, "REOPENED", "ReqA Ticket 6 REOPENED", new Date(baseTime - 40000));
    const t7 = await createTicketForRequester(requesterA.id, "RESOLVED", "ReqA Ticket 7 RESOLVED", new Date(baseTime - 30000));
    const t8 = await createTicketForRequester(requesterA.id, "RESOLVED", "ReqA Ticket 8 RESOLVED", new Date(baseTime - 20000));
    const t9 = await createTicketForRequester(requesterA.id, "CLOSED", "ReqA Ticket 9 CLOSED", new Date(baseTime - 10000));
    const t10 = await createTicketForRequester(requesterA.id, "CANCELLED", "ReqA Ticket 10 CANCELLED", new Date(baseTime - 5000));

    // Create tickets for Requester B to verify they NEVER leak into Requester A's counts or recent list
    await createTicketForRequester(requesterB.id, "IN_PROGRESS", "ReqB Foreign Ticket 1", new Date(baseTime));
    await createTicketForRequester(requesterB.id, "WAITING_FOR_REQUESTER", "ReqB Foreign Ticket 2", new Date(baseTime));

    const res = await request(app)
      .get("/api/dashboard/requester")
      .set("Cookie", requesterA.cookie);

    expect(res.status).toBe(200);
    expect(res.body.myOpenTickets).toBe(6); // NEW(1) + OPEN(1) + IN_PROGRESS(2) + WAITING_FOR_REQUESTER(1) + REOPENED(1)
    expect(res.body.inProgress).toBe(2);
    expect(res.body.waitingForRequester).toBe(1);
    expect(res.body.resolved).toBe(2);
    expect(res.body.closed).toBe(1);

    // Top 5 recentlyUpdated ordered by updatedAt DESC
    expect(Array.isArray(res.body.recentlyUpdated)).toBe(true);
    expect(res.body.recentlyUpdated.length).toBe(5);
    expect(res.body.recentlyUpdated.map((t: any) => t.id)).toEqual([
      t10.id,
      t9.id,
      t8.id,
      t7.id,
      t6.id,
    ]);

    // Check required DTO fields on recentlyUpdated items
    const firstItem = res.body.recentlyUpdated[0];
    expect(firstItem).toHaveProperty("id", t10.id);
    expect(firstItem).toHaveProperty("ticketNumber", t10.ticketNumber);
    expect(firstItem).toHaveProperty("summary", "ReqA Ticket 10 CANCELLED");
    expect(firstItem).toHaveProperty("currentStatus", "CANCELLED");
    expect(firstItem).toHaveProperty("requestedPriority", "MEDIUM");
    expect(firstItem).toHaveProperty("itPriority", "HIGH");
    expect(firstItem).toHaveProperty("updatedAt");
    expect(firstItem.category).toHaveProperty("id", categoryId);
    expect(firstItem.category).toHaveProperty("name");
  });

  // T17 / AC-17: Requester Dashboard zero/empty behavior
  it("T17 / AC-17: returns all zeroes and empty recentlyUpdated array for a user with zero tickets", async () => {
    const res = await request(app)
      .get("/api/dashboard/requester")
      .set("Cookie", emptyRequester.cookie);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      myOpenTickets: 0,
      inProgress: 0,
      resolved: 0,
      closed: 0,
      waitingForRequester: 0,
      recentlyUpdated: [],
    });
  });

  // T22 / AC-22: Unauthenticated access rejected with 401
  it("T22 / AC-22: rejects unauthenticated request to GET /api/dashboard/requester with 401 UNAUTHENTICATED", async () => {
    const res = await request(app).get("/api/dashboard/requester");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHENTICATED");
  });
});
