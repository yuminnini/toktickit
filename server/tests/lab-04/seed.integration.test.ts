import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";

describe("T26 / AC-26: Idempotent Seed Data Verification (Lab 4)", () => {
  it("generates tickets with 0, 1, and multiple Actions Taken, varied follow-up, and is idempotent upon re-seeding", async () => {
    const prisma = getPrisma() as any;

    // Run first seed
    await seedDatabase(prisma);

    // Verify ActionTaken records were created
    const initialActionCount = await prisma.actionTaken.count();
    expect(initialActionCount).toBeGreaterThan(0);

    // Verify tickets with 0, 1, and multiple (>1) actions exist among seeded tickets
    const tickets = await prisma.ticket.findMany({
      where: { ticketNumber: { startsWith: "TKT-2026-900" } },
      include: {
        actionsTaken: true,
      },
    });

    const ticketsWithZeroActions = tickets.filter((t: any) => t.actionsTaken.length === 0);
    const ticketsWithOneAction = tickets.filter((t: any) => t.actionsTaken.length === 1);
    const ticketsWithMultipleActions = tickets.filter((t: any) => t.actionsTaken.length > 1);

    expect(ticketsWithZeroActions.length, "Should have tickets with 0 actions").toBeGreaterThan(0);
    expect(ticketsWithOneAction.length, "Should have tickets with 1 action").toBeGreaterThan(0);
    expect(ticketsWithMultipleActions.length, "Should have tickets with >1 actions").toBeGreaterThan(0);

    // Decision D2 requirement: All RESOLVED and CLOSED tickets MUST have at least 1 Action Taken
    const resolvedOrClosed = tickets.filter((t: any) => ["RESOLVED", "CLOSED"].includes(t.currentStatus));
    for (const t of resolvedOrClosed) {
      expect(
        t.actionsTaken.length,
        `Ticket ${t.ticketNumber} with status ${t.currentStatus} must have at least 1 Action Taken`
      ).toBeGreaterThanOrEqual(1);
    }

    // BR-10 requirement: Seeded WAITING_FOR_REQUESTER tickets (i = 4, 12, 20) must have an assigned active owner
    const waitingTickets = tickets.filter((t: any) =>
      ["TKT-2026-900004", "TKT-2026-900012", "TKT-2026-900020"].includes(t.ticketNumber)
    );
    expect(waitingTickets.length).toBe(3);
    for (const t of waitingTickets) {
      expect(t.currentStatus).toBe("WAITING_FOR_REQUESTER");
      expect(
        t.ticketOwnerId,
        `Ticket ${t.ticketNumber} with status ${t.currentStatus} must have an active assigned owner per BR-10`
      ).not.toBeNull();
    }

    // Verify follow-up field variations
    const withFollowUp = await prisma.actionTaken.findMany({
      where: { followUpRequired: true },
    });
    const withoutFollowUp = await prisma.actionTaken.findMany({
      where: { followUpRequired: false },
    });

    expect(withFollowUp.length).toBeGreaterThan(0);
    expect(withoutFollowUp.length).toBeGreaterThan(0);

    for (const a of withFollowUp) {
      expect(a.followUpNote).toBeTruthy();
      expect(a.followUpNote!.trim().length).toBeGreaterThanOrEqual(3);
    }

    // Re-seed to verify idempotency (AC-26)
    await seedDatabase(prisma);

    const postReseedCount = await prisma.actionTaken.count();
    expect(postReseedCount, "ActionTaken count should not duplicate on re-seed").toBe(initialActionCount);
  });
});
