import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requirePasswordChanged, requireRole } from "../middleware/auth.js";
import { TicketStatus, Priority, Prisma } from "@prisma/client";

export const staffRouter = Router();

staffRouter.use(requireAuth);
staffRouter.use(requirePasswordChanged);

const priorityRank: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

const statusRank: Record<string, number> = {
  NEW: 1,
  OPEN: 2,
  IN_PROGRESS: 3,
  WAITING_FOR_REQUESTER: 4,
  RESOLVED: 5,
  CLOSED: 6,
  REOPENED: 7,
  CANCELLED: 8,
};

const allowedTransitions: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};

const statusesRequiringOwner: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
];

function formatStaffTicketDetail(ticket: any) {
  return {
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    ticketNo: ticket.ticketNumber,
    requesterId: ticket.requesterId,
    requester: {
      id: ticket.requester.id,
      name: ticket.requester.name,
      email: ticket.requester.email,
    },
    categoryId: ticket.categoryId,
    category: {
      id: ticket.category.id,
      name: ticket.category.name,
    },
    relatedSystemId: ticket.relatedSystemId,
    relatedSystem: {
      id: ticket.relatedSystem.id,
      name: ticket.relatedSystem.name,
    },
    summary: ticket.summary,
    description: ticket.description,
    requestedPriority: ticket.requestedPriority,
    itPriority: ticket.itPriority,
    currentStatus: ticket.currentStatus,
    ticketOwnerId: ticket.ticketOwnerId,
    ticketOwner: ticket.ticketOwner
      ? { id: ticket.ticketOwner.id, name: ticket.ticketOwner.name }
      : null,
    version: ticket.version,
    appearsResolvedAt: ticket.appearsResolvedAt ? ticket.appearsResolvedAt.toISOString() : null,
    appearsResolvedById: ticket.appearsResolvedById,
    appearsResolvedBy: ticket.appearsResolvedBy
      ? { id: ticket.appearsResolvedBy.id, name: ticket.appearsResolvedBy.name }
      : null,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    attachments: (ticket.attachments || []).map((a: any) => ({
      id: a.id,
      originalName: a.originalName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      uploadedAt: a.uploadedAt.toISOString(),
      removedAt: a.removedAt ? a.removedAt.toISOString() : null,
      removalReason: a.removalReason,
    })),
  };
}

/**
 * GET /api/staff/tickets
 * Staff Queue with filtering, semantic sorting, and pagination
 */
