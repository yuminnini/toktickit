export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  remainingAttempts: number;
}

export class LoginRateLimiter {
  private attempts = new Map<string, number[]>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts = 5, windowMinutes = 15) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMinutes * 60 * 1000;
  }

  private cleanOldAttempts(timestamps: number[], now: number): number[] {
    const cutoff = now - this.windowMs;
    return timestamps.filter((t) => t > cutoff);
  }

  check(key: string, now = Date.now()): RateLimitCheckResult {
    const existing = this.attempts.get(key) || [];
    const active = this.cleanOldAttempts(existing, now);
    this.attempts.set(key, active);

    if (active.length >= this.maxAttempts) {
      // 6th attempt or higher is blocked
      const oldest = active[0];
      const expiry = oldest + this.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((expiry - now) / 1000));
      return {
        allowed: false,
        retryAfterSeconds,
        remainingAttempts: 0,
      };
    }

    return {
      allowed: true,
      remainingAttempts: this.maxAttempts - active.length,
    };
  }

  recordFailure(key: string, now = Date.now()): RateLimitCheckResult {
    const existing = this.attempts.get(key) || [];
    const active = this.cleanOldAttempts(existing, now);
    active.push(now);
    this.attempts.set(key, active);

    return this.check(key, now);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  clearAll(): void {
    this.attempts.clear();
  }
}

export const loginRateLimiter = new LoginRateLimiter();
