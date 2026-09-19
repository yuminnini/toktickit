import { Router, Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requirePasswordChanged } from "../middleware/auth.js";
import { TicketStatus } from "@prisma/client";

export const communicationsRouter = Router({ mergeParams: true });

communicationsRouter.use(requireAuth);
communicationsRouter.use(requirePasswordChanged);

const ALLOWED_APPEARS_RESOLVED_STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "REOPENED",
];

/**
 * Middleware to check ticket existence and ownership for communications
 */
async function loadTicketForAccess(req: Request, res: Response, next: NextFunction) {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    // Non-disclosure: Requesters can only access their own tickets
    if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    (req as any).targetTicket = ticket;
    return next();
  } catch (err) {
    console.error("loadTicketForAccess error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Failed to access ticket" });
  }
}

/**
 * GET /api/tickets/:id/comments
 * Readable by own Requester, Staff, and Admin
 */
communicationsRouter.get("/:id/comments", loadTicketForAccess, async (req: Request, res: Response) => {
  try {
    const ticket = (req as any).targetTicket;
    const prisma = getPrisma();

    const comments = await prisma.publicComment.findMany({
      where: { ticketId: ticket.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    const data = comments.map((c) => ({
      id: c.id,
      ticketId: c.ticketId,
      content: c.content,
      author: c.author,
      createdAt: c.createdAt.toISOString(),
    }));

    return res.status(200).json({ data });
  } catch (err) {
    console.error("Get comments error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to load comments" });
  }
});

/**
 * POST /api/tickets/:id/comments
 * Creatable by own Requester and Staff (Admin is read-only for comments)
 */
communicationsRouter.post("/:id/comments", loadTicketForAccess, async (req: Request, res: Response) => {
  try {
    // Admin cannot create comments
    if (req.user!.role === "ADMINISTRATOR") {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "Administrators have read-only access to ticket communications",
      });
    }

    // Reject supplied author or timestamp fields (spec: authors/timestamps from session/server only)
    if (
      req.body?.author !== undefined ||
      req.body?.authorId !== undefined ||
      req.body?.createdAt !== undefined ||
      req.body?.timestamp !== undefined
    ) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Client cannot specify author or timestamp",
      });
    }

    const ticket = (req as any).targetTicket;
    const { content } = req.body || {};

    if (!content || typeof content !== "string" || content.trim().length < 1 || content.trim().length > 2000) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Comment content must be between 1 and 2000 characters",
      });
    }

    const prisma = getPrisma();
    const comment = await prisma.publicComment.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user!.id,
        content: content.trim(),
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return res.status(201).json({
      id: comment.id,
      ticketId: comment.ticketId,
      content: comment.content,
      author: comment.author,
      createdAt: comment.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Create comment error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to create comment" });
  }
});

/**
 * GET /api/tickets/:id/internal-notes
 * Readable by Staff and Admin only. Requester gets 403 with zero content leak.
 */
communicationsRouter.get("/:id/internal-notes", async (req: Request, res: Response, next: NextFunction) => {
  // Requesters are strictly forbidden from accessing internal notes
  if (req.user!.role === "REQUESTER") {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Access denied to internal notes",
    });
  }
  return next();
}, loadTicketForAccess, async (req: Request, res: Response) => {
  try {
    const ticket = (req as any).targetTicket;
    const prisma = getPrisma();

    const notes = await prisma.internalNote.findMany({
      where: { ticketId: ticket.id },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    const data = notes.map((n) => ({
      id: n.id,
      ticketId: n.ticketId,
      content: n.content,
      author: n.author,
      createdAt: n.createdAt.toISOString(),
    }));

    return res.status(200).json({ data });
  } catch (err) {
    console.error("Get internal notes error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to load internal notes" });
  }
});

/**
 * POST /api/tickets/:id/internal-notes
 * Creatable by IT Staff only. Requester and Admin get 403.
 */
