import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { ensureTestHarnessReady } from "../../src/harness-guard.js";

import { seedDatabase } from "../../prisma/seed.js";

describe("Phase F2 / P03: Seed Distribution & Composition (AC-18)", () => {
  const prisma = getPrisma();

  beforeAll(async () => {
    await ensureTestHarnessReady();
    await seedDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("AC-18: Verifies at least 4 active and 1 inactive Requester accounts", async () => {
    const activeRequesters = await prisma.user.findMany({
      where: { role: "REQUESTER", active: true },
    });
    const inactiveRequesters = await prisma.user.findMany({
      where: { role: "REQUESTER", active: false },
    });

    expect(activeRequesters.length).toBeGreaterThanOrEqual(4);
    expect(inactiveRequesters.length).toBeGreaterThanOrEqual(1);
  });

  it("AC-18: Verifies at least 3 active and 1 inactive IT Staff accounts", async () => {
    const activeStaff = await prisma.user.findMany({
      where: { role: "IT_STAFF", active: true },
    });
    const inactiveStaff = await prisma.user.findMany({
      where: { role: "IT_STAFF", active: false },
    });

    expect(activeStaff.length).toBeGreaterThanOrEqual(3);
    expect(inactiveStaff.length).toBeGreaterThanOrEqual(1);
  });

  it("AC-18: Verifies at least 1 active Administrator account", async () => {
    const activeAdmins = await prisma.user.findMany({
      where: { role: "ADMINISTRATOR", active: true },
    });

    expect(activeAdmins.length).toBeGreaterThanOrEqual(1);
  });

  it("AC-18: Verifies at least 24 tickets distributed across all 8 statuses", async () => {
    const totalTickets = await prisma.ticket.count();
    expect(totalTickets).toBeGreaterThanOrEqual(24);

    const statuses = [
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CLOSED",
      "REOPENED",
      "CANCELLED",
    ] as const;

    for (const status of statuses) {
      const count = await prisma.ticket.count({
        where: { currentStatus: status },
      });
      expect(count, `Expected at least 1 ticket with status ${status}`).toBeGreaterThanOrEqual(1);
    }
  });

  it("AC-18: Verifies distribution across priorities and ownership assignment", async () => {
    const priorities = ["LOW", "MEDIUM", "HIGH"] as const;
    for (const prio of priorities) {
      const count = await prisma.ticket.count({
        where: { requestedPriority: prio },
      });
      expect(count, `Expected tickets with requestedPriority ${prio}`).toBeGreaterThanOrEqual(1);
    }

    const assignedCount = await prisma.ticket.count({
      where: { ticketOwnerId: { not: null } },
    });
    const unassignedCount = await prisma.ticket.count({
      where: { ticketOwnerId: null },
    });

    expect(assignedCount).toBeGreaterThanOrEqual(5);
    expect(unassignedCount).toBeGreaterThanOrEqual(2);
  });

  it("AC-18: Verifies sample public comments and internal notes exist", async () => {
    const comments = await prisma.publicComment.findMany({
      include: { author: true, ticket: true },
    });
    const notes = await prisma.internalNote.findMany({
      include: { author: true, ticket: true },
    });

    expect(comments.length).toBeGreaterThanOrEqual(2);
    expect(notes.length).toBeGreaterThanOrEqual(2);

    for (const comment of comments) {
      expect(comment.content.trim().length).toBeGreaterThan(0);
      expect(comment.author).toBeDefined();
      expect(comment.ticket).toBeDefined();
    }

    for (const note of notes) {
      expect(note.content.trim().length).toBeGreaterThan(0);
      expect(note.author).toBeDefined();
      expect(note.ticket).toBeDefined();
    }
  });
});