staffRouter.get("/tickets", requireRole("IT_STAFF"), async (req: Request, res: Response) => {
  try {
    const {
      search,
      categoryId,
      requestedPriority,
      itPriority,
      status,
      owner,
      ticketOwnerId,
      sort = "updatedAt",
      order = "desc",
      page = "1",
      pageSize = "10",
    } = req.query;

    const where: Prisma.TicketWhereInput = {};

    // 1. Search (max 150 chars, case-insensitive substring on ticketNumber OR summary)
    if (typeof search === "string") {
      const trimmed = search.trim();
      if (trimmed.length > 150) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Search query must not exceed 150 characters",
        });
      }
      if (trimmed.length > 0) {
        where.OR = [
          { ticketNumber: { contains: trimmed, mode: "insensitive" } },
          { summary: { contains: trimmed, mode: "insensitive" } },
        ];
      }
    }

    // 2. categoryId
    if (categoryId !== undefined && categoryId !== "") {
      const catNum = Number(categoryId);
      if (!Number.isInteger(catNum) || catNum <= 0) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "categoryId must be a positive integer",
        });
      }
      where.categoryId = catNum;
    }

    // 3. requestedPriority
    if (requestedPriority !== undefined && requestedPriority !== "") {
      if (!["LOW", "MEDIUM", "HIGH"].includes(String(requestedPriority))) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "requestedPriority must be LOW, MEDIUM, or HIGH",
        });
      }
      where.requestedPriority = requestedPriority as Priority;
    }

    // 4. itPriority
    if (itPriority !== undefined && itPriority !== "") {
      if (!["LOW", "MEDIUM", "HIGH"].includes(String(itPriority))) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "itPriority must be LOW, MEDIUM, or HIGH",
        });
      }
      where.itPriority = itPriority as Priority;
    }

    // 5. status
    if (status !== undefined && status !== "") {
      if (!Object.values(TicketStatus).includes(status as TicketStatus)) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Invalid ticket status filter",
        });
      }
      where.currentStatus = status as TicketStatus;
    }

    // 6. owner & ticketOwnerId
    const hasOwner = owner !== undefined && owner !== "";
    const hasTicketOwnerId = ticketOwnerId !== undefined && ticketOwnerId !== "";

    if (hasOwner && !["all", "unassigned", "mine"].includes(String(owner))) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "owner must be one of: all, unassigned, mine",
      });
    }

    if (hasTicketOwnerId) {
      const ownerIdNum = Number(ticketOwnerId);
      if (!Number.isInteger(ownerIdNum) || ownerIdNum <= 0) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "ticketOwnerId must be a positive integer",
        });
      }
    }

    if (hasOwner && owner !== "all" && hasTicketOwnerId) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "owner and ticketOwnerId are mutually exclusive",
      });
    }

    if (owner === "unassigned") {
      where.ticketOwnerId = null;
    } else if (owner === "mine") {
      where.ticketOwnerId = req.user!.id;
    } else if (hasTicketOwnerId) {
      where.ticketOwnerId = Number(ticketOwnerId);
    }

    // 7. sort
    const allowedSort = ["createdAt", "updatedAt", "ticketNumber", "itPriority", "requestedPriority", "currentStatus"];
    if (!allowedSort.includes(String(sort))) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: `sort must be one of: ${allowedSort.join(", ")}`,
      });
    }

    // 8. order
    if (!["asc", "desc"].includes(String(order))) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "order must be asc or desc",
      });
    }

    // 9. page
    const pageNum = Number(page);
    if (!Number.isInteger(pageNum) || pageNum <= 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "page must be a positive integer",
      });
    }

    // 10. pageSize
    const sizeNum = Number(pageSize);
    if (![10, 20, 50].includes(sizeNum)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "pageSize must be 10, 20, or 50",
      });
    }

    const prisma = getPrisma();
    const unfilteredTotal = await prisma.ticket.count();

    // Fetch lightweight projection for sorting & total count
    const matchingTickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        ticketNumber: true,
        createdAt: true,
        updatedAt: true,
        itPriority: true,
        requestedPriority: true,
        currentStatus: true,
      },
    });

    const total = matchingTickets.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / sizeNum);
    const clampedPage = total === 0 ? 1 : Math.min(Math.max(1, pageNum), totalPages);

    // Semantic Sort
    matchingTickets.sort((a, b) => {
      let cmp = 0;
      if (sort === "itPriority") {
        const rA = a.itPriority ? priorityRank[a.itPriority] : 0;
        const rB = b.itPriority ? priorityRank[b.itPriority] : 0;
        cmp = rA - rB;
      } else if (sort === "requestedPriority") {
        const rA = priorityRank[a.requestedPriority] || 0;
        const rB = priorityRank[b.requestedPriority] || 0;
        cmp = rA - rB;
      } else if (sort === "currentStatus") {
        const rA = statusRank[a.currentStatus] || 0;
        const rB = statusRank[b.currentStatus] || 0;
        cmp = rA - rB;
      } else if (sort === "ticketNumber") {
        cmp = a.ticketNumber.localeCompare(b.ticketNumber);
      } else if (sort === "createdAt") {
        cmp = a.createdAt.getTime() - b.createdAt.getTime();
      } else {
        // default: updatedAt
        cmp = a.updatedAt.getTime() - b.updatedAt.getTime();
      }

      if (order === "desc") {
        cmp = -cmp;
      }

      if (cmp === 0) {
        // Tie breaker on id in same direction
        cmp = order === "desc" ? b.id - a.id : a.id - b.id;
      }

      return cmp;
    });

    const skip = (clampedPage - 1) * sizeNum;
    const pageIds = matchingTickets.slice(skip, skip + sizeNum).map((t) => t.id);

    // Fetch full data with relations for the paged IDs
    const tickets = await prisma.ticket.findMany({
      where: { id: { in: pageIds } },
      include: {
        category: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true } },
        ticketOwner: { select: { id: true, name: true } },
      },
    });

    const ticketMap = new Map(tickets.map((t) => [t.id, t]));
    const data = pageIds.map((id) => {
      const t = ticketMap.get(id)!;
      return {
        id: t.id,
        ticketNumber: t.ticketNumber,
        ticketNo: t.ticketNumber,
        summary: t.summary,
        category: t.category.name,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        requesterId: t.requesterId,
        requester: t.requester,
        ticketOwnerId: t.ticketOwnerId,
        ticketOwner: t.ticketOwner,
        version: t.version,
      };
    });

    return res.status(200).json({
      data,
      page: clampedPage,
      pageSize: sizeNum,
      total,
      totalPages,
      unfilteredTotal,
    });
  } catch (err) {
    console.error("Staff queue error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to load staff queue" });
  }
});

