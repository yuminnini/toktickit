import fs from "node:fs";
import path from "node:path";

// Force load server/.env.test into process.env so Playwright worker processes
// share the identical isolated test database and upload directory as the webServer.
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

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://toktickit:toktickit@localhost:5233/toktickit_test?schema=public";
}
if (!process.env.UPLOAD_DIR) {
  process.env.UPLOAD_DIR = "uploads_test";
}
