import express, { Request, Response } from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { Priority, TicketStatus } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import { formatTicketNumber } from "./services/ticketNumber.js";

export const app = express();

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

// Create Ticket
app.post("/api/tickets", async (req: Request, res: Response) => {
  try {
    const {
      requesterId,
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

    res.status(201).json(ticket);
  } catch {
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to create ticket" });
  }
});

// List Tickets (My Tickets)
app.get("/api/tickets", async (req: Request, res: Response) => {
  try {
    const {
      requesterId,
      search,
      categoryId,
      requestedPriority,
      status,
      sort,
      order,
      page,
      pageSize,
    } = req.query;

    if (!requesterId) {
      res.status(400).json({ error: "MISSING_REQUESTER", message: "requesterId is required" });
      return;
    }

    const numRequesterId = Number(requesterId);
    if (!Number.isInteger(numRequesterId)) {
      res.status(400).json({ error: "BAD_REQUESTER", message: "Invalid requesterId" });
      return;
    }

    const prisma = getPrisma();

    // Build filter where clause
    const where: Record<string, any> = {
      requesterId: numRequesterId,
    };

    if (typeof search === "string" && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { ticketNumber: { contains: term, mode: "insensitive" } },
        { summary: { contains: term, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      const numCat = Number(categoryId);
      if (Number.isInteger(numCat)) {
        where.categoryId = numCat;
      }
    }

    if (requestedPriority && Object.values(Priority).includes(requestedPriority as Priority)) {
      where.requestedPriority = requestedPriority as Priority;
    }

    if (status && Object.values(TicketStatus).includes(status as TicketStatus)) {
      where.currentStatus = status as TicketStatus;
    }

    // Sort options with deterministic secondary sort
    const validSortFields = ["createdAt", "ticketNumber", "requestedPriority", "currentStatus"];
    const sortField = typeof sort === "string" && validSortFields.includes(sort) ? sort : "createdAt";
    const sortOrder: "asc" | "desc" = order === "asc" ? "asc" : "desc";

    const orderBy = [{ [sortField]: sortOrder }, { id: "desc" as const }];

    // Pagination
    let pageNum = Number(page);
    if (!Number.isInteger(pageNum) || pageNum < 1) pageNum = 1;

    let pageSizeNum = Number(pageSize);
    if (!Number.isInteger(pageSizeNum) || pageSizeNum < 1) pageSizeNum = 10;
    if (pageSizeNum > 50) pageSizeNum = 50;

    const skip = (pageNum - 1) * pageSizeNum;
    const take = pageSizeNum;

    const [total, unfilteredTotal, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.count({ where: { requesterId: numRequesterId } }),
      prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
        },
      }),
    ]);

    const data = tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      summary: t.summary,
      description: t.description,
      category: t.category.name,
      categoryId: t.categoryId,
      relatedSystem: t.relatedSystem.name,
      relatedSystemId: t.relatedSystemId,
      requestedPriority: t.requestedPriority,
      currentStatus: t.currentStatus,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    res.status(200).json({
      data,
      page: pageNum,
      pageSize: pageSizeNum,
      total,
      totalPages: Math.ceil(total / pageSizeNum) || 1,
      unfilteredTotal,
    });
  } catch {
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to load tickets" });
  }
});

// Ticket Detail (owned only)
app.get("/api/tickets/:id", async (req: Request, res: Response) => {
  try {
    const { requesterId } = req.query;
    if (!requesterId) {
      res.status(400).json({ error: "MISSING_REQUESTER", message: "requesterId is required" });
      return;
    }

    const numRequesterId = Number(requesterId);
    const numTicketId = Number(req.params.id);

    if (!Number.isInteger(numRequesterId) || !Number.isInteger(numTicketId)) {
      res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
      return;
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: numTicketId,
        requesterId: numRequesterId,
      },
      include: {
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        attachments: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            uploadedAt: true,
            removedAt: true,
            removalReason: true,
          },
        },
      },
    });

    if (!ticket) {
      res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
      return;
    }

    res.status(200).json(ticket);
  } catch {
    res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to load ticket detail" });
  }
});

export default app;
