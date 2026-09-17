import { getPrisma } from "../src/prisma.js";
import { hashPassword } from "../src/password.js";
import type { PrismaClient, Priority, TicketStatus, Role } from "@prisma/client";

const CATEGORIES = ["Account and Access", "Hardware", "Software", "Network"];

const RELATED_SYSTEMS = [
  "Email", "Campus Wi-Fi", "VPN", "LEB2 App",
  "Grade Submission App", "Printer", "Corporate Laptop",
];

export const SEEDED_USERS: {
  name: string;
  email: string;
  role: Role;
  active: boolean;
}[] = [
  // Requesters (4 active, 1 inactive)
  { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: "REQUESTER", active: true },
  { name: "Michael Brown", email: "michael.brown@example.com", role: "REQUESTER", active: true },
  { name: "Sarah Johnson", email: "sarah.johnson@example.com", role: "REQUESTER", active: true },
  { name: "David Lee", email: "david.lee@example.com", role: "REQUESTER", active: true },
  { name: "Robert Wilson", email: "robert.wilson@example.com", role: "REQUESTER", active: false },

  // IT Staff (3 active, 1 inactive)
  { name: "Alex Thompson", email: "staff.alex@example.com", role: "IT_STAFF", active: true },
  { name: "Charlie Evans", email: "staff.charlie@example.com", role: "IT_STAFF", active: true },
  { name: "Danielle Martinez", email: "staff.danielle@example.com", role: "IT_STAFF", active: true },
  { name: "Ian InactiveStaff", email: "staff.inactive@example.com", role: "IT_STAFF", active: false },

  // Administrator (2 active)
  { name: "Dr. Jogie Admin", email: "admin.jogie@example.com", role: "ADMINISTRATOR", active: true },
  { name: "Dr. Toey Admin", email: "admin.toey@example.com", role: "ADMINISTRATOR", active: true },
];

export const DEFAULT_INITIAL_PASSWORD = "Password1234!";

