import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/services/password.js";

describe("P05 / RBAC-ALL: Server Authorization & Role-Based Access Control", () => {
  const prisma = getPrisma();
  const allowedOrigin = process.env.APP_ORIGIN || "http://localhost:5173";
  const password = "ValidPassword123!";

  let requester1: any;
  let requester2: any;
  let forcedChangeRequester: any;
  let staffUser: any;
  let adminUser: any;

  let cookieReq1: string;
  let cookieReq2: string;
  let cookieForced: string;
  let cookieStaff: string;
  let cookieAdmin: string;

  let csrfReq1: string;
  let csrfStaff: string;

  let ticketOfReq1: any;

  beforeAll(async () => {
    const hash = await hashPassword(password);

    // Create test accounts
    requester1 = await prisma.user.create({
      data: {
        name: "Authz Requester One",
        email: `authz-req1-${Date.now()}@example.com`,
        role: "REQUESTER",
        active: true,
        passwordHash: hash,
        mustChangePassword: false,
      },
    });

    requester2 = await prisma.user.create({
      data: {
        name: "Authz Requester Two",
        email: `authz-req2-${Date.now()}@example.com`,
        role: "REQUESTER",
        active: true,
        passwordHash: hash,
        mustChangePassword: false,
      },
    });

    forcedChangeRequester = await prisma.user.create({
      data: {
        name: "Forced Change User",
        email: `authz-forced-${Date.now()}@example.com`,
        role: "REQUESTER",
        active: true,
        passwordHash: hash,
        mustChangePassword: true,
      },
    });

    staffUser = await prisma.user.create({
      data: {
        name: "Authz Staff User",
        email: `authz-staff-${Date.now()}@example.com`,
        role: "IT_STAFF",
        active: true,
        passwordHash: hash,
        mustChangePassword: false,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        name: "Authz Admin User",
        email: `authz-admin-${Date.now()}@example.com`,
        role: "ADMINISTRATOR",
        active: true,
        passwordHash: hash,
        mustChangePassword: false,
      },
    });

    // Helper to log in and get cookie + csrf
    async function login(email: string) {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email, password });
      const cookie = res.headers["set-cookie"]![0];
      const csrfRes = await request(app).get("/api/auth/csrf").set("Cookie", cookie);
      return { cookie, csrf: csrfRes.body.csrfToken };
    }

    const res1 = await login(requester1.email);
    cookieReq1 = res1.cookie;
    csrfReq1 = res1.csrf;

    const res2 = await login(requester2.email);
    cookieReq2 = res2.cookie;

    const resForced = await login(forcedChangeRequester.email);
    cookieForced = resForced.cookie;

    const resStaff = await login(staffUser.email);
    cookieStaff = resStaff.cookie;
    csrfStaff = resStaff.csrf;

    const resAdmin = await login(adminUser.email);
    cookieAdmin = resAdmin.cookie;

    // Create a ticket owned by Requester 1
    const cat = await prisma.category.findFirst();
    const sys = await prisma.relatedSystem.findFirst();
    ticketOfReq1 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-AUTHZ-${Date.now()}`,
        requesterId: requester1.id,
        categoryId: cat!.id,
        relatedSystemId: sys!.id,
        summary: "Authz Test Ticket for Requester 1",
        description: "Testing authorization boundaries",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        version: 1,
      },
    });

    // Add an internal note to ticketOfReq1
    await prisma.internalNote.create({
      data: {
        ticketId: ticketOfReq1.id,
        authorId: staffUser.id,
        content: "Top secret internal technician note",
      },
    });
  });

  describe("T03 / AC-03: Ignore legacy X-Requester-Id & derive from session", () => {
    it("derives requester identity strictly from session, completely ignoring spoofed X-Requester-Id header", async () => {
      // Requester 1 creates a ticket while trying to spoof X-Requester-Id as Requester 2
      const cat = await prisma.category.findFirst();
      const sys = await prisma.relatedSystem.findFirst();

      const res = await request(app)
        .post("/api/tickets")
        .set("Origin", allowedOrigin)
        .set("Cookie", cookieReq1)
        .set("X-CSRF-Token", csrfReq1)
        .set("X-Requester-Id", String(requester2.id))
        .send({
          categoryId: cat!.id,
          relatedSystemId: sys!.id,
          summary: "Ticket with spoofed header",
          description: "Header should be ignored completely",
          requestedPriority: "HIGH",
          requesterId: requester2.id, // also attempt to spoof in body
        });

      expect(res.status).toBe(201);
      // The ticket must belong to requester 1, NOT requester 2!
      expect(res.body.requesterId).toBe(requester1.id);

      const createdInDb = await prisma.ticket.findUnique({
        where: { id: res.body.id },
      });
      expect(createdInDb?.requesterId).toBe(requester1.id);
    });

    it("rejects unauthenticated requests even if X-Requester-Id header is supplied", async () => {
      const res = await request(app)
        .get("/api/tickets")
        .set("X-Requester-Id", String(requester1.id));

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHENTICATED");
    });
  });

  describe("T04 / AC-04: Non-disclosure & 403 for Requester on Internal Notes", () => {
    it("returns 403 Forbidden for Requester trying to access internal notes with zero content or existence leak", async () => {
      const res = await request(app)
        .get(`/api/tickets/${ticketOfReq1.id}/internal-notes`)
        .set("Cookie", cookieReq1);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("FORBIDDEN");
      expect(res.body).not.toHaveProperty("data");
      expect(JSON.stringify(res.body)).not.toContain("Top secret");
    });

    it("allows IT_STAFF and ADMINISTRATOR to read internal notes", async () => {
      const staffRes = await request(app)
        .get(`/api/tickets/${ticketOfReq1.id}/internal-notes`)
        .set("Cookie", cookieStaff);
      expect(staffRes.status).toBe(200);
      expect(staffRes.body.data.length).toBeGreaterThan(0);
      expect(staffRes.body.data[0].content).toContain("Top secret");

      const adminRes = await request(app)
        .get(`/api/tickets/${ticketOfReq1.id}/internal-notes`)
        .set("Cookie", cookieAdmin);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.data.length).toBeGreaterThan(0);
    });
  });

  describe("AC-02 / BR-02: Forced Password Change Blocks Business APIs", () => {
    it("blocks user with mustChangePassword: true from accessing business APIs with 403", async () => {
      const ticketsRes = await request(app)
        .get("/api/tickets")
        .set("Cookie", cookieForced);

      expect(ticketsRes.status).toBe(403);
      expect(ticketsRes.body.error).toBe("PASSWORD_CHANGE_REQUIRED");

      const catRes = await request(app)
        .get("/api/categories")
        .set("Cookie", cookieForced);

      expect(catRes.status).toBe(403);
      expect(catRes.body.error).toBe("PASSWORD_CHANGE_REQUIRED");
    });
  });

  describe("AC-21: Foreign Resource 404 for Requester", () => {
    it("returns 404 when Requester tries to view another user's ticket", async () => {
      // Requester 2 attempts to view ticket belonging to Requester 1
      const res = await request(app)
        .get(`/api/tickets/${ticketOfReq1.id}`)
        .set("Cookie", cookieReq2);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });

    it("allows IT_STAFF and ADMINISTRATOR to view any ticket detail", async () => {
      const staffRes = await request(app)
        .get(`/api/tickets/${ticketOfReq1.id}`)
        .set("Cookie", cookieStaff);
      expect(staffRes.status).toBe(200);
      expect(staffRes.body.id).toBe(ticketOfReq1.id);

      const adminRes = await request(app)
        .get(`/api/tickets/${ticketOfReq1.id}`)
        .set("Cookie", cookieAdmin);
      expect(adminRes.status).toBe(200);
      expect(adminRes.body.id).toBe(ticketOfReq1.id);
    });
  });

  describe("Decommissioning of /api/requesters", () => {
    it("returns 404 for /api/requesters in Lab 3", async () => {
      const res = await request(app).get("/api/requesters");
      expect(res.status).toBe(404);
    });
  });
});
