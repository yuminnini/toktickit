import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/requesters", () => {
    it("returns only active requesters, excluding inactive ones", async () => {
        const res = await request(app).get("/api/requesters");
        expect(res.status).toBe(200);

        const names = res.body.map((r: { name: string }) => r.name);
        expect(names).toContain("Jennifer Anderson");
        expect(names).not.toContain("Robert Wilson"); // seeded as inactive

        // no email field should be exposed
        expect(res.body[0]).not.toHaveProperty("email");
    });
});