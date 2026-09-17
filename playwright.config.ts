import { defineConfig, devices } from "@playwright/test";

const API_PORT = process.env.TEST_API_PORT || "3103";
const CLIENT_PORT = process.env.TEST_CLIENT_PORT || "5174";
const BASE_URL = process.env.BASE_URL || `http://localhost:${CLIENT_PORT}`;
const API_URL = process.env.API_URL || `http://localhost:${API_PORT}`;

export default defineConfig({
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
        DATABASE_URL: process.env.DATABASE_URL || "postgresql://toktickit:toktickit@localhost:5233/toktickit_test?schema=public",
        UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads_test",
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
