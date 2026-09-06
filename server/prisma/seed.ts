import { getPrisma } from "../src/prisma.js";
import type { PrismaClient } from "@prisma/client";

const CATEGORIES = ["Account and Access", "Hardware", "Software", "Network"];

const RELATED_SYSTEMS = [
  "Email", "Campus Wi-Fi", "VPN", "LEB2 App",
  "Grade Submission App", "Printer", "Corporate Laptop",
];

const REQUESTERS: { name: string; email: string; active: boolean }[] = [
  { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", active: true },
  { name: "Michael Brown", email: "michael.brown@example.com", active: true },
  { name: "Sarah Johnson", email: "sarah.johnson@example.com", active: true },
  { name: "David Lee", email: "david.lee@example.com", active: true },
  { name: "Robert Wilson", email: "robert.wilson@example.com", active: false },
];

export async function seedDatabase(prisma: PrismaClient) {
  for (const name of CATEGORIES) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const name of RELATED_SYSTEMS) {
    await prisma.relatedSystem.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const r of REQUESTERS) {
    await prisma.requesterUser.upsert({
      where: { email: r.email },
      update: {},
      create: { name: r.name, email: r.email, active: r.active },
    });
  }
  return { categories: CATEGORIES.length, relatedSystems: RELATED_SYSTEMS.length, requesters: REQUESTERS.length };
}

async function main() {
  const prisma = getPrisma();
  const counts = await seedDatabase(prisma);
  console.log(
    `Seeded ${counts.categories} categories, ${counts.relatedSystems} related systems, ${counts.requesters} requesters.`
  );
}

// Run main() only when this file executes directly (`npx prisma db seed`),
// not when seedDatabase is imported elsewhere (e.g. from a test file).
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