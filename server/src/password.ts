import argon2 from "argon2";

export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates password according to TokTickIT Lab 3 policy:
 * - 12 to 128 characters
 * - Preserves whitespace (does not strip spaces)
 * - Optional confirmation matching
 * - Optional new != old check
 */
export function validatePasswordPolicy(
  password: unknown,
  confirmPassword?: unknown,
  oldPassword?: unknown
): PasswordValidationResult {
  if (typeof password !== "string") {
    return { valid: false, error: "Password must be a string." };
  }

  if (password.length < 12) {
    return { valid: false, error: "Password must be at least 12 characters long." };
  }

  if (password.length > 128) {
    return { valid: false, error: "Password cannot exceed 128 characters." };
  }

  if (confirmPassword !== undefined) {
    if (typeof confirmPassword !== "string" || password !== confirmPassword) {
      return { valid: false, error: "New password and confirmation password do not match." };
    }
  }

  if (oldPassword !== undefined && typeof oldPassword === "string") {
    if (password === oldPassword) {
      return { valid: false, error: "New password must be different from the current password." };
    }
  }

  return { valid: true };
}

/**
 * Hash password using Argon2id with recommended parameters:
 * - Memory: 19456 KiB
 * - Iterations: 2
 * - Parallelism: 1
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Verifies password against Argon2id hash.
 */
export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}
