import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";

describe("T14–T17 / AC-14–17: Migration & Seed Integrity", () => {
  const prisma = getPrisma() as any;

  it("T14 / AC-14: User model maps to RequesterUser and preserves existing records, categories, and systems", async () => {
    // Existing categories and systems exist
    const categories = await prisma.category.findMany();
    expect(categories.length).toBeGreaterThanOrEqual(4);

    const systems = await prisma.relatedSystem.findMany();
    expect(systems.length).toBeGreaterThanOrEqual(7);

    // Users are queryable via user model
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThan(0);
  });

  it("T16 / AC-16: Idempotent seed script runs repeatedly without duplicating records or overwriting changed passwords", async () => {
    await seedDatabase(prisma);

    const userCountBefore = await prisma.user.count();
    const ticketCountBefore = await prisma.ticket.count();
    const commentCountBefore = await prisma.publicComment.count();
    const noteCountBefore = await prisma.internalNote.count();

    // Pick Jennifer Anderson and modify her password and mustChangePassword
    const testUser = await prisma.user.findUnique({ where: { email: "jennifer.anderson@example.com" } });
    expect(testUser).not.toBeNull();

    const changedHash = "$argon2id$v=19$m=19456,t=2,p=1$customhash$customhash";
    await prisma.user.update({
      where: { id: testUser.id },
      data: {
        passwordHash: changedHash,
        mustChangePassword: false,
      },
    });

    // Run seed again
    await seedDatabase(prisma);

    // Record counts should not duplicate
    expect(await prisma.user.count()).toBe(userCountBefore);
    expect(await prisma.ticket.count()).toBe(ticketCountBefore);
    expect(await prisma.publicComment.count()).toBe(commentCountBefore);
    expect(await prisma.internalNote.count()).toBe(noteCountBefore);

    // Password and mustChangePassword of modified user should NOT be overwritten
    const verifiedUser = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(verifiedUser?.passwordHash).toBe(changedHash);
    expect(verifiedUser?.mustChangePassword).toBe(false);
  });

  it("T17 / AC-17: Seeded/migrated Requesters have valid provisioned credentials and initial password change flag", async () => {
    const requesters = await prisma.user.findMany({ where: { role: "REQUESTER" } });
    expect(requesters.length).toBeGreaterThan(0);

    for (const req of requesters) {
      expect(req.passwordHash).toBeTruthy();
      expect(req.passwordHash).toContain("$argon2id$");
      // Check that newly provisioned requesters have mustChangePassword === true
      // (or if it was explicitly updated in the previous test)
      if (req.email === "robert.wilson@example.com" || req.email === "sarah.johnson@example.com" || req.email === "david.lee@example.com") {
        expect(req.mustChangePassword).toBe(true);
      }
    }
  });
});
