import { getPrisma } from "../src/prisma.js";
import type { PrismaClient, Priority, TicketStatus, Role } from "@prisma/client";
import { hashPassword } from "../src/services/password.js";

const CATEGORIES = ["Account and Access", "Hardware", "Software", "Network"];

const RELATED_SYSTEMS = [
  "Email", "Campus Wi-Fi", "VPN", "LEB2 App",
  "Grade Submission App", "Printer", "Corporate Laptop",
];

export const INITIAL_SEED_PASSWORD = process.env.INITIAL_SEED_PASSWORD || "InitialPass123!";

interface SeedUser {
  name: string;
  email: string;
  role: Role;
  active: boolean;
  mustChangePassword?: boolean;
}

export const USERS: SeedUser[] = [
  // Administrators (>= 1 active)
  { name: "System Administrator", email: "admin@example.com", role: "ADMINISTRATOR", active: true, mustChangePassword: true },

  // IT Staff (>= 3 active, >= 1 inactive)
  { name: "Alice IT Support", email: "staff.alice@example.com", role: "IT_STAFF", active: true, mustChangePassword: true },
  { name: "Bob Network Tech", email: "staff.bob@example.com", role: "IT_STAFF", active: true, mustChangePassword: true },
  { name: "Charlie Systems", email: "staff.charlie@example.com", role: "IT_STAFF", active: true, mustChangePassword: true },
  { name: "Dana Former Staff", email: "staff.dana@example.com", role: "IT_STAFF", active: false, mustChangePassword: true },

  // Requesters (>= 4 active, >= 1 inactive)
  // All newly provisioned users require password change on first login per spec
  { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "REQUESTER", active: true, mustChangePassword: true },
  { name: "Michael Brown", email: "michael.brown@example.com", role: "REQUESTER", active: true, mustChangePassword: true },
  { name: "Sarah Johnson", email: "sarah.johnson@example.com", role: "REQUESTER", active: true, mustChangePassword: true },
  { name: "David Lee", email: "david.lee@example.com", role: "REQUESTER", active: true, mustChangePassword: true },
  { name: "Robert Wilson", email: "robert.wilson@example.com", role: "REQUESTER", active: false, mustChangePassword: true },
];

