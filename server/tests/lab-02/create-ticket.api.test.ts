import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("POST /api/tickets (API-01, API-03, API-04, API-15, API-19, API-20)", () => {
  let activeRequesterId: number;
  let inactiveRequesterId: number;
  let categoryId: number;
  let relatedSystemId: number;

  beforeEach(async () => {
    const prisma = getPrisma();
    const activeReq = await prisma.requesterUser.findFirst({ where: { active: true } });
    const inactiveReq = await prisma.requesterUser.findFirst({ where: { active: false } });
    const cat = await prisma.category.findFirst();
    const sys = await prisma.relatedSystem.findFirst({ where: { active: true } });

    if (!activeReq || !inactiveReq || !cat || !sys) {
      throw new Error("Seeded test data missing");
    }

    activeRequesterId = activeReq.id;
    inactiveRequesterId = inactiveReq.id;
    categoryId = cat.id;
    relatedSystemId = sys.id;
  });

  it("API-01 / AC-01: creates ticket with valid body and returns 201 with generated ticketNumber", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: activeRequesterId,
        categoryId,
        relatedSystemId,
        summary: "Laptop battery issue",
        description: "Battery discharges rapidly when idle.",
        requestedPriority: "MEDIUM",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("NEW");
    expect(res.body.summary).toBe("Laptop battery issue");
    expect(res.body.description).toBe("Battery discharges rapidly when idle.");

    // Cleanup
    await getPrisma().ticket.delete({ where: { id: res.body.id } });
  });

  it("API-03 / AC-04: rejects empty summary with 400 and validation message", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: activeRequesterId,
        categoryId,
        relatedSystemId,
        summary: "   ",
        description: "Valid description",
        requestedPriority: "LOW",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(res.body.fields).toHaveProperty("summary");
  });

  it("API-04 / BR-08: rejects summary over 150 characters with 400", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: activeRequesterId,
        categoryId,
        relatedSystemId,
        summary: "A".repeat(151),
        description: "Valid description",
        requestedPriority: "LOW",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(res.body.fields).toHaveProperty("summary");
  });

  it("API-15 / BR-11: rejects creation for inactive requester with 400 bad-requester", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: inactiveRequesterId,
        categoryId,
        relatedSystemId,
        summary: "Valid summary",
        description: "Valid description",
        requestedPriority: "LOW",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("BAD_REQUESTER");
  });

  it("API-19 / BR-08: rejects empty description with 400 validation error", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: activeRequesterId,
        categoryId,
        relatedSystemId,
        summary: "Valid summary",
        description: "   ",
        requestedPriority: "HIGH",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(res.body.fields).toHaveProperty("description");
  });

  it("API-20 / BR-08: rejects description over 2000 characters with 400 validation error", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({
        requesterId: activeRequesterId,
        categoryId,
        relatedSystemId,
        summary: "Valid summary",
        description: "B".repeat(2001),
        requestedPriority: "HIGH",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
    expect(res.body.fields).toHaveProperty("description");
  });
});
