import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import fs from "node:fs";
import path from "node:path";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getUploadDir } from "../../src/services/attachmentStorage.js";
import { Priority, TicketStatus } from "@prisma/client";

describe("Attachment Lifecycle API (API-07, API-08, API-09, API-10, API-12, API-13, API-14, AC-11, AC-13, AC-14, AC-15)", () => {
  let requesterAId: number;
  let requesterBId: number;
  let inactiveRequesterId: number;
  let ticketAId: number;
  let ticketBId: number;
  const createdAttachmentIds: number[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst({ where: { active: true } });

    if (!category || !system) {
      throw new Error("Seeded test data missing for Attachment API tests");
    }

    // Create dedicated isolated test requesters so other test suites running in parallel don't collide
    const userA = await prisma.requesterUser.create({
      data: {
        name: "Attachment Tester A",
        email: `att-tester-a-${Date.now()}@example.com`,
        active: true,
      },
    });
    const userB = await prisma.requesterUser.create({
      data: {
        name: "Attachment Tester B",
        email: `att-tester-b-${Date.now()}@example.com`,
        active: true,
      },
    });
    const inactiveUser = await prisma.requesterUser.create({
      data: {
        name: "Attachment Inactive Tester",
        email: `att-inactive-${Date.now()}@example.com`,
        active: false,
      },
    });

    requesterAId = userA.id;
    requesterBId = userB.id;
    inactiveRequesterId = inactiveUser.id;

    // Create ticket for requester A
    const ticketA = await prisma.ticket.create({
      data: {
        ticketNumber: `TMP-ATT-A-${Date.now()}`,
        requesterId: requesterAId,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: "Attachment test ticket A",
        description: "Testing attachments lifecycle for Requester A",
        requestedPriority: Priority.MEDIUM,
        currentStatus: TicketStatus.NEW,
      },
    });
    ticketAId = ticketA.id;

    // Create ticket for requester B
    const ticketB = await prisma.ticket.create({
      data: {
        ticketNumber: `TMP-ATT-B-${Date.now()}`,
        requesterId: requesterBId,
        categoryId: category.id,
        relatedSystemId: system.id,
        summary: "Attachment test ticket B",
        description: "Testing attachments lifecycle for Requester B",
        requestedPriority: Priority.LOW,
        currentStatus: TicketStatus.NEW,
      },
    });
    ticketBId = ticketB.id;
  });

  afterAll(async () => {
    const prisma = getPrisma();
    const uploadDir = getUploadDir();

    // Fetch stored filenames to clean up files on disk
    if (createdAttachmentIds.length > 0) {
      const attachments = await prisma.attachment.findMany({
        where: { id: { in: createdAttachmentIds } },
      });
      for (const att of attachments) {
        const filePath = path.join(uploadDir, att.storedFilename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch {
            // ignore cleanup errors
          }
        }
      }
      await prisma.attachment.deleteMany({
        where: { id: { in: createdAttachmentIds } },
      });
    }

    // Delete test tickets
    await prisma.ticket.deleteMany({
      where: { id: { in: [ticketAId, ticketBId] } },
    });

    // Delete dedicated test requesters
    await prisma.requesterUser.deleteMany({
      where: { id: { in: [requesterAId, requesterBId, inactiveRequesterId] } },
    });
  });

  describe("POST /api/tickets/:id/attachments (Upload)", () => {
    it("API-07 / AC-11: uploads a valid 1 MB PNG and returns 201 with attachment metadata", async () => {
      // 1 MB buffer of dummy PNG bytes
      const oneMbBuffer = Buffer.alloc(1024 * 1024, 0x89);

      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .query({ requesterId: requesterAId })
        .attach("file", oneMbBuffer, {
          filename: "screenshot.png",
          contentType: "image/png",
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("id");
      expect(res.body.originalName).toBe("screenshot.png");
      expect(res.body.mimeType).toBe("image/png");
      expect(res.body.sizeBytes).toBe(1024 * 1024);
      expect(res.body.uploadedAt).toBeDefined();
      expect(res.body.removedAt).toBeNull();
      expect(res.body.removalReason).toBeNull();
      expect(res.body.storedFilename).toBeUndefined(); // Stored filename must not leak

      createdAttachmentIds.push(res.body.id);

      // Verify file is saved in upload directory with a UUID-based name (not original name)
      const prisma = getPrisma();
      const saved = await prisma.attachment.findUnique({ where: { id: res.body.id } });
      expect(saved).not.toBeNull();
      expect(saved?.storedFilename).not.toBe("screenshot.png");
      expect(saved?.storedFilename).toMatch(/^[0-9a-f-]+\.png$/);

      const filePath = path.join(getUploadDir(), saved!.storedFilename);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.statSync(filePath).size).toBe(1024 * 1024);
    });

    it("rejects unsupported file type (.exe) with 400 UNSUPPORTED_TYPE", async () => {
      const exeBuffer = Buffer.from("MZ dummy executable content");

      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .query({ requesterId: requesterAId })
        .attach("file", exeBuffer, {
          filename: "malware.exe",
          contentType: "application/x-msdownload",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("UNSUPPORTED_TYPE");
    });

    it("rejects mismatched MIME type with 400 UNSUPPORTED_TYPE", async () => {
      const textBuffer = Buffer.from("plain text spoofing png");

      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .query({ requesterId: requesterAId })
        .attach("file", textBuffer, {
          filename: "fake.png",
          contentType: "text/plain",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("UNSUPPORTED_TYPE");
    });

    it("rejects file exceeding 5 MB limit with 400 FILE_TOO_LARGE", async () => {
      // 5 MB + 100 bytes
      const bigBuffer = Buffer.alloc(5 * 1024 * 1024 + 100, 0x25);

      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .query({ requesterId: requesterAId })
        .attach("file", bigBuffer, {
          filename: "huge.pdf",
          contentType: "application/pdf",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("FILE_TOO_LARGE");
    });

    it("returns 400 NO_FILE when no file is attached", async () => {
      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .query({ requesterId: requesterAId });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("NO_FILE");
    });

    it("returns 404 when uploading to a ticket owned by another requester", async () => {
      const buffer = Buffer.from("test content");

      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .query({ requesterId: requesterBId })
        .attach("file", buffer, {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });

    it("returns 400 BAD_REQUESTER when requester is inactive", async () => {
      const buffer = Buffer.from("test content");

      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .query({ requesterId: inactiveRequesterId })
        .attach("file", buffer, {
          filename: "test.jpg",
          contentType: "image/jpeg",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("BAD_REQUESTER");
    });

    it("API-08 / AC-13: uploading a 6th active attachment returns 409 ATTACHMENT_LIMIT", async () => {
      // Currently ticketA has 1 attachment. Upload 4 more to reach 5 active attachments.
      for (let i = 2; i <= 5; i++) {
        const buf = Buffer.from(`Attachment ${i} content`);
        const res = await request(app)
          .post(`/api/tickets/${ticketAId}/attachments`)
          .query({ requesterId: requesterAId })
          .attach("file", buf, {
            filename: `file${i}.png`,
            contentType: "image/png",
          });

        expect(res.status).toBe(201);
        createdAttachmentIds.push(res.body.id);
      }

      // 6th upload should be rejected
      const sixthBuf = Buffer.from("Sixth attachment content");
      const res6 = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .query({ requesterId: requesterAId })
        .attach("file", sixthBuf, {
          filename: "file6.png",
          contentType: "image/png",
        });

      expect(res6.status).toBe(409);
      expect(res6.body.error).toBe("ATTACHMENT_LIMIT");
    });
  });

  describe("DELETE /api/attachments/:id (Soft-Remove)", () => {
    it("API-14 / AC-03, BR-13: returns 404 when removing an attachment belonging to a different requester", async () => {
      const targetId = createdAttachmentIds[0];

      const res = await request(app)
        .delete(`/api/attachments/${targetId}`)
        .query({ requesterId: requesterBId })
        .send({ reason: "Attempting unauthorized removal" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");

      // Verify attachment was NOT removed
      const prisma = getPrisma();
      const att = await prisma.attachment.findUnique({ where: { id: targetId } });
      expect(att?.removedAt).toBeNull();
    });

    it("rejects empty or missing removal reason with 400 REASON_REQUIRED", async () => {
      const targetId = createdAttachmentIds[0];

      const resNoReason = await request(app)
        .delete(`/api/attachments/${targetId}`)
        .query({ requesterId: requesterAId })
        .send({});

      expect(resNoReason.status).toBe(400);
      expect(resNoReason.body.error).toBe("REASON_REQUIRED");

      const resBlankReason = await request(app)
        .delete(`/api/attachments/${targetId}`)
        .query({ requesterId: requesterAId })
        .send({ reason: "   " });

      expect(resBlankReason.status).toBe(400);
      expect(resBlankReason.body.error).toBe("REASON_REQUIRED");
    });

    it("rejects reason longer than 500 characters with 400 REASON_REQUIRED", async () => {
      const targetId = createdAttachmentIds[0];

      const res = await request(app)
        .delete(`/api/attachments/${targetId}`)
        .query({ requesterId: requesterAId })
        .send({ reason: "A".repeat(501) });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("REASON_REQUIRED");
    });

    it("API-09 / AC-14: soft-removes attachment with reason, returning 200 and setting removedAt/removalReason", async () => {
      const targetId = createdAttachmentIds[0];

      const res = await request(app)
        .delete(`/api/attachments/${targetId}`)
        .query({ requesterId: requesterAId })
        .send({ reason: "Obsolete screenshot replaced by log file" });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(targetId);
      expect(res.body.removedAt).not.toBeNull();
      expect(res.body.removalReason).toBe("Obsolete screenshot replaced by log file");

      // Verify DB row still exists (never physically deleted)
      const prisma = getPrisma();
      const dbRecord = await prisma.attachment.findUnique({ where: { id: targetId } });
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.removedAt).not.toBeNull();
      expect(dbRecord?.removalReason).toBe("Obsolete screenshot replaced by log file");
    });

    it("returns 409 ALREADY_REMOVED when attempting to soft-remove an already removed attachment", async () => {
      const targetId = createdAttachmentIds[0];

      const res = await request(app)
        .delete(`/api/attachments/${targetId}`)
        .query({ requesterId: requesterAId })
        .send({ reason: "Removing again" });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("ALREADY_REMOVED");
    });

    it("soft-removed attachment frees up quota towards the 5-file active limit", async () => {
      // With attachment 0 removed, active count is now 4.
      // We should now be able to upload a new 5th active attachment.
      const newBuf = Buffer.from("New 5th attachment content");
      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .query({ requesterId: requesterAId })
        .attach("file", newBuf, {
          filename: "replacement.webp",
          contentType: "image/webp",
        });

      expect(res.status).toBe(201);
      createdAttachmentIds.push(res.body.id);
    });
  });

  describe("GET /api/attachments/:id (Metadata)", () => {
    it("API-12 / AC-03, BR-13: returns 404 when accessing attachment metadata belonging to a different requester", async () => {
      const targetId = createdAttachmentIds[0];

      const res = await request(app)
        .get(`/api/attachments/${targetId}`)
        .query({ requesterId: requesterBId });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
      expect(res.body.originalName).toBeUndefined();
    });

    it("returns 200 with metadata for active attachment when accessed by owner", async () => {
      // createdAttachmentIds[1] is active
      const targetId = createdAttachmentIds[1];

      const res = await request(app)
        .get(`/api/attachments/${targetId}`)
        .query({ requesterId: requesterAId });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(targetId);
      expect(res.body.originalName).toBe("file2.png");
      expect(res.body.mimeType).toBe("image/png");
      expect(res.body.removedAt).toBeNull();
      expect(res.body.removalReason).toBeNull();
      expect(res.body.storedFilename).toBeUndefined();
    });

    it("returns 200 with metadata for soft-removed attachment (metadata remains visible)", async () => {
      // createdAttachmentIds[0] was soft-removed
      const targetId = createdAttachmentIds[0];

      const res = await request(app)
        .get(`/api/attachments/${targetId}`)
        .query({ requesterId: requesterAId });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(targetId);
      expect(res.body.originalName).toBe("screenshot.png");
      expect(res.body.removedAt).not.toBeNull();
      expect(res.body.removalReason).toBe("Obsolete screenshot replaced by log file");
    });
  });

  describe("GET /api/attachments/:id/download (Download)", () => {
    it("API-13 / AC-03, BR-13: returns 404 when downloading an attachment belonging to a different requester", async () => {
      const activeId = createdAttachmentIds[1];

      const res = await request(app)
        .get(`/api/attachments/${activeId}/download`)
        .query({ requesterId: requesterBId });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });

    it("API-10 / AC-15: returns 404 on a soft-removed attachment (indistinguishable from non-existent)", async () => {
      const removedId = createdAttachmentIds[0];

      const res = await request(app)
        .get(`/api/attachments/${removedId}/download`)
        .query({ requesterId: requesterAId });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });

    it("downloads active attachment successfully with safe Content-Disposition and correct headers", async () => {
      const activeId = createdAttachmentIds[1];

      const res = await request(app)
        .get(`/api/attachments/${activeId}/download`)
        .query({ requesterId: requesterAId });

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toBe("image/png");
      expect(res.headers["content-disposition"]).toContain("attachment;");
      expect(res.headers["content-disposition"]).toContain("file2.png");
      expect(res.body.length).toBeGreaterThan(0);
    });

    it("returns 404 when attachment ID does not exist", async () => {
      const res = await request(app)
        .get("/api/attachments/999999/download")
        .query({ requesterId: requesterAId });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("NOT_FOUND");
    });
  });
});
