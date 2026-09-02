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

export default app;
