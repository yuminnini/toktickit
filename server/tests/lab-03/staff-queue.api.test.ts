import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getAuthSessionForUser } from "../helpers/auth.js";
import { Priority, TicketStatus } from "@prisma/client";

describe("P08: IT Staff Ticket Queue API (T23–T26 / AC-23–AC-26)", () => {
  let staffSession: { id: number; cookie: string; csrfToken: string };
  let requesterSession: { id: number; cookie: string; csrfToken: string };
  let adminSession: { id: number; cookie: string; csrfToken: string };
  let categoryId: number;
  let relatedSystemId: number;

  beforeEach(async () => {
    const prisma = getPrisma();

    // Ensure staff user exists
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

    // Ensure requester user exists
    let reqUser = await prisma.user.findFirst({ where: { email: "jennifer.anderson@example.com" } });
    if (!reqUser) {
      reqUser = await prisma.user.create({
        data: {
          name: "Jennifer Anderson",
          email: "jennifer.anderson@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else if (reqUser.mustChangePassword) {
      reqUser = await prisma.user.update({
        where: { id: reqUser.id },
        data: { mustChangePassword: false },
      });
    }

    // Ensure admin user exists
    let admin = await prisma.user.findFirst({ where: { role: "ADMINISTRATOR", active: true } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: "System Administrator",
          email: "admin@example.com",
          role: "ADMINISTRATOR",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else if (admin.mustChangePassword) {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: { mustChangePassword: false },
      });
    }

    const cat = await prisma.category.findFirst();
    const sys = await prisma.relatedSystem.findFirst({ where: { active: true } });
    categoryId = cat!.id;
    relatedSystemId = sys!.id;

    const sStaff = await getAuthSessionForUser(staff.id);
    staffSession = { id: staff.id, ...sStaff };

    const sReq = await getAuthSessionForUser(reqUser.id);
    requesterSession = { id: reqUser.id, ...sReq };

    const sAdmin = await getAuthSessionForUser(admin.id);
    adminSession = { id: admin.id, ...sAdmin };
  });

  describe("T23 / AC-23: Staff Queue Access Control", () => {
    it("allows IT Staff (200), but returns 403 for Requester and 401 for anonymous", async () => {
      // IT Staff gets 200
      const staffRes = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", staffSession.cookie);
      expect(staffRes.status).toBe(200);
      expect(staffRes.body).toHaveProperty("data");
      expect(staffRes.body).toHaveProperty("total");
      expect(staffRes.body).toHaveProperty("unfilteredTotal");

      // Requester gets 403 Forbidden
      const reqRes = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", requesterSession.cookie);
      expect(reqRes.status).toBe(403);
      expect(reqRes.body.error).toBe("FORBIDDEN");

      // Anonymous gets 401 Unauthenticated
      const anonRes = await request(app).get("/api/staff/tickets");
      expect(anonRes.status).toBe(401);
    });
  });

  describe("T24 / AC-24: Case-Insensitive Search & Combined Filters", () => {
    it("searches by ticket number and summary case-insensitively with combined filters", async () => {
      const prisma = getPrisma();
      const uniqueSuffix = Date.now().toString().slice(-6);

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${uniqueSuffix}`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: `Searchable Quantum Glitch ${uniqueSuffix}`,
          description: "Detailed description of quantum glitch.",
          requestedPriority: "HIGH",
          itPriority: "HIGH",
          currentStatus: "IN_PROGRESS",
          ticketOwnerId: staffSession.id,
        },
      });

      try {
        // 1. Search by summary substring in lowercase
        const searchRes = await request(app)
          .get("/api/staff/tickets")
          .set("Cookie", staffSession.cookie)
          .query({ search: `quantum glitch ${uniqueSuffix}`.toLowerCase() });

        expect(searchRes.status).toBe(200);
        expect(searchRes.body.data.some((t: any) => t.id === ticket.id)).toBe(true);

        // 2. Search by ticket number substring
        const tktNumRes = await request(app)
          .get("/api/staff/tickets")
          .set("Cookie", staffSession.cookie)
          .query({ search: uniqueSuffix });

        expect(tktNumRes.status).toBe(200);
        expect(tktNumRes.body.data.some((t: any) => t.id === ticket.id)).toBe(true);

        // 3. Combined filters: matching category, status, and owner=mine
        const combinedRes = await request(app)
          .get("/api/staff/tickets")
          .set("Cookie", staffSession.cookie)
          .query({
            search: uniqueSuffix,
            categoryId,
            status: "IN_PROGRESS",
            owner: "mine",
          });

        expect(combinedRes.status).toBe(200);
        expect(combinedRes.body.data.some((t: any) => t.id === ticket.id)).toBe(true);

        // 4. Combined filters with non-matching status returns empty data
        const nonMatchRes = await request(app)
          .get("/api/staff/tickets")
          .set("Cookie", staffSession.cookie)
          .query({
            search: uniqueSuffix,
            status: "RESOLVED",
          });

        expect(nonMatchRes.status).toBe(200);
        expect(nonMatchRes.body.data.some((t: any) => t.id === ticket.id)).toBe(false);
      } finally {
        await prisma.ticket.delete({ where: { id: ticket.id } });
      }
    });

    it("validates query parameters and returns 400 VALIDATION_ERROR on invalid input", async () => {
      // Long search > 150 chars
      const longSearch = "a".repeat(151);
      const res1 = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", staffSession.cookie)
        .query({ search: longSearch });
      expect(res1.status).toBe(400);
      expect(res1.body.error).toBe("VALIDATION_ERROR");

      // Invalid categoryId
      const res2 = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", staffSession.cookie)
        .query({ categoryId: "not-a-number" });
      expect(res2.status).toBe(400);

      // Mutually exclusive owner and ticketOwnerId
      const res3 = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", staffSession.cookie)
        .query({ owner: "mine", ticketOwnerId: "5" });
      expect(res3.status).toBe(400);

      // Invalid pageSize
      const res4 = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", staffSession.cookie)
        .query({ pageSize: "15" });
      expect(res4.status).toBe(400);
    });
  });

  describe("T25 / AC-25: Semantic Priority Sorting (HIGH > MEDIUM > LOW)", () => {
    it("orders tickets semantically by priority (HIGH > MEDIUM > LOW) rather than alphabetically", async () => {
      const prisma = getPrisma();
      const prefix = `TKT-2026-999${Math.floor(100 + Math.random() * 800)}`;

      const tLow = await prisma.ticket.create({
        data: {
          ticketNumber: `${prefix}1`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Semantic Sort Low",
          description: "Priority sorting test",
          requestedPriority: "LOW",
          itPriority: "LOW",
          currentStatus: "NEW",
        },
      });

      const tMed = await prisma.ticket.create({
        data: {
          ticketNumber: `${prefix}2`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Semantic Sort Med",
          description: "Priority sorting test",
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          currentStatus: "NEW",
        },
      });

      const tHigh = await prisma.ticket.create({
        data: {
          ticketNumber: `${prefix}3`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Semantic Sort High",
          description: "Priority sorting test",
          requestedPriority: "HIGH",
          itPriority: "HIGH",
          currentStatus: "NEW",
        },
      });

      try {
        // Sort by itPriority descending: HIGH should come before MEDIUM, which comes before LOW
        const resDesc = await request(app)
          .get("/api/staff/tickets")
          .set("Cookie", staffSession.cookie)
          .query({
            search: "Semantic Sort",
            sort: "itPriority",
            order: "desc",
          });

        expect(resDesc.status).toBe(200);
        const priorities = resDesc.body.data.map((t: any) => t.itPriority);
        expect(priorities).toEqual(["HIGH", "MEDIUM", "LOW"]);

        // Sort by itPriority ascending: LOW should come before MEDIUM, which comes before HIGH
        const resAsc = await request(app)
          .get("/api/staff/tickets")
          .set("Cookie", staffSession.cookie)
          .query({
            search: "Semantic Sort",
            sort: "itPriority",
            order: "asc",
          });

        expect(resAsc.status).toBe(200);
        const prioritiesAsc = resAsc.body.data.map((t: any) => t.itPriority);
        expect(prioritiesAsc).toEqual(["LOW", "MEDIUM", "HIGH"]);
      } finally {
        await prisma.ticket.deleteMany({ where: { id: { in: [tLow.id, tMed.id, tHigh.id] } } });
      }
    });
  });

  describe("T26 / AC-26: Queue Pagination, Page Sizes & Counts", () => {
    it("handles total counts, page sizes (10/20/50), and bounds clamping", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", staffSession.cookie)
        .query({ page: 1, pageSize: 10 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("page", 1);
      expect(res.body).toHaveProperty("pageSize", 10);
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("totalPages");
      expect(res.body).toHaveProperty("unfilteredTotal");
      expect(res.body.data.length).toBeLessThanOrEqual(10);

      // Testing page clamp for page exceeding totalPages
      const excessivePage = res.body.totalPages + 50;
      const clampedRes = await request(app)
        .get("/api/staff/tickets")
        .set("Cookie", staffSession.cookie)
        .query({ page: excessivePage, pageSize: 10 });

      expect(clampedRes.status).toBe(200);
      if (res.body.totalPages > 0) {
        expect(clampedRes.body.page).toBe(res.body.totalPages);
      } else {
        expect(clampedRes.body.page).toBe(1);
        expect(clampedRes.body.totalPages).toBe(0);
      }
    });
  });
});
