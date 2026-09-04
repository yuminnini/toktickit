import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { formatTicketNumber } from "../../src/services/ticketNumber.js";
import { Priority, TicketStatus } from "@prisma/client";

describe("GET /api/tickets (API-05, API-06, API-16, API-17, API-18)", () => {
  let requesterAId: number;
  let requesterBId: number;
  let inactiveRequesterId: number;
  let category1Id: number;
  let category2Id: number;
  let relatedSystemId: number;
  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();
    const requesters = await prisma.requesterUser.findMany({
      where: { active: true },
      take: 2,
    });
    const inactiveReq = await prisma.requesterUser.findFirst({
      where: { active: false },
    });
    const categories = await prisma.category.findMany({ take: 2 });
    const system = await prisma.relatedSystem.findFirst({ where: { active: true } });

    if (requesters.length < 2 || !inactiveReq || categories.length < 2 || !system) {
      throw new Error("Seeded test data missing for My Tickets tests");
    }

    requesterAId = requesters[0].id;
    requesterBId = requesters[1].id;
    inactiveRequesterId = inactiveReq.id;
    category1Id = categories[0].id;
    category2Id = categories[1].id;
    relatedSystemId = system.id;

    // Clean up any existing tickets for test requesters first for deterministic counts
    await prisma.ticket.deleteMany({
      where: { requesterId: { in: [requesterAId, requesterBId] } },
    });

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
    await prisma.ticket.deleteMany({
      where: { id: { in: createdTicketIds } },
    });
  });

  it("API-05 / AC-09: page=2&pageSize=10 returns second page tickets and correct totalPages", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId: requesterAId, page: 2, pageSize: 10 });

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
      .query({ requesterId: requesterAId, page: 99, pageSize: 10 });

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2); // clamped to totalPages = 2
    expect(res.body.data.length).toBe(5);
  });

  it("page=2abc falls back to page 1 silently without using partial parseInt value", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId: requesterAId, page: "2abc", pageSize: 10 });

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1); // falls back to 1 instead of returning page 2
  });

  it("API-06 / BR-07: invalid sort=xyz falls back to createdAt desc silently without 400", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId: requesterAId, sort: "xyz", order: "invalid_order" });

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(10);
    // Should be ordered descending by createdAt
    const d1 = new Date(res.body.data[0].createdAt).getTime();
    const d2 = new Date(res.body.data[1].createdAt).getTime();
    expect(d1).toBeGreaterThanOrEqual(d2);
  });

  it("API-16 / AC-19: search=laptop matches case-insensitively across summary and ticketNumber", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId: requesterAId, search: "lApToP" });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].summary).toContain("Laptop");
    expect(res.body.unfilteredTotal).toBe(15);
  });

  it("API-17 / AC-20: categoryId and requestedPriority combined with AND", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({
        requesterId: requesterAId,
        categoryId: category1Id,
        requestedPriority: "HIGH",
      });

    expect(res.status).toBe(200);
    for (const item of res.body.data) {
      expect(item.requestedPriority).toBe("HIGH");
    }
  });

  it("API-18 / AC-21: sort=ticketNumber&order=asc orders results ascending by ticketNumber", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({
        requesterId: requesterAId,
        sort: "ticketNumber",
        order: "asc",
        pageSize: 15,
      });

    expect(res.status).toBe(200);
    const numbers = res.body.data.map((t: { ticketNumber: string }) => t.ticketNumber);
    const sorted = [...numbers].sort();
    expect(numbers).toEqual(sorted);
  });

  it("enforces ownership: Requester B does not see Requester A tickets", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId: requesterBId });

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.unfilteredTotal).toBe(1);
    expect(res.body.data[0].summary).toBe("Requester B private ticket");
  });

  it("rejects missing requesterId with 400 MISSING_REQUESTER", async () => {
    const res = await request(app).get("/api/tickets");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("MISSING_REQUESTER");
  });

  it("rejects inactive requesterId with 400 BAD_REQUESTER", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .query({ requesterId: inactiveRequesterId });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("BAD_REQUESTER");
  });
});
