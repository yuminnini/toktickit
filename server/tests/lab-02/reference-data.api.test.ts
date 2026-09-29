import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getAuthCookieForUser } from "../helpers/auth.js";

describe("GET /api/related-systems", () => {
  let authCookie: string;

  beforeAll(async () => {
    const user = await getPrisma().user.findFirst({ where: { active: true, mustChangePassword: false } });
    authCookie = await getAuthCookieForUser(user!.id);
  });

  it("returns active related systems in predictable order", async () => {
    const res = await request(app)
      .get("/api/related-systems")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(6);

    const names = res.body.map((s: { name: string }) => s.name);
    expect(names).toContain("Corporate Laptop");
    expect(names).toContain("Email");
    expect(names).toContain("Campus Wi-Fi");

    // Check item structure
    const first = res.body[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("name");
  });
});
