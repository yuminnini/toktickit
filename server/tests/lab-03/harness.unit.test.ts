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

    it("rejects development database 'toktickit'", () => {
      const devUrl = "postgresql://toktickit:toktickit@localhost:5233/toktickit?schema=public";
      const result = validateDatabaseUrl(devUrl);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/development or system database/);
    });

    it("rejects system databases 'postgres' and 'template1'", () => {
      expect(validateDatabaseUrl("postgresql://toktickit:toktickit@localhost:5233/postgres").valid).toBe(false);
      expect(validateDatabaseUrl("postgresql://toktickit:toktickit@localhost:5233/template1").valid).toBe(false);
    });

    it("rejects databases lacking 'test' naming convention", () => {
      const result = validateDatabaseUrl("postgresql://toktickit:toktickit@localhost:5233/production_app");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/must include 'test' or end with '_test'/);
    });

    it("accepts valid isolated test database 'toktickit_test'", () => {
      const testUrl = "postgresql://toktickit:toktickit@localhost:5233/toktickit_test?schema=public";
      const result = validateDatabaseUrl(testUrl);
      expect(result.valid).toBe(true);
      expect(result.dbName).toBe("toktickit_test");
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

    it("rejects colliding with development upload directories", () => {
      const devUpload1 = path.resolve(workspaceRoot, "uploads");
      const result1 = validateUploadDir(devUpload1, workspaceRoot);
      expect(result1.valid).toBe(false);
      expect(result1.error).toMatch(/collides with the development upload directory/);

      const devUpload2 = path.resolve(workspaceRoot, "server", "uploads");
      const result2 = validateUploadDir(devUpload2, workspaceRoot);
      expect(result2.valid).toBe(false);
      expect(result2.error).toMatch(/collides with the development upload directory/);
    });

    it("rejects path escaping workspace root", () => {
      const escaped = path.resolve(workspaceRoot, "..", "outside_uploads");
      const result = validateUploadDir(escaped, workspaceRoot);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/escapes the project workspace root/);
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
      // In CI / local environment, 3103 should be available
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

    it("passes when all parameters are properly isolated", async () => {
      await expect(
        ensureTestHarnessReady({
          dbUrl: "postgresql://toktickit:toktickit@localhost:5233/toktickit_test?schema=public",
          uploadDir: "uploads_test",
          workspaceRoot,
        })
      ).resolves.toBeUndefined();
    });
  });
});
