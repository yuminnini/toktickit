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
});
