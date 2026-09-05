import express, { Request, Response } from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { Priority, TicketStatus, Prisma } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { formatTicketNumber } from "./services/ticketNumber.js";
import {
  upload,
  deleteFileFromStorage,
  getUploadDir,
  resolveSafeFilePath,
  validateFileContent,
} from "./services/attachmentStorage.js";

export const app = express();

/**
 * Extract requesterId from header (X-Requester-Id), query, or body
 * Supports peer review contract compatibility
 */
export function extractRequesterId(req: Request): string | undefined {
  const headerVal = req.headers["x-requester-id"];
  if (typeof headerVal === "string" && headerVal.trim().length > 0) {
    return headerVal.trim();
  }
  if (Array.isArray(headerVal) && headerVal[0]) {
    return headerVal[0].trim();
  }
  if (typeof req.query.requesterId === "string" && req.query.requesterId.trim().length > 0) {
    return req.query.requesterId.trim();
  }
  if (req.body && typeof req.body.requesterId !== "undefined") {
    return String(req.body.requesterId).trim();
  }
  return undefined;
}

app.use(cors());
app.use(express.json());

// Health Check
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// Categories
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch {
    res.status(500).json({ error: "Unable to load categories" });
  }
});

// Related Systems
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { active: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(systems);
  } catch {
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to load related systems" });
  }
});

// Requesters (active only)
app.get("/api/requesters", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(requesters);
  } catch {
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to load requesters" });
  }
});

// List Tickets (My Tickets)
app.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    const requesterId = extractRequesterId(req);
    const {
      search,
      categoryId,
      requestedPriority,
      priority,
      itPriority,
      status,
      sort,
      order,
      page,
      pageSize,
    } = req.query;

    const numRequesterId = Number(requesterId);
    if (!requesterId || !Number.isInteger(numRequesterId)) {
      res.status(400).json({
        error: "MISSING_REQUESTER",
        message: "requesterId is required",
      });
      return;
    }

    const prisma = getPrisma();

    // Check active requester
    const activeRequester = await prisma.requesterUser.findFirst({
      where: {
        id: numRequesterId,
        active: true,
      },
      select: { id: true },
    });

    if (!activeRequester) {
      res.status(400).json({
        error: "BAD_REQUESTER",
        message: "Invalid or inactive requester",
      });
      return;
    }

    // Ownership scoped filter
    const where: Prisma.TicketWhereInput = {
      requesterId: numRequesterId,
    };

    // Search filter: case-insensitive substring on ticketNumber OR summary
    if (typeof search === "string" && search.trim().length > 0) {
      const trimmedSearch = search.trim();
      where.OR = [
        { ticketNumber: { contains: trimmedSearch, mode: "insensitive" } },
        { summary: { contains: trimmedSearch, mode: "insensitive" } },
      ];
    }

    // Category filter
    if (categoryId !== undefined && categoryId !== "") {
      const numCategoryId = Number(categoryId);
      if (Number.isInteger(numCategoryId)) {
        where.categoryId = numCategoryId;
      }
    }

    // Priority filter (supports requestedPriority, priority, and itPriority)
    const rawPriority = requestedPriority || priority || itPriority;
    if (
      typeof rawPriority === "string" &&
      Object.values(Priority).includes(rawPriority as Priority)
    ) {
      where.requestedPriority = rawPriority as Priority;
    }

    // Status filter
    if (
      typeof status === "string" &&
      Object.values(TicketStatus).includes(status as TicketStatus)
    ) {
      where.currentStatus = status as TicketStatus;
    }

    // Deterministic sort: primary sort + secondary sort by id
    const validSorts = [
      "createdAt",
      "updatedAt",
      "ticketNumber",
      "requestedPriority",
      "currentStatus",
      "summary",
    ];
    const sortField =
      typeof sort === "string" && validSorts.includes(sort)
        ? sort
        : "createdAt";
    const sortOrder: Prisma.SortOrder = order === "asc" ? "asc" : "desc";

    const orderBy: Prisma.TicketOrderByWithRelationInput[] = [
      { [sortField]: sortOrder },
      { id: sortOrder },
    ];

    // Pagination (strictly validate full digits to avoid parseInt("2abc") returning 2)
    let parsedPage = 1;
    if (typeof page === "string" && /^\d+$/.test(page.trim())) {
      parsedPage = parseInt(page.trim(), 10);
      if (parsedPage < 1) parsedPage = 1;
    }

    let parsedPageSize = 10;
    if (typeof pageSize === "string" && /^\d+$/.test(pageSize.trim())) {
      parsedPageSize = parseInt(pageSize.trim(), 10);
      if (parsedPageSize < 1) parsedPageSize = 10;
      else if (parsedPageSize > 50) parsedPageSize = 50;
    }

    const [total, unfilteredTotal] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: { requesterId: numRequesterId } }),
    ]);

    const totalPages = Math.ceil(total / parsedPageSize);
    if (totalPages > 0) {
      parsedPage = Math.min(parsedPage, totalPages);
    }

    const tickets = await prisma.ticket.findMany({
      where,
      orderBy,
      skip: (parsedPage - 1) * parsedPageSize,
      take: parsedPageSize,
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    const data = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      ticketNo: t.ticketNumber,
      summary: t.summary,
      category: t.category.name,
      requestedPriority: t.requestedPriority,
      currentStatus: t.currentStatus,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));

    res.status(200).json({
      data,
      page: parsedPage,
      pageSize: parsedPageSize,
      total,
      totalPages,
      unfilteredTotal,
    });
  } catch {
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to load tickets" });
  }
});

