import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requirePasswordChanged, requireRole } from "../middleware/auth.js";

export const actionsRouter = Router();

function formatActionTaken(action: any) {
  return {
    id: action.id,
    ticketId: action.ticketId,
    actionDateTime: action.actionDateTime.toISOString(),
    description: action.description,
    result: action.result,
    performedBy: action.performedBy,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote,
    attachmentNotes: action.attachmentNotes,
    version: action.version,
    createdAt: action.createdAt.toISOString(),
    updatedAt: action.updatedAt.toISOString(),
  };
}

/**
 * GET /api/tickets/:id/actions
 * List all Actions Taken for a ticket in chronological order
 * Requesters can only access their own tickets (foreign returns 404)
 */
actionsRouter.get("/tickets/:id/actions", requireAuth, requirePasswordChanged, async (req: Request, res: Response) => {
  try {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, requesterId: true },
    });

    if (!ticket) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    // Privacy preservation: Requester can only access actions on their own tickets
    if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
    }

    const actions = await prisma.actionTaken.findMany({
      where: { ticketId },
      orderBy: [{ actionDateTime: "asc" }, { id: "asc" }],
      include: {
        performedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return res.status(200).json(actions.map(formatActionTaken));
  } catch (err) {
    console.error("Get actions error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to load actions taken" });
  }
});

/**
 * POST /api/tickets/:id/actions
 * Create an Action Taken under a ticket
 * Access: Active IT_STAFF and ADMINISTRATOR only (Requesters and inactive staff get 403)
 */
actionsRouter.post(
  "/tickets/:id/actions",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    try {
      const ticketId = Number(req.params.id);
      if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
      }

      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, currentStatus: true },
      });

      if (!ticket) {
        return res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found" });
      }

      // Ticket Status Gate (Decision D5): Locked tickets reject actions
      if (["RESOLVED", "CLOSED", "CANCELLED"].includes(ticket.currentStatus)) {
        return res.status(400).json({
          error: "TICKET_LOCKED",
          message: "Actions cannot be added to a resolved, closed, or cancelled ticket",
        });
      }

      const {
        description,
        result,
        followUpRequired = false,
        followUpNote,
        attachmentNotes,
        actionDateTime,
      } = req.body || {};

      const fields: Record<string, string> = {};

      if (!description || typeof description !== "string" || description.trim().length < 3 || description.trim().length > 2000) {
        fields.description = "Description must be between 3 and 2000 characters";
      }

      if (!result || typeof result !== "string" || result.trim().length < 3 || result.trim().length > 2000) {
        fields.result = "Result must be between 3 and 2000 characters";
      }

      if (typeof followUpRequired !== "boolean") {
        fields.followUpRequired = "followUpRequired must be a boolean";
      }

      if (followUpRequired) {
        if (!followUpNote || typeof followUpNote !== "string" || followUpNote.trim().length < 3) {
          fields.followUpNote = "followUpNote is mandatory when followUpRequired is true (min 3 characters)";
        }
      }

      if (attachmentNotes !== undefined && attachmentNotes !== null) {
        if (typeof attachmentNotes !== "string" || attachmentNotes.trim().length > 500) {
          fields.attachmentNotes = "attachmentNotes must be at most 500 characters";
        }
      }

      let parsedActionDateTime = new Date();
      if (actionDateTime !== undefined && actionDateTime !== null) {
        const d = new Date(actionDateTime);
        if (isNaN(d.getTime())) {
          fields.actionDateTime = "Invalid actionDateTime ISO string";
        } else {
          // Cannot be in the future (5 min skew tolerance)
          const fiveMinInFuture = new Date(Date.now() + 5 * 60 * 1000);
          if (d > fiveMinInFuture) {
            fields.actionDateTime = "actionDateTime cannot be in the future";
          } else {
            parsedActionDateTime = d;
          }
        }
      }

      if (Object.keys(fields).length > 0) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "One or more fields failed validation",
          fields,
        });
      }

      const action = await prisma.actionTaken.create({
        data: {
          ticketId,
          actionDateTime: parsedActionDateTime,
          description: description.trim(),
          result: result.trim(),
          performedById: req.user!.id,
          followUpRequired,
          followUpNote: followUpRequired ? followUpNote.trim() : null,
          attachmentNotes: attachmentNotes && typeof attachmentNotes === "string" ? attachmentNotes.trim() : null,
          version: 1,
        },
        include: {
          performedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      return res.status(201).json(formatActionTaken(action));
    } catch (err) {
      console.error("Create action error:", err);
      return res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to create action taken" });
    }
  }
);

/**
 * PATCH /api/actions/:id
 * Update an Action Taken with Optimistic Concurrency Control (OCC)
 * Access: Author (`performedById`) or active ADMINISTRATOR (Decision D4)
 */
