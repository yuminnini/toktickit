import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getAuthCookieForUser } from "../helpers/auth.js";

describe("GET /api/categories", () => {
  let authCookie: string;

  beforeAll(async () => {
    const user = await getPrisma().user.findFirst({ where: { active: true, mustChangePassword: false } });
    authCookie = await getAuthCookieForUser(user!.id);
  });

  it("returns the four seeded categories in id order", async () => {
    const res = await request(app)
      .get("/api/categories")
      .set("Cookie", authCookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ]);
  });
});