// Ticket Detail (owned only)
app.get("/api/tickets/:id", async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    const requesterId = extractRequesterId(req);

    if (!Number.isInteger(ticketId)) {
      res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
      return;
    }

    const numRequesterId = Number(requesterId);
    if (!requesterId || !Number.isInteger(numRequesterId)) {
      res.status(400).json({
        error: "MISSING_REQUESTER",
        message: "requesterId is required",
      });
      return;
    }

    const prisma = getPrisma();

    // Check active requester
    const activeRequester = await prisma.requesterUser.findFirst({
      where: {
        id: numRequesterId,
        active: true,
      },
      select: { id: true },
    });

    if (!activeRequester) {
      res.status(400).json({
        error: "BAD_REQUESTER",
        message: "Invalid or inactive requester",
      });
      return;
    }

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId,
        requesterId: numRequesterId,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        relatedSystem: {
          select: { id: true, name: true },
        },
        attachments: true,
      },
    });

    if (!ticket) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "Ticket not found",
      });
      return;
    }

    res.status(200).json({
      ...ticket,
      ticketNo: ticket.ticketNumber,
    });
  } catch {
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to load ticket detail" });
  }
});

// Create Ticket
app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const requesterId = extractRequesterId(req);
    const {
      categoryId,
      relatedSystemId,
      summary,
      description,
      requestedPriority,
    } = req.body;

    const prisma = getPrisma();
    const fields: Record<string, string> = {};

    // Validate requesterId
    const numRequesterId = Number(requesterId);
    if (!requesterId || !Number.isInteger(numRequesterId)) {
      res.status(400).json({ error: "BAD_REQUESTER", message: "requesterId is required" });
      return;
    }
    const requester = await prisma.requesterUser.findUnique({
      where: { id: numRequesterId },
    });
    if (!requester || !requester.active) {
      res.status(400).json({ error: "BAD_REQUESTER", message: "Invalid or inactive requester" });
      return;
    }

    // Validate categoryId
    const numCategoryId = Number(categoryId);
    if (!categoryId || !Number.isInteger(numCategoryId)) {
      fields.categoryId = "Valid category is required";
    } else {
      const category = await prisma.category.findUnique({
        where: { id: numCategoryId },
      });
      if (!category) {
        fields.categoryId = "Category not found";
      }
    }

    // Validate relatedSystemId
    const numRelatedSystemId = Number(relatedSystemId);
    if (!relatedSystemId || !Number.isInteger(numRelatedSystemId)) {
      fields.relatedSystemId = "Valid related system is required";
    } else {
      const system = await prisma.relatedSystem.findUnique({
        where: { id: numRelatedSystemId },
      });
      if (!system || !system.active) {
        fields.relatedSystemId = "Related system not found or inactive";
      }
    }

    // Validate summary (1-150 chars after trim)
    const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
    if (trimmedSummary.length < 1 || trimmedSummary.length > 150) {
      fields.summary = "Required, 1-150 characters";
    }

    // Validate description (1-2000 chars after trim)
    const trimmedDesc = typeof description === "string" ? description.trim() : "";
    if (trimmedDesc.length < 1 || trimmedDesc.length > 2000) {
      fields.description = "Required, 1-2000 characters";
    }

    // Validate requestedPriority
    if (!requestedPriority || !Object.values(Priority).includes(requestedPriority)) {
      fields.requestedPriority = "Valid requested priority is required (LOW, MEDIUM, HIGH)";
    }

    if (Object.keys(fields).length > 0) {
      res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "One or more fields are invalid",
        fields,
      });
      return;
    }

    // Atomic creation with official Ticket Number
    const ticket = await prisma.$transaction(async (tx) => {
      const provisionalNumber = `TMP-${randomUUID()}`;
      const created = await tx.ticket.create({
        data: {
          ticketNumber: provisionalNumber,
          requesterId: numRequesterId,
          categoryId: numCategoryId,
          relatedSystemId: numRelatedSystemId,
          summary: trimmedSummary,
          description: trimmedDesc,
          requestedPriority: requestedPriority as Priority,
          currentStatus: TicketStatus.NEW,
        },
      });

      const officialNumber = formatTicketNumber(created.id);
      return tx.ticket.update({
        where: { id: created.id },
        data: { ticketNumber: officialNumber },
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          attachments: true,
        },
      });
    });

    res.status(201).json({
      ...ticket,
      ticketNo: ticket.ticketNumber,
    });
  } catch {
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to create ticket" });
  }
});

