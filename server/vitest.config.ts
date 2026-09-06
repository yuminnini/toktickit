import { defineConfig } from "vitest/config";
import fs from "node:fs";
import path from "node:path";

// Automatically load .env.test or .env if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
  const envTestPath = path.resolve(process.cwd(), ".env.test");
  const envDefaultPath = path.resolve(process.cwd(), ".env");
  const targetEnv = fs.existsSync(envTestPath)
    ? envTestPath
    : fs.existsSync(envDefaultPath)
    ? envDefaultPath
    : null;

  if (targetEnv) {
    const content = fs.readFileSync(targetEnv, "utf-8");
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
