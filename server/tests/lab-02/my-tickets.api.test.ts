import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { formatTicketNumber } from "../../src/services/ticketNumber.js";
import { Priority, TicketStatus } from "@prisma/client";
import { getAuthCookieForUser } from "../helpers/auth.js";

describe("GET /api/tickets (API-05, API-06, API-16, API-17, API-18)", () => {
  let requesterAId: number;
  let requesterBId: number;
  let inactiveRequesterId: number;
  let category1Id: number;
  let category2Id: number;
  let relatedSystemId: number;
  let cookieA: string;
  let cookieB: string;
  let inactiveCookie: string;
  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();
    const categories = await prisma.category.findMany({ take: 2 });
    const system = await prisma.relatedSystem.findFirst({ where: { active: true } });

    if (categories.length < 2 || !system) {
      throw new Error("Seeded test data missing for My Tickets tests");
    }

    const userA = await prisma.user.create({
      data: {
        name: "MyTickets Tester A",
        email: `mytickets-tester-a-${Date.now()}-${Math.random()}@example.com`,
        role: "REQUESTER",
        active: true,
        mustChangePassword: false,
      },
    });
    const userB = await prisma.user.create({
      data: {
        name: "MyTickets Tester B",
        email: `mytickets-tester-b-${Date.now()}-${Math.random()}@example.com`,
        role: "REQUESTER",
        active: true,
        mustChangePassword: false,
      },
    });
    const inactiveUser = await prisma.user.create({
      data: {
        name: "MyTickets Inactive Tester",
        email: `mytickets-inactive-${Date.now()}-${Math.random()}@example.com`,
        role: "REQUESTER",
        active: false,
        mustChangePassword: false,
      },
    });

    requesterAId = userA.id;
    requesterBId = userB.id;
    inactiveRequesterId = inactiveUser.id;
    category1Id = categories[0].id;
    category2Id = categories[1].id;
    relatedSystemId = system.id;

    cookieA = await getAuthCookieForUser(requesterAId);
    cookieB = await getAuthCookieForUser(requesterBId);
    inactiveCookie = await getAuthCookieForUser(inactiveRequesterId);

    // Seed 15 tickets for requesterA
    for (let i = 1; i <= 15; i++) {
      const isHigh = i % 3 === 0;
      const isCat1 = i % 2 === 0;
      const summaryText = i === 5 ? "Need replacement Laptop charger" : `Ticket sample ${i}`;

      const t = await prisma.ticket.create({
        data: {
          ticketNumber: `TMP-${i}-${Date.now()}`,
          requesterId: requesterAId,
          categoryId: isCat1 ? category1Id : category2Id,
          relatedSystemId,
          summary: summaryText,
          description: `Description for ticket ${i}`,
          requestedPriority: isHigh ? Priority.HIGH : Priority.LOW,
          itPriority: isHigh ? Priority.HIGH : Priority.LOW,
          currentStatus: TicketStatus.NEW,
        },
      });

      const officialNum = formatTicketNumber(t.id);
      const updated = await prisma.ticket.update({
        where: { id: t.id },
        data: { ticketNumber: officialNum },
      });
      createdTicketIds.push(updated.id);
    }

    // Seed 1 ticket for requesterB
    const tB = await prisma.ticket.create({
      data: {
        ticketNumber: `TMP-B-${Date.now()}`,
        requesterId: requesterBId,
        categoryId: category1Id,
        relatedSystemId,
        summary: "Requester B private ticket",
        description: "Must never be visible to requester A",
        requestedPriority: Priority.MEDIUM,
        itPriority: Priority.MEDIUM,
        currentStatus: TicketStatus.NEW,
      },
    });
    const officialNumB = formatTicketNumber(tB.id);
    const updatedB = await prisma.ticket.update({
      where: { id: tB.id },
      data: { ticketNumber: officialNumB },
    });
    createdTicketIds.push(updatedB.id);
  });

  afterAll(async () => {
    const prisma = getPrisma();
    if (createdTicketIds.length > 0) {
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
    await prisma.session.deleteMany({
      where: { userId: { in: [requesterAId, requesterBId, inactiveRequesterId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [requesterAId, requesterBId, inactiveRequesterId] } },
    });
  });

  it("API-05 / AC-09: page=2&pageSize=10 returns second page tickets and correct totalPages", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookieA)
      .query({ page: 2, pageSize: 10 });

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(10);
    expect(res.body.total).toBe(15);
    expect(res.body.totalPages).toBe(2);
    expect(res.body.unfilteredTotal).toBe(15);
    expect(res.body.data.length).toBe(5);
    expect(typeof res.body.data[0].category).toBe("string");
  });

  it("clamps page when requested page exceeds totalPages", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookieA)
      .query({ page: 99, pageSize: 10 });

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2); // clamped to totalPages = 2
    expect(res.body.data.length).toBe(5);
  });

  it("page=2abc falls back to page 1 silently without using partial parseInt value", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookieA)
      .query({ page: "2abc", pageSize: 10 });

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1); // falls back to 1 instead of returning page 2
  });

  it("API-06 / BR-07: invalid sort=xyz falls back to createdAt desc silently without 400", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookieA)
      .query({ sort: "invalid_sort_xyz", order: "asc" });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(10);
  });

  it("API-16 / AC-06: filters tickets by categoryId", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookieA)
      .query({ categoryId: category1Id });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(7);
  });

  it("API-17 / AC-06: filters tickets by priority", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookieA)
      .query({ priority: "HIGH" });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(5);
  });

  it("API-18 / AC-06: searches tickets by case-insensitive substring across ticketNumber and summary", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookieA)
      .query({ search: "charger" });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].summary).toBe("Need replacement Laptop charger");
  });

  it("isolates tickets between different requesters", async () => {
    const resA = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookieA);

    expect(resA.status).toBe(200);
    expect(resA.body.total).toBe(15);

    const resB = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookieB);

    expect(resB.status).toBe(200);
    expect(resB.body.total).toBe(1);
    expect(resB.body.data[0].summary).toBe("Requester B private ticket");
  });

  it("rejects inactive requester session with 401 UNAUTHENTICATED", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", inactiveCookie);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHENTICATED");
  });

  it("authenticates via session and returns requester tickets", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookieA);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(15);
  });

  it("provides ticketNo alias alongside ticketNumber in response", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookieA)
      .query({ page: 1, pageSize: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data[0].ticketNumber).toBeDefined();
    expect(res.body.data[0].ticketNo).toBe(res.body.data[0].ticketNumber);
  });

  it("supports itPriority filter parameter as an alias", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("Cookie", cookieA)
      .query({ itPriority: "HIGH" });

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { requestedPriority: string }) => t.requestedPriority === "HIGH")).toBe(true);
  });
});
