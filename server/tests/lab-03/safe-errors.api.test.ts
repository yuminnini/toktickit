import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getAuthSessionForUser } from "../helpers/auth.js";

describe("Safe Error Handling API (T53 / AC-53)", () => {
  const allowedOrigin = "http://localhost:5173";
  let adminEmail: string;
  let adminSession: { cookie: string; csrfToken: string };
  let requester1Session: { cookie: string; csrfToken: string };
  let requester2Session: { cookie: string; csrfToken: string };
  let req1Id: number;
  let testTicketId: number;

  const testUserIdsToClean: number[] = [];
  const testTicketIdsToClean: number[] = [];

  beforeEach(async () => {
    const prisma = getPrisma();

    // Ensure Admin
    let admin = await prisma.user.findFirst({ where: { role: "ADMINISTRATOR", active: true } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: "SafeError Admin",
          email: `safe.admin.${Date.now()}@example.com`,
          role: "ADMINISTRATOR",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
      testUserIdsToClean.push(admin.id);
    }
    adminEmail = admin.email;
    adminSession = await getAuthSessionForUser(admin.id);

    // Ensure Requester 1
    const req1 = await prisma.user.create({
      data: {
        name: "SafeError Requester 1",
        email: `safe.req1.${Date.now()}@example.com`,
        role: "REQUESTER",
        active: true,
        mustChangePassword: false,
        sessionVersion: 1,
      },
    });
    req1Id = req1.id;
    testUserIdsToClean.push(req1.id);
    requester1Session = await getAuthSessionForUser(req1.id);

    // Ensure Requester 2
    const req2 = await prisma.user.create({
      data: {
        name: "SafeError Requester 2",
        email: `safe.req2.${Date.now()}@example.com`,
        role: "REQUESTER",
        active: true,
        mustChangePassword: false,
        sessionVersion: 1,
      },
    });
    testUserIdsToClean.push(req2.id);
    requester2Session = await getAuthSessionForUser(req2.id);

    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    // Create a ticket owned by Requester 1
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-ERR-${Date.now()}`,
        summary: "Safe Error Test Ticket",
        description: "Testing non-disclosure and error safety",
        categoryId: category!.id,
        relatedSystemId: system!.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "OPEN",
        requesterId: req1.id,
        version: 1,
      },
    });
    testTicketId = ticket.id;
    testTicketIdsToClean.push(ticket.id);
  });

  afterEach(async () => {
    const prisma = getPrisma();
    for (const tid of testTicketIdsToClean) {
      try {
        await prisma.attachment.deleteMany({ where: { ticketId: tid } });
        await prisma.ticket.delete({ where: { id: tid } });
      } catch {}
    }
    for (const uid of testUserIdsToClean) {
      try {
        await prisma.session.deleteMany({ where: { userId: uid } });
        await prisma.user.delete({ where: { id: uid } });
      } catch {}
    }
  });

  describe("404 Not Found & Foreign Resource Non-Disclosure (AC-53)", () => {
    it("returns standard 404 without stack traces for unmatched API endpoints", async () => {
      const res = await request(app)
        .get("/api/non-existent-endpoint-xyz-987")
        .set("Origin", allowedOrigin);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "NOT_FOUND");
      expect(res.body).toHaveProperty("message");
      expect(res.body.stack).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/node_modules|at\s+|PrismaClient/i);
    });

    it("returns 404 for non-existent ticket ID without database query leakage", async () => {
      const res = await request(app)
        .get("/api/tickets/99999999")
        .set("Origin", allowedOrigin)
        .set("Cookie", requester1Session.cookie);

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "NOT_FOUND");
      expect(res.body.stack).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/SELECT|FROM|"Ticket"|WHERE/i);
    });

    it("returns non-disclosing 404 when user attempts to access foreign ticket", async () => {
      // Requester 2 tries to access ticket belonging to Requester 1
      const res = await request(app)
        .get(`/api/tickets/${testTicketId}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", requester2Session.cookie);

      // Must return 404, never 403, to prevent ID enumeration
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty("error", "NOT_FOUND");
      expect(res.body.message).toBe("Ticket not found");
      expect(res.body.stack).toBeUndefined();
      // Ensure no requester identity or ownership info is leaked
      expect(JSON.stringify(res.body)).not.toContain("SafeError Requester 1");
      expect(JSON.stringify(res.body)).not.toContain(String(req1Id));
    });
  });

  describe("409 Conflict Safety (AC-53)", () => {
    it("returns safe 409 on duplicate email creation without SQL/schema disclosure", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({
          name: "Duplicate User",
          email: adminEmail, // existing email
          role: "REQUESTER",
          active: true,
          initialPassword: "ValidInitialPassword123!",
        });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        error: "EMAIL_EXISTS",
        message: "A user with this email already exists",
      });
      expect(res.body.stack).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/Unique constraint|PrismaClientKnownRequestError|RequesterUser/i);
    });

    it("returns safe 409 on already removed attachment without internal details", async () => {
      const prisma = getPrisma();
      const att = await prisma.attachment.create({
        data: {
          ticketId: testTicketId,
          originalName: "test.png",
          storedFilename: "test_stored.png",
          mimeType: "image/png",
          sizeBytes: 1024,
          removedAt: new Date(),
          removalReason: "Initially removed",
        },
      });

      const res = await request(app)
        .delete(`/api/attachments/${att.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", requester1Session.cookie)
        .set("X-CSRF-Token", requester1Session.csrfToken)
        .send({ reason: "Attempt second removal" });

      expect(res.status).toBe(409);
      expect(res.body).toEqual({
        error: "ALREADY_REMOVED",
        message: "This attachment was already removed",
      });
      expect(res.body.stack).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/node_modules|at\s+/i);
    });
  });

  describe("500 Internal Server Error & Unexpected Failure Safety (AC-53)", () => {
    it("safely sanitizes unhandled 500 errors and conceals database secrets, stack traces, and credentials", async () => {
      const res = await request(app)
        .get("/api/test-500-error")
        .set("Origin", allowedOrigin);

      expect(res.status).toBe(500);
      expect(res.body).toEqual({
        error: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
      });
      // Verify nothing secret or internal was disclosed
      expect(res.body.stack).toBeUndefined();
      expect(res.text).not.toContain("secret_pass");
      expect(res.text).not.toContain("secret_user");
      expect(res.text).not.toContain("postgresql://");
      expect(res.text).not.toContain("Simulated unhandled internal error");
      expect(JSON.stringify(res.body)).not.toMatch(/node_modules|at\s+|Error:/i);
    });

    it("safely handles malformed JSON request bodies without leaking stack traces", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .set("Content-Type", "application/json")
        .send('{"email": "broken-json", "password": ');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error", "INVALID_JSON");
      expect(res.body).toHaveProperty("message");
      expect(res.body.stack).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toMatch(/node_modules|at\s+|SyntaxError/i);
    });
  });
});
