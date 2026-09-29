import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/requesters (Decommissioned in Lab 3)", () => {
  it("returns 404 as requester enumeration is removed in Lab 3", async () => {
    const res = await request(app).get("/api/requesters");
    expect(res.status).toBe(404);
  });
});