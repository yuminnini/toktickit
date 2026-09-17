import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { verifyPassword } from "../../src/password.js";
import { seedDatabase, DEFAULT_INITIAL_PASSWORD } from "../../prisma/seed.js";
import { ensureTestHarnessReady } from "../../src/harness-guard.js";

describe("Phase F2 / P03: Database Migration & Schema Foundation (AC-14, AC-15, AC-16, AC-17)", () => {
  const prisma = getPrisma();

  beforeAll(async () => {
    await ensureTestHarnessReady();
    await seedDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("AC-15: Verifies that forward migration added User fields, Session table, and Ticket fields", async () => {
    // Check User table columns and mapping
    const user = await prisma.user.findFirst();
    expect(user).toBeDefined();
    expect(user).toHaveProperty("role");
    expect(user).toHaveProperty("passwordHash");
    expect(user).toHaveProperty("mustChangePassword");
    expect(user).toHaveProperty("sessionVersion");
    expect(user).toHaveProperty("updatedAt");

    // Check Ticket table new workflow fields
    const ticket = await prisma.ticket.findFirst();
    expect(ticket).toBeDefined();
    expect(ticket).toHaveProperty("itPriority");
    expect(ticket).toHaveProperty("version");
    expect(ticket).toHaveProperty("ticketOwnerId");
    expect(ticket).toHaveProperty("appearsResolvedAt");
    expect(ticket).toHaveProperty("appearsResolvedById");

    // Check Session table exists
    const sessions = await prisma.session.findMany({ take: 1 });
    expect(Array.isArray(sessions)).toBe(true);

    // Check PublicComment and InternalNote tables exist
    const comments = await prisma.publicComment.findMany({ take: 1 });
    expect(Array.isArray(comments)).toBe(true);

    const notes = await prisma.internalNote.findMany({ take: 1 });
    expect(Array.isArray(notes)).toBe(true);
  });

  it("AC-14: Preserves category, system, ticket, and attachment relationships", async () => {
    const categories = await prisma.category.findMany();
    expect(categories.length).toBeGreaterThanOrEqual(4);

    const systems = await prisma.relatedSystem.findMany();
    expect(systems.length).toBeGreaterThanOrEqual(7);

    // Verify tickets have valid relations
    const ticket = await prisma.ticket.findFirst({
      include: {
        category: true,
        relatedSystem: true,
        requester: true,
      },
    });

    expect(ticket).toBeDefined();
    expect(ticket?.category).toBeDefined();
    expect(ticket?.relatedSystem).toBeDefined();
    expect(ticket?.requester).toBeDefined();
    expect(ticket?.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
  });

  it("AC-17: Seeded users have valid provisioned Argon2id credentials and mustChangePassword flag", async () => {
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThanOrEqual(9);

    for (const u of users) {
      if (u.email.includes("@example.com")) {
        expect(u.passwordHash).toBeTruthy();
        expect(u.passwordHash?.startsWith("$argon2id$")).toBe(true);
        expect(u.mustChangePassword).toBe(true);

        const passwordValid = await verifyPassword(u.passwordHash!, DEFAULT_INITIAL_PASSWORD);
        expect(passwordValid).toBe(true);
      }
    }
  });

  it("AC-16: Idempotent seed script runs repeatedly without duplicating records or corrupting fields", async () => {
    const beforeUserCount = await prisma.user.count();
    const beforeTicketCount = await prisma.ticket.count();
    const beforeCategoryCount = await prisma.category.count();

    // Re-run seed
    await seedDatabase(prisma);

    const afterUserCount = await prisma.user.count();
    const afterTicketCount = await prisma.ticket.count();
    const afterCategoryCount = await prisma.category.count();

    expect(afterUserCount).toBe(beforeUserCount);
    expect(afterTicketCount).toBe(beforeTicketCount);
    expect(afterCategoryCount).toBe(beforeCategoryCount);
  });
});
