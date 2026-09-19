import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getAuthSessionForUser } from "../helpers/auth.js";

describe("P09: IT Staff Ticket Operations & Concurrency (T28–T33 / AC-28–AC-33)", () => {
  const allowedOrigin = process.env.APP_ORIGIN || "http://localhost:5173";
  let staffA: { id: number; cookie: string; csrfToken: string };
  let staffB: { id: number; cookie: string; csrfToken: string };
  let requesterSession: { id: number; cookie: string; csrfToken: string };
  let adminSession: { id: number; cookie: string; csrfToken: string };
  let categoryId: number;
  let relatedSystemId: number;

  beforeEach(async () => {
    const prisma = getPrisma();

    // Staff A (Alice)
    let sA = await prisma.user.findFirst({ where: { email: "staff.alice@example.com" } });
    if (!sA) {
      sA = await prisma.user.create({
        data: {
          name: "Alice IT Support",
          email: "staff.alice@example.com",
          role: "IT_STAFF",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else {
      sA = await prisma.user.update({
        where: { id: sA.id },
        data: { active: true, role: "IT_STAFF", mustChangePassword: false },
      });
    }

    // Staff B (Bob)
    let sB = await prisma.user.findFirst({ where: { email: "staff.bob@example.com" } });
    if (!sB) {
      sB = await prisma.user.create({
        data: {
          name: "Bob Network Tech",
          email: "staff.bob@example.com",
          role: "IT_STAFF",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else {
      sB = await prisma.user.update({
        where: { id: sB.id },
        data: { active: true, role: "IT_STAFF", mustChangePassword: false },
      });
    }

    // Requester
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
      reqUser = await prisma.user.update({ where: { id: reqUser.id }, data: { mustChangePassword: false } });
    }

    // Admin
    let adm = await prisma.user.findFirst({ where: { role: "ADMINISTRATOR", active: true } });
    if (!adm) {
      adm = await prisma.user.create({
        data: {
          name: "System Administrator",
          email: "admin@example.com",
          role: "ADMINISTRATOR",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else if (adm.mustChangePassword) {
      adm = await prisma.user.update({ where: { id: adm.id }, data: { mustChangePassword: false } });
    }

    const cat = await prisma.category.findFirst();
    const sys = await prisma.relatedSystem.findFirst({ where: { active: true } });
    categoryId = cat!.id;
    relatedSystemId = sys!.id;

    staffA = { id: sA.id, ...(await getAuthSessionForUser(sA.id)) };
    staffB = { id: sB.id, ...(await getAuthSessionForUser(sB.id)) };
    requesterSession = { id: reqUser.id, ...(await getAuthSessionForUser(reqUser.id)) };
    adminSession = { id: adm.id, ...(await getAuthSessionForUser(adm.id)) };
  });

  describe("T28 / AC-28: Staff Ticket Detail & Eligible Owners", () => {
    it("returns StaffTicketDetail with requester info and returns eligible owners list", async () => {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Detail Verification Ticket",
          description: "Detail description",
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          currentStatus: "NEW",
        },
      });

      try {
        const res = await request(app)
          .get(`/api/staff/tickets/${ticket.id}`)
          .set("Cookie", staffA.cookie);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("id", ticket.id);
        expect(res.body).toHaveProperty("requester");
        expect(res.body.requester).toHaveProperty("email");
        expect(res.body).toHaveProperty("version", 1);
        expect(res.body).toHaveProperty("itPriority", "HIGH");

        // Eligible owners endpoint
        const ownersRes = await request(app)
          .get("/api/staff/eligible-owners")
          .set("Cookie", staffA.cookie);

        expect(ownersRes.status).toBe(200);
        expect(ownersRes.body).toHaveProperty("data");
        expect(Array.isArray(ownersRes.body.data)).toBe(true);
        expect(ownersRes.body.data.some((u: any) => u.id === staffA.id)).toBe(true);
        // Requesters must NOT be eligible owners
        expect(ownersRes.body.data.every((u: any) => u.role !== "REQUESTER")).toBe(true);
      } finally {
        await prisma.ticket.delete({ where: { id: ticket.id } });
      }
    });
  });

  describe("T29 / AC-29: Claim & Reassign Ownership", () => {
    it("claims unassigned ticket, rejects already-owned claim (409), and reassigns to active staff", async () => {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Claimable Ticket",
          description: "Testing claim and reassign",
          requestedPriority: "LOW",
          currentStatus: "NEW",
          version: 1,
        },
      });

      try {
        // 1. Staff A claims unassigned ticket
        const claimRes = await request(app)
          .post(`/api/staff/tickets/${ticket.id}/claim`)
          .set("Origin", allowedOrigin)
          .set("Cookie", staffA.cookie)
          .set("X-CSRF-Token", staffA.csrfToken)
          .send({ expectedVersion: 1 });

        expect(claimRes.status).toBe(200);
        expect(claimRes.body.ticketOwnerId).toBe(staffA.id);
        expect(claimRes.body.version).toBe(2);

        // 2. Staff B attempting to claim already assigned ticket receives 409 ALREADY_CLAIMED
        const repeatClaimRes = await request(app)
          .post(`/api/staff/tickets/${ticket.id}/claim`)
          .set("Origin", allowedOrigin)
          .set("Cookie", staffB.cookie)
          .set("X-CSRF-Token", staffB.csrfToken)
          .send({ expectedVersion: 2 });

        expect(repeatClaimRes.status).toBe(409);
        expect(repeatClaimRes.body.error).toBe("ALREADY_CLAIMED");

        // 3. Reassign to Staff B with valid expectedVersion
        const reassignRes = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/owner`)
          .set("Origin", allowedOrigin)
          .set("Cookie", staffA.cookie)
          .set("X-CSRF-Token", staffA.csrfToken)
          .send({ ticketOwnerId: staffB.id, expectedVersion: 2 });

        expect(reassignRes.status).toBe(200);
        expect(reassignRes.body.ticketOwnerId).toBe(staffB.id);
        expect(reassignRes.body.version).toBe(3);

        // 4. Reassigning to a Requester is rejected with 400 INVALID_OWNER
        const invalidOwnerRes = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/owner`)
          .set("Origin", allowedOrigin)
          .set("Cookie", staffA.cookie)
          .set("X-CSRF-Token", staffA.csrfToken)
          .send({ ticketOwnerId: requesterSession.id, expectedVersion: 3 });

        expect(invalidOwnerRes.status).toBe(400);
        expect(invalidOwnerRes.body.error).toBe("INVALID_OWNER");
      } finally {
        await prisma.ticket.delete({ where: { id: ticket.id } });
      }
    });

    it("atomic concurrency: two simultaneous claims for the same unassigned ticket resolve with exactly one 200 and one 409", async () => {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Concurrent Claim Ticket",
          description: "Testing racing claims",
          requestedPriority: "MEDIUM",
          currentStatus: "NEW",
          version: 1,
        },
      });

      try {
        const [resA, resB] = await Promise.all([
          request(app)
            .post(`/api/staff/tickets/${ticket.id}/claim`)
            .set("Origin", allowedOrigin)
            .set("Cookie", staffA.cookie)
            .set("X-CSRF-Token", staffA.csrfToken)
            .send({ expectedVersion: 1 }),
          request(app)
            .post(`/api/staff/tickets/${ticket.id}/claim`)
            .set("Origin", allowedOrigin)
            .set("Cookie", staffB.cookie)
            .set("X-CSRF-Token", staffB.csrfToken)
            .send({ expectedVersion: 1 }),
        ]);

        const statuses = [resA.status, resB.status].sort();
        expect(statuses).toEqual([200, 409]);

        const successRes = resA.status === 200 ? resA : resB;
        const conflictRes = resA.status === 409 ? resA : resB;

        expect(successRes.body.version).toBe(2);
        expect([staffA.id, staffB.id]).toContain(successRes.body.ticketOwnerId);
        expect(["ALREADY_CLAIMED", "VERSION_CONFLICT"]).toContain(conflictRes.body.error);

        // Verify database state: exactly one owner and version 2
        const finalTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(finalTicket?.version).toBe(2);
        expect([staffA.id, staffB.id]).toContain(finalTicket?.ticketOwnerId);
      } finally {
        await prisma.ticket.delete({ where: { id: ticket.id } });
      }
    });
  });

  describe("T30 / AC-30: Concurrency Control (VERSION_CONFLICT)", () => {
    it("returns 409 VERSION_CONFLICT on stale expectedVersion during mutations", async () => {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Concurrency Test Ticket",
          description: "Checking version conflict",
          requestedPriority: "MEDIUM",
          currentStatus: "NEW",
          version: 5,
        },
      });

      try {
        // Attempt mutation with stale expectedVersion (e.g. 4 instead of 5)
        const staleRes = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/priority`)
          .set("Origin", allowedOrigin)
          .set("Cookie", staffA.cookie)
          .set("X-CSRF-Token", staffA.csrfToken)
          .send({ itPriority: "HIGH", expectedVersion: 4 });

        expect(staleRes.status).toBe(409);
        expect(staleRes.body.error).toBe("VERSION_CONFLICT");

        // Stale status transition also returns 409
        const staleStatusRes = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Origin", allowedOrigin)
          .set("Cookie", staffA.cookie)
          .set("X-CSRF-Token", staffA.csrfToken)
          .send({ currentStatus: "OPEN", expectedVersion: 4 });

        expect(staleStatusRes.status).toBe(409);
        expect(staleStatusRes.body.error).toBe("VERSION_CONFLICT");
      } finally {
        await prisma.ticket.delete({ where: { id: ticket.id } });
      }
    });
  });

  describe("T31 / AC-31: IT Priority Updates & Requested Priority Immutability", () => {
    it("updates IT Priority independently while preserving Requested Priority unchanged", async () => {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Priority Immutability Ticket",
          description: "Requested Priority must never change",
          requestedPriority: "LOW",
          itPriority: "LOW",
          currentStatus: "NEW",
          version: 1,
        },
      });

      try {
        const updateRes = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/priority`)
          .set("Origin", allowedOrigin)
          .set("Cookie", staffA.cookie)
          .set("X-CSRF-Token", staffA.csrfToken)
          .send({ itPriority: "HIGH", expectedVersion: 1 });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.itPriority).toBe("HIGH");
        expect(updateRes.body.requestedPriority).toBe("LOW");
        expect(updateRes.body.version).toBe(2);

        // Verify in DB directly
        const freshTicket = await prisma.ticket.findUnique({ where: { id: ticket.id } });
        expect(freshTicket?.itPriority).toBe("HIGH");
        expect(freshTicket?.requestedPriority).toBe("LOW");
      } finally {
        await prisma.ticket.delete({ where: { id: ticket.id } });
      }
    });
  });

  describe("T32 / AC-32: Status Transition Matrix & Owner Requirement", () => {
    it("enforces allowed transition matrix and requires assigned owner for active statuses", async () => {
      const prisma = getPrisma();
      // Unassigned ticket in NEW
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Status Matrix Test Ticket",
          description: "Transition tests",
          requestedPriority: "MEDIUM",
          currentStatus: "NEW",
          ticketOwnerId: null,
          version: 1,
        },
      });

      try {
        // 1. Transition NEW -> OPEN without assigned owner fails with 400 OWNER_REQUIRED
        const noOwnerRes = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Origin", allowedOrigin)
          .set("Cookie", staffA.cookie)
          .set("X-CSRF-Token", staffA.csrfToken)
          .send({ currentStatus: "OPEN", expectedVersion: 1 });

        expect(noOwnerRes.status).toBe(400);
        expect(noOwnerRes.body.error).toBe("OWNER_REQUIRED");

        // 2. Assign owner to Staff A
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { ticketOwnerId: staffA.id, version: 2 },
        });

        // 3. Illegal transition: NEW -> RESOLVED fails with 400 INVALID_TRANSITION
        const illegalRes = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Origin", allowedOrigin)
          .set("Cookie", staffA.cookie)
          .set("X-CSRF-Token", staffA.csrfToken)
          .send({ currentStatus: "RESOLVED", expectedVersion: 2 });

        expect(illegalRes.status).toBe(400);
        expect(illegalRes.body.error).toBe("INVALID_TRANSITION");

        // 4. Valid transition: NEW -> OPEN succeeds
        const openRes = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Origin", allowedOrigin)
          .set("Cookie", staffA.cookie)
          .set("X-CSRF-Token", staffA.csrfToken)
          .send({ currentStatus: "OPEN", expectedVersion: 2 });

        expect(openRes.status).toBe(200);
        expect(openRes.body.currentStatus).toBe("OPEN");
        expect(openRes.body.version).toBe(3);

        // 5. Valid transition: OPEN -> IN_PROGRESS succeeds
        const inProgRes = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Origin", allowedOrigin)
          .set("Cookie", staffA.cookie)
          .set("X-CSRF-Token", staffA.csrfToken)
          .send({ currentStatus: "IN_PROGRESS", expectedVersion: 3 });

        expect(inProgRes.status).toBe(200);
        expect(inProgRes.body.currentStatus).toBe("IN_PROGRESS");
      } finally {
        await prisma.ticket.delete({ where: { id: ticket.id } });
      }
    });

    it("rejects status transition with 400 OWNER_REQUIRED if assigned owner is inactive or has role REQUESTER", async () => {
      const prisma = getPrisma();
      const inactiveStaff = await prisma.user.create({
        data: {
          name: "Inactive Staff Tech",
          email: `inactive.staff.${Date.now()}@example.com`,
          role: "IT_STAFF",
          active: false,
          mustChangePassword: false,
        },
      });

      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Inactive Owner Ticket",
          description: "Transition should fail if owner inactive",
          requestedPriority: "LOW",
          currentStatus: "NEW",
          ticketOwnerId: inactiveStaff.id,
          version: 1,
        },
      });

      try {
        const res = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Origin", allowedOrigin)
          .set("Cookie", staffA.cookie)
          .set("X-CSRF-Token", staffA.csrfToken)
          .send({ currentStatus: "OPEN", expectedVersion: 1 });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe("OWNER_REQUIRED");
      } finally {
        await prisma.ticket.delete({ where: { id: ticket.id } });
        await prisma.user.delete({ where: { id: inactiveStaff.id } });
      }
    });
  });

  describe("T33 / AC-33: Requester Operational Field Protection", () => {
    it("strictly blocks Requesters from invoking operational mutation endpoints (403)", async () => {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Requester Mutation Attempt",
          description: "Requesters cannot change operational fields",
          requestedPriority: "LOW",
          currentStatus: "NEW",
          version: 1,
        },
      });

      try {
        // Requester tries to claim
        const claimRes = await request(app)
          .post(`/api/staff/tickets/${ticket.id}/claim`)
          .set("Origin", allowedOrigin)
          .set("Cookie", requesterSession.cookie)
          .set("X-CSRF-Token", requesterSession.csrfToken)
          .send({ expectedVersion: 1 });
        expect(claimRes.status).toBe(403);

        // Requester tries to update status
        const statusRes = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set("Origin", allowedOrigin)
          .set("Cookie", requesterSession.cookie)
          .set("X-CSRF-Token", requesterSession.csrfToken)
          .send({ currentStatus: "RESOLVED", expectedVersion: 1 });
        expect(statusRes.status).toBe(403);

        // Requester tries to update priority
        const prioRes = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/priority`)
          .set("Origin", allowedOrigin)
          .set("Cookie", requesterSession.cookie)
          .set("X-CSRF-Token", requesterSession.csrfToken)
          .send({ itPriority: "HIGH", expectedVersion: 1 });
        expect(prioRes.status).toBe(403);
      } finally {
        await prisma.ticket.delete({ where: { id: ticket.id } });
      }
    });
  });
});
