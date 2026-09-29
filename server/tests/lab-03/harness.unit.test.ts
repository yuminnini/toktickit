import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import {
  validateDatabaseUrl,
  validateUploadDir,
  validatePort,
  TestHarnessRegistry,
  ensureTestHarnessReady,
  assertCleanupSucceeded,
  ResponseRegistrationTracker,
} from "../../src/harness-guard.js";

describe("HARNESS-01: Test Harness Isolation Guard", () => {
  const workspaceRoot = path.resolve(__dirname, "../../..");

  describe("Database URL Isolation", () => {
    it("rejects empty or missing DATABASE_URL", () => {
      expect(validateDatabaseUrl("").valid).toBe(false);
      expect(validateDatabaseUrl(undefined).valid).toBe(false);
    });

    it("rejects non-postgres protocols", () => {
      const result = validateDatabaseUrl("http://localhost:5432/toktickit_test");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Invalid protocol/);
    });

    it("rejects non-local hostnames (remote/cloud databases)", () => {
      const remoteUrl = "postgresql://toktickit:toktickit@remote-prod-db.aws.com:5432/toktickit_test";
      const result = validateDatabaseUrl(remoteUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/not an authorized local test host/);
    });

    it("rejects development database 'toktickit'", () => {
      const devUrl = "postgresql://toktickit:toktickit@localhost:5233/toktickit?schema=public";
      const result = validateDatabaseUrl(devUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/development or system database/);
    });

    it("rejects system databases 'postgres', 'template0', and 'template1'", () => {
      expect(validateDatabaseUrl("postgresql://toktickit:toktickit@localhost:5233/postgres").valid).toBe(false);
      expect(validateDatabaseUrl("postgresql://toktickit:toktickit@localhost:5233/template1").valid).toBe(false);
      expect(validateDatabaseUrl("postgresql://toktickit:toktickit@localhost:5233/template0").valid).toBe(false);
    });

    it("rejects databases lacking explicit test naming convention", () => {
      const result = validateDatabaseUrl("postgresql://toktickit:toktickit@localhost:5233/production_app");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/does not follow the required isolated test database naming convention/);
    });

    it("rejects database names containing 'test' as a substring inside another word (e.g. 'contest', 'fastest')", () => {
      const contestResult = validateDatabaseUrl("postgresql://toktickit:toktickit@localhost:5233/contest");
      expect(contestResult.valid).toBe(false);
      expect(contestResult.error).toMatch(/does not follow the required isolated test database naming convention/);

      const fastestResult = validateDatabaseUrl("postgresql://toktickit:toktickit@localhost:5233/fastest");
      expect(fastestResult.valid).toBe(false);
      expect(fastestResult.error).toMatch(/does not follow the required isolated test database naming convention/);
    });

    it("accepts valid isolated test database 'toktickit_test' on localhost/127.0.0.1", () => {
      const testUrl = "postgresql://toktickit:toktickit@localhost:5233/toktickit_test?schema=public";
      const result = validateDatabaseUrl(testUrl);
      expect(result.valid).toBe(true);
      expect(result.dbName).toBe("toktickit_test");
    });

    it("accepts valid isolated test database 'toktickit_shadow'", () => {
      const shadowUrl = "postgresql://toktickit:toktickit@127.0.0.1:5233/toktickit_shadow?schema=public";
      const result = validateDatabaseUrl(shadowUrl);
      expect(result.valid).toBe(true);
      expect(result.dbName).toBe("toktickit_shadow");
    });
  });

  describe("Upload Directory Isolation", () => {
    it("rejects empty upload directory", () => {
      expect(validateUploadDir("").valid).toBe(false);
      expect(validateUploadDir(undefined).valid).toBe(false);
    });

    it("rejects drive root as upload directory", () => {
      const rootPath = path.parse(process.cwd()).root;
      const result = validateUploadDir(rootPath);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/cannot be the root/);
    });

    it("rejects project workspace root itself as upload directory", () => {
      const result = validateUploadDir(".", workspaceRoot);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/cannot be the project workspace root/);
    });

    it("rejects colliding with development upload directories directly", () => {
      const devUpload1 = path.resolve(workspaceRoot, "uploads");
      const result1 = validateUploadDir(devUpload1, workspaceRoot);
      expect(result1.valid).toBe(false);
      expect(result1.error).toMatch(/collides with.*development upload directory/);

      const devUpload2 = path.resolve(workspaceRoot, "server", "uploads");
      const result2 = validateUploadDir(devUpload2, workspaceRoot);
      expect(result2.valid).toBe(false);
      expect(result2.error).toMatch(/collides with.*development upload directory/);
    });

    it("rejects subdirectories inside development upload directories (e.g. server/uploads/attachments)", () => {
      const subDevUpload = path.resolve(workspaceRoot, "server", "uploads", "attachments");
      const result = validateUploadDir(subDevUpload, workspaceRoot);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/collides with.*development upload directory/);
    });

    it("rejects path escaping workspace root", () => {
      const escaped = path.resolve(workspaceRoot, "..", "outside_uploads");
      const result = validateUploadDir(escaped, workspaceRoot);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/escapes the project workspace root/);
    });

    it("rejects directory junctions or symlinks pointing into development upload directory", () => {
      const junctionPath = path.resolve(workspaceRoot, "scratch_test_junction");
      const devTarget = path.resolve(workspaceRoot, "server", "uploads");
      if (!fs.existsSync(devTarget)) {
        fs.mkdirSync(devTarget, { recursive: true });
      }

      try {
        fs.symlinkSync(devTarget, junctionPath, "junction");
        const result = validateUploadDir(junctionPath, workspaceRoot);
        expect(result.valid).toBe(false);
        expect(result.error).toMatch(/collides with.*development upload directory/);
      } finally {
        if (fs.existsSync(junctionPath)) {
          try {
            fs.rmdirSync(junctionPath);
          } catch {
            fs.unlinkSync(junctionPath);
          }
        }
      }
    });

    it("rejects parent directories enclosing development upload directory (e.g. server/ or server)", () => {
      const serverDir = path.resolve(workspaceRoot, "server");
      const result1 = validateUploadDir(serverDir, workspaceRoot);
      expect(result1.valid).toBe(false);

      const serverSlash = "server/";
      const result2 = validateUploadDir(serverSlash, workspaceRoot);
      expect(result2.valid).toBe(false);
    });

    it("rejects critical project source directories (e.g. client, e2e)", () => {
      const clientDir = path.resolve(workspaceRoot, "client");
      const result = validateUploadDir(clientDir, workspaceRoot);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/project source\/root directory/);
    });

    it("accepts valid isolated test upload directory", () => {
      const testUpload = path.resolve(workspaceRoot, "server", "uploads_test");
      const result = validateUploadDir(testUpload, workspaceRoot);
      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe(testUpload);
    });
  });

  describe("Port Availability", () => {
    it("rejects ports outside valid range", async () => {
      const result = await validatePort(80);
      expect(result.available).toBe(false);
    });

    it("identifies available ephemeral test port", async () => {
      const result = await validatePort(3103);
      expect(typeof result.available).toBe("boolean");
    });
  });

  describe("Deterministic Cleanup Registry", () => {
    const registry = new TestHarnessRegistry();
    const tempTestFile = path.resolve(os.tmpdir(), `toktickit_test_${Date.now()}.tmp`);

    beforeEach(() => {
      fs.writeFileSync(tempTestFile, "test-data");
    });

    afterEach(() => {
      if (fs.existsSync(tempTestFile)) {
        fs.unlinkSync(tempTestFile);
      }
    });

    it("cleans up registered files successfully", async () => {
      registry.registerFile(tempTestFile);
      expect(fs.existsSync(tempTestFile)).toBe(true);

      const result = await registry.runCleanup();
      expect(result.success).toBe(true);
      expect(result.cleanedFiles).toContain(tempTestFile);
      expect(fs.existsSync(tempTestFile)).toBe(false);
    });

    it("reports cleanup handler failures without swallowing", async () => {
      registry.registerCleanupHandler(() => {
        throw new Error("Simulated cleanup failure");
      });

      const result = await registry.runCleanup();
      expect(result.success).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].message).toBe("Simulated cleanup failure");
    });

    it("regression: reports uncleaned resources and assertCleanupSucceeded throws when unlinking fails", async () => {
      registry.registerCleanupHandler(() => {
        throw new Error("Disk permission denied when removing orphan file");
      });

      const result = await registry.runCleanup();
      expect(result.success).toBe(false);
      expect(result.uncleanedResources.length).toBeGreaterThan(0);
      expect(result.uncleanedResources[0]).toContain("Disk permission denied");

      // Verify that assertCleanupSucceeded throws with explicit resource diagnostics
      expect(() => assertCleanupSucceeded(result)).toThrow(/\[HARNESS-01 CLEANUP FAILED\]/);
    });

    it("regression: ResponseRegistrationTracker captures response IDs even when subsequent UI click action throws", async () => {
      const tracker = new ResponseRegistrationTracker();
      const mockResponse = {
        url: () => "http://localhost:3103/api/tickets",
        request: () => ({ method: () => "POST" }),
        ok: () => true,
        json: async () => ({ id: 999, ticketNumber: "TKT-2026-000999" }),
      };

      // Simulated user action that dispatches response via network listener but then throws in UI
      const failedUserAction = async () => {
        tracker.handleResponse(mockResponse);
        throw new Error("Simulated click timeout / element detached error");
      };

      // Action throws
      await expect(failedUserAction()).rejects.toThrow("Simulated click timeout / element detached error");

      // Teardown awaits pending response registrations
      await tracker.waitForRegistrations();

      // Verify ID and ticket number were reliably captured despite the thrown error
      expect(tracker.ticketIds).toContain(999);
      expect(tracker.ticketNumbers).toContain("TKT-2026-000999");
      expect(tracker.registrationErrors).toHaveLength(0);
    });

    it("regression: ResponseRegistrationTracker records registration errors when response.json() fails, failing teardown", async () => {
      const tracker = new ResponseRegistrationTracker();
      const mockFailedResponse = {
        url: () => "http://localhost:3103/api/tickets",
        request: () => ({ method: () => "POST" }),
        ok: () => true,
        json: async () => {
          throw new Error("Target page, context or browser has been closed");
        },
      };

      // Simulated network response whose body cannot be read because the page fixture was closed prematurely
      tracker.handleResponse(mockFailedResponse);
      await tracker.waitForRegistrations();

      // Verify that ticket ID could not be parsed, but the error is recorded in registrationErrors
      expect(tracker.ticketIds).toHaveLength(0);
      expect(tracker.registrationErrors.length).toBe(1);
      expect(tracker.registrationErrors[0]).toContain("Target page, context or browser has been closed");

      // Teardown inspects registrationErrors and must throw to prevent silent orphan tickets
      const assertTeardownSucceeded = () => {
        const cleanupErrors = [...tracker.registrationErrors];
        if (cleanupErrors.length > 0) {
          throw new Error(`[E2E CLEANUP FAILED] ${cleanupErrors.join("; ")}`);
        }
      };
      expect(assertTeardownSucceeded).toThrow(/\[E2E CLEANUP FAILED\].*Target page, context or browser has been closed/);
    });
  });

  describe("ensureTestHarnessReady Guard", () => {
    it("fails fast if database is pointing to development database", async () => {
      await expect(
        ensureTestHarnessReady({
          dbUrl: "postgresql://toktickit:toktickit@localhost:5233/toktickit?schema=public",
          uploadDir: "uploads_test",
          workspaceRoot,
        })
      ).rejects.toThrow(/HARNESS-01 GUARD FAILED/);
    });

    it("passes when all parameters are properly isolated and sets process.env.UPLOAD_DIR", async () => {
      const previous = process.env.UPLOAD_DIR;
      delete process.env.UPLOAD_DIR;

      await expect(
        ensureTestHarnessReady({
          dbUrl: "postgresql://toktickit:toktickit@localhost:5233/toktickit_test?schema=public",
          uploadDir: "uploads_test",
          workspaceRoot,
        })
      ).resolves.toBeUndefined();

      expect(process.env.UPLOAD_DIR).toBeDefined();
      expect(process.env.UPLOAD_DIR).toContain("uploads_test");

      process.env.UPLOAD_DIR = previous;
    });
  });
});