/**
 * GET /api/staff/eligible-owners
 * Returns active IT Staff and Administrators for owner assignment
 */
staffRouter.get("/eligible-owners", requireRole("IT_STAFF", "ADMINISTRATOR"), async (_req: Request, res: Response) => {
  try {
    const prisma = getPrisma();
    const owners = await prisma.user.findMany({
      where: {
        active: true,
        role: { in: ["IT_STAFF", "ADMINISTRATOR"] },
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, role: true },
    });

    return res.status(200).json({ data: owners });
  } catch {
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to load eligible owners" });
  }
});

/**
 * GET /api/staff/tickets/:id
 * Staff Ticket Detail
 */
staffRouter.get("/tickets/:id", requireRole("IT_STAFF", "ADMINISTRATOR"), async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        category: { select: { id: true, name: true } },
        relatedSystem: { select: { id: true, name: true } },
        ticketOwner: { select: { id: true, name: true } },
        appearsResolvedBy: { select: { id: true, name: true } },
        attachments: true,
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    return res.status(200).json(formatStaffTicketDetail(ticket));
  } catch {
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to load ticket detail" });
  }
});

/**
 * POST /api/staff/tickets/:id/claim
 * Claim an unassigned ticket
 */
staffRouter.post("/tickets/:id/claim", requireRole("IT_STAFF"), async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    const { expectedVersion } = req.body || {};
    if (!expectedVersion || !Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Positive integer expectedVersion is required",
      });
    }

    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        return { status: 404, data: { error: "NOT_FOUND", message: "Ticket not found" } };
      }

      // Check version conflict first
      if (ticket.version !== expectedVersion) {
        return {
          status: 409,
          data: {
            error: "VERSION_CONFLICT",
            message: "Ticket version conflict. Please refresh and try again.",
          },
        };
      }

      // Check already assigned
      if (ticket.ticketOwnerId !== null) {
        return {
          status: 409,
          data: {
            error: "ALREADY_CLAIMED",
            message: "Ticket is already assigned to an owner.",
          },
        };
      }

      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          ticketOwnerId: req.user!.id,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          ticketOwner: { select: { id: true, name: true } },
          appearsResolvedBy: { select: { id: true, name: true } },
          attachments: true,
        },
      });

      return { status: 200, data: formatStaffTicketDetail(updated) };
    });

    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error("Claim ticket error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to claim ticket" });
  }
});

/**
 * PATCH /api/staff/tickets/:id/owner
 * Reassign ticket to an active Staff or Administrator
 */
staffRouter.patch("/tickets/:id/owner", requireRole("IT_STAFF"), async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    const { ticketOwnerId: bodyOwnerId, ownerId, expectedVersion } = req.body || {};
    const ticketOwnerId = bodyOwnerId ?? ownerId;

    if (!expectedVersion || !Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Positive integer expectedVersion is required",
      });
    }

    if (!ticketOwnerId || !Number.isInteger(ticketOwnerId) || ticketOwnerId <= 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Positive integer ticketOwnerId is required",
      });
    }

    const prisma = getPrisma();

    // Verify candidate owner is active Staff or Admin
    const candidate = await prisma.user.findUnique({
      where: { id: ticketOwnerId },
    });

    if (!candidate || !candidate.active || !["IT_STAFF", "ADMINISTRATOR"].includes(candidate.role)) {
      return res.status(400).json({
        error: "INVALID_OWNER",
        message: "Target owner must be an active IT Staff or Administrator",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          ticketOwner: { select: { id: true, name: true } },
          appearsResolvedBy: { select: { id: true, name: true } },
          attachments: true,
        },
      });

      if (!ticket) {
        return { status: 404, data: { error: "NOT_FOUND", message: "Ticket not found" } };
      }

      // Check version conflict
      if (ticket.version !== expectedVersion) {
        return {
          status: 409,
          data: {
            error: "VERSION_CONFLICT",
            message: "Ticket version conflict. Please refresh and try again.",
          },
        };
      }

      // Same owner no-op
      if (ticket.ticketOwnerId === ticketOwnerId) {
        return { status: 200, data: formatStaffTicketDetail(ticket) };
      }

      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          ticketOwnerId,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          ticketOwner: { select: { id: true, name: true } },
          appearsResolvedBy: { select: { id: true, name: true } },
          attachments: true,
        },
      });

      return { status: 200, data: formatStaffTicketDetail(updated) };
    });

    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error("Reassign owner error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to reassign ticket owner" });
  }
});

