import { defineConfig, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { ensureTestHarnessReady } from "./server/src/harness-guard.js";

// 1. Force load server/.env.test into process.env before building Playwright config
const envTestPath = path.resolve(process.cwd(), "server/.env.test");
if (fs.existsSync(envTestPath)) {
  const content = fs.readFileSync(envTestPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0) {
      process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

const API_PORT = process.env.TEST_API_PORT || "3103";
const CLIENT_PORT = process.env.TEST_CLIENT_PORT || "5174";
const BASE_URL = process.env.BASE_URL || `http://localhost:${CLIENT_PORT}`;
const API_URL = process.env.API_URL || `http://localhost:${API_PORT}`;
process.env.API_URL = API_URL;
process.env.BASE_URL = BASE_URL;

const targetDbUrl = process.env.DATABASE_URL || "postgresql://toktickit:toktickit@localhost:5233/toktickit_test?schema=public";
const targetUploadDir = process.env.UPLOAD_DIR || "uploads_test";

// 2. Pre-flight guard: run BEFORE creating configuration or spawning any webServer process
await ensureTestHarnessReady({
  dbUrl: targetDbUrl,
  uploadDir: targetUploadDir,
  workspaceRoot: process.cwd(),
});

// The validated and canonical upload directory from process.env
const validatedUploadDir = process.env.UPLOAD_DIR || targetUploadDir;

// Synchronize process.env so globalSetup, webServers, and test worker processes share the exact same configuration
process.env.DATABASE_URL = targetDbUrl;
process.env.UPLOAD_DIR = validatedUploadDir;
process.env.PORT = API_PORT;
process.env.API_URL = API_URL;
process.env.BASE_URL = BASE_URL;

export default defineConfig({
  globalSetup: "./e2e/global-setup.ts",
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
  webServer: [
    {
      command: `npm run dev`,
      cwd: "./server",
      url: `${API_URL}/api/health`,
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        PORT: API_PORT,
        DATABASE_URL: targetDbUrl,
        UPLOAD_DIR: validatedUploadDir,
        NODE_ENV: "test",
      },
    },
    {
      command: `npx vite --port ${CLIENT_PORT}`,
      cwd: "./client",
      url: BASE_URL,
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        VITE_API_URL: API_URL,
      },
    },
  ],
});
