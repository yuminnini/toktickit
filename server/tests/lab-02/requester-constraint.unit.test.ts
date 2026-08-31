import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("RequesterUser email uniqueness constraint", () => {
    it("rejects creating a second requester with a duplicate email", async () => {
        const prisma = getPrisma();
        const email = `constraint-test-${Date.now()}@example.com`;

        await prisma.requesterUser.create({ data: { name: "Constraint Test A", email } });

        try {
            await expect(
                prisma.requesterUser.create({ data: { name: "Constraint Test B", email } })
            ).rejects.toThrow();
        } finally {
            await prisma.requesterUser.deleteMany({ where: { email } });
        }
    });
});