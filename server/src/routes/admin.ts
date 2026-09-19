import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import { toSafeUser } from "../services/session.js";
import { hashPassword, validatePasswordPolicy } from "../services/password.js";
import {
  requireAuth,
  requirePasswordChanged,
  requireRole,
} from "../middleware/auth.js";

export const adminRouter = Router();

// Enforce authentication, password change completion, and ADMINISTRATOR role on all /api/admin routes
adminRouter.use(requireAuth);
adminRouter.use(requirePasswordChanged);
adminRouter.use(requireRole("ADMINISTRATOR"));

const VALID_ROLES = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const;
type Role = (typeof VALID_ROLES)[number];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_REGEX.test(trimmed);
}

function isValidRole(role: any): role is Role {
  return VALID_ROLES.includes(role);
}

/**
 * GET /api/admin/users
 * Lists users ordered by name asc, then id asc.
 * Supports optional case-insensitive substring search (name/email) and single role filter.
 */
adminRouter.get("/users", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const { search, role } = req.query;

    const where: Prisma.UserWhereInput = {};

    if (role !== undefined && role !== "") {
      if (typeof role !== "string" || !isValidRole(role)) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Invalid role filter. Allowed: REQUESTER, IT_STAFF, ADMINISTRATOR",
        });
      }
      where.role = role;
    }

    if (search && typeof search === "string" && search.trim().length > 0) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });

    return res.status(200).json({ data: users.map(toSafeUser) });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/users
 * Provisions a new user with valid single role, active flag, initial password, and mustChangePassword = true.
 */
adminRouter.post("/users", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const { name, email, role, active, initialPassword } = req.body;

    // Validate fields
    if (!name || typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Name is required and must be between 1 and 100 characters",
      });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "A valid email address is required (max 254 characters)",
      });
    }

    if (!role || !isValidRole(role)) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Role is required and must be REQUESTER, IT_STAFF, or ADMINISTRATOR",
      });
    }

    if (typeof active !== "boolean") {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Active status is required as a boolean",
      });
    }

    const passwordVal = validatePasswordPolicy(initialPassword);
    if (!passwordVal.valid) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: passwordVal.error || "Password does not meet complexity requirements",
      });
    }

    const normalizedEmail = normalizeEmail(email);

    // Check duplicate email
    const existing = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });
    if (existing) {
      return res.status(409).json({
        error: "EMAIL_EXISTS",
        message: "A user with this email already exists",
      });
    }

    const passwordHash = await hashPassword(initialPassword);

    try {
      const newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          role,
          active,
          passwordHash,
          mustChangePassword: true,
          sessionVersion: 1,
        },
      });

      return res.status(201).json({ user: toSafeUser(newUser) });
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return res.status(409).json({
          error: "EMAIL_EXISTS",
          message: "A user with this email already exists",
        });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/users/:id
 * Edits user name, email, role, or active status.
 * Rejects credential fields.
 * Blocks self-deactivation and deactivation/demotion of last remaining active Administrator.
 * Atomically unassigns tickets when owner is deactivated or changed to REQUESTER.
 */
