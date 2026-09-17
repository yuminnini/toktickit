import { afterAll } from "vitest";
import {
  ensureTestHarnessReady,
  globalHarnessRegistry,
  assertCleanupSucceeded,
} from "../src/harness-guard.js";

// Top-level await: runs immediately when setupFiles loads, BEFORE any test files/modules are imported.
// If the test harness is not safely isolated, this throws immediately and halts test execution.
await ensureTestHarnessReady();

// Global cleanup: ensures any registered test resources are deterministically cleaned up.
// If cleanup fails, throws an error to fail the test run and report all uncleaned resources.
afterAll(async () => {
  const cleanup = await globalHarnessRegistry.runCleanup();
  assertCleanupSucceeded(cleanup);
});
