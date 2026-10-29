import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getAuthSessionForUser } from "../helpers/auth.js";
import { hashSessionToken } from "../../src/services/session.js";

describe("Phase F2 / P04: Actions Taken REST API & Authorization (T01–T09, T22)", () => {
  const allowedOrigin = process.env.APP_ORIGIN || "http://localhost:5173";
  let staffAlice: { id: number; cookie: string; csrfToken: string };
  let staffBob: { id: number; cookie: string; csrfToken: string };
  let inactiveStaff: { id: number; cookie: string; csrfToken: string };
  let adminUser: { id: number; cookie: string; csrfToken: string };
  let requesterOwner: { id: number; cookie: string; csrfToken: string };
  let requesterOther: { id: number; cookie: string; csrfToken: string };
  let categoryId: number;
  let relatedSystemId: number;
  const createdTicketIds: number[] = [];

  afterAll(async () => {
    const prisma = getPrisma();
    if (createdTicketIds.length > 0) {
      await prisma.actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
  });

  beforeEach(async () => {
    const prisma = getPrisma();

    // 1. Staff Alice
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
    } else {
      alice = await prisma.user.update({
        where: { id: alice.id },
        data: { active: true, role: "IT_STAFF", mustChangePassword: false },
      });
    }
    const aliceSession = await getAuthSessionForUser(alice.id);
    staffAlice = { id: alice.id, ...aliceSession };

    // 2. Staff Bob
    let bob = await prisma.user.findFirst({ where: { email: "staff.bob@example.com" } });
    if (!bob) {
      bob = await prisma.user.create({
        data: {
          name: "Bob Network Tech",
          email: "staff.bob@example.com",
          role: "IT_STAFF",
          active: true,
          mustChangePassword: false,
        },
      });
    } else {
      bob = await prisma.user.update({
        where: { id: bob.id },
        data: { active: true, role: "IT_STAFF", mustChangePassword: false },
      });
    }
    const bobSession = await getAuthSessionForUser(bob.id);
    staffBob = { id: bob.id, ...bobSession };

    // 3. Inactive Staff Dana
    let dana = await prisma.user.findFirst({ where: { email: "staff.dana@example.com" } });
    if (!dana) {
      dana = await prisma.user.create({
        data: {
          name: "Dana Former Staff",
          email: "staff.dana@example.com",
          role: "IT_STAFF",
          active: false,
          mustChangePassword: false,
        },
      });
    } else {
      dana = await prisma.user.update({
        where: { id: dana.id },
        data: { active: false, role: "IT_STAFF", mustChangePassword: false },
      });
    }
    const danaSession = await getAuthSessionForUser(dana.id);
    inactiveStaff = { id: dana.id, ...danaSession };

    // 4. Admin
    let admin = await prisma.user.findFirst({ where: { role: "ADMINISTRATOR" } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: "Admin Super",
          email: "admin.super@example.com",
          role: "ADMINISTRATOR",
          active: true,
          mustChangePassword: false,
        },
      });
    } else {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: { active: true, mustChangePassword: false },
      });
    }
    const adminSession = await getAuthSessionForUser(admin.id);
    adminUser = { id: admin.id, ...adminSession };

    // 5. Requester Owner (Jennifer)
    let jennifer = await prisma.user.findFirst({ where: { email: "jennifer.anderson@example.com" } });
    if (!jennifer) {
      jennifer = await prisma.user.create({
        data: {
          name: "Jennifer Anderson",
          email: "jennifer.anderson@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
        },
      });
    } else {
      jennifer = await prisma.user.update({
        where: { id: jennifer.id },
        data: { active: true, mustChangePassword: false },
      });
    }
    const jenniferSession = await getAuthSessionForUser(jennifer.id);
    requesterOwner = { id: jennifer.id, ...jenniferSession };

    // 6. Requester Other (Michael)
    let michael = await prisma.user.findFirst({ where: { email: "michael.brown@example.com" } });
    if (!michael) {
      michael = await prisma.user.create({
        data: {
          name: "Michael Brown",
          email: "michael.brown@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
        },
      });
    } else {
      michael = await prisma.user.update({
        where: { id: michael.id },
        data: { active: true, mustChangePassword: false },
      });
    }
    const michaelSession = await getAuthSessionForUser(michael.id);
    requesterOther = { id: michael.id, ...michaelSession };

    // Category & System
    let cat = await prisma.category.findFirst();
    if (!cat) {
      cat = await prisma.category.create({ data: { name: "Network" } });
    }
    categoryId = cat.id;

    let sys = await prisma.relatedSystem.findFirst();
    if (!sys) {
      sys = await prisma.relatedSystem.create({ data: { name: "Campus Wi-Fi" } });
    }
    relatedSystemId = sys.id;
  });

  async function createTestTicket(status = "OPEN", ownerId: number | null = staffAlice.id) {
    const prisma = getPrisma();
    const ticketNumber = `TKT-2026-T${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 100)}`;
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        requesterId: requesterOwner.id,
        categoryId,
        relatedSystemId,
        summary: "Test Ticket for Actions Taken",
        description: "Detailed description for test ticket.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: status as any,
        ticketOwnerId: ownerId,
        version: 1,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  // T01 / AC-01: Create valid Action Taken by IT Staff
  it("T01 / AC-01: Creates valid Action Taken by IT Staff with auto-bound actor and version 1", async () => {
    const ticket = await createTestTicket("IN_PROGRESS");

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({
        performedById: 99999, // Spoofed performer ID must be ignored by backend
        description: "Checked network switch port and diagnostic logs.",
        result: "Port 4 replaced successfully.",
        followUpRequired: false,
        attachmentNotes: "See port-log.txt",
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.ticketId).toBe(ticket.id);
    expect(res.body.description).toBe("Checked network switch port and diagnostic logs.");
    expect(res.body.result).toBe("Port 4 replaced successfully.");
    expect(res.body.followUpRequired).toBe(false);
    expect(res.body.performedBy.id).toBe(staffAlice.id);
    expect(res.body.performedBy.id).not.toBe(99999);
    expect(res.body.version).toBe(1);
    expect(res.body.actionDateTime).toBeDefined();
  });

  // T02 / AC-02: Follow-up note required when followUpRequired=true
  it("T02 / AC-02: Rejects Action Taken when followUpRequired=true but followUpNote is missing/empty", async () => {
    const ticket = await createTestTicket("IN_PROGRESS");

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({
        description: "Checked hardware power supply unit.",
        result: "Voltage fluctuated intermittently.",
        followUpRequired: true,
        // followUpNote omitted
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  // T03 / AC-03: Create Action Taken with followUpRequired=false
  it("T03 / AC-03: Creates Action Taken with followUpRequired=false and null note without error", async () => {
    const ticket = await createTestTicket("IN_PROGRESS");

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({
        description: "Rebooted main departmental switch.",
        result: "Switch back online with zero dropped packets.",
        followUpRequired: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.followUpRequired).toBe(false);
    expect(res.body.followUpNote).toBeNull();
  });

  // T04 / AC-04: Requester read-only view of Actions Taken on owned ticket
  it("T04 / AC-04: Requester views Actions Taken on their owned ticket with performer details", async () => {
    const ticket = await createTestTicket("OPEN");

    // Staff creates action
    await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({
        description: "Cleaned optical sensor on printer.",
        result: "Sensor recalibrated successfully.",
        followUpRequired: false,
      });

    // Requester reads actions
    const res = await request(app)
      .get(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", requesterOwner.cookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].performedBy).toBeDefined();
    expect(res.body[0].performedBy.name).toBe("Alice IT Support");
  });

  // T05 / AC-05: Requester write attempt rejection
  it("T05 / AC-05: Rejects Requester attempting to create or patch an Action Taken with 403 Forbidden", async () => {
    const ticket = await createTestTicket("OPEN");

    // Requester attempts POST
    const postRes = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterOwner.cookie)
      .set("X-CSRF-Token", requesterOwner.csrfToken)
      .send({
        description: "Attempted requester work log",
        result: "Failed",
        followUpRequired: false,
      });
    expect(postRes.status).toBe(403);
    expect(postRes.body.error).toBe("FORBIDDEN");

    // Staff creates action
    const createRes = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({
        description: "Staff action",
        result: "Done",
        followUpRequired: false,
      });
    const actionId = createRes.body.id;

    // Requester attempts PATCH
    const patchRes = await request(app)
      .patch(`/api/actions/${actionId}`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterOwner.cookie)
      .set("X-CSRF-Token", requesterOwner.csrfToken)
      .send({
        description: "Requester tampering attempt",
        expectedVersion: 1,
      });
    expect(patchRes.status).toBe(403);
    expect(patchRes.body.error).toBe("FORBIDDEN");
  });

  // T06 / AC-06: Requester foreign ticket privacy
  it("T06 / AC-06: Requester attempting to access actions on ticket owned by another user receives 404", async () => {
    const ticket = await createTestTicket("OPEN"); // owned by requesterOwner (Jennifer)

    // Other requester (Michael) requests actions
    const res = await request(app)
      .get(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", requesterOther.cookie);

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NOT_FOUND");
  });

  // T07 / AC-07: Update existing Action Taken authorization & OCC
  it("T07 / AC-07: Update authorization (Author & Admin OK, other staff 403, locked ticket 400, OCC 409)", async () => {
    const ticket = await createTestTicket("OPEN");

    // Alice creates action
    const createRes = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({
        description: "Initial diagnostic on router.",
        result: "Identified bad firmware.",
        followUpRequired: false,
      });
    const actionId = createRes.body.id;

    // 1. Other staff (Bob) attempts edit -> 403 ACTION_EDIT_FORBIDDEN (Decision D4)
    const bobRes = await request(app)
      .patch(`/api/actions/${actionId}`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffBob.cookie)
      .set("X-CSRF-Token", staffBob.csrfToken)
      .send({
        description: "Bob modifying Alice's action",
        expectedVersion: 1,
      });
    expect(bobRes.status).toBe(403);
    expect(bobRes.body.error).toBe("ACTION_EDIT_FORBIDDEN");

    // 2. OCC mismatch -> 409 VERSION_CONFLICT (Decision D7)
    const occRes = await request(app)
      .patch(`/api/actions/${actionId}`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({
        description: "Alice updating with outdated version",
        expectedVersion: 999,
      });
    expect(occRes.status).toBe(409);
    expect(occRes.body.error).toBe("VERSION_CONFLICT");

    // 3. Author (Alice) updates successfully with matching expectedVersion -> version increments to 2
    const aliceRes = await request(app)
      .patch(`/api/actions/${actionId}`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffAlice.cookie)
      .set("X-CSRF-Token", staffAlice.csrfToken)
      .send({
        result: "Firmware flashed to version 2.4.1 cleanly.",
        expectedVersion: 1,
      });
    expect(aliceRes.status).toBe(200);
    expect(aliceRes.body.result).toBe("Firmware flashed to version 2.4.1 cleanly.");
    expect(aliceRes.body.version).toBe(2);

    // 4. Admin updates successfully (Decision D4) -> version increments to 3
    const adminRes = await request(app)
      .patch(`/api/actions/${actionId}`)
      .set("Origin", allowedOrigin)
      .set("Cookie", adminUser.cookie)
      .set("X-CSRF-Token", adminUser.csrfToken)
      .send({
        attachmentNotes: "Reviewed and approved by Admin.",
        expectedVersion: 2,
      });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.version).toBe(3);

    // 5. Decision D5: Locked ticket (e.g. RESOLVED) rejects modifications with 400 TICKET_LOCKED
    const prisma = getPrisma();
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { currentStatus: "RESOLVED" },
    });

    const lockedPatchRes = await request(app)
      .patch(`/api/actions/${actionId}`)
      .set("Origin", allowedOrigin)
      .set("Cookie", adminUser.cookie)
      .set("X-CSRF-Token", adminUser.csrfToken)
      .send({
        description: "Editing resolved ticket action",
        expectedVersion: 3,
      });
    expect(lockedPatchRes.status).toBe(400);
    expect(lockedPatchRes.body.error).toBe("TICKET_LOCKED");

    const lockedPostRes = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Origin", allowedOrigin)
      .set("Cookie", adminUser.cookie)
      .set("X-CSRF-Token", adminUser.csrfToken)
      .send({
        description: "New action on resolved ticket",
        result: "Blocked",
        followUpRequired: false,
      });
    expect(lockedPostRes.status).toBe(400);
    expect(lockedPostRes.body.error).toBe("TICKET_LOCKED");
  });

  // T08 / AC-08: Inactive staff user rejection (POST, PATCH, GET)
  it("T08 / AC-08: Inactive staff session attempting action creation, patch, or get is rejected", async () => {
    const ticket = await createTestTicket("OPEN");
    const prisma = getPrisma();

    // 1. Inactive staff attempting POST /api/tickets/:id/actions is rejected
    const postRes = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Origin", allowedOrigin)
      .set("Cookie", inactiveStaff.cookie)
      .set("X-CSRF-Token", inactiveStaff.csrfToken)
      .send({
        description: "Action by inactive staff",
        result: "Denied",
        followUpRequired: false,
      });

    expect([401, 403]).toContain(postRes.status);
    if (postRes.status === 403) {
      expect(postRes.body.error).toBe("FORBIDDEN");
    } else {
      expect(postRes.body.error).toBe("UNAUTHENTICATED");
    }

    // 2. Active staff creates an action to test PATCH
    const existingAction = await prisma.actionTaken.create({
      data: {
        ticketId: ticket.id,
        description: "Existing action by Alice",
        result: "Existing result",
        performedById: staffAlice.id,
        followUpRequired: false,
        version: 1,
      },
    });

    // Inactive staff attempting PATCH /api/actions/:id is rejected
    const patchRes = await request(app)
      .patch(`/api/actions/${existingAction.id}`)
      .set("Origin", allowedOrigin)
      .set("Cookie", inactiveStaff.cookie)
      .set("X-CSRF-Token", inactiveStaff.csrfToken)
      .send({
        description: "Unauthorized edit attempt",
        expectedVersion: 1,
      });

    expect([401, 403]).toContain(patchRes.status);
    if (patchRes.status === 403) {
      expect(patchRes.body.error).toBe("FORBIDDEN");
    } else {
      expect(patchRes.body.error).toBe("UNAUTHENTICATED");
    }

    // 3. Inactive staff attempting GET /api/tickets/:id/actions is rejected
    const getRes = await request(app)
      .get(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", inactiveStaff.cookie);

    expect([401, 403]).toContain(getRes.status);
    if (getRes.status === 403) {
      expect(getRes.body.error).toBe("FORBIDDEN");
    } else {
      expect(getRes.body.error).toBe("UNAUTHENTICATED");
    }

    // AC-11: Session is revoked from database
    const sessionToken = inactiveStaff.cookie.split("=")[1]?.split(";")[0];
    if (sessionToken) {
      const revokedSession = await prisma.session.findUnique({
        where: { tokenHash: hashSessionToken(sessionToken) },
      });
      expect(revokedSession).toBeNull();
    }
  });

  // T09 / AC-09: Chronological ordering of Actions Taken
  it("T09 / AC-09: Actions Taken returned in chronological order by actionDateTime ASC", async () => {
    const ticket = await createTestTicket("IN_PROGRESS");
    const prisma = getPrisma();

    // Create 3 actions with distinct actionDateTime
    const t1 = new Date(Date.now() - 7200000); // 2 hours ago
    const t2 = new Date(Date.now() - 3600000); // 1 hour ago
    const t3 = new Date(Date.now() - 1800000); // 30 mins ago

    // Insert out of order: t2, t1, t3
    await prisma.actionTaken.create({
      data: {
        ticketId: ticket.id,
        actionDateTime: t2,
        description: "Action 2 (1 hour ago)",
        result: "Result 2",
        performedById: staffAlice.id,
      },
    });
    await prisma.actionTaken.create({
      data: {
        ticketId: ticket.id,
        actionDateTime: t1,
        description: "Action 1 (2 hours ago)",
        result: "Result 1",
        performedById: staffBob.id,
      },
    });
    await prisma.actionTaken.create({
      data: {
        ticketId: ticket.id,
        actionDateTime: t3,
        description: "Action 3 (30 mins ago)",
        result: "Result 3",
        performedById: staffAlice.id,
      },
    });

    const res = await request(app)
      .get(`/api/tickets/${ticket.id}/actions`)
      .set("Cookie", staffAlice.cookie);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
    expect(res.body[0].description).toBe("Action 1 (2 hours ago)");
    expect(res.body[1].description).toBe("Action 2 (1 hour ago)");
    expect(res.body[2].description).toBe("Action 3 (30 mins ago)");
  });

  // T22 / AC-22: Unauthenticated actions access
  it("T22 / AC-22: Unauthenticated requests to actions endpoints receive 401 Unauthorized", async () => {
    const ticket = await createTestTicket("OPEN");

    const getRes = await request(app).get(`/api/tickets/${ticket.id}/actions`);
    expect(getRes.status).toBe(401);
    expect(getRes.body.error).toBe("UNAUTHENTICATED");

    const postRes = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set("Origin", allowedOrigin)
      .send({ description: "Test", result: "Test" });
    expect(postRes.status).toBe(401);
    expect(postRes.body.error).toBe("UNAUTHENTICATED");

    const patchRes = await request(app)
      .patch("/api/actions/1")
      .set("Origin", allowedOrigin)
      .send({ expectedVersion: 1 });
    expect(patchRes.status).toBe(401);
    expect(patchRes.body.error).toBe("UNAUTHENTICATED");
  });

  // P1 Review Feedback: Input Validation Hardening
  describe("P1 Input Validation Hardening on Actions Taken", () => {
    it("rejects empty PATCH payload { expectedVersion: 1 } with 400 VALIDATION_ERROR", async () => {
      const ticket = await createTestTicket("IN_PROGRESS");
      const prisma = getPrisma();
      const action = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          description: "Action for empty patch test",
          result: "Result",
          performedById: staffAlice.id,
          followUpRequired: false,
          version: 1,
        },
      });

      const res = await request(app)
        .patch(`/api/actions/${action.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", staffAlice.cookie)
        .set("X-CSRF-Token", staffAlice.csrfToken)
        .send({ expectedVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });

    it("rejects non-string or empty actionDateTime in PATCH with 400 VALIDATION_ERROR", async () => {
      const ticket = await createTestTicket("IN_PROGRESS");
      const prisma = getPrisma();
      const action = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          description: "Action for actionDateTime patch test",
          result: "Result",
          performedById: staffAlice.id,
          followUpRequired: false,
          version: 1,
        },
      });

      // Passing null as actionDateTime
      const resNull = await request(app)
        .patch(`/api/actions/${action.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", staffAlice.cookie)
        .set("X-CSRF-Token", staffAlice.csrfToken)
        .send({ expectedVersion: 1, actionDateTime: null });

      expect(resNull.status).toBe(400);
      expect(resNull.body.error).toBe("VALIDATION_ERROR");

      // Passing boolean/number
      const resNum = await request(app)
        .patch(`/api/actions/${action.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", staffAlice.cookie)
        .set("X-CSRF-Token", staffAlice.csrfToken)
        .send({ expectedVersion: 1, actionDateTime: 0 });

      expect(resNum.status).toBe(400);
      expect(resNum.body.error).toBe("VALIDATION_ERROR");
    });

    it("rejects followUpNote exceeding 2000 characters in POST and PATCH with 400 VALIDATION_ERROR", async () => {
      const ticket = await createTestTicket("IN_PROGRESS");
      const longNote = "A".repeat(2001);

      // POST with overly long followUpNote
      const postRes = await request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set("Origin", allowedOrigin)
        .set("Cookie", staffAlice.cookie)
        .set("X-CSRF-Token", staffAlice.csrfToken)
        .send({
          description: "Checked components",
          result: "Done",
          followUpRequired: true,
          followUpNote: longNote,
        });

      expect(postRes.status).toBe(400);
      expect(postRes.body.error).toBe("VALIDATION_ERROR");

      // Create valid action
      const prisma = getPrisma();
      const action = await prisma.actionTaken.create({
        data: {
          ticketId: ticket.id,
          description: "Action for long note patch test",
          result: "Result",
          performedById: staffAlice.id,
          followUpRequired: true,
          followUpNote: "Valid follow up note",
          version: 1,
        },
      });

      // PATCH with overly long followUpNote
      const patchRes = await request(app)
        .patch(`/api/actions/${action.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", staffAlice.cookie)
        .set("X-CSRF-Token", staffAlice.csrfToken)
        .send({
          expectedVersion: 1,
          followUpNote: longNote,
        });

      expect(patchRes.status).toBe(400);
      expect(patchRes.body.error).toBe("VALIDATION_ERROR");
    });
  });
});
