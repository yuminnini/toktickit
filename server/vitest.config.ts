import { defineConfig } from "vitest/config";
import fs from "node:fs";
import path from "node:path";

// Automatically load .env.test if DATABASE_URL is not set (never fallback to dev .env)
if (!process.env.DATABASE_URL) {
  const envTestPath = path.resolve(process.cwd(), ".env.test");
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
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
