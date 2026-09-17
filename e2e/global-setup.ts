import { ensureTestHarnessReady } from "../server/src/harness-guard.js";

export default async function globalSetup() {
  // HARNESS-01 isolation check is already performed before config creation;
  // this confirms test harness environment consistency before worker suites run.
  await ensureTestHarnessReady();
}
