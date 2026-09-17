import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/password.js";
import { seedDatabase, DEFAULT_INITIAL_PASSWORD } from "../../prisma/seed.js";
import { ensureTestHarnessReady } from "../../src/harness-guard.js";
import { loginRateLimiter } from "../../src/rate-limiter.js";
import { SESSION_COOKIE_NAME } from "../../src/session-service.js";

describe("Phase F2 / P04: Authentication API & Session Lifecycle (AC-01, AC-02, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10, AC-11)", () => {
  const prisma = getPrisma();

  beforeAll(async () => {
    await ensureTestHarnessReady();
    await seedDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    loginRateLimiter.clearAll();
  });

  describe("POST /api/auth/login", () => {
    it("AC-01: Active valid user logs in, receives HttpOnly cookie and SafeUser profile", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "jennifer.anderson@example.com",
          password: DEFAULT_INITIAL_PASSWORD,
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe("jennifer.anderson@example.com");
      expect(res.body.user.role).toBe("REQUESTER");
      expect(res.body.user.mustChangePassword).toBe(true);

      // Verify no sensitive fields returned
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.sessionVersion).toBeUndefined();

      // Verify Set-Cookie header
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const sessionCookie = cookies.find((c: string) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toMatch(/HttpOnly/i);
      expect(sessionCookie).toMatch(/SameSite=Lax/i);
      expect(sessionCookie).toMatch(/Max-Age=28800/i);
    });

    it("AC-05: Returns uniform 401 for wrong password, missing account, or inactive user", async () => {
      // 1. Wrong password
      const wrongPassRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "jennifer.anderson@example.com",
          password: "IncorrectPassword123!",
        });
      expect(wrongPassRes.status).toBe(401);
      expect(wrongPassRes.body.error).toBe("INVALID_CREDENTIALS");

      // 2. Non-existent account
      const nonExistentRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent.user@example.com",
          password: DEFAULT_INITIAL_PASSWORD,
        });
      expect(nonExistentRes.status).toBe(401);
      expect(nonExistentRes.body.error).toBe("INVALID_CREDENTIALS");

      // 3. Inactive account (Robert Wilson is inactive)
      const inactiveRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "robert.wilson@example.com",
          password: DEFAULT_INITIAL_PASSWORD,
        });
      expect(inactiveRes.status).toBe(401);
      expect(inactiveRes.body.error).toBe("INVALID_CREDENTIALS");
    });

    it("AC-09: Triggers 429 with Retry-After on 6th failed login attempt", async () => {
      const email = "rate.limit.test@example.com";

      // 5 failed attempts
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post("/api/auth/login")
          .send({ email, password: "WrongPassword123!" });
        expect(res.status).toBe(401);
      }

      // 6th attempt should be blocked
      const blockedRes = await request(app)
        .post("/api/auth/login")
        .send({ email, password: "WrongPassword123!" });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers["retry-after"]).toBeDefined();
      expect(Number(blockedRes.headers["retry-after"])).toBeGreaterThan(0);
      expect(blockedRes.body.error).toBe("TOO_MANY_ATTEMPTS");
    });
  });

  describe("GET /api/auth/me & GET /api/auth/csrf", () => {
    it("AC-07: /api/auth/me returns current user for valid session; 401 when unauthenticated", async () => {
      // Unauthenticated
      const unauthRes = await request(app).get("/api/auth/me");
      expect(unauthRes.status).toBe(401);
      expect(unauthRes.body.error).toBe("UNAUTHENTICATED");

      // Authenticated
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "staff.alex@example.com",
          password: DEFAULT_INITIAL_PASSWORD,
        });

      const cookie = loginRes.headers["set-cookie"];

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user.email).toBe("staff.alex@example.com");
      expect(meRes.body.user.role).toBe("IT_STAFF");
    });

    it("returns CSRF token for active session", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "staff.alex@example.com",
          password: DEFAULT_INITIAL_PASSWORD,
        });

      const cookie = loginRes.headers["set-cookie"];

      const csrfRes = await request(app)
        .get("/api/auth/csrf")
        .set("Cookie", cookie);

      expect(csrfRes.status).toBe(200);
      expect(typeof csrfRes.body.csrfToken).toBe("string");
      expect(csrfRes.body.csrfToken.length).toBeGreaterThanOrEqual(24);
    });
  });

  describe("POST /api/auth/change-password & Session Invalidation", () => {
    it("AC-02, AC-06, AC-10: Changes password successfully, rotates session, updates mustChangePassword flag", async () => {
      // Create a test user for password change
      const testEmail = `pwchange-test-${Date.now()}@example.com`;
      const initialHash = await hashPassword("InitialPass1234!");
      const user = await prisma.user.create({
        data: {
          name: "Password Changer",
          email: testEmail,
          role: "REQUESTER",
          active: true,
          passwordHash: initialHash,
          mustChangePassword: true,
          sessionVersion: 1,
        },
      });

      // Login
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: testEmail, password: "InitialPass1234!" });

      const cookie = loginRes.headers["set-cookie"];

      // Get CSRF token
      const csrfRes = await request(app)
        .get("/api/auth/csrf")
        .set("Cookie", cookie);
      const csrfToken = csrfRes.body.csrfToken;

      // Try change password without CSRF -> 403 (AC-10)
      const noCsrfRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .send({
          currentPassword: "InitialPass1234!",
          newPassword: "BrandNewPassword123!",
          confirmPassword: "BrandNewPassword123!",
        });
      expect(noCsrfRes.status).toBe(403);
      expect(noCsrfRes.body.error).toBe("CSRF_INVALID");

      // Change with CSRF -> 200
      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .set("X-CSRF-Token", csrfToken)
        .send({
          currentPassword: "InitialPass1234!",
          newPassword: "BrandNewPassword123!",
          confirmPassword: "BrandNewPassword123!",
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.user.mustChangePassword).toBe(false);

      // Old cookie is revoked
      const oldSessionCheck = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookie);
      expect(oldSessionCheck.status).toBe(401);

      // New cookie issued
      const newCookie = changeRes.headers["set-cookie"];
      const newSessionCheck = await request(app)
        .get("/api/auth/me")
        .set("Cookie", newCookie);
      expect(newSessionCheck.status).toBe(200);
      expect(newSessionCheck.body.user.mustChangePassword).toBe(false);
    });

    it("AC-08: POST /api/auth/logout invalidates session and clears cookie", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "admin.jogie@example.com",
          password: DEFAULT_INITIAL_PASSWORD,
        });

      const cookie = loginRes.headers["set-cookie"];
      const csrfRes = await request(app).get("/api/auth/csrf").set("Cookie", cookie);
      const csrfToken = csrfRes.body.csrfToken;

      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookie)
        .set("X-CSRF-Token", csrfToken);

      expect(logoutRes.status).toBe(204);

      // Verify cookie was invalidated
      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", cookie);
      expect(meRes.status).toBe(401);
    });

    it("AC-11: Deactivating an account immediately invalidates existing sessions", async () => {
      const testEmail = `deact-test-${Date.now()}@example.com`;
      const user = await prisma.user.create({
        data: {
          name: "To Deactivate",
          email: testEmail,
          role: "REQUESTER",
          active: true,
          passwordHash: await hashPassword(DEFAULT_INITIAL_PASSWORD),
          mustChangePassword: false,
        },
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: testEmail, password: DEFAULT_INITIAL_PASSWORD });
      const cookie = loginRes.headers["set-cookie"];

      // Verify session works
      const meBefore = await request(app).get("/api/auth/me").set("Cookie", cookie);
      expect(meBefore.status).toBe(200);

      // Deactivate user in database
      await prisma.user.update({
        where: { id: user.id },
        data: { active: false },
      });

      // Session should immediately fail
      const meAfter = await request(app).get("/api/auth/me").set("Cookie", cookie);
      expect(meAfter.status).toBe(401);
    });
  });
});
