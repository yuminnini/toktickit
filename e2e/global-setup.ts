import path from "node:path";
import fs from "node:fs";
import { ensureTestHarnessReady } from "../server/src/harness-guard.js";

export default async function globalSetup() {
  // Load server/.env.test if present
  const envTestPath = path.resolve(process.cwd(), "server/.env.test");
  if (fs.existsSync(envTestPath)) {
    const content = fs.readFileSync(envTestPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, ...rest] = trimmed.split("=");
      if (key && rest.length > 0 && !process.env[key.trim()]) {
        process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
      }
    }
  }

  const API_PORT = process.env.TEST_API_PORT || "3103";
  process.env.API_URL = process.env.API_URL || `http://localhost:${API_PORT}`;

  // Enforce HARNESS-01 isolation guard before Playwright spawns webservers or executes tests
  await ensureTestHarnessReady();
}
