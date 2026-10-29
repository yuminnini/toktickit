import { Router, Request, Response } from "express";
import { TicketStatus } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { requireAuth, requirePasswordChanged, requireRole } from "../middleware/auth.js";

export const dashboardRouter = Router();

const TERMINAL_STATUSES: TicketStatus[] = [
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
  TicketStatus.CANCELLED,
];

const REQUESTER_OPEN_STATUSES: TicketStatus[] = [
  TicketStatus.NEW,
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_FOR_REQUESTER,
  TicketStatus.REOPENED,
];

/**
 * GET /api/dashboard/requester
 * Authoritative Requester Dashboard metrics & recent tickets (BR-12, AC-16, AC-17)
 */
dashboardRouter.get(
  "/requester",
  requireAuth,
  requirePasswordChanged,
  async (req: Request, res: Response) => {
    try {
      const requesterId = req.user!.id;
      const prisma = getPrisma();

      const [
        myOpenTickets,
        inProgress,
        resolved,
        closed,
        waitingForRequester,
        recentTickets,
      ] = await Promise.all([
        prisma.ticket.count({
          where: {
            requesterId,
            currentStatus: { in: REQUESTER_OPEN_STATUSES },
          },
        }),
        prisma.ticket.count({
          where: {
            requesterId,
            currentStatus: TicketStatus.IN_PROGRESS,
          },
        }),
        prisma.ticket.count({
          where: {
            requesterId,
            currentStatus: TicketStatus.RESOLVED,
          },
        }),
        prisma.ticket.count({
          where: {
            requesterId,
            currentStatus: TicketStatus.CLOSED,
          },
        }),
        prisma.ticket.count({
          where: {
            requesterId,
            currentStatus: TicketStatus.WAITING_FOR_REQUESTER,
          },
        }),
        prisma.ticket.findMany({
          where: { requesterId },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 5,
          include: {
            category: { select: { id: true, name: true } },
          },
        }),
      ]);

      const recentlyUpdated = recentTickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        currentStatus: t.currentStatus,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        updatedAt: t.updatedAt.toISOString(),
        category: t.category,
      }));

      return res.status(200).json({
        myOpenTickets,
        inProgress,
        resolved,
        closed,
        waitingForRequester,
        recentlyUpdated,
      });
    } catch (err) {
      console.error("Requester dashboard error:", err);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Unable to load requester dashboard metrics",
      });
    }
  }
);

/**
 * GET /api/dashboard/staff
 * Authoritative IT Staff & Administrator Dashboard metrics (BR-13, BR-14, AC-19, AC-21)
 */
dashboardRouter.get(
  "/staff",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user!.role === "ADMINISTRATOR";
      const prisma = getPrisma();

      const [
        statusGroups,
        priorityGroups,
        myAssigned,
        recentActiveTickets,
      ] = await Promise.all([
        prisma.ticket.groupBy({
          by: ["currentStatus"],
          _count: { _all: true },
        }),
        prisma.ticket.groupBy({
          by: ["itPriority"],
          where: {
            currentStatus: { notIn: TERMINAL_STATUSES },
          },
          _count: { _all: true },
        }),
        prisma.ticket.count({
          where: {
            ticketOwnerId: userId,
            currentStatus: { notIn: TERMINAL_STATUSES },
          },
        }),
        prisma.ticket.findMany({
          where: {
            currentStatus: { notIn: TERMINAL_STATUSES },
          },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          take: 5,
          include: {
            ticketOwner: { select: { id: true, name: true } },
          },
        }),
      ]);

      const byStatus: Record<TicketStatus, number> = {
        NEW: 0,
        OPEN: 0,
        IN_PROGRESS: 0,
        WAITING_FOR_REQUESTER: 0,
        RESOLVED: 0,
        CLOSED: 0,
        REOPENED: 0,
        CANCELLED: 0,
      };

      for (const row of statusGroups) {
        byStatus[row.currentStatus] = row._count._all;
      }

      const byPriority = {
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      };

      for (const row of priorityGroups) {
        byPriority[row.itPriority] = row._count._all;
      }

      const recentQueue = recentActiveTickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        summary: t.summary,
        currentStatus: t.currentStatus,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        ticketOwner: t.ticketOwner,
        updatedAt: t.updatedAt.toISOString(),
      }));

      const payload: Record<string, any> = {
        new: byStatus.NEW,
        open: byStatus.OPEN,
        inProgress: byStatus.IN_PROGRESS,
        waitingForRequester: byStatus.WAITING_FOR_REQUESTER,
        myAssigned,
        byStatus,
        byPriority,
        recentQueue,
      };

      if (isAdmin) {
        const [totalUsers, activeStaff, inactiveUsers] = await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { role: "IT_STAFF", active: true } }),
          prisma.user.count({ where: { active: false } }),
        ]);

        payload.userStats = {
          totalUsers,
          activeStaff,
          inactiveUsers,
        };
      }

      return res.status(200).json(payload);
    } catch (err) {
      console.error("Staff dashboard error:", err);
      return res.status(500).json({
        error: "INTERNAL_ERROR",
        message: "Unable to load staff dashboard metrics",
      });
    }
  }
);
