import { afterAll } from "vitest";
import { ensureTestHarnessReady, globalHarnessRegistry } from "../src/harness-guard.js";

// Top-level await: runs immediately when setupFiles loads, BEFORE any test files/modules are imported.
// If the test harness is not safely isolated, this throws immediately and halts test execution.
await ensureTestHarnessReady();

// Global cleanup: ensures any registered test resources are deterministically cleaned up.
// If cleanup fails, throws an error to fail the test run and report all uncleaned resources.
afterAll(async () => {
  const cleanup = await globalHarnessRegistry.runCleanup();
  if (!cleanup.success) {
    const errorDetails = cleanup.errors.map((e, i) => `  ${i + 1}. ${e.message || String(e)}`).join("\n");
    throw new Error(
      `[HARNESS-01 CLEANUP FAILED] Test harness cleanup failed for the following resources:\n${errorDetails}`
    );
  }
});
