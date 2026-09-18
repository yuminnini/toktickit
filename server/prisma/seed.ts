import { getPrisma } from "../src/prisma.js";
import type { PrismaClient, Priority, TicketStatus, Role } from "@prisma/client";
import { hashPassword } from "../src/services/password.js";

const CATEGORIES = ["Account and Access", "Hardware", "Software", "Network"];

const RELATED_SYSTEMS = [
  "Email", "Campus Wi-Fi", "VPN", "LEB2 App",
  "Grade Submission App", "Printer", "Corporate Laptop",
];

export const INITIAL_SEED_PASSWORD = "InitialPass123!";

interface SeedUser {
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

const USERS: SeedUser[] = [
  // Administrators (>= 1 active)
  { name: "System Administrator", email: "admin@example.com", role: "ADMINISTRATOR", active: true },

  // IT Staff (>= 3 active, >= 1 inactive)
  { name: "Alice IT Support", email: "staff.alice@example.com", role: "IT_STAFF", active: true },
  { name: "Bob Network Tech", email: "staff.bob@example.com", role: "IT_STAFF", active: true },
  { name: "Charlie Systems", email: "staff.charlie@example.com", role: "IT_STAFF", active: true },
  { name: "Dana Former Staff", email: "staff.dana@example.com", role: "IT_STAFF", active: false },

  // Requesters (>= 4 active, >= 1 inactive)
  { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "REQUESTER", active: true },
  { name: "Michael Brown", email: "michael.brown@example.com", role: "REQUESTER", active: true },
  { name: "Sarah Johnson", email: "sarah.johnson@example.com", role: "REQUESTER", active: true },
  { name: "David Lee", email: "david.lee@example.com", role: "REQUESTER", active: true },
  { name: "Robert Wilson", email: "robert.wilson@example.com", role: "REQUESTER", active: false },
];

export async function seedDatabase(prisma: PrismaClient) {
  // 1. Categories
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 2. Related Systems
  for (const name of RELATED_SYSTEMS) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 3. Users (idempotent: does not overwrite changed passwords)
  const defaultHash = await hashPassword(INITIAL_SEED_PASSWORD);
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
          mustChangePassword: true,
          sessionVersion: 1,
        },
      });
      userMap.set(u.email, created.id);
    } else {
      // Update metadata without wiping passwordHash or mustChangePassword
      const updated = await prisma.user.update({
        where: { email: u.email },
        data: {
          name: u.name,
          role: u.role,
          active: u.active,
          // If existing user has no passwordHash (legacy migrated), set initial
          ...(existing.passwordHash ? {} : { passwordHash: defaultHash, mustChangePassword: true }),
        },
      });
      userMap.set(u.email, updated.id);
    }
  }

  const categories = await prisma.category.findMany();
  const systems = await prisma.relatedSystem.findMany();
  const jenniferId = userMap.get("jennifer.anderson@example.com")!;
  const michaelId = userMap.get("michael.brown@example.com")!;
  const sarahId = userMap.get("sarah.johnson@example.com")!;
  const aliceId = userMap.get("staff.alice@example.com")!;
  const bobId = userMap.get("staff.bob@example.com")!;

  // 4. 24 Fictional Tickets across all 8 statuses and all priorities
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
    const ticketNumStr = String(i).padStart(6, "0");
    const ticketNumber = `TKT-2026-${ticketNumStr}`;
    const status = allStatuses[(i - 1) % allStatuses.length];
    const prio = priorities[(i - 1) % priorities.length];
    const cat = categories[(i - 1) % categories.length];
    const sys = systems[(i - 1) % systems.length];
    const requesterId = (i % 3 === 0) ? sarahId : (i % 2 === 0) ? michaelId : jenniferId;

    // Tickets in NEW or CANCELLED may be unassigned; others can be assigned to Alice or Bob
    const ownerId = (status === "NEW" || i % 4 === 0) ? null : (i % 2 === 0 ? aliceId : bobId);

    const ticket = await prisma.ticket.upsert({
      where: { ticketNumber },
      update: {
        summary: `Fictional Ticket #${i}: System issue with ${sys.name}`,
        description: `Detailed description for test ticket #${i} concerning category ${cat.name} and system ${sys.name}.`,
        currentStatus: status,
        requestedPriority: prio,
        itPriority: prio,
        ticketOwnerId: ownerId,
      },
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
  }

  return {
    categories: CATEGORIES.length,
    relatedSystems: RELATED_SYSTEMS.length,
    users: USERS.length,
    tickets: 24,
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