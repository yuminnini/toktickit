import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
} from "../../src/services/password.js";

describe("PASS-UNIT / AC-06: Password Hashing and Policy Unit Tests", () => {
  it("hashes passwords using Argon2id with unique salt per hash", async () => {
    const password = "correct-horse-battery-staple";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);

    // Formatted as argon2id
    expect(hash1).toContain("$argon2id$");
    expect(hash2).toContain("$argon2id$");

    // Hashes differ because of unique random salts
    expect(hash1).not.toBe(hash2);

    // Verifies correctly
    expect(await verifyPassword(hash1, password)).toBe(true);
    expect(await verifyPassword(hash2, password)).toBe(true);
    expect(await verifyPassword(hash1, "wrong-password-1234")).toBe(false);
  });

  it("enforces password policy (12–128 characters, whitespace preserved, confirmation check, new != old)", () => {
    // Exactly 11 chars: reject
    const elevenChars = "12345678901";
    expect(validatePasswordPolicy(elevenChars, elevenChars, "old-password-123")).toEqual({
      valid: false,
      error: "Password must be between 12 and 128 characters",
    });

    // Exactly 12 chars: accept
    const twelveChars = "123456789012";
    expect(validatePasswordPolicy(twelveChars, twelveChars, "old-password-123")).toEqual({
      valid: true,
    });

    // Exactly 128 chars: accept
    const maxChars = "a".repeat(128);
    expect(validatePasswordPolicy(maxChars, maxChars, "old-password-123")).toEqual({
      valid: true,
    });

    // 129 chars: reject
    const tooLong = "a".repeat(129);
    expect(validatePasswordPolicy(tooLong, tooLong, "old-password-123")).toEqual({
      valid: false,
      error: "Password must be between 12 and 128 characters",
    });

    // Whitespace preserved
    const withSpaces = "  spaced out password  ";
    expect(validatePasswordPolicy(withSpaces, withSpaces, "old-password-123")).toEqual({
      valid: true,
    });

    // Confirmation mismatch: reject
    expect(validatePasswordPolicy("valid-password-123", "different-password", "old-password-123")).toEqual({
      valid: false,
      error: "New password and confirmation do not match",
    });

    // New equals old: reject
    expect(validatePasswordPolicy("same-password-123", "same-password-123", "same-password-123")).toEqual({
      valid: false,
      error: "New password must be different from current password",
    });
  });
});
