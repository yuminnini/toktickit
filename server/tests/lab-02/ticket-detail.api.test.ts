import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { formatTicketNumber } from "../../src/services/ticketNumber.js";
import { Priority, TicketStatus } from "@prisma/client";

describe("GET /api/tickets/:id (API-02, BR-13, AC-03)", () => {
  let requesterAId: number;
  let requesterBId: number;
  let inactiveRequesterId: number;
  let ticketAId: number;
  let ticketANumber: string;

  beforeAll(async () => {
    const prisma = getPrisma();
    const requesters = await prisma.requesterUser.findMany({
      where: { active: true },
      take: 2,
    });
    const inactiveReq = await prisma.requesterUser.findFirst({
      where: { active: false },
    });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst({ where: { active: true } });

    if (requesters.length < 2 || !inactiveReq || !category || !system) {
      throw new Error("Seeded test data missing for Ticket Detail tests");
    }

    requesterAId = requesters[0].id;
    requesterBId = requesters[1].id;
    inactiveRequesterId = inactiveReq.id;

    // Create a ticket for Requester A
    const t = await prisma.ticket.create({
      data: {
        ticketNumber: `TMP-DETAIL-${Date.now()}`,
        requesterId: requesterAId,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: "Detailed investigation needed for VPN",
        description: "Cannot connect to VPN from home office since Monday.",
        requestedPriority: Priority.HIGH,
        currentStatus: TicketStatus.NEW,
      },
    });

    ticketANumber = formatTicketNumber(t.id);
    const updated = await prisma.ticket.update({
      where: { id: t.id },
      data: { ticketNumber: ticketANumber },
    });
    ticketAId = updated.id;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    await prisma.ticket.deleteMany({
      where: { id: ticketAId },
    });
  });

  it("returns 200 with full ticket details when accessed by owner", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketAId}`)
      .query({ requesterId: requesterAId });

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticketAId);
    expect(res.body.ticketNumber).toBe(ticketANumber);
    expect(res.body.summary).toBe("Detailed investigation needed for VPN");
    expect(res.body.description).toBe("Cannot connect to VPN from home office since Monday.");
    expect(res.body.requestedPriority).toBe("HIGH");
    expect(res.body.currentStatus).toBe("NEW");
    expect(res.body.category).toHaveProperty("name");
    expect(res.body.relatedSystem).toHaveProperty("name");
    expect(Array.isArray(res.body.attachments)).toBe(true);
  });

  it("API-02 / AC-03, BR-13: returns 404 when accessed by a requester who does not own it", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketAId}`)
      .query({ requesterId: requesterBId });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NOT_FOUND");
    expect(res.body.ticketNumber).toBeUndefined();
    expect(res.body.summary).toBeUndefined();
  });

  it("returns 404 when ticket ID does not exist", async () => {
    const res = await request(app)
      .get("/api/tickets/999999")
      .query({ requesterId: requesterAId });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NOT_FOUND");
  });

  it("returns 400 when requesterId is missing", async () => {
    const res = await request(app).get(`/api/tickets/${ticketAId}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("MISSING_REQUESTER");
  });

  it("returns 400 when requesterId belongs to inactive requester", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketAId}`)
      .query({ requesterId: inactiveRequesterId });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("BAD_REQUESTER");
  });
});
