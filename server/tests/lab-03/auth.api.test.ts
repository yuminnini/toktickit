import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/services/password.js";
import { resetLoginRateLimiter } from "../../src/services/rateLimiter.js";

describe("P04: Authentication Backend API & Session Lifecycle", () => {
  const prisma = getPrisma();
  const allowedOrigin = process.env.APP_ORIGIN || "http://localhost:5173";
  const validPassword = "InitialPass123!";
  const testEmail = "jennifer.anderson@example.com";

  beforeAll(async () => {
    const hash = await hashPassword(validPassword);
    await prisma.user.upsert({
      where: { email: testEmail },
      update: { passwordHash: hash, active: true },
      create: {
        name: "Jennifer Anderson",
        email: testEmail,
        role: "REQUESTER",
        active: true,
        passwordHash: hash,
        mustChangePassword: true,
      },
    });
  });

  beforeEach(async () => {
    resetLoginRateLimiter();
  });

  describe("T01 / AC-01: Login Success & Session Cookie", () => {
    it("logs in active user with valid credentials, setting HTTP-only cookie and returning safe user profile", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email: "JENNIFER.ANDERSON@example.com ", password: validPassword });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("user");
      const user = res.body.user;
      expect(user.email).toBe(testEmail);
      expect(user.role).toBe("REQUESTER");
      expect(user.active).toBe(true);
      expect(user.mustChangePassword).toBeDefined();

      // Ensure no sensitive fields are leaked
      expect(user).not.toHaveProperty("passwordHash");
      expect(user).not.toHaveProperty("sessionVersion");
      expect(user).not.toHaveProperty("tokenHash");

      // Verify Set-Cookie header
      const rawCookies = res.headers["set-cookie"];
      expect(rawCookies).toBeDefined();
      const cookiesList: string[] = Array.isArray(rawCookies)
        ? rawCookies
        : typeof rawCookies === "string"
        ? [rawCookies]
        : [];
      const sessionCookie = cookiesList.find((c: string) => c.startsWith("toktickit_session="));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain("HttpOnly");
      expect(sessionCookie).toContain("Path=/");
      expect(sessionCookie).toContain("SameSite=Lax");
      expect(sessionCookie).toContain("Max-Age=28800");

      // Verify Cache-Control header
      expect(res.headers["cache-control"]).toContain("no-store");
    });
  });

  describe("T05 / AC-05: Uniform 401 for Invalid Credentials or Inactive User", () => {
    it("returns uniform 401 INVALID_CREDENTIALS for unknown email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email: "nonexistent@example.com", password: validPassword });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("INVALID_CREDENTIALS");
    });

    it("returns uniform 401 INVALID_CREDENTIALS for wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email: testEmail, password: "WrongPassword123!" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("INVALID_CREDENTIALS");
    });

    it("returns uniform 401 INVALID_CREDENTIALS for inactive account", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email: "robert.wilson@example.com", password: validPassword });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("T07 / AC-07: /api/auth/me", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error).toBe("UNAUTHENTICATED");
    });

    it("returns SafeUser when called with valid session cookie", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email: testEmail, password: validPassword });

      const cookie = loginRes.headers["set-cookie"]![0];

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe(testEmail);
      expect(meRes.body.user).not.toHaveProperty("passwordHash");
    });
  });

  describe("T08 / AC-08: Logout Session Invalidation", () => {
    it("invalidates session and clears cookie upon logout", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email: testEmail, password: validPassword });

      const cookie = loginRes.headers["set-cookie"]![0];

      // Get CSRF token
      const csrfRes = await request(app)
        .get("/api/auth/csrf")
        .set("Cookie", cookie);
      expect(csrfRes.status).toBe(200);
      const csrfToken = csrfRes.body.csrfToken;

      // Logout with CSRF token and Origin
      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Origin", allowedOrigin)
        .set("X-CSRF-Token", csrfToken)
        .set("Cookie", cookie);

      expect(logoutRes.status).toBe(204);

      // Attempting /api/auth/me with the revoked cookie now returns 401
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookie);

      expect(meRes.status).toBe(401);
    });
  });

  describe("T09 / AC-09: Login Rate Limiting", () => {
    it("returns 429 with Retry-After after 5 failed attempts in 15 minutes", async () => {
      const targetEmail = "rate-limit-test@example.com";

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post("/api/auth/login")
          .set("Origin", allowedOrigin)
          .send({ email: targetEmail, password: "WrongPassword123!" });
        expect(res.status).toBe(401);
      }

      // 6th attempt should be blocked with 429
      const blockedRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email: targetEmail, password: "WrongPassword123!" });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.error).toBe("TOO_MANY_ATTEMPTS");
      expect(blockedRes.headers["retry-after"]).toBeDefined();
      expect(parseInt(blockedRes.headers["retry-after"])).toBeGreaterThan(0);
    });
  });

  describe("T10 / AC-10: CSRF Protection", () => {
    it("rejects state-changing requests with foreign or missing Origin", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", "http://malicious-site.com")
        .send({ email: testEmail, password: validPassword });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe("CSRF_INVALID");
    });

    it("rejects authenticated mutation without X-CSRF-Token", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email: testEmail, password: validPassword });

      const cookie = loginRes.headers["set-cookie"]![0];

      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Origin", allowedOrigin)
        .set("Cookie", cookie)
        .send({
          currentPassword: validPassword,
          newPassword: "BrandNewSecurePassword123!",
          confirmPassword: "BrandNewSecurePassword123!",
        });

      expect(changeRes.status).toBe(403);
      expect(changeRes.body.error).toBe("CSRF_INVALID");
    });
  });

  describe("T02, T06 / AC-02, AC-06: Change Password Flow", () => {
    it("validates policy, enforces current password check, updates hash, clears flag and rotates session", async () => {
      // Provision dedicated test user for change-password
      const email = `cp-user-${Date.now()}@example.com`;
      const hash = await hashPassword("OldPassword123!");
      await prisma.user.create({
        data: {
          name: "Password Change Tester",
          email,
          role: "REQUESTER",
          active: true,
          passwordHash: hash,
          mustChangePassword: true,
          sessionVersion: 1,
        },
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email, password: "OldPassword123!" });

      const oldCookie = loginRes.headers["set-cookie"]![0];

      const csrfRes = await request(app)
        .get("/api/auth/csrf")
        .set("Cookie", oldCookie);
      const csrfToken = csrfRes.body.csrfToken;

      // Reject mismatch
      const mismatchRes = await request(app)
        .post("/api/auth/change-password")
        .set("Origin", allowedOrigin)
        .set("X-CSRF-Token", csrfToken)
        .set("Cookie", oldCookie)
        .send({
          currentPassword: "OldPassword123!",
          newPassword: "NewSecurePassword123!",
          confirmPassword: "DifferentPassword123!",
        });
      expect(mismatchRes.status).toBe(400);

      // Successful change
      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Origin", allowedOrigin)
        .set("X-CSRF-Token", csrfToken)
        .set("Cookie", oldCookie)
        .send({
          currentPassword: "OldPassword123!",
          newPassword: "NewSecurePassword123!",
          confirmPassword: "NewSecurePassword123!",
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.user.mustChangePassword).toBe(false);

      // New cookie issued
      const newCookie = changeRes.headers["set-cookie"]![0];
      expect(newCookie).toBeDefined();

      // Old cookie is revoked
      const oldSessionRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", oldCookie);
      expect(oldSessionRes.status).toBe(401);

      // New cookie is valid
      const newSessionRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", newCookie);
      expect(newSessionRes.status).toBe(200);
      expect(newSessionRes.body.user.mustChangePassword).toBe(false);
    });
  });

  describe("T11 / AC-11: Immediate Session Invalidation on User Deactivation or Role Change", () => {
    it("invalidates active session on next request when user active is set to false", async () => {
      const email = `deactivate-${Date.now()}@example.com`;
      const hash = await hashPassword(validPassword);
      const user = await prisma.user.create({
        data: {
          name: "Deactivation Tester",
          email,
          role: "REQUESTER",
          active: true,
          passwordHash: hash,
          mustChangePassword: false,
        },
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", allowedOrigin)
        .send({ email, password: validPassword });

      const cookie = loginRes.headers["set-cookie"]![0];

      // Deactivate user in DB
      await prisma.user.update({
        where: { id: user.id },
        data: { active: false },
      });

      // Next request must return 401
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookie);

      expect(meRes.status).toBe(401);
    });
  });
});