// Pre-validation middleware for upload: check params, requester, ticket ownership and active count before Multer writes to disk
const validateTicketForUpload = async (req: Request, res: Response, next: express.NextFunction) => {
  try {
    const ticketId = Number(req.params.id);
    const requesterId = extractRequesterId(req);

    if (!Number.isInteger(ticketId)) {
      res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
      return;
    }

    const numRequesterId = Number(requesterId);
    if (!requesterId || !Number.isInteger(numRequesterId)) {
      res.status(400).json({
        error: "MISSING_REQUESTER",
        message: "requesterId is required",
      });
      return;
    }

    const prisma = getPrisma();

    // Check active requester
    const activeRequester = await prisma.requesterUser.findFirst({
      where: { id: numRequesterId, active: true },
      select: { id: true },
    });

    if (!activeRequester) {
      res.status(400).json({
        error: "BAD_REQUESTER",
        message: "Invalid or inactive requester",
      });
      return;
    }

    // Check ticket ownership
    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: numRequesterId },
      select: { id: true },
    });

    if (!ticket) {
      res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
      return;
    }

    // Preliminary check of active attachments limit before disk write
    const activeCount = await prisma.attachment.count({
      where: { ticketId, removedAt: null },
    });

    if (activeCount >= 5) {
      res.status(409).json({
        error: "ATTACHMENT_LIMIT",
        message: "This ticket already has 5 active attachments",
      });
      return;
    }

    next();
  } catch {
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Unable to validate ticket for upload",
    });
  }
};

// Upload Attachment (one file per call, concurrency-safe with row-level lock)
app.post("/api/tickets/:id/attachments", validateTicketForUpload, (req: Request, res: Response) => {
  upload.single("file")(req, res, async (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          error: "FILE_TOO_LARGE",
          message: "File exceeds the 5 MB limit",
        });
        return;
      }
      if (err.message === "UNSUPPORTED_TYPE") {
        res.status(400).json({
          error: "UNSUPPORTED_TYPE",
          message: "Allowed types: JPG, JPEG, PNG, WEBP, PDF",
        });
        return;
      }
      res.status(400).json({
        error: "UPLOAD_ERROR",
        message: err.message || "Failed to upload file",
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        error: "NO_FILE",
        message: "File is required",
      });
      return;
    }

    const filenameToDelete = req.file.filename;

    // Validate file content magic bytes directly from disk (Peer Review: content-based verification)
    const isContentValid = await validateFileContent(
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    if (!isContentValid) {
      await deleteFileFromStorage(filenameToDelete);
      res.status(400).json({
        error: "UNSUPPORTED_TYPE",
        message: "Allowed types: JPG, JPEG, PNG, WEBP, PDF",
      });
      return;
    }

    try {
      const ticketId = Number(req.params.id);
      const prisma = getPrisma();

      // Concurrency-safe: interactive transaction with row-level lock on the Ticket
      const attachment = await prisma.$transaction(async (tx) => {
        // Lock ticket row for update to serialize concurrent uploads for this ticket
        await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;

        const activeCount = await tx.attachment.count({
          where: { ticketId, removedAt: null },
        });

        if (activeCount >= 5) {
          const limitErr = new Error("ATTACHMENT_LIMIT");
          (limitErr as any).code = "ATTACHMENT_LIMIT";
          throw limitErr;
        }

        return tx.attachment.create({
          data: {
            ticketId,
            originalName: req.file!.originalname,
            storedFilename: req.file!.filename,
            mimeType: req.file!.mimetype,
            sizeBytes: req.file!.size,
          },
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            uploadedAt: true,
            removedAt: true,
            removalReason: true,
          },
        });
      });

      res.status(201).json(attachment);
    } catch (dbErr: any) {
      await deleteFileFromStorage(filenameToDelete);
      if (dbErr?.code === "ATTACHMENT_LIMIT" || dbErr?.message === "ATTACHMENT_LIMIT") {
        res.status(409).json({
          error: "ATTACHMENT_LIMIT",
          message: "This ticket already has 5 active attachments",
        });
        return;
      }
      res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Unable to save attachment",
      });
    }
  });
});

// Get Attachment Metadata
app.get("/api/attachments/:id", async (req: Request, res: Response) => {
  try {
    const attachmentId = Number(req.params.id);
    const requesterId = extractRequesterId(req);

    if (!Number.isInteger(attachmentId)) {
      res.status(404).json({ error: "NOT_FOUND", message: "Attachment not found" });
      return;
    }

    const numRequesterId = Number(requesterId);
    if (!requesterId || !Number.isInteger(numRequesterId)) {
      res.status(400).json({
        error: "MISSING_REQUESTER",
        message: "requesterId is required",
      });
      return;
    }

    const prisma = getPrisma();

    // Check active requester
    const activeRequester = await prisma.requesterUser.findFirst({
      where: { id: numRequesterId, active: true },
      select: { id: true },
    });

    if (!activeRequester) {
      res.status(400).json({
        error: "BAD_REQUESTER",
        message: "Invalid or inactive requester",
      });
      return;
    }

    // Ownership check via parent ticket
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        ticket: { requesterId: numRequesterId },
      },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
        removedAt: true,
        removalReason: true,
      },
    });

    if (!attachment) {
      res.status(404).json({ error: "NOT_FOUND", message: "Attachment not found" });
      return;
    }

    res.status(200).json(attachment);
  } catch {
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Unable to load attachment metadata",
    });
  }
});

// Download Attachment (active only, owned only)
app.get("/api/attachments/:id/download", async (req: Request, res: Response) => {
  try {
    const attachmentId = Number(req.params.id);
    const requesterId = extractRequesterId(req);

    if (!Number.isInteger(attachmentId)) {
      res.status(404).json({ error: "NOT_FOUND", message: "Attachment not found" });
      return;
    }

    const numRequesterId = Number(requesterId);
    if (!requesterId || !Number.isInteger(numRequesterId)) {
      res.status(400).json({
        error: "MISSING_REQUESTER",
        message: "requesterId is required",
      });
      return;
    }

    const prisma = getPrisma();

    // Check active requester
    const activeRequester = await prisma.requesterUser.findFirst({
      where: { id: numRequesterId, active: true },
      select: { id: true },
    });

    if (!activeRequester) {
      res.status(400).json({
        error: "BAD_REQUESTER",
        message: "Invalid or inactive requester",
      });
      return;
    }

    // Must be owned AND not removed (removed files return 404, indistinguishable from non-existent)
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        removedAt: null,
        ticket: { requesterId: numRequesterId },
      },
    });

    if (!attachment) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "Attachment not found or removed",
      });
      return;
    }

    const filePath = resolveSafeFilePath(attachment.storedFilename);

    if (!filePath || !fs.existsSync(filePath)) {
      res.status(404).json({
        error: "NOT_FOUND",
        message: "File not found on disk",
      });
      return;
    }

    // Safe Content-Disposition header with RFC 5987 UTF-8 filename encoding
    const encodedFilename = encodeURIComponent(attachment.originalName);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodedFilename}"; filename*=UTF-8''${encodedFilename}`
    );
    res.setHeader("Content-Type", attachment.mimeType);
    res.setHeader("Content-Length", attachment.sizeBytes);

    const stream = fs.createReadStream(filePath);

    stream.on("error", () => {
      if (!res.headersSent) {
        res.status(404).json({
          error: "NOT_FOUND",
          message: "File not found",
        });
      } else {
        res.destroy();
      }
    });

    stream.pipe(res);
  } catch {
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Unable to download attachment",
    });
  }
});

// Soft-Remove Attachment
app.delete("/api/attachments/:id", async (req: Request, res: Response) => {
  try {
    const attachmentId = Number(req.params.id);
    const requesterId = extractRequesterId(req);
    const { reason } = req.body || {};

    if (!Number.isInteger(attachmentId)) {
      res.status(404).json({ error: "NOT_FOUND", message: "Attachment not found" });
      return;
    }

    const numRequesterId = Number(requesterId);
    if (!requesterId || !Number.isInteger(numRequesterId)) {
      res.status(400).json({
        error: "MISSING_REQUESTER",
        message: "requesterId is required",
      });
      return;
    }

    const trimmedReason = typeof reason === "string" ? reason.trim() : "";
    if (trimmedReason.length < 1 || trimmedReason.length > 500) {
      res.status(400).json({
        error: "REASON_REQUIRED",
        message: "A removal reason is required",
      });
      return;
    }

    const prisma = getPrisma();

    // Check active requester
    const activeRequester = await prisma.requesterUser.findFirst({
      where: { id: numRequesterId, active: true },
      select: { id: true },
    });

    if (!activeRequester) {
      res.status(400).json({
        error: "BAD_REQUESTER",
        message: "Invalid or inactive requester",
      });
      return;
    }

    // Ownership check via parent ticket
    const attachment = await prisma.attachment.findFirst({
      where: {
        id: attachmentId,
        ticket: { requesterId: numRequesterId },
      },
    });

    if (!attachment) {
      res.status(404).json({ error: "NOT_FOUND", message: "Attachment not found" });
      return;
    }

    if (attachment.removedAt !== null) {
      res.status(409).json({
        error: "ALREADY_REMOVED",
        message: "This attachment was already removed",
      });
      return;
    }

    // Soft remove: NEVER physically delete database row
    const updated = await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        removedAt: new Date(),
        removalReason: trimmedReason,
      },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        uploadedAt: true,
        removedAt: true,
        removalReason: true,
      },
    });

    res.status(200).json(updated);
  } catch {
    res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Unable to remove attachment",
    });
  }
});

export default app;
