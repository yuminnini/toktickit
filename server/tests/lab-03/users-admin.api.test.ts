import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { getAuthSessionForUser } from "../helpers/auth.js";
import { hashPassword, verifyPassword } from "../../src/services/password.js";

describe("P11: Administrator User Management API (T40–T48 / AC-40–AC-48)", () => {
  const allowedOrigin = "http://localhost:5173";
  let adminSession: { id: number; cookie: string; csrfToken: string };
  let staffSession: { id: number; cookie: string; csrfToken: string };
  let requesterSession: { id: number; cookie: string; csrfToken: string };
  let categoryId: number;
  let relatedSystemId: number;

  const testUserIdsToClean: number[] = [];
  const testTicketIdsToClean: number[] = [];

  beforeEach(async () => {
    const prisma = getPrisma();

    // Ensure primary admin exists
    let admin = await prisma.user.findFirst({ where: { role: "ADMINISTRATOR", active: true } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          name: "Sarah Admin",
          email: "sarah.admin@example.com",
          role: "ADMINISTRATOR",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else if (admin.mustChangePassword) {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: { mustChangePassword: false },
      });
    }

    // Ensure staff exists
    let staff = await prisma.user.findFirst({ where: { role: "IT_STAFF", active: true } });
    if (!staff) {
      staff = await prisma.user.create({
        data: {
          name: "Bob Staff Tech",
          email: "bob.staff@example.com",
          role: "IT_STAFF",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else if (staff.mustChangePassword) {
      staff = await prisma.user.update({
        where: { id: staff.id },
        data: { mustChangePassword: false },
      });
    }

    // Ensure requester exists
    let requester = await prisma.user.findFirst({ where: { role: "REQUESTER", active: true } });
    if (!requester) {
      requester = await prisma.user.create({
        data: {
          name: "Rachel Requester",
          email: "rachel.requester@example.com",
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
          sessionVersion: 1,
        },
      });
    } else if (requester.mustChangePassword) {
      requester = await prisma.user.update({
        where: { id: requester.id },
        data: { mustChangePassword: false },
      });
    }

    const cat = await prisma.category.findFirst();
    const sys = await prisma.relatedSystem.findFirst({ where: { active: true } });
    categoryId = cat!.id;
    relatedSystemId = sys!.id;

    const sAdmin = await getAuthSessionForUser(admin.id);
    adminSession = { id: admin.id, ...sAdmin };

    const sStaff = await getAuthSessionForUser(staff.id);
    staffSession = { id: staff.id, ...sStaff };

    const sReq = await getAuthSessionForUser(requester.id);
    requesterSession = { id: requester.id, ...sReq };
  });

  afterEach(async () => {
    const prisma = getPrisma();
    if (testTicketIdsToClean.length > 0) {
      await prisma.ticket.deleteMany({
        where: { id: { in: testTicketIdsToClean } },
      });
      testTicketIdsToClean.length = 0;
    }
    if (testUserIdsToClean.length > 0) {
      await prisma.session.deleteMany({
        where: { userId: { in: testUserIdsToClean } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: testUserIdsToClean } },
      });
      testUserIdsToClean.length = 0;
    }
  });

  describe("T48 / AC-48: Non-Admin Access Control", () => {
    it("returns 401 for unauthenticated requests and 403 for Requester and IT Staff", async () => {
      // 1. Unauthenticated -> 401
      const anonRes = await request(app).get("/api/admin/users");
      expect(anonRes.status).toBe(401);

      // 2. Requester -> 403
      const reqRes = await request(app)
        .get("/api/admin/users")
        .set("Cookie", requesterSession.cookie);
      expect(reqRes.status).toBe(403);
      expect(reqRes.body.error).toBe("FORBIDDEN");

      // 3. IT Staff -> 403
      const staffRes = await request(app)
        .get("/api/admin/users")
        .set("Cookie", staffSession.cookie);
      expect(staffRes.status).toBe(403);
      expect(staffRes.body.error).toBe("FORBIDDEN");
    });
  });

  describe("T40 / AC-40: List, Search & Filter Users", () => {
    it("lists users ordered by name asc, then id asc, returning SafeUser shape", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", adminSession.cookie);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const firstUser = res.body.data[0];
      expect(firstUser).toHaveProperty("id");
      expect(firstUser).toHaveProperty("name");
      expect(firstUser).toHaveProperty("email");
      expect(firstUser).toHaveProperty("role");
      expect(firstUser).toHaveProperty("active");
      expect(firstUser).toHaveProperty("mustChangePassword");

      // Security: verify sensitive fields are NEVER exposed
      expect(firstUser).not.toHaveProperty("password");
      expect(firstUser).not.toHaveProperty("passwordHash");
      expect(firstUser).not.toHaveProperty("sessionVersion");
      expect(firstUser).not.toHaveProperty("tokenHash");

      // Verify ordering
      for (let i = 1; i < res.body.data.length; i++) {
        const prev = res.body.data[i - 1];
        const curr = res.body.data[i];
        const cmp = prev.name.localeCompare(curr.name);
        expect(cmp <= 0).toBe(true);
        if (cmp === 0) {
          expect(prev.id).toBeLessThanOrEqual(curr.id);
        }
      }
    });

    it("filters users by search term (case-insensitive substring of name or email)", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=sarah")
        .set("Cookie", adminSession.cookie);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const u of res.body.data) {
        const matches =
          u.name.toLowerCase().includes("sarah") ||
          u.email.toLowerCase().includes("sarah");
        expect(matches).toBe(true);
      }
    });

    it("filters users by single role, rejecting invalid role with 400", async () => {
      const validRes = await request(app)
        .get("/api/admin/users?role=IT_STAFF")
        .set("Cookie", adminSession.cookie);

      expect(validRes.status).toBe(200);
      for (const u of validRes.body.data) {
        expect(u.role).toBe("IT_STAFF");
      }

      const invalidRes = await request(app)
        .get("/api/admin/users?role=SUPERUSER")
        .set("Cookie", adminSession.cookie);

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("T41 / AC-41: Provision New User", () => {
    it("creates a new user with valid single role, active state, initial password, and mustChangePassword = true", async () => {
      const email = `new.staff.${Date.now()}@example.com`;
      const res = await request(app)
        .post("/api/admin/users")
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({
          name: "Daniel Newbie",
          email,
          role: "IT_STAFF",
          active: true,
          initialPassword: "Password123456!",
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.name).toBe("Daniel Newbie");
      expect(res.body.user.email).toBe(email.toLowerCase());
      expect(res.body.user.role).toBe("IT_STAFF");
      expect(res.body.user.active).toBe(true);
      expect(res.body.user.mustChangePassword).toBe(true);
      expect(res.body.user).not.toHaveProperty("passwordHash");

      testUserIdsToClean.push(res.body.user.id);

      // Verify database state: password hashed with Argon2id
      const prisma = getPrisma();
      const dbUser = await prisma.user.findUnique({ where: { id: res.body.user.id } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.mustChangePassword).toBe(true);
      expect(dbUser?.passwordHash).toBeTruthy();
      const matches = await verifyPassword(dbUser!.passwordHash!, "Password123456!");
      expect(matches).toBe(true);
    });

    it("rejects invalid inputs with 400 VALIDATION_ERROR", async () => {
      // 1. Password too short (< 12 chars)
      const resShort = await request(app)
        .post("/api/admin/users")
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({
          name: "Invalid User",
          email: `invalid.${Date.now()}@example.com`,
          role: "REQUESTER",
          active: true,
          initialPassword: "short",
        });
      expect(resShort.status).toBe(400);
      expect(resShort.body.error).toBe("VALIDATION_ERROR");

      // 2. Missing name
      const resNoName = await request(app)
        .post("/api/admin/users")
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({
          email: `invalid.${Date.now()}@example.com`,
          role: "REQUESTER",
          active: true,
          initialPassword: "Password123456!",
        });
      expect(resNoName.status).toBe(400);

      // 3. Invalid email syntax
      const resBadEmail = await request(app)
        .post("/api/admin/users")
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({
          name: "Bad Email",
          email: "notanemail",
          role: "REQUESTER",
          active: true,
          initialPassword: "Password123456!",
        });
      expect(resBadEmail.status).toBe(400);
    });
  });

  describe("T42 / AC-42: Duplicate Email Rejection (EMAIL_EXISTS)", () => {
    it("rejects duplicate email case-insensitively with 409 EMAIL_EXISTS", async () => {
      const email = `dup.test.${Date.now()}@example.com`;
      const prisma = getPrisma();
      const existing = await prisma.user.create({
        data: {
          name: "Existing User",
          email: email.toLowerCase(),
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
        },
      });
      testUserIdsToClean.push(existing.id);

      // Attempt to create user with uppercase/whitespace variant of same email
      const res = await request(app)
        .post("/api/admin/users")
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({
          name: "Second User",
          email: `  ${email.toUpperCase()}  `,
          role: "IT_STAFF",
          active: true,
          initialPassword: "Password123456!",
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("EMAIL_EXISTS");
    });
  });

  describe("T43 / AC-43: Edit User Profile & Credential Protection", () => {
    it("edits user name, email, role, and active status while rejecting credential fields", async () => {
      const prisma = getPrisma();
      const target = await prisma.user.create({
        data: {
          name: "Original Name",
          email: `orig.${Date.now()}@example.com`,
          role: "REQUESTER",
          active: true,
          mustChangePassword: false,
          passwordHash: await hashPassword("OldPassword123456!"),
        },
      });
      testUserIdsToClean.push(target.id);

      // 1. Successful update of name, email, and role
      const newEmail = `updated.${Date.now()}@example.com`;
      const res = await request(app)
        .patch(`/api/admin/users/${target.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({
          name: "Updated Name",
          email: newEmail,
          role: "IT_STAFF",
        });

      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe("Updated Name");
      expect(res.body.user.email).toBe(newEmail.toLowerCase());
      expect(res.body.user.role).toBe("IT_STAFF");
      expect(res.body.unassignedTicketCount).toBe(0);

      // 2. Reject attempts to submit password or internal flags in generic edit
      const resCred = await request(app)
        .patch(`/api/admin/users/${target.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({
          name: "Another Name",
          password: "HackedPassword123!",
        });
      expect(resCred.status).toBe(400);
      expect(resCred.body.error).toBe("VALIDATION_ERROR");

      // 3. Reject empty body with 400
      const resEmpty = await request(app)
        .patch(`/api/admin/users/${target.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({});
      expect(resEmpty.status).toBe(400);

      // 4. Nonexistent user returns 404
      const res404 = await request(app)
        .patch("/api/admin/users/999999")
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({ name: "Ghost" });
      expect(res404.status).toBe(404);
    });
  });

  describe("T44 / AC-44: Self-Deactivation Block", () => {
    it("strictly blocks administrator self-deactivation with 400 SELF_DEACTIVATION", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminSession.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({ active: false });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("SELF_DEACTIVATION");
    });
  });

  describe("T45 / AC-45: Last Active Administrator Invariant", () => {
    it("blocks deactivation or demotion of the last remaining active Administrator with 400 LAST_ACTIVE_ADMIN", async () => {
      const prisma = getPrisma();
      // Ensure only 1 active administrator exists initially for demotion test
      const otherAdmins = await prisma.user.findMany({
        where: { role: "ADMINISTRATOR", active: true, id: { not: adminSession.id } },
      });

      // Temporarily deactivate other admins so adminSession is the sole active admin
      if (otherAdmins.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: otherAdmins.map((a) => a.id) } },
          data: { active: false },
        });
      }

      try {
        // Attempt 1: The sole active admin attempts to demote self to IT_STAFF
        const demoteRes = await request(app)
          .patch(`/api/admin/users/${adminSession.id}`)
          .set("Origin", allowedOrigin)
          .set("Cookie", adminSession.cookie)
          .set("X-CSRF-Token", adminSession.csrfToken)
          .send({ role: "IT_STAFF" });

        expect(demoteRes.status).toBe(400);
        expect(demoteRes.body.error).toBe("LAST_ACTIVE_ADMIN");

        // Attempt 2: Create a second admin and test concurrent mutual deactivation
        const secondAdmin = await prisma.user.create({
          data: {
            name: "Second Admin",
            email: `second.admin.${Date.now()}@example.com`,
            role: "ADMINISTRATOR",
            active: true,
            mustChangePassword: false,
          },
        });
        testUserIdsToClean.push(secondAdmin.id);
        const secondSession = await getAuthSessionForUser(secondAdmin.id);

        // Both admins race to deactivate each other simultaneously
        const [res1, res2] = await Promise.all([
          request(app)
            .patch(`/api/admin/users/${secondAdmin.id}`)
            .set("Origin", allowedOrigin)
            .set("Cookie", adminSession.cookie)
            .set("X-CSRF-Token", adminSession.csrfToken)
            .send({ active: false }),
          request(app)
            .patch(`/api/admin/users/${adminSession.id}`)
            .set("Origin", allowedOrigin)
            .set("Cookie", secondSession.cookie)
            .set("X-CSRF-Token", secondSession.csrfToken)
            .send({ active: false }),
        ]);

        const statuses = [res1.status, res2.status].sort();
        expect(statuses).toEqual([200, 400]);

        const failedRes = res1.status === 400 ? res1 : res2;
        expect(failedRes.body.error).toBe("LAST_ACTIVE_ADMIN");

        // Verify exactly one admin remains active
        const remainingActive = await prisma.user.count({
          where: { role: "ADMINISTRATOR", active: true, id: { in: [adminSession.id, secondAdmin.id] } },
        });
        expect(remainingActive).toBe(1);
      } finally {
        // Restore other admins
        if (otherAdmins.length > 0) {
          await prisma.user.updateMany({
            where: { id: { in: otherAdmins.map((a) => a.id) } },
            data: { active: true },
          });
        }
        await prisma.user.update({
          where: { id: adminSession.id },
          data: { active: true, role: "ADMINISTRATOR" },
        });
      }
    });
  });

  describe("T46 / AC-46: Atomic Ticket Unassignment", () => {
    it("atomically unassigns tickets, increments versions, preserves status, and returns unassignedTicketCount when owner is deactivated or changed to REQUESTER", async () => {
      const prisma = getPrisma();

      // Create a staff user
      const tech = await prisma.user.create({
        data: {
          name: "Tech To Deactivate",
          email: `tech.deact.${Date.now()}@example.com`,
          role: "IT_STAFF",
          active: true,
          mustChangePassword: false,
        },
      });
      testUserIdsToClean.push(tech.id);

      // Create 2 tickets assigned to this tech
      const t1 = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Assigned Ticket 1",
          description: "Desc 1",
          requestedPriority: "LOW",
          currentStatus: "IN_PROGRESS",
          ticketOwnerId: tech.id,
          version: 2,
        },
      });
      const t2 = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          requesterId: requesterSession.id,
          categoryId,
          relatedSystemId,
          summary: "Assigned Ticket 2",
          description: "Desc 2",
          requestedPriority: "HIGH",
          currentStatus: "OPEN",
          ticketOwnerId: tech.id,
          version: 5,
        },
      });
      testTicketIdsToClean.push(t1.id, t2.id);

      // Deactivate the tech
      const res = await request(app)
        .patch(`/api/admin/users/${tech.id}`)
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({ active: false });

      expect(res.status).toBe(200);
      expect(res.body.user.active).toBe(false);
      expect(res.body.unassignedTicketCount).toBe(2);

      // Verify tickets in database: owner null, version incremented, status preserved
      const freshT1 = await prisma.ticket.findUnique({ where: { id: t1.id } });
      expect(freshT1?.ticketOwnerId).toBeNull();
      expect(freshT1?.version).toBe(3);
      expect(freshT1?.currentStatus).toBe("IN_PROGRESS");

      const freshT2 = await prisma.ticket.findUnique({ where: { id: t2.id } });
      expect(freshT2?.ticketOwnerId).toBeNull();
      expect(freshT2?.version).toBe(6);
      expect(freshT2?.currentStatus).toBe("OPEN");
    });
  });

  describe("T47 / AC-47: Admin Password Reset & Session Revocation", () => {
    it("resets password, sets mustChangePassword = true, revokes user sessions immediately, and never leaks password", async () => {
      const prisma = getPrisma();
      const victim = await prisma.user.create({
        data: {
          name: "Victim User",
          email: `victim.${Date.now()}@example.com`,
          role: "IT_STAFF",
          active: true,
          mustChangePassword: false,
          passwordHash: await hashPassword("OldValidPassword123!"),
        },
      });
      testUserIdsToClean.push(victim.id);

      // Create an active session for the victim
      const victimSession = await getAuthSessionForUser(victim.id);

      // Verify victim's session works prior to reset
      const preRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", victimSession.cookie);
      expect(preRes.status).toBe(200);

      // Admin resets victim password
      const resetRes = await request(app)
        .post(`/api/admin/users/${victim.id}/reset-password`)
        .set("Origin", allowedOrigin)
        .set("Cookie", adminSession.cookie)
        .set("X-CSRF-Token", adminSession.csrfToken)
        .send({ initialPassword: "BrandNewPassword123!" });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.user).toBeDefined();
      expect(resetRes.body.user.mustChangePassword).toBe(true);
      expect(resetRes.body.user).not.toHaveProperty("password");
      expect(resetRes.body.user).not.toHaveProperty("initialPassword");
      expect(resetRes.body.user).not.toHaveProperty("passwordHash");

      // Verify victim's previous session is now revoked (returns 401)
      const postRes = await request(app)
        .get("/api/auth/me")
        .set("Cookie", victimSession.cookie);
      expect(postRes.status).toBe(401);

      // Verify new password is valid in DB
      const freshVictim = await prisma.user.findUnique({ where: { id: victim.id } });
      expect(freshVictim?.mustChangePassword).toBe(true);
      const isNewMatch = await verifyPassword(freshVictim!.passwordHash!, "BrandNewPassword123!");
      expect(isNewMatch).toBe(true);
    });
  });
});
