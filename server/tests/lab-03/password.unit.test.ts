import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, validatePasswordPolicy } from "../../src/password.js";
import { LoginRateLimiter } from "../../src/rate-limiter.js";

describe("Phase F2 / P04: Password Policy & Rate Limiting Unit Tests (AC-06, AC-09)", () => {
  describe("Password Policy Validation (AC-06)", () => {
    it("rejects non-string passwords", () => {
      expect(validatePasswordPolicy(123456789012).valid).toBe(false);
      expect(validatePasswordPolicy(null).valid).toBe(false);
      expect(validatePasswordPolicy(undefined).valid).toBe(false);
    });

    it("rejects passwords under 12 characters (boundary 11 vs 12)", () => {
      expect(validatePasswordPolicy("Short12345!").valid).toBe(false); // 11 chars
      expect(validatePasswordPolicy("ValidPass12!").valid).toBe(true); // 12 chars
    });

    it("handles maximum length boundary (128 vs 129)", () => {
      const char128 = "A".repeat(128);
      const char129 = "A".repeat(129);
      expect(validatePasswordPolicy(char128).valid).toBe(true);
      expect(validatePasswordPolicy(char129).valid).toBe(false);
    });

    it("preserves whitespace without trimming", () => {
      const passWithSpaces = "  password with spaces  ";
      expect(validatePasswordPolicy(passWithSpaces).valid).toBe(true);
    });

    it("verifies confirmation password matches", () => {
      expect(validatePasswordPolicy("NewValidPassword12!", "NewValidPassword12!").valid).toBe(true);
      expect(validatePasswordPolicy("NewValidPassword12!", "DifferentPassword12!").valid).toBe(false);
    });

    it("rejects new password matching current password", () => {
      const oldPass = "ExistingPassword123!";
      const result = validatePasswordPolicy(oldPass, oldPass, oldPass);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/must be different/);
    });
  });

  describe("Argon2id Hashing & Verification (AC-06, BR-09)", () => {
    it("generates different hashes for the same password due to random salt", async () => {
      const pass = "TestPassword1234!";
      const hash1 = await hashPassword(pass);
      const hash2 = await hashPassword(pass);

      expect(hash1.startsWith("$argon2id$")).toBe(true);
      expect(hash2.startsWith("$argon2id$")).toBe(true);
      expect(hash1).not.toBe(hash2);
    });

    it("verifies valid password and rejects incorrect password", async () => {
      const pass = "MySecretPassphrase123!";
      const hash = await hashPassword(pass);

      expect(await verifyPassword(hash, pass)).toBe(true);
      expect(await verifyPassword(hash, "WrongPassword123!")).toBe(false);
      expect(await verifyPassword(hash, "")).toBe(false);
    });
  });

  describe("Login Rate Limiter (AC-09, BR-11)", () => {
    it("allows up to 5 attempts and blocks on the 6th with positive Retry-After", () => {
      const limiter = new LoginRateLimiter(5, 15);
      const key = "user@test.com::127.0.0.1";
      const now = 1000000;

      // 5 failed attempts
      for (let i = 1; i <= 5; i++) {
        const check = limiter.check(key, now);
        expect(check.allowed).toBe(true);
        expect(check.remainingAttempts).toBe(6 - i);
        limiter.recordFailure(key, now + i * 100);
      }

      // 6th attempt should be blocked
      const blocked = limiter.check(key, now + 1000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remainingAttempts).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("resets rate limit on successful login", () => {
      const limiter = new LoginRateLimiter(5, 15);
      const key = "user@test.com::127.0.0.1";
      const now = 1000000;

      limiter.recordFailure(key, now);
      limiter.recordFailure(key, now + 100);
      expect(limiter.check(key, now + 200).remainingAttempts).toBe(3);

      limiter.reset(key);
      expect(limiter.check(key, now + 300).remainingAttempts).toBe(5);
    });

    it("expires old attempts after the window passes", () => {
      const limiter = new LoginRateLimiter(5, 15);
      const key = "user@test.com::127.0.0.1";
      const startTime = 1000000;

      for (let i = 0; i < 5; i++) {
        limiter.recordFailure(key, startTime + i * 1000);
      }

      expect(limiter.check(key, startTime + 6000).allowed).toBe(false);

      // Advance 16 minutes (beyond 15-minute window)
      const afterWindow = startTime + 16 * 60 * 1000;
      const result = limiter.check(key, afterWindow);
      expect(result.allowed).toBe(true);
      expect(result.remainingAttempts).toBe(5);
    });
  });
});