/**
 * PATCH /api/staff/tickets/:id/priority
 * Set IT Priority (leaves requestedPriority unchanged)
 */
staffRouter.patch("/tickets/:id/priority", requireRole("IT_STAFF"), async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    const { itPriority, expectedVersion } = req.body || {};
    if (!expectedVersion || !Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Positive integer expectedVersion is required",
      });
    }

    if (!itPriority || !["LOW", "MEDIUM", "HIGH"].includes(itPriority)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "itPriority must be LOW, MEDIUM, or HIGH",
      });
    }

    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          ticketOwner: { select: { id: true, name: true } },
          appearsResolvedBy: { select: { id: true, name: true } },
          attachments: true,
        },
      });

      if (!ticket) {
        return { status: 404, data: { error: "NOT_FOUND", message: "Ticket not found" } };
      }

      // Check version conflict
      if (ticket.version !== expectedVersion) {
        return {
          status: 409,
          data: {
            error: "VERSION_CONFLICT",
            message: "Ticket version conflict. Please refresh and try again.",
          },
        };
      }

      // Same priority no-op
      if (ticket.itPriority === itPriority) {
        return { status: 200, data: formatStaffTicketDetail(ticket) };
      }

      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          itPriority,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          ticketOwner: { select: { id: true, name: true } },
          appearsResolvedBy: { select: { id: true, name: true } },
          attachments: true,
        },
      });

      return { status: 200, data: formatStaffTicketDetail(updated) };
    });

    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error("Update IT priority error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to update IT priority" });
  }
});

/**
 * PATCH /api/staff/tickets/:id/status
 * Transition ticket status following matrix with eligible owner precondition
 */
staffRouter.patch("/tickets/:id/status", requireRole("IT_STAFF"), async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    const { currentStatus, expectedVersion } = req.body || {};
    if (!expectedVersion || !Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Positive integer expectedVersion is required",
      });
    }

    if (!currentStatus || !Object.values(TicketStatus).includes(currentStatus)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid ticket status value",
      });
    }

    const prisma = getPrisma();

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          ticketOwner: { select: { id: true, name: true } },
          appearsResolvedBy: { select: { id: true, name: true } },
          attachments: true,
        },
      });

      if (!ticket) {
        return { status: 404, data: { error: "NOT_FOUND", message: "Ticket not found" } };
      }

      // Check version conflict FIRST per specification
      if (ticket.version !== expectedVersion) {
        return {
          status: 409,
          data: {
            error: "VERSION_CONFLICT",
            message: "Ticket version conflict. Please refresh and try again.",
          },
        };
      }

      // Validate transition matrix
      const validTargets = allowedTransitions[ticket.currentStatus] || [];
      if (!validTargets.includes(currentStatus)) {
        return {
          status: 400,
          data: {
            error: "INVALID_TRANSITION",
            message: `Cannot transition status from ${ticket.currentStatus} to ${currentStatus}`,
          },
        };
      }

      // Eligible owner precondition: target OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, RESOLVED requires owner
      if (statusesRequiringOwner.includes(currentStatus)) {
        if (!ticket.ticketOwnerId) {
          return {
            status: 400,
            data: {
              error: "OWNER_REQUIRED",
              message: `Ticket must have an assigned owner before transitioning to ${currentStatus}`,
            },
          };
        }
      }

      // BR-19: entering REOPENED clears appearsResolvedAt/ById; other transitions preserve it
      const updateData: Prisma.TicketUpdateInput = {
        currentStatus,
        version: { increment: 1 },
        updatedAt: new Date(),
      };

      if (currentStatus === "REOPENED") {
        updateData.appearsResolvedAt = null;
        updateData.appearsResolvedBy = { disconnect: true };
      }

      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: updateData,
        include: {
          requester: { select: { id: true, name: true, email: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          ticketOwner: { select: { id: true, name: true } },
          appearsResolvedBy: { select: { id: true, name: true } },
          attachments: true,
        },
      });

      return { status: 200, data: formatStaffTicketDetail(updated) };
    });

    return res.status(result.status).json(result.data);
  } catch (err) {
    console.error("Transition status error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to transition ticket status" });
  }
});
