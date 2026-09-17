import { beforeAll, afterAll } from "vitest";
import { ensureTestHarnessReady, globalHarnessRegistry } from "../src/harness-guard.js";

// Global pre-flight verification: runs before any tests or app imports run
beforeAll(async () => {
  await ensureTestHarnessReady();
});

// Global cleanup: ensures any registered test resources are deterministically cleaned up
afterAll(async () => {
  const cleanup = await globalHarnessRegistry.runCleanup();
  if (!cleanup.success) {
    console.error("[HARNESS-01] Cleanup encountered errors:", cleanup.errors);
  }
});
