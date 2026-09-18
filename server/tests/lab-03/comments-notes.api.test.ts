import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getAuthSessionForUser } from "../helpers/auth.js";

describe("P10: Communications & Requester Indication (T34–T38 / AC-34–AC-38 / MSG-01)", () => {
  const allowedOrigin = process.env.APP_ORIGIN || "http://localhost:5173";
  let staffSession: { id: number; cookie: string; csrfToken: string };
  let adminSession: { id: number; cookie: string; csrfToken: string };
  let requesterSession: { id: number; cookie: string; csrfToken: string };
  let otherRequesterSession: { id: number; cookie: string; csrfToken: string };
  let categoryId: number;
  let relatedSystemId: number;
  const createdTicketIds: number[] = [];

  afterAll(async () => {
    const prisma = getPrisma();
    if (createdTicketIds.length > 0) {
      await prisma.publicComment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.internalNote.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
  });

  beforeEach(async () => {
    const prisma = getPrisma();

    // Staff
    let staffUser = await prisma.user.findFirst({ where: { email: "staff.alice@example.com" } });
    if (!staffUser) {
      staffUser = await prisma.user.create({
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
      staffUser = await prisma.user.update({
        where: { id: staffUser.id },
        data: { active: true, role: "IT_STAFF", mustChangePassword: false },
      });
    }

    // Admin
    let adminUser = await prisma.user.findFirst({ where: { role: "ADMINISTRATOR" } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          name: "System Admin",
          email: "admin.super@example.com",
          role: "ADMINISTRATOR",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else {
      adminUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: { active: true, mustChangePassword: false },
      });
    }

    // Requester A
    let reqUserA = await prisma.user.findFirst({ where: { email: "jennifer.anderson@example.com" } });
    if (!reqUserA) {
      reqUserA = await prisma.user.create({
        data: {
          name: "Jennifer Anderson",
          email: "jennifer.anderson@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else {
      reqUserA = await prisma.user.update({
        where: { id: reqUserA.id },
        data: { active: true, role: "REQUESTER", mustChangePassword: false },
      });
    }

    // Requester B (Other requester)
    let reqUserB = await prisma.user.findFirst({ where: { email: "michael.brown@example.com" } });
    if (!reqUserB) {
      reqUserB = await prisma.user.create({
        data: {
          name: "Michael Brown",
          email: "michael.brown@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else {
      reqUserB = await prisma.user.update({
        where: { id: reqUserB.id },
        data: { active: true, role: "REQUESTER", mustChangePassword: false },
      });
    }

    // Get categories & systems
    const cat = await prisma.category.findFirst();
    categoryId = cat ? cat.id : (await prisma.category.create({ data: { name: "Network Comm" } })).id;
    const sys = await prisma.relatedSystem.findFirst();
    relatedSystemId = sys ? sys.id : (await prisma.relatedSystem.create({ data: { name: "VPN Comm" } })).id;

    // Create session helpers
    const sSession = await getAuthSessionForUser(staffUser.id);
    staffSession = { id: staffUser.id, cookie: sSession.cookie, csrfToken: sSession.csrfToken };

    const aSession = await getAuthSessionForUser(adminUser.id);
    adminSession = { id: adminUser.id, cookie: aSession.cookie, csrfToken: aSession.csrfToken };

    const rSessionA = await getAuthSessionForUser(reqUserA.id);
    requesterSession = { id: reqUserA.id, cookie: rSessionA.cookie, csrfToken: rSessionA.csrfToken };

    const rSessionB = await getAuthSessionForUser(reqUserB.id);
    otherRequesterSession = { id: reqUserB.id, cookie: rSessionB.cookie, csrfToken: rSessionB.csrfToken };
  });

  // T34 / AC-34: Problem Appears Resolved
  it("T34 / AC-34: Requester 'Problem Appears Resolved' records timestamp/actor without changing formal status; idempotent", async () => {
    const prisma = getPrisma();

    // Create ticket owned by requesterSession in OPEN status
    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        summary: "VPN is dropping connection periodically",
        description: "Happens every 30 minutes",
        categoryId,
        relatedSystemId,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "OPEN",
        requesterId: requesterSession.id,
        version: 1,
      },
    });
    createdTicketIds.push(ticket.id);

    // 1. Staff or Admin trying to indicate appears-resolved returns 403
    const staffRes = await request(app)
      .post(`/api/tickets/${ticket.id}/appears-resolved`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffSession.cookie)
      .set("X-CSRF-Token", staffSession.csrfToken);
    expect(staffRes.status).toBe(403);
    expect(staffRes.body.error).toBe("FORBIDDEN");

    // 2. Foreign requester returns 404 (non-disclosure)
    const foreignRes = await request(app)
      .post(`/api/tickets/${ticket.id}/appears-resolved`)
      .set("Origin", allowedOrigin)
      .set("Cookie", otherRequesterSession.cookie)
      .set("X-CSRF-Token", otherRequesterSession.csrfToken);
    expect(foreignRes.status).toBe(404);

    // 3. Own requester indicates problem appears resolved
    const successRes = await request(app)
      .post(`/api/tickets/${ticket.id}/appears-resolved`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterSession.cookie)
      .set("X-CSRF-Token", requesterSession.csrfToken);

    expect(successRes.status).toBe(200);
    expect(successRes.body.id).toBe(ticket.id);
    expect(successRes.body.appearsResolvedAt).toBeTruthy();
    expect(successRes.body.appearsResolvedById).toBe(requesterSession.id);
    expect(successRes.body.currentStatus).toBe("OPEN"); // Formal status remains unchanged!
    expect(successRes.body.version).toBe(2);

    // 4. Duplicate call is idempotent: retains original actor/time/version
    const dupRes = await request(app)
      .post(`/api/tickets/${ticket.id}/appears-resolved`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterSession.cookie)
      .set("X-CSRF-Token", requesterSession.csrfToken);

    expect(dupRes.status).toBe(200);
    expect(dupRes.body.appearsResolvedAt).toBe(successRes.body.appearsResolvedAt);
    expect(dupRes.body.appearsResolvedById).toBe(requesterSession.id);
    expect(dupRes.body.version).toBe(2); // No extra increment on duplicate

    // 5. Check disallowed status: CANCELLED, RESOLVED, CLOSED returns 400 INVALID_TRANSITION
    const closedTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        summary: "Already closed ticket",
        description: "Cannot indicate resolution",
        categoryId,
        relatedSystemId,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "CLOSED",
        requesterId: requesterSession.id,
        version: 1,
      },
    });
    createdTicketIds.push(closedTicket.id);

    const invalidRes = await request(app)
      .post(`/api/tickets/${closedTicket.id}/appears-resolved`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterSession.cookie)
      .set("X-CSRF-Token", requesterSession.csrfToken);

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error).toBe("INVALID_TRANSITION");
  });

  // T35 / AC-35: Public Comments Access & Creation
  it("T35 / AC-35: Public comments are readable by own Requester, Staff, Admin; creatable by Requester and Staff", async () => {
    const prisma = getPrisma();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        summary: "Monitor display issues",
        description: "Flickering screen",
        categoryId,
        relatedSystemId,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "IN_PROGRESS",
        requesterId: requesterSession.id,
        version: 1,
      },
    });
    createdTicketIds.push(ticket.id);

    // 1. Requester posts a comment
    const reqPostRes = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterSession.cookie)
      .set("X-CSRF-Token", requesterSession.csrfToken)
      .send({ content: "I tried replugging the HDMI cable but it still flickers." });

    expect(reqPostRes.status).toBe(201);
    expect(reqPostRes.body.ticketId).toBe(ticket.id);
    expect(reqPostRes.body.content).toBe("I tried replugging the HDMI cable but it still flickers.");
    expect(reqPostRes.body.author.id).toBe(requesterSession.id);
    expect(reqPostRes.body.author.role).toBe("REQUESTER");

    // 2. Staff posts a comment
    const staffPostRes = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffSession.cookie)
      .set("X-CSRF-Token", staffSession.csrfToken)
      .send({ content: "Thanks for checking. We will bring a replacement cable to test." });

    expect(staffPostRes.status).toBe(201);
    expect(staffPostRes.body.author.id).toBe(staffSession.id);
    expect(staffPostRes.body.author.role).toBe("IT_STAFF");

    // 3. Admin attempting to POST a comment is rejected with 403 (Admin is read-only)
    const adminPostRes = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set("Origin", allowedOrigin)
      .set("Cookie", adminSession.cookie)
      .set("X-CSRF-Token", adminSession.csrfToken)
      .send({ content: "Admin trying to comment" });

    expect(adminPostRes.status).toBe(403);
    expect(adminPostRes.body.error).toBe("FORBIDDEN");

    // 4. GET comments by Requester (own)
    const reqGetRes = await request(app)
      .get(`/api/tickets/${ticket.id}/comments`)
      .set("Cookie", requesterSession.cookie);
    expect(reqGetRes.status).toBe(200);
    expect(reqGetRes.body.data).toHaveLength(2);

    // 5. GET comments by Staff
    const staffGetRes = await request(app)
      .get(`/api/tickets/${ticket.id}/comments`)
      .set("Cookie", staffSession.cookie);
    expect(staffGetRes.status).toBe(200);
    expect(staffGetRes.body.data).toHaveLength(2);

    // 6. GET comments by Admin
    const adminGetRes = await request(app)
      .get(`/api/tickets/${ticket.id}/comments`)
      .set("Cookie", adminSession.cookie);
    expect(adminGetRes.status).toBe(200);
    expect(adminGetRes.body.data).toHaveLength(2);

    // 7. GET comments by Foreign Requester returns 404 (non-disclosure)
    const foreignGetRes = await request(app)
      .get(`/api/tickets/${ticket.id}/comments`)
      .set("Cookie", otherRequesterSession.cookie);
    expect(foreignGetRes.status).toBe(404);
  });

  // T36 / AC-36: Internal Notes Access & Isolation
  it("T36 / AC-36: Internal notes are readable by IT Staff and Admin, creatable only by IT Staff, and completely hidden from Requester", async () => {
    const prisma = getPrisma();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        summary: "Printer toner leaking",
        description: "Black toner on tray",
        categoryId,
        relatedSystemId,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "OPEN",
        requesterId: requesterSession.id,
        version: 1,
      },
    });
    createdTicketIds.push(ticket.id);

    // 1. Staff creates internal note
    const staffCreateRes = await request(app)
      .post(`/api/tickets/${ticket.id}/internal-notes`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffSession.cookie)
      .set("X-CSRF-Token", staffSession.csrfToken)
      .send({ content: "Spoke with vendor warranty team. Model X500 has known cartridge seal flaw." });

    expect(staffCreateRes.status).toBe(201);
    expect(staffCreateRes.body.ticketId).toBe(ticket.id);
    expect(staffCreateRes.body.content).toContain("vendor warranty team");
    expect(staffCreateRes.body.author.id).toBe(staffSession.id);

    // 2. Admin attempting to POST internal note is rejected with 403 (Admin read-only)
    const adminCreateRes = await request(app)
      .post(`/api/tickets/${ticket.id}/internal-notes`)
      .set("Origin", allowedOrigin)
      .set("Cookie", adminSession.cookie)
      .set("X-CSRF-Token", adminSession.csrfToken)
      .send({ content: "Admin note attempt" });

    expect(adminCreateRes.status).toBe(403);
    expect(adminCreateRes.body.error).toBe("FORBIDDEN");

    // 3. Requester attempting to POST internal note receives 403
    const reqCreateRes = await request(app)
      .post(`/api/tickets/${ticket.id}/internal-notes`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterSession.cookie)
      .set("X-CSRF-Token", requesterSession.csrfToken)
      .send({ content: "Requester note attempt" });

    expect(reqCreateRes.status).toBe(403);
    expect(reqCreateRes.body.error).toBe("FORBIDDEN");

    // 4. Requester attempting to GET internal notes receives 403 (zero leak)
    const reqGetRes = await request(app)
      .get(`/api/tickets/${ticket.id}/internal-notes`)
      .set("Cookie", requesterSession.cookie);

    expect(reqGetRes.status).toBe(403);
    expect(reqGetRes.body.error).toBe("FORBIDDEN");
    expect(reqGetRes.body.data).toBeUndefined();

    // 5. Staff GET internal notes returns 200
    const staffGetRes = await request(app)
      .get(`/api/tickets/${ticket.id}/internal-notes`)
      .set("Cookie", staffSession.cookie);

    expect(staffGetRes.status).toBe(200);
    expect(staffGetRes.body.data).toHaveLength(1);
    expect(staffGetRes.body.data[0].content).toContain("warranty team");

    // 6. Admin GET internal notes returns 200
    const adminGetRes = await request(app)
      .get(`/api/tickets/${ticket.id}/internal-notes`)
      .set("Cookie", adminSession.cookie);

    expect(adminGetRes.status).toBe(200);
    expect(adminGetRes.body.data).toHaveLength(1);
  });

  // T37 / AC-37: Append-only Enforcement (405 Method Not Allowed)
  it("T37 / AC-37: Comments and notes are strictly append-only; PUT, PATCH, DELETE are rejected with 405", async () => {
    const prisma = getPrisma();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        summary: "Software license expiring",
        description: "AutoCAD license",
        categoryId,
        relatedSystemId,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "OPEN",
        requesterId: requesterSession.id,
        version: 1,
      },
    });
    createdTicketIds.push(ticket.id);

    // 1. Comments collection: PUT, PATCH, DELETE return 405 with Allow header
    const putCommentRes = await request(app)
      .put(`/api/tickets/${ticket.id}/comments`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffSession.cookie)
      .set("X-CSRF-Token", staffSession.csrfToken)
      .send({ content: "test" });

    expect(putCommentRes.status).toBe(405);
    expect(putCommentRes.headers["allow"]).toBe("GET, POST");
    expect(putCommentRes.body.error).toBe("METHOD_NOT_ALLOWED");

    const deleteCommentRes = await request(app)
      .delete(`/api/tickets/${ticket.id}/comments/1`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffSession.cookie)
      .set("X-CSRF-Token", staffSession.csrfToken);

    expect(deleteCommentRes.status).toBe(405);
    expect(deleteCommentRes.headers["allow"]).toBe("GET, POST");

    // 2. Internal notes collection: Staff PUT, PATCH, DELETE return 405
    const patchNoteRes = await request(app)
      .patch(`/api/tickets/${ticket.id}/internal-notes`)
      .set("Origin", allowedOrigin)
      .set("Cookie", staffSession.cookie)
      .set("X-CSRF-Token", staffSession.csrfToken)
      .send({ content: "test" });

    expect(patchNoteRes.status).toBe(405);
    expect(patchNoteRes.headers["allow"]).toBe("GET, POST");

    // 3. Internal notes: Requester PUT/PATCH/DELETE returns 403 (Requester notes always 403 per spec)
    const reqPutNoteRes = await request(app)
      .put(`/api/tickets/${ticket.id}/internal-notes`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterSession.cookie)
      .set("X-CSRF-Token", requesterSession.csrfToken)
      .send({ content: "test" });

    expect(reqPutNoteRes.status).toBe(403);
    expect(reqPutNoteRes.body.error).toBe("FORBIDDEN");
  });

  // T38 / AC-38 & MSG-01: Content validation, sanitization, and reject spoofed fields
  it("T38 / AC-38 & MSG-01: Validates length (1-2000), trims content, rejects spoofed author/time, renders safe text", async () => {
    const prisma = getPrisma();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        summary: "Security badge reader offline",
        description: "North entrance",
        categoryId,
        relatedSystemId,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "IN_PROGRESS",
        requesterId: requesterSession.id,
        version: 1,
      },
    });
    createdTicketIds.push(ticket.id);

    // 1. Empty string or whitespace-only returns 400
    const emptyRes = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterSession.cookie)
      .set("X-CSRF-Token", requesterSession.csrfToken)
      .send({ content: "    " });

    expect(emptyRes.status).toBe(400);
    expect(emptyRes.body.error).toBe("VALIDATION_ERROR");

    // 2. Content exceeding 2000 characters returns 400
    const tooLong = "A".repeat(2001);
    const longRes = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterSession.cookie)
      .set("X-CSRF-Token", requesterSession.csrfToken)
      .send({ content: tooLong });

    expect(longRes.status).toBe(400);
    expect(longRes.body.error).toBe("VALIDATION_ERROR");

    // 3. Exactly 2000 characters passes
    const exact2000 = "B".repeat(2000);
    const exactRes = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterSession.cookie)
      .set("X-CSRF-Token", requesterSession.csrfToken)
      .send({ content: exact2000 });

    expect(exactRes.status).toBe(201);
    expect(exactRes.body.content.length).toBe(2000);

    // 4. Reject spoofed author or timestamp
    const spoofRes = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterSession.cookie)
      .set("X-CSRF-Token", requesterSession.csrfToken)
      .send({
        content: "Valid comment text",
        author: { id: 999, name: "Hacker" },
        createdAt: "2020-01-01T00:00:00.000Z",
      });

    expect(spoofRes.status).toBe(400);
    expect(spoofRes.body.error).toBe("VALIDATION_ERROR");

    // 5. XSS string preserved as plain text without execution
    const xssPayload = "<script>alert('xss')</script><img src=x onerror=alert(1)>";
    const xssRes = await request(app)
      .post(`/api/tickets/${ticket.id}/comments`)
      .set("Origin", allowedOrigin)
      .set("Cookie", requesterSession.cookie)
      .set("X-CSRF-Token", requesterSession.csrfToken)
      .send({ content: xssPayload });

    expect(xssRes.status).toBe(201);
    expect(xssRes.body.content).toBe(xssPayload); // Kept as verbatim raw text for client safe rendering

    // 6. Comments ordering: createdAt then id ascending
    const listRes = await request(app)
      .get(`/api/tickets/${ticket.id}/comments`)
      .set("Cookie", requesterSession.cookie);

    expect(listRes.status).toBe(200);
    const comments = listRes.body.data;
    expect(comments.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < comments.length; i++) {
      const prevTime = new Date(comments[i - 1].createdAt).getTime();
      const currTime = new Date(comments[i].createdAt).getTime();
      expect(currTime).toBeGreaterThanOrEqual(prevTime);
      if (currTime === prevTime) {
        expect(comments[i].id).toBeGreaterThan(comments[i - 1].id);
      }
    }
  });
});