export async function seedDatabase(prisma: PrismaClient, initialPassword?: string) {
  // 1. Categories
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 2. Related Systems
  for (const name of RELATED_SYSTEMS) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 3. Users
  // Provision credentials using initial password from parameter, env, or default
  const passwordToUse = initialPassword || process.env.INITIAL_SEED_PASSWORD || INITIAL_SEED_PASSWORD;
  const defaultHash = await hashPassword(passwordToUse);
  const userMap = new Map<string, number>();

  for (const u of USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const created = await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          passwordHash: defaultHash,
          mustChangePassword: u.mustChangePassword ?? true,
          sessionVersion: 1,
        },
      });
      userMap.set(u.email, created.id);
    } else {
      // Fix Point 2: Preserve existing account fields (role, active, name)
      // Never overwrite active status or role when re-seeding!
      // Only set credentials if existing user has no passwordHash
      if (!existing.passwordHash) {
        await prisma.user.update({
          where: { email: u.email },
          data: {
            passwordHash: defaultHash,
            mustChangePassword: u.mustChangePassword ?? true,
          },
        });
      }
      userMap.set(u.email, existing.id);
    }
  }

  // Fix Point 4: Provision ANY existing/migrated users not in the seed list who lack passwordHash
  const unprovisioned = await prisma.user.findMany({
    where: {
      OR: [
        { passwordHash: null },
        { passwordHash: "" },
      ],
    },
  });

  for (const u of unprovisioned) {
    await prisma.user.update({
      where: { id: u.id },
      data: {
        passwordHash: defaultHash,
        mustChangePassword: true,
      },
    });
  }

  // Verify that all users in the database have valid credentials
  const remainingUnprovisioned = await prisma.user.count({
    where: {
      OR: [
        { passwordHash: null },
        { passwordHash: "" },
      ],
    },
  });
  if (remainingUnprovisioned > 0) {
    throw new Error(
      `Provisioning failed: ${remainingUnprovisioned} user(s) still lack password credentials.`
    );
  }

  const categories = await prisma.category.findMany();
  const systems = await prisma.relatedSystem.findMany();
  const jenniferId = userMap.get("jennifer.anderson@example.com")!;
  const michaelId = userMap.get("michael.brown@example.com")!;
  const sarahId = userMap.get("sarah.johnson@example.com")!;
  const aliceId = userMap.get("staff.alice@example.com")!;
  const bobId = userMap.get("staff.bob@example.com")!;

  // 4. 24 Fictional Tickets across all 8 statuses and all priorities
  // Fix Point 1: Use dedicated fixture ticket numbers (TKT-2026-900001..900024)
  // and NEVER overwrite existing tickets on re-seed (update: {})
  const allStatuses: TicketStatus[] = [
    "NEW",
    "OPEN",
    "IN_PROGRESS",
    "WAITING_FOR_REQUESTER",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
    "CANCELLED",
  ];

  const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH"];

  for (let i = 1; i <= 24; i++) {
    const ticketNumStr = String(900000 + i).padStart(6, "0");
    const ticketNumber = `TKT-2026-${ticketNumStr}`;
    const status = allStatuses[(i - 1) % allStatuses.length];
    const prio = priorities[(i - 1) % priorities.length];
    const cat = categories[(i - 1) % categories.length];
    const sys = systems[(i - 1) % systems.length];
    const requesterId = (i % 3 === 0) ? sarahId : (i % 2 === 0) ? michaelId : jenniferId;

    // Tickets in NEW or CANCELLED may be unassigned; others can be assigned to Alice or Bob
    const ownerId = (status === "NEW" || i % 4 === 0) ? null : (i % 2 === 0 ? aliceId : bobId);

    // Fix Point 1: update: {} ensures we do NOT overwrite existing tickets
    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber },
      update: {},
      create: {
        ticketNumber,
        summary: `Fictional Ticket #${i}: System issue with ${sys.name}`,
        description: `Detailed description for test ticket #${i} concerning category ${cat.name} and system ${sys.name}.`,
        currentStatus: status,
        requestedPriority: prio,
        itPriority: prio,
        requesterId,
        categoryId: cat.id,
        relatedSystemId: sys.id,
        ticketOwnerId: ownerId,
        version: 1,
      },
    });

    // Sample comment on ticket 1 & 2
    if (i <= 2) {
      await prisma.publicComment.upsert({
        where: { seedKey: `seed-comment-${ticket.id}` },
        update: {},
        create: {
          ticketId: ticket.id,
          authorId: requesterId,
          content: `Initial update from user on ticket #${i}.`,
          seedKey: `seed-comment-${ticket.id}`,
        },
      });

      await prisma.internalNote.upsert({
        where: { seedKey: `seed-note-${ticket.id}` },
        update: {},
        create: {
          ticketId: ticket.id,
          authorId: aliceId,
          content: `Internal investigation note for ticket #${i}.`,
          seedKey: `seed-note-${ticket.id}`,
        },
      });
    }

    // 5. Seed Actions Taken (Lab 4 / P03 / AC-26)
    // Satisfies: 0 actions (NEW/some OPEN), 1 action (WAITING/REOPENED), >1 actions (RESOLVED/CLOSED)
    let numActions = 0;
    if (status === "RESOLVED" || status === "CLOSED") {
      numActions = (i % 2 === 0) ? 2 : 3;
    } else if (status === "IN_PROGRESS") {
      numActions = (i % 2 === 0) ? 2 : 1;
    } else if (status === "WAITING_FOR_REQUESTER" || status === "REOPENED") {
      numActions = 1;
    } else if (status === "OPEN" && i % 2 === 0) {
      numActions = 1;
    }

    for (let a = 1; a <= numActions; a++) {
      const followUpRequired = (a === 1 && i % 2 === 1);
      const followUpNote = followUpRequired
        ? `Scheduled follow-up verification check for ${sys.name} on ticket #${i}`
        : null;
      const attachmentNotes = (a === 2)
        ? `Refer to attached diagnostics log file.`
        : null;
      const actionPerformerId = (a % 2 === 0) ? bobId : aliceId;
      const actionDateTime = new Date(Date.now() - ((25 - i) * 3600000 * 2) - (a * 1800000));

      await prisma.actionTaken.upsert({
        where: { seedKey: `seed-action-${ticket.id}-${a}` },
        update: {},
        create: {
          ticketId: ticket.id,
          actionDateTime,
          description: `Action #${a}: Inspected and performed maintenance on ${sys.name} for ticket #${i}.`,
          result: `Step #${a} verified and diagnostic check passed.`,
          performedById: actionPerformerId,
          followUpRequired,
          followUpNote,
          attachmentNotes,
          seedKey: `seed-action-${ticket.id}-${a}`,
          version: 1,
        },
      });
    }
  }

  // Backfill: Ensure any existing legacy tickets in RESOLVED or CLOSED status have at least one Action Taken (Decision D2)
  const existingResolvedOrClosed = await prisma.ticket.findMany({
    where: {
      currentStatus: { in: ["RESOLVED", "CLOSED"] },
      actionsTaken: { none: {} },
    },
  });

  for (const t of existingResolvedOrClosed) {
    await prisma.actionTaken.upsert({
      where: { seedKey: `seed-action-backfill-${t.id}` },
      update: {},
      create: {
        ticketId: t.id,
        actionDateTime: t.updatedAt || new Date(),
        description: `Historical maintenance action for ticket ${t.ticketNumber}`,
        result: `Technical issue verified resolved.`,
        performedById: aliceId,
        followUpRequired: false,
        seedKey: `seed-action-backfill-${t.id}`,
        version: 1,
      },
    });
  }

  const totalActions = await prisma.actionTaken.count();

  return {
    categories: CATEGORIES.length,
    relatedSystems: RELATED_SYSTEMS.length,
    users: USERS.length,
    tickets: 24,
    actionsTaken: totalActions,
  };
}

async function main() {
  const prisma = getPrisma();
  const counts = await seedDatabase(prisma);
  console.log(
    `Seeded ${counts.categories} categories, ${counts.relatedSystems} systems, ${counts.users} users, ${counts.tickets} tickets.`
  );
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}