export async function seedDatabase(prisma: PrismaClient) {
  // 1. Categories
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 2. Related Systems
  for (const name of RELATED_SYSTEMS) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Pre-calculate hash for default initial password
  const initialHash = await hashPassword(DEFAULT_INITIAL_PASSWORD);

  // 3. Users: provision credentials for migrated users with null passwordHash and create new users idempotently
  const userMap = new Map<string, number>();
  for (const u of SEEDED_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      if (!existing.passwordHash) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            passwordHash: initialHash,
            mustChangePassword: true,
            role: u.role,
          },
        });
      }
      userMap.set(u.email, existing.id);
    } else {
      const user = await prisma.user.create({
        data: {
          name: u.name,
          email: u.email,
          role: u.role,
          active: u.active,
          passwordHash: initialHash,
          mustChangePassword: true,
          sessionVersion: 1,
        },
      });
      userMap.set(u.email, user.id);
    }
  }

  // Helper lookups
  const allCategories = await prisma.category.findMany();
  const allSystems = await prisma.relatedSystem.findMany();
  const catMap = new Map(allCategories.map((c) => [c.name, c.id]));
  const sysMap = new Map(allSystems.map((s) => [s.name, s.id]));

  const r1 = userMap.get("jennifer.anderson@example.com")!;
  const r2 = userMap.get("michael.brown@example.com")!;
  const r3 = userMap.get("sarah.johnson@example.com")!;
  const r4 = userMap.get("david.lee@example.com")!;

  const staff1 = userMap.get("staff.alex@example.com")!;
  const staff2 = userMap.get("staff.charlie@example.com")!;
  const staff3 = userMap.get("staff.danielle@example.com")!;

  const catAccount = catMap.get("Account and Access")!;
  const catHardware = catMap.get("Hardware")!;
  const catSoftware = catMap.get("Software")!;
  const catNetwork = catMap.get("Network")!;

  const sysEmail = sysMap.get("Email")!;
  const sysWifi = sysMap.get("Campus Wi-Fi")!;
  const sysVpn = sysMap.get("VPN")!;
  const sysLaptop = sysMap.get("Corporate Laptop")!;
  const sysPrinter = sysMap.get("Printer")!;
  const sysLeb2 = sysMap.get("LEB2 App")!;

  // 4. 24 Realistic Tickets spanning all 8 statuses, priorities, assigned/unassigned
  const ticketDefs: Array<{
    ticketNumber: string;
    requesterId: number;
    categoryId: number;
    relatedSystemId: number;
    summary: string;
    description: string;
    requestedPriority: Priority;
    itPriority: Priority;
    currentStatus: TicketStatus;
    ticketOwnerId: number | null;
  }> = [
    // 3 NEW (unassigned)
    {
      ticketNumber: "TKT-2026-000001",
      requesterId: r1,
      categoryId: catHardware,
      relatedSystemId: sysLaptop,
      summary: "Laptop battery drains quickly under light load",
      description: "My laptop battery is draining much faster than usual even when idle.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      ticketOwnerId: null,
    },
    {
      ticketNumber: "TKT-2026-000002",
      requesterId: r2,
      categoryId: catNetwork,
      relatedSystemId: sysVpn,
      summary: "Cannot connect to campus VPN from home",
      description: "Getting timeout error 800 when attempting to connect to VPN gateway.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "NEW",
      ticketOwnerId: null,
    },
    {
      ticketNumber: "TKT-2026-000003",
      requesterId: r3,
      categoryId: catAccount,
      relatedSystemId: sysEmail,
      summary: "Email mailbox storage quota warning",
      description: "Received warning that mailbox is 95% full. Need quota increase.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "NEW",
      ticketOwnerId: null,
    },

    // 4 OPEN (assigned)
    {
      ticketNumber: "TKT-2026-000004",
      requesterId: r1,
      categoryId: catSoftware,
      relatedSystemId: sysLeb2,
      summary: "Cannot upload assignment files to LEB2 App",
      description: "Upload fails with server error 500 when uploading PDF files over 5MB.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "OPEN",
      ticketOwnerId: staff1,
    },
    {
      ticketNumber: "TKT-2026-000005",
      requesterId: r4,
      categoryId: catHardware,
      relatedSystemId: sysPrinter,
      summary: "Printer on 3rd floor office is offline",
      description: "Network printer showing offline status for all workstations on floor 3.",
      requestedPriority: "MEDIUM",
      itPriority: "LOW",
      currentStatus: "OPEN",
      ticketOwnerId: staff2,
    },
    {
      ticketNumber: "TKT-2026-000006",
      requesterId: r2,
      categoryId: catNetwork,
      relatedSystemId: sysWifi,
      summary: "Campus Wi-Fi disconnects intermittently in Building A",
      description: "Connection drops every 10 minutes in room 301.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "OPEN",
      ticketOwnerId: staff3,
    },
    {
      ticketNumber: "TKT-2026-000007",
      requesterId: r3,
      categoryId: catAccount,
      relatedSystemId: sysEmail,
      summary: "Request new alias for research group",
      description: "Please create alias ai-research@kmutt.ac.th forwarding to 5 members.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "OPEN",
      ticketOwnerId: staff1,
    },

    // 4 IN_PROGRESS (assigned)
    {
      ticketNumber: "TKT-2026-000008",
      requesterId: r1,
      categoryId: catHardware,
      relatedSystemId: sysLaptop,
      summary: "External monitor not detected via HDMI dock",
      description: "Docking station dual display stopped working after firmware update.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
      ticketOwnerId: staff1,
    },
    {
      ticketNumber: "TKT-2026-000009",
      requesterId: r2,
      categoryId: catSoftware,
      relatedSystemId: sysLeb2,
      summary: "Grade submission export format corrupted",
      description: "CSV export generates unreadable characters for Thai student names.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
      ticketOwnerId: staff2,
    },
    {
      ticketNumber: "TKT-2026-000010",
      requesterId: r3,
      categoryId: catNetwork,
      relatedSystemId: sysVpn,
      summary: "Slow speeds through VPN gateway",
      description: "Bandwidth drops below 1 Mbps when connected to campus VPN.",
      requestedPriority: "MEDIUM",
      itPriority: "LOW",
      currentStatus: "IN_PROGRESS",
      ticketOwnerId: staff3,
    },
    {
      ticketNumber: "TKT-2026-000011",
      requesterId: r4,
      categoryId: catAccount,
      relatedSystemId: sysEmail,
      summary: "Password reset sync issue on mobile client",
      description: "Changed password on web portal, but phone email client cannot re-authenticate.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
      ticketOwnerId: staff1,
    },

    // 3 WAITING_FOR_REQUESTER (assigned)
    {
      ticketNumber: "TKT-2026-000012",
      requesterId: r1,
      categoryId: catSoftware,
      relatedSystemId: sysLaptop,
      summary: "Requesting software license key for IDE",
      description: "Need license key for development IDE on research laptop.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "WAITING_FOR_REQUESTER",
      ticketOwnerId: staff2,
    },
    {
      ticketNumber: "TKT-2026-000013",
      requesterId: r2,
      categoryId: catHardware,
      relatedSystemId: sysPrinter,
      summary: "Printer paper jam recurring in tray 2",
      description: "Every multi-page job jams at the pickup roller.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "WAITING_FOR_REQUESTER",
      ticketOwnerId: staff3,
    },
    {
      ticketNumber: "TKT-2026-000014",
      requesterId: r3,
      categoryId: catAccount,
      relatedSystemId: sysVpn,
      summary: "Request 2FA device reset for VPN token",
      description: "Lost phone with authenticator app. Need backup codes or reset.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "WAITING_FOR_REQUESTER",
      ticketOwnerId: staff1,
    },

    // 4 RESOLVED (assigned)
    {
      ticketNumber: "TKT-2026-000015",
      requesterId: r4,
      categoryId: catAccount,
      relatedSystemId: sysEmail,
      summary: "Spam filtering blocking legitimate conference invitations",
      description: "Important academic conference emails were going to quarantine.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "RESOLVED",
      ticketOwnerId: staff1,
    },
    {
      ticketNumber: "TKT-2026-000016",
      requesterId: r1,
      categoryId: catNetwork,
      relatedSystemId: sysWifi,
      summary: "Certificate error when connecting to eduroam",
      description: "Root certificate expired on MacOS device.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "RESOLVED",
      ticketOwnerId: staff2,
    },
    {
      ticketNumber: "TKT-2026-000017",
      requesterId: r2,
      categoryId: catHardware,
      relatedSystemId: sysLaptop,
      summary: "Replacement power adapter requested",
      description: "Power brick cable frayed near the connector.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "RESOLVED",
      ticketOwnerId: staff3,
    },
    {
      ticketNumber: "TKT-2026-000018",
      requesterId: r3,
      categoryId: catSoftware,
      relatedSystemId: sysLeb2,
      summary: "Course materials link broken on dashboard",
      description: "Hyperlink pointed to outdated semester archive.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "RESOLVED",
      ticketOwnerId: staff1,
    },

    // 2 CLOSED (assigned)
    {
      ticketNumber: "TKT-2026-000019",
      requesterId: r1,
      categoryId: catAccount,
      relatedSystemId: sysEmail,
      summary: "Annual account renewal confirmation",
      description: "Adjunct faculty account renewal completed for academic year 2026.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "CLOSED",
      ticketOwnerId: staff1,
    },
    {
      ticketNumber: "TKT-2026-000020",
      requesterId: r4,
      categoryId: catHardware,
      relatedSystemId: sysLaptop,
      summary: "RAM upgrade request for workstation",
      description: "Upgraded from 16GB to 32GB RAM completed and tested.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "CLOSED",
      ticketOwnerId: staff2,
    },

    // 2 REOPENED (assigned)
    {
      ticketNumber: "TKT-2026-000021",
      requesterId: r2,
      categoryId: catNetwork,
      relatedSystemId: sysVpn,
      summary: "VPN disconnection issue recurring after update",
      description: "Issue reoccurred after yesterday's OS patch. Reopening ticket.",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "REOPENED",
      ticketOwnerId: staff2,
    },
    {
      ticketNumber: "TKT-2026-000022",
      requesterId: r3,
      categoryId: catHardware,
      relatedSystemId: sysPrinter,
      summary: "Color calibration still off on poster printer",
      description: "Cyan prints as dark navy blue despite cartridge replacement.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "REOPENED",
      ticketOwnerId: staff3,
    },

    // 2 CANCELLED (1 unassigned, 1 assigned)
    {
      ticketNumber: "TKT-2026-000023",
      requesterId: r1,
      categoryId: catSoftware,
      relatedSystemId: sysLeb2,
      summary: "Accidental duplicate ticket submission",
      description: "Submitted twice by mistake. Please cancel this request.",
      requestedPriority: "LOW",
      itPriority: "LOW",
      currentStatus: "CANCELLED",
      ticketOwnerId: null,
    },
    {
      ticketNumber: "TKT-2026-000024",
      requesterId: r4,
      categoryId: catAccount,
      relatedSystemId: sysEmail,
      summary: "Password reset request - solved myself",
      description: "Remembered password right after submitting.",
      requestedPriority: "HIGH",
      itPriority: "LOW",
      currentStatus: "CANCELLED",
      ticketOwnerId: staff1,
    },
  ];

  for (const t of ticketDefs) {
    await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {}, // Idempotent
      create: {
        ticketNumber: t.ticketNumber,
        requesterId: t.requesterId,
        categoryId: t.categoryId,
        relatedSystemId: t.relatedSystemId,
        summary: t.summary,
        description: t.description,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        ticketOwnerId: t.ticketOwnerId,
        version: 1,
      },
    });
  }

  // 5. Sample Public Comments & Internal Notes (idempotent via seedKey)
  const ticket4 = await prisma.ticket.findUnique({ where: { ticketNumber: "TKT-2026-000004" } });
  if (ticket4) {
    await prisma.publicComment.upsert({
      where: { seedKey: "seed-comment-t4-1" },
      update: {},
      create: {
        ticketId: ticket4.id,
        authorId: staff1,
        content: "We are investigating the upload size limit on the LEB2 backend proxy.",
        seedKey: "seed-comment-t4-1",
      },
    });
    await prisma.publicComment.upsert({
      where: { seedKey: "seed-comment-t4-2" },
      update: {},
      create: {
        ticketId: ticket4.id,
        authorId: r1,
        content: "Thank you, I tried splitting the file into 2 parts and it went through.",
        seedKey: "seed-comment-t4-2",
      },
    });
    await prisma.internalNote.upsert({
      where: { seedKey: "seed-note-t4-1" },
      update: {},
      create: {
        ticketId: ticket4.id,
        authorId: staff1,
        content: "Nginx client_max_body_size is set to 5M on staging proxy. Need ops to bump to 20M.",
        seedKey: "seed-note-t4-1",
      },
    });
  }

  const ticket8 = await prisma.ticket.findUnique({ where: { ticketNumber: "TKT-2026-000008" } });
  if (ticket8) {
    await prisma.publicComment.upsert({
      where: { seedKey: "seed-comment-t8-1" },
      update: {},
      create: {
        ticketId: ticket8.id,
        authorId: staff1,
        content: "DisplayLink driver 1.10 was deployed to test laptop.",
        seedKey: "seed-comment-t8-1",
      },
    });
    await prisma.internalNote.upsert({
      where: { seedKey: "seed-note-t8-1" },
      update: {},
      create: {
        ticketId: ticket8.id,
        authorId: staff1,
        content: "User confirmed monitor worked after cold dock power cycle.",
        seedKey: "seed-note-t8-1",
      },
    });
  }

  return {
    categories: CATEGORIES.length,
    relatedSystems: RELATED_SYSTEMS.length,
    users: SEEDED_USERS.length,
    tickets: ticketDefs.length,
  };
}

async function main() {
  const prisma = getPrisma();
  const counts = await seedDatabase(prisma);
  console.log(
    `Seeded ${counts.categories} categories, ${counts.relatedSystems} related systems, ${counts.users} users, ${counts.tickets} tickets.`
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