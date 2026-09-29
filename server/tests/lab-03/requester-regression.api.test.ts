import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getAuthSessionForUser } from "../helpers/auth.js";

describe("P07: Requester Regression & Session Adaptation (AC-19, AC-20, AC-21, AC-22)", () => {
  const allowedOrigin = process.env.APP_ORIGIN || "http://localhost:5173";
  let requesterA: { id: number; cookie: string; csrfToken: string };
  let requesterB: { id: number; cookie: string; csrfToken: string };
  let staffUser: { id: number; cookie: string; csrfToken: string };
  let categoryId: number;
  let relatedSystemId: number;

  beforeEach(async () => {
    const prisma = getPrisma();

    // Ensure Requester A and B exist with mustChangePassword: false for testing
    let userA = await prisma.user.findUnique({ where: { email: "jennifer.anderson@example.com" } });
    if (!userA) {
      userA = await prisma.user.create({
        data: {
          name: "Jennifer Anderson",
          email: "jennifer.anderson@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else if (userA.mustChangePassword) {
      userA = await prisma.user.update({
        where: { id: userA.id },
        data: { mustChangePassword: false },
      });
    }

    let userB = await prisma.user.findUnique({ where: { email: "michael.brown@example.com" } });
    if (!userB) {
      userB = await prisma.user.create({
        data: {
          name: "Michael Brown",
          email: "michael.brown@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else if (userB.mustChangePassword) {
      userB = await prisma.user.update({
        where: { id: userB.id },
        data: { mustChangePassword: false },
      });
    }

    let staff = await prisma.user.findFirst({ where: { role: "IT_STAFF", active: true } });
    if (!staff) {
      staff = await prisma.user.create({
        data: {
          name: "Alice IT Support",
          email: "staff.alice@example.com",
          role: "IT_STAFF",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else if (staff.mustChangePassword) {
      staff = await prisma.user.update({
        where: { id: staff.id },
        data: { mustChangePassword: false },
      });
    }

    const cat = await prisma.category.findFirst();
    const sys = await prisma.relatedSystem.findFirst({ where: { active: true } });

    if (!cat || !sys) {
      throw new Error("Missing seeded category or system");
    }

    categoryId = cat.id;
    relatedSystemId = sys.id;

    const sessionA = await getAuthSessionForUser(userA.id);
    requesterA = { id: userA.id, ...sessionA };

    const sessionB = await getAuthSessionForUser(userB.id);
    requesterB = { id: userB.id, ...sessionB };

    const sessionStaff = await getAuthSessionForUser(staff.id);
    staffUser = { id: staff.id, ...sessionStaff };
  });

  describe("T19 / AC-19: Requester Ticket Creation, DTOs & Queries under Session Identity", () => {
    it("creates ticket with valid body and verifies ticketNumber, ticketNo alias, and session scoping", async () => {
      const createRes = await request(app)
        .post("/api/tickets")
        .set("Origin", allowedOrigin)
        .set("Cookie", requesterA.cookie)
        .set("X-CSRF-Token", requesterA.csrfToken)
        .send({
          categoryId,
          relatedSystemId,
          summary: "Regression Ticket Summary",
          description: "Regression ticket detailed description.",
          requestedPriority: "HIGH",
        });

      expect(createRes.status).toBe(201);
      const created = createRes.body;
      expect(created.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
      expect(created.ticketNo).toBe(created.ticketNumber);
      expect(created.summary).toBe("Regression Ticket Summary");
      expect(created.requesterId).toBe(requesterA.id);

      // Verify list endpoint includes ticket with ticketNo alias
      const listRes = await request(app)
        .get("/api/tickets")
        .set("Cookie", requesterA.cookie)
        .query({ search: "Regression Ticket Summary" });

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThan(0);
      const listedTicket = listRes.body.data.find((t: any) => t.id === created.id);
      expect(listedTicket).toBeTruthy();
      expect(listedTicket.ticketNo).toBe(listedTicket.ticketNumber);
      expect(typeof listedTicket.category).toBe("string");

      // Verify detail endpoint
      const detailRes = await request(app)
        .get(`/api/tickets/${created.id}`)
        .set("Cookie", requesterA.cookie);

      expect(detailRes.status).toBe(200);
      expect(detailRes.body.ticketNo).toBe(created.ticketNumber);
      expect(detailRes.body.category.id).toBe(categoryId);
      expect(Array.isArray(detailRes.body.attachments)).toBe(true);

      // Clean up
      await getPrisma().ticket.delete({ where: { id: created.id } });
    });
  });

  describe("T20 / AC-20: Attachment Upload, List, Download & Soft-Remove", () => {
    it("manages attachments with session identity, safe DTO, streaming download, and soft removal", async () => {
      const prisma = getPrisma();

      // Create ticket for requesterA
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterA.id,
          categoryId,
          relatedSystemId,
          summary: "Attachment Regression Ticket",
          description: "Testing attachment flow under session.",
          requestedPriority: "MEDIUM",
          currentStatus: "NEW",
        },
      });

      // Upload attachment
      const samplePng = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89,
      ]);

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set("Origin", allowedOrigin)
        .set("Cookie", requesterA.cookie)
        .set("X-CSRF-Token", requesterA.csrfToken)
        .attach("file", samplePng, "test-regression.png");

      expect(uploadRes.status).toBe(201);
      const attachment = uploadRes.body;
      expect(attachment).toHaveProperty("id");
      expect(attachment.originalName).toBe("test-regression.png");
      expect(attachment.sizeBytes).toBe(samplePng.length);
      expect(attachment).not.toHaveProperty("storedFilename");

      // Verify download
      const downloadRes = await request(app)
        .get(`/api/attachments/${attachment.id}/download`)
        .set("Cookie", requesterA.cookie);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers["content-type"]).toContain("image/png");
      expect(downloadRes.body.length).toBe(samplePng.length);

      // Soft remove attachment
      const removeRes = await request(app)
        .delete(`/api/attachments/${attachment.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", requesterA.cookie)
        .set("X-CSRF-Token", requesterA.csrfToken)
        .send({ reason: "Duplicate file uploaded" });

      expect(removeRes.status).toBe(200);
      expect(removeRes.body.removedAt).not.toBeNull();
      expect(removeRes.body.removalReason).toBe("Duplicate file uploaded");

      // Clean up
      await prisma.attachment.delete({ where: { id: attachment.id } });
      await prisma.ticket.delete({ where: { id: ticket.id } });
    });
  });

  describe("T21 / AC-21: Foreign Resource 404 & Repeat Removal 409", () => {
    it("returns 404 for foreign ticket/attachment, 404 for removed download, and 409 for repeat removal", async () => {
      const prisma = getPrisma();

      // Create ticket owned by requester A
      const ticketA = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterA.id,
          categoryId,
          relatedSystemId,
          summary: "Requester A Ticket",
          description: "Private ticket.",
          requestedPriority: "LOW",
          currentStatus: "NEW",
        },
      });

      // Requester B cannot see Requester A's ticket (404 Non-disclosure)
      const foreignTicketRes = await request(app)
        .get(`/api/tickets/${ticketA.id}`)
        .set("Cookie", requesterB.cookie);

      expect(foreignTicketRes.status).toBe(404);
      expect(foreignTicketRes.body.error).toBe("NOT_FOUND");

      // Create attachment for ticket A
      const samplePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const uploadRes = await request(app)
        .post(`/api/tickets/${ticketA.id}/attachments`)
        .set("Origin", allowedOrigin)
        .set("Cookie", requesterA.cookie)
        .set("X-CSRF-Token", requesterA.csrfToken)
        .attach("file", samplePng, "photo.png");

      const attachment = uploadRes.body;

      // Requester B cannot access or remove attachment (404)
      const foreignAttachRes = await request(app)
        .get(`/api/attachments/${attachment.id}`)
        .set("Cookie", requesterB.cookie);
      expect(foreignAttachRes.status).toBe(404);

      const foreignRemoveRes = await request(app)
        .delete(`/api/attachments/${attachment.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", requesterB.cookie)
        .set("X-CSRF-Token", requesterB.csrfToken)
        .send({ reason: "Malicious attempt" });
      expect(foreignRemoveRes.status).toBe(404);

      // Requester A soft removes attachment
      const removeRes = await request(app)
        .delete(`/api/attachments/${attachment.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", requesterA.cookie)
        .set("X-CSRF-Token", requesterA.csrfToken)
        .send({ reason: "Obsolete attachment" });
      expect(removeRes.status).toBe(200);

      // Downloading removed attachment returns 404
      const downloadRemovedRes = await request(app)
        .get(`/api/attachments/${attachment.id}/download`)
        .set("Cookie", requesterA.cookie);
      expect(downloadRemovedRes.status).toBe(404);
      expect(downloadRemovedRes.body.error).toBe("NOT_FOUND");

      // Repeating removal on already removed attachment returns 409
      const repeatRemoveRes = await request(app)
        .delete(`/api/attachments/${attachment.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", requesterA.cookie)
        .set("X-CSRF-Token", requesterA.csrfToken)
        .send({ reason: "Removing again" });
      expect(repeatRemoveRes.status).toBe(409);
      expect(repeatRemoveRes.body.error).toBe("ALREADY_REMOVED");

      // Clean up
      await prisma.attachment.delete({ where: { id: attachment.id } });
      await prisma.ticket.delete({ where: { id: ticketA.id } });
    });
  });

  describe("T22 / AC-22: Requester Account Switch Isolation", () => {
    it("completely isolates ticket lists when switching between requester sessions", async () => {
      const prisma = getPrisma();

      const ticketA = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterA.id,
          categoryId,
          relatedSystemId,
          summary: "Unique Ticket For User A Only",
          description: "Isolated description A.",
          requestedPriority: "HIGH",
          currentStatus: "NEW",
        },
      });

      const ticketB = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterB.id,
          categoryId,
          relatedSystemId,
          summary: "Unique Ticket For User B Only",
          description: "Isolated description B.",
          requestedPriority: "LOW",
          currentStatus: "NEW",
        },
      });

      // Requester A lists tickets: sees ticket A, does not see ticket B
      const resA = await request(app)
        .get("/api/tickets")
        .set("Cookie", requesterA.cookie);
      expect(resA.status).toBe(200);
      const idsA = resA.body.data.map((t: any) => t.id);
      expect(idsA).toContain(ticketA.id);
      expect(idsA).not.toContain(ticketB.id);

      // Requester B lists tickets: sees ticket B, does not see ticket A
      const resB = await request(app)
        .get("/api/tickets")
        .set("Cookie", requesterB.cookie);
      expect(resB.status).toBe(200);
      const idsB = resB.body.data.map((t: any) => t.id);
      expect(idsB).toContain(ticketB.id);
      expect(idsB).not.toContain(ticketA.id);

      // Clean up
      await prisma.ticket.delete({ where: { id: ticketA.id } });
      await prisma.ticket.delete({ where: { id: ticketB.id } });
    });
  });
});
