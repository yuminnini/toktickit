interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lastAttemptAt: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

const failureRecords = new Map<string, RateLimitRecord>();

let timeProvider = () => Date.now();

/**
 * Allows injecting a custom clock provider for testing time-based rate limit windows.
 */
export function setTimeProvider(provider: () => number) {
  timeProvider = provider;
}

export function resetTimeProvider() {
  timeProvider = () => Date.now();
}

/**
 * Resets all rate limit records (for test isolation).
 */
export function resetLoginRateLimiter() {
  failureRecords.clear();
}

function buildKey(email: string, ip: string): string {
  return `${email.trim().toLowerCase()}::${ip}`;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/**
 * Checks if the given normalized email + IP is currently rate-limited.
 */
export function checkLoginRateLimit(email: string, ip: string): RateLimitCheckResult {
  const key = buildKey(email, ip);
  const now = timeProvider();
  const record = failureRecords.get(key);

  if (!record) {
    return { allowed: true };
  }

  // Check if window has expired
  if (now - record.firstAttemptAt > WINDOW_MS) {
    failureRecords.delete(key);
    return { allowed: true };
  }

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    const timeRemainingMs = WINDOW_MS - (now - record.firstAttemptAt);
    const retryAfterSeconds = Math.max(1, Math.ceil(timeRemainingMs / 1000));
    return {
      allowed: false,
      retryAfterSeconds,
    };
  }

  return { allowed: true };
}

/**
 * Records a failed login attempt.
 */
export function recordLoginFailure(email: string, ip: string): RateLimitCheckResult {
  const key = buildKey(email, ip);
  const now = timeProvider();
  const record = failureRecords.get(key);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    failureRecords.set(key, {
      attempts: 1,
      firstAttemptAt: now,
      lastAttemptAt: now,
    });
    return { allowed: true };
  }

  record.attempts += 1;
  record.lastAttemptAt = now;

  // The 5th failure still allows 401 to be returned; only exceeding 5 (attempt 6) or checkLoginRateLimit blocks with 429
  if (record.attempts > MAX_FAILED_ATTEMPTS) {
    const timeRemainingMs = WINDOW_MS - (now - record.firstAttemptAt);
    const retryAfterSeconds = Math.max(1, Math.ceil(timeRemainingMs / 1000));
    return {
      allowed: false,
      retryAfterSeconds,
    };
  }

  return { allowed: true };
}

/**
 * Resets failed attempts upon successful login.
 */
export function recordLoginSuccess(email: string, ip: string) {
  const key = buildKey(email, ip);
  failureRecords.delete(key);
}
