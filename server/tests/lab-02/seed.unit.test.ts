import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { seedDatabase } from "../../prisma/seed.js";

describe("Lab 2 seed idempotency", () => {
    it("running the seed twice does not create duplicate rows", async () => {
        const prisma = getPrisma();

        await seedDatabase(prisma);
        const categoriesFirst = await prisma.category.count();
        const relatedSystemsFirst = await prisma.relatedSystem.count();
        const requestersFirst = await prisma.requesterUser.count();

        await seedDatabase(prisma);

        expect(await prisma.category.count()).toBe(categoriesFirst);
        expect(await prisma.relatedSystem.count()).toBe(relatedSystemsFirst);
        expect(await prisma.requesterUser.count()).toBe(requestersFirst);
    });
});