communicationsRouter.post("/:id/internal-notes", async (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.role === "REQUESTER") {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Access denied to internal notes",
    });
  }
  if (req.user!.role === "ADMINISTRATOR") {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Administrators have read-only access to internal notes",
    });
  }
  return next();
}, loadTicketForAccess, async (req: Request, res: Response) => {
  try {
    // Reject supplied author or timestamp fields
    if (
      req.body?.author !== undefined ||
      req.body?.authorId !== undefined ||
      req.body?.createdAt !== undefined ||
      req.body?.timestamp !== undefined
    ) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Client cannot specify author or timestamp",
      });
    }

    const ticket = (req as any).targetTicket;
    const { content } = req.body || {};

    if (!content || typeof content !== "string" || content.trim().length < 1 || content.trim().length > 2000) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Internal note content must be between 1 and 2000 characters",
      });
    }

    const prisma = getPrisma();
    const note = await prisma.internalNote.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user!.id,
        content: content.trim(),
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    return res.status(201).json({
      id: note.id,
      ticketId: note.ticketId,
      content: note.content,
      author: note.author,
      createdAt: note.createdAt.toISOString(),
    });
  } catch (err) {
    console.error("Create internal note error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to create internal note" });
  }
});

/**
 * POST /api/tickets/:id/appears-resolved
 * Requester indicates problem appears resolved without changing formal status
 */
communicationsRouter.post("/:id/appears-resolved", async (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.role !== "REQUESTER") {
    return res.status(403).json({
      error: "FORBIDDEN",
      message: "Only Requesters can indicate resolution on tickets",
    });
  }
  return next();
}, loadTicketForAccess, async (req: Request, res: Response) => {
  try {
    const ticketId = (req as any).targetTicket.id;
    const prisma = getPrisma();

    // Atomic transaction checking status and idempotent indication
    const result = await prisma.$transaction(async (tx) => {
      const freshTicket = await tx.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!freshTicket) {
        return { notFound: true as const };
      }

      // Idempotent: if already indicated, return current state without version increment
      if (freshTicket.appearsResolvedAt !== null) {
        return { ticket: freshTicket };
      }

      if (!ALLOWED_APPEARS_RESOLVED_STATUSES.includes(freshTicket.currentStatus)) {
        return {
          invalidTransition: true as const,
          status: freshTicket.currentStatus,
        };
      }

      const now = new Date();
      const updateResult = await tx.ticket.updateMany({
        where: {
          id: ticketId,
          appearsResolvedAt: null,
          currentStatus: { in: ALLOWED_APPEARS_RESOLVED_STATUSES },
        },
        data: {
          appearsResolvedAt: now,
          appearsResolvedById: req.user!.id,
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        // Race condition: another request set appearsResolvedAt or changed status
        const recheck = await tx.ticket.findUnique({
          where: { id: ticketId },
        });

        if (!recheck) {
          return { notFound: true as const };
        }

        // If another concurrent request indicated resolution, return it idempotently
        if (recheck.appearsResolvedAt !== null) {
          return { ticket: recheck };
        }

        // If status transitioned to a disallowed status concurrently
        if (!ALLOWED_APPEARS_RESOLVED_STATUSES.includes(recheck.currentStatus)) {
          return {
            invalidTransition: true as const,
            status: recheck.currentStatus,
          };
        }
      }

      const finalTicket = await tx.ticket.findUniqueOrThrow({
        where: { id: ticketId },
      });

      return { ticket: finalTicket };
    });

    if ("notFound" in result) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    if ("invalidTransition" in result) {
      return res.status(400).json({
        error: "INVALID_TRANSITION",
        message: `Resolution indication is not allowed for ticket with status ${result.status}`,
      });
    }

    const t = result.ticket;
    return res.status(200).json({
      id: t.id,
      appearsResolvedAt: t.appearsResolvedAt!.toISOString(),
      appearsResolvedById: t.appearsResolvedById,
      currentStatus: t.currentStatus,
      version: t.version,
    });
  } catch (err) {
    console.error("Appears resolved error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to record resolution indication" });
  }
});

/**
 * Method Not Allowed handlers (405) for comments and internal notes
 * Per spec line 156: PUT/PATCH/DELETE return 405 after auth/role/ownership checks; Requester notes always 403.
 */
communicationsRouter.all("/:id/internal-notes*", async (req: Request, res: Response, next: NextFunction) => {
  if (req.user!.role === "REQUESTER") {
    return res.status(403).json({ error: "FORBIDDEN", message: "Access denied to internal notes" });
  }
  return next();
}, loadTicketForAccess, (req: Request, res: Response) => {
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({
    error: "METHOD_NOT_ALLOWED",
    message: `Method ${req.method} is not allowed on internal notes`,
  });
});

communicationsRouter.all("/:id/comments*", loadTicketForAccess, (req: Request, res: Response) => {
  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({
    error: "METHOD_NOT_ALLOWED",
    message: `Method ${req.method} is not allowed on comments`,
  });
});
