import { hash, verify, Algorithm } from "@node-rs/argon2";

// BR-09: Argon2id (memory 19456 KiB, iterations 2, parallelism 1), random salt per password
const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * Hashes a plaintext password using Argon2id with compliant parameters.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against an Argon2id hash.
 */
export async function verifyPassword(hashStr: string, plaintext: string): Promise<boolean> {
  try {
    return await verify(hashStr, plaintext, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * BR-08 / AC-06:
 * Validates password policy:
 * - 12 to 128 characters
 * - Whitespace is preserved (not trimmed away)
 * - Confirmation matches
 * - New password differs from old password (if old password provided)
 */
export function validatePasswordPolicy(
  newPassword: string,
  confirmPassword?: string,
  currentPassword?: string
): PasswordValidationResult {
  if (typeof newPassword !== "string" || newPassword.length < 12 || newPassword.length > 128) {
    return {
      valid: false,
      error: "Password must be between 12 and 128 characters",
    };
  }

  if (confirmPassword !== undefined && newPassword !== confirmPassword) {
    return {
      valid: false,
      error: "New password and confirmation do not match",
    };
  }

  if (currentPassword !== undefined && newPassword === currentPassword) {
    return {
      valid: false,
      error: "New password must be different from current password",
    };
  }

  return { valid: true };
}