adminRouter.patch("/users/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId) || targetId <= 0) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid user ID" });
    }

    // Reject credential or internal flags in generic edit
    const FORBIDDEN_FIELDS = [
      "password",
      "passwordHash",
      "initialPassword",
      "mustChangePassword",
      "sessionVersion",
      "tokenHash",
      "id",
    ];
    for (const f of FORBIDDEN_FIELDS) {
      if (typeof req.body[f] !== "undefined") {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: `Field '${f}' cannot be modified via user edit`,
        });
      }
    }

    const hasEditableField = ["name", "email", "role", "active"].some(
      (f) => typeof req.body[f] !== "undefined"
    );
    if (!hasEditableField) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "At least one editable field (name, email, role, active) must be provided",
      });
    }

    const { name, email, role, active } = req.body;

    if (typeof name !== "undefined") {
      if (typeof name !== "string" || name.trim().length < 1 || name.trim().length > 100) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Name must be between 1 and 100 characters",
        });
      }
    }

    if (typeof email !== "undefined") {
      if (!isValidEmail(email)) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "A valid email address is required (max 254 characters)",
        });
      }
    }

    if (typeof role !== "undefined") {
      if (!isValidRole(role)) {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR",
        });
      }
    }

    if (typeof active !== "undefined") {
      if (typeof active !== "boolean") {
        return res.status(400).json({
          error: "VALIDATION_ERROR",
          message: "Active status must be a boolean",
        });
      }
    }

    // BR-22 / AC-44: Self-deactivation block
    if (req.user && req.user.id === targetId && active === false) {
      return res.status(400).json({
        error: "SELF_DEACTIVATION",
        message: "Administrators are strictly prohibited from deactivating their own account",
      });
    }

    // Atomic transaction for validations and mutations
    const result = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({ where: { id: targetId } });
      if (!targetUser) {
        return { notFound: true as const };
      }

      // Duplicate email check
      if (typeof email === "string") {
        const normalized = normalizeEmail(email);
        if (normalized !== targetUser.email.toLowerCase()) {
          const dup = await tx.user.findFirst({
            where: {
              email: { equals: normalized, mode: "insensitive" },
              id: { not: targetId },
            },
          });
          if (dup) {
            return { emailExists: true as const };
          }
        }
      }

      // BR-22 / AC-45: Last active admin invariant
      const willBeInactive = typeof active === "boolean" && !active;
      const willChangeRole = typeof role === "string" && role !== "ADMINISTRATOR";
      if (
        targetUser.role === "ADMINISTRATOR" &&
        targetUser.active &&
        (willBeInactive || willChangeRole)
      ) {
        // Explicitly lock active administrator rows with FOR UPDATE to serialize concurrent deactivations
        await tx.$queryRaw`SELECT id FROM "RequesterUser" WHERE role = 'ADMINISTRATOR'::"Role" AND active = true FOR UPDATE`;

        const activeAdminCount = await tx.user.count({
          where: { role: "ADMINISTRATOR", active: true },
        });
        if (activeAdminCount <= 1) {
          return { lastActiveAdmin: true as const };
        }
      }

      // BR-23 / AC-46: Unassign tickets if owner deactivated or changed to REQUESTER
      let unassignedTicketCount = 0;
      const wasEligibleOwner =
        targetUser.role === "IT_STAFF" || targetUser.role === "ADMINISTRATOR";
      const becomesInactive = typeof active === "boolean" ? !active : !targetUser.active;
      const becomesRequester = role === "REQUESTER";

      if (wasEligibleOwner && (becomesInactive || becomesRequester)) {
        const unassignResult = await tx.ticket.updateMany({
          where: { ticketOwnerId: targetId },
          data: {
            ticketOwnerId: null,
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        unassignedTicketCount = unassignResult.count;
      }

      // Prepare update payload
      const updateData: Prisma.UserUpdateInput = {};
      if (typeof name === "string") updateData.name = name.trim();
      if (typeof email === "string") updateData.email = normalizeEmail(email);
      if (typeof role === "string") updateData.role = role;
      if (typeof active === "boolean") updateData.active = active;

      // BR-12: If role or active status changes, revoke sessions and bump sessionVersion
      const roleChanged = typeof role === "string" && role !== targetUser.role;
      const activeChanged = typeof active === "boolean" && active !== targetUser.active;
      if (roleChanged || activeChanged) {
        updateData.sessionVersion = { increment: 1 };
        await tx.session.deleteMany({ where: { userId: targetId } });
      }

      const updatedUser = await tx.user.update({
        where: { id: targetId },
        data: updateData,
      });

      return {
        updatedUser,
        unassignedTicketCount,
      };
    });

    if ("notFound" in result) {
      return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
    }
    if ("emailExists" in result) {
      return res.status(409).json({
        error: "EMAIL_EXISTS",
        message: "A user with this email already exists",
      });
    }
    if ("lastActiveAdmin" in result) {
      return res.status(400).json({
        error: "LAST_ACTIVE_ADMIN",
        message: "Cannot deactivate or demote the last remaining active Administrator",
      });
    }

    return res.status(200).json({
      user: toSafeUser(result.updatedUser),
      unassignedTicketCount: result.unassignedTicketCount,
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({
        error: "EMAIL_EXISTS",
        message: "A user with this email already exists",
      });
    }
    next(err);
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Resets user password, forces mustChangePassword = true, and invalidates all existing sessions.
 */
adminRouter.post("/users/:id/reset-password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prisma = getPrisma();
    const targetId = parseInt(req.params.id, 10);
    if (isNaN(targetId) || targetId <= 0) {
      return res.status(400).json({ error: "VALIDATION_ERROR", message: "Invalid user ID" });
    }

    const { initialPassword } = req.body;
    const passwordVal = validatePasswordPolicy(initialPassword);
    if (!passwordVal.valid) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: passwordVal.error || "Password does not meet complexity requirements",
      });
    }

    const passwordHash = await hashPassword(initialPassword);

    const result = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({ where: { id: targetId } });
      if (!targetUser) {
        return { notFound: true as const };
      }

      const updatedUser = await tx.user.update({
        where: { id: targetId },
        data: {
          passwordHash,
          mustChangePassword: true,
          sessionVersion: { increment: 1 },
        },
      });

      // Revoke all sessions for this user
      await tx.session.deleteMany({ where: { userId: targetId } });

      return { updatedUser };
    });

    if ("notFound" in result) {
      return res.status(404).json({ error: "NOT_FOUND", message: "User not found" });
    }

    return res.status(200).json({ user: toSafeUser(result.updatedUser) });
  } catch (err) {
    next(err);
  }
});
