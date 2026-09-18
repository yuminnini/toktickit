import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";

describe("T18 / AC-18: Seed Data Coverage", () => {
  it("seeds at least 4 active and 1 inactive Requester, 3 active and 1 inactive Staff, 1 Admin, and 24 tickets spanning all 8 statuses", async () => {
    const prisma = getPrisma() as any;

    await seedDatabase(prisma);

    // Requesters: >= 4 active, >= 1 inactive
    const activeRequesters = await prisma.user.count({
      where: { role: "REQUESTER", active: true },
    });
    const inactiveRequesters = await prisma.user.count({
      where: { role: "REQUESTER", active: false },
    });
    expect(activeRequesters).toBeGreaterThanOrEqual(4);
    expect(inactiveRequesters).toBeGreaterThanOrEqual(1);

    // Staff: >= 3 active, >= 1 inactive
    const activeStaff = await prisma.user.count({
      where: { role: "IT_STAFF", active: true },
    });
    const inactiveStaff = await prisma.user.count({
      where: { role: "IT_STAFF", active: false },
    });
    expect(activeStaff).toBeGreaterThanOrEqual(3);
    expect(inactiveStaff).toBeGreaterThanOrEqual(1);

    // Admin: >= 1 active
    const activeAdmins = await prisma.user.count({
      where: { role: "ADMINISTRATOR", active: true },
    });
    expect(activeAdmins).toBeGreaterThanOrEqual(1);

    // Tickets: >= 24 fictional tickets spanning all 8 statuses
    const totalTickets = await prisma.ticket.count();
    expect(totalTickets).toBeGreaterThanOrEqual(24);

    const allStatuses = [
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CLOSED",
      "REOPENED",
      "CANCELLED",
    ];

    for (const status of allStatuses) {
      const count = await prisma.ticket.count({
        where: { currentStatus: status },
      });
      expect(count, `Expected tickets with status ${status}`).toBeGreaterThan(0);
    }

    // Priorities: spanning all 3 priorities
    for (const prio of ["LOW", "MEDIUM", "HIGH"]) {
      const count = await prisma.ticket.count({
        where: { requestedPriority: prio },
      });
      expect(count, `Expected tickets with requestedPriority ${prio}`).toBeGreaterThan(0);
    }

    // Ownership: both assigned and unassigned tickets exist
    const unassignedTickets = await prisma.ticket.count({
      where: { ticketOwnerId: null },
    });
    const assignedTickets = await prisma.ticket.count({
      where: { ticketOwnerId: { not: null } },
    });
    expect(unassignedTickets).toBeGreaterThan(0);
    expect(assignedTickets).toBeGreaterThan(0);

    // Sample comments and notes
    const commentCount = await prisma.publicComment.count();
    const noteCount = await prisma.internalNote.count();
    expect(commentCount).toBeGreaterThan(0);
    expect(noteCount).toBeGreaterThan(0);
  });

  it("Point 1: seedDatabase does not overwrite existing tickets upon re-seeding", async () => {
    const prisma = getPrisma() as any;
    await seedDatabase(prisma);

    // Pick a seeded ticket and modify its fields
    const testTicket = await prisma.ticket.findFirst({
      where: { ticketNumber: "TKT-2026-900001" },
    });
    expect(testTicket).toBeTruthy();

    const customSummary = "User Customized Issue Summary";
    const customStatus = "IN_PROGRESS";
    await prisma.ticket.update({
      where: { id: testTicket.id },
      data: {
        summary: customSummary,
        currentStatus: customStatus,
      },
    });

    // Re-run seed
    await seedDatabase(prisma);

    // Verify ticket was NOT overwritten back to fictional template
    const verifiedTicket = await prisma.ticket.findUnique({
      where: { id: testTicket.id },
    });
    expect(verifiedTicket.summary).toBe(customSummary);
    expect(verifiedTicket.currentStatus).toBe(customStatus);
  });

  it("Point 2: seedDatabase preserves deactivated account status and custom roles", async () => {
    const prisma = getPrisma() as any;
    await seedDatabase(prisma);

    // Deactivate an active staff user and change role
    const staffUser = await prisma.user.findUnique({
      where: { email: "staff.bob@example.com" },
    });
    expect(staffUser).toBeTruthy();

    await prisma.user.update({
      where: { email: "staff.bob@example.com" },
      data: {
        active: false,
        role: "ADMINISTRATOR",
      },
    });

    // Re-run seed
    await seedDatabase(prisma);

    // Verify deactivated status and role were preserved (not reset to active / IT_STAFF)
    const verifiedStaff = await prisma.user.findUnique({
      where: { email: "staff.bob@example.com" },
    });
    expect(verifiedStaff.active).toBe(false);
    expect(verifiedStaff.role).toBe("ADMINISTRATOR");
  });

  it("Point 4: seedDatabase provisions legacy accounts that lack password credentials", async () => {
    const prisma = getPrisma() as any;

    // Create a legacy user with null passwordHash
    const legacyEmail = `legacy.user.${Date.now()}@example.com`;
    await prisma.user.create({
      data: {
        name: "Legacy Requester",
        email: legacyEmail,
        role: "REQUESTER",
        active: true,
        passwordHash: null,
      },
    });

    // Run seed with custom initial password
    const customInitPass = "CustomInitPassword123!";
    await seedDatabase(prisma, customInitPass);

    // Verify legacy user now has valid password credentials and mustChangePassword === true
    const provisionedUser = await prisma.user.findUnique({
      where: { email: legacyEmail },
    });
    expect(provisionedUser.passwordHash).toBeTruthy();
    expect(provisionedUser.passwordHash).toContain("$argon2id$");
    expect(provisionedUser.mustChangePassword).toBe(true);

    // Clean up test user
    await prisma.user.delete({ where: { email: legacyEmail } });
  });
});