actionsRouter.patch("/actions/:id", requireAuth, requirePasswordChanged, async (req: Request, res: Response) => {
  try {
    const actionId = Number(req.params.id);
    if (!Number.isInteger(actionId) || actionId <= 0) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Action taken not found" });
    }

    // Role guard: Requesters and inactive staff get 403
    if (req.user!.role === "REQUESTER" || !req.user!.active) {
      return res.status(403).json({ error: "FORBIDDEN", message: "Access denied" });
    }

    const prisma = getPrisma();
    const action = await prisma.actionTaken.findUnique({
      where: { id: actionId },
      include: {
        ticket: { select: { id: true, currentStatus: true } },
      },
    });

    if (!action) {
      return res.status(404).json({ error: "NOT_FOUND", message: "Action taken not found" });
    }

    // Decision D4: Only original author or Administrator can edit
    const isAuthor = action.performedById === req.user!.id;
    const isAdmin = req.user!.role === "ADMINISTRATOR";
    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        error: "ACTION_EDIT_FORBIDDEN",
        message: "Only the author or an administrator can edit this action taken",
      });
    }

    // Decision D5: Locked tickets reject edits
    if (["RESOLVED", "CLOSED", "CANCELLED"].includes(action.ticket.currentStatus)) {
      return res.status(400).json({
        error: "TICKET_LOCKED",
        message: "Actions cannot be edited on a resolved, closed, or cancelled ticket",
      });
    }

    const {
      expectedVersion,
      description,
      result,
      followUpRequired,
      followUpNote,
      attachmentNotes,
      actionDateTime,
    } = req.body || {};

    if (!expectedVersion || !Number.isInteger(expectedVersion) || expectedVersion <= 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Positive integer expectedVersion is required",
      });
    }

    // Decision D7: Optimistic Concurrency Control
    if (action.version !== expectedVersion) {
      return res.status(409).json({
        error: "VERSION_CONFLICT",
        message: "Action taken version conflict. Please refresh and try again.",
      });
    }

    const fields: Record<string, string> = {};
    const updateData: any = {};

    if (description !== undefined) {
      if (typeof description !== "string" || description.trim().length < 3 || description.trim().length > 2000) {
        fields.description = "Description must be between 3 and 2000 characters";
      } else {
        updateData.description = description.trim();
      }
    }

    if (result !== undefined) {
      if (typeof result !== "string" || result.trim().length < 3 || result.trim().length > 2000) {
        fields.result = "Result must be between 3 and 2000 characters";
      } else {
        updateData.result = result.trim();
      }
    }

    const effectiveFollowUpRequired =
      followUpRequired !== undefined ? followUpRequired : action.followUpRequired;

    if (followUpRequired !== undefined) {
      if (typeof followUpRequired !== "boolean") {
        fields.followUpRequired = "followUpRequired must be a boolean";
      } else {
        updateData.followUpRequired = followUpRequired;
      }
    }

    if (effectiveFollowUpRequired) {
      const candidateNote =
        followUpNote !== undefined ? followUpNote : action.followUpNote;
      if (!candidateNote || typeof candidateNote !== "string" || candidateNote.trim().length < 3) {
        fields.followUpNote = "followUpNote is mandatory when followUpRequired is true (min 3 characters)";
      } else if (followUpNote !== undefined) {
        updateData.followUpNote = followUpNote.trim();
      }
    } else if (followUpRequired !== undefined && !followUpRequired) {
      updateData.followUpNote = null;
    }

    if (attachmentNotes !== undefined) {
      if (attachmentNotes === null) {
        updateData.attachmentNotes = null;
      } else if (typeof attachmentNotes !== "string" || attachmentNotes.trim().length > 500) {
        fields.attachmentNotes = "attachmentNotes must be at most 500 characters";
      } else {
        updateData.attachmentNotes = attachmentNotes.trim();
      }
    }

    if (actionDateTime !== undefined) {
      const d = new Date(actionDateTime);
      if (isNaN(d.getTime())) {
        fields.actionDateTime = "Invalid actionDateTime ISO string";
      } else {
        const fiveMinInFuture = new Date(Date.now() + 5 * 60 * 1000);
        if (d > fiveMinInFuture) {
          fields.actionDateTime = "actionDateTime cannot be in the future";
        } else {
          updateData.actionDateTime = d;
        }
      }
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "One or more fields failed validation",
        fields,
      });
    }

    // Atomic update with OCC
    const updateResult = await prisma.actionTaken.updateMany({
      where: {
        id: actionId,
        version: expectedVersion,
      },
      data: {
        ...updateData,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });

    if (updateResult.count === 0) {
      return res.status(409).json({
        error: "VERSION_CONFLICT",
        message: "Action taken version conflict. Please refresh and try again.",
      });
    }

    const updated = await prisma.actionTaken.findUniqueOrThrow({
      where: { id: actionId },
      include: {
        performedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return res.status(200).json(formatActionTaken(updated));
  } catch (err) {
    console.error("Update action error:", err);
    return res.status(500).json({ error: "INTERNAL_ERROR", message: "Unable to update action taken" });
  }
});
