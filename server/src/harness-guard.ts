import path from "node:path";
import fs from "node:fs";
import net from "node:net";

export interface DatabaseValidationResult {
  valid: boolean;
  error?: string;
  dbName?: string;
}

export interface UploadDirValidationResult {
  valid: boolean;
  error?: string;
  resolvedPath?: string;
}

export interface PortValidationResult {
  available: boolean;
  error?: string;
}

/**
 * Validates that the database URL points to a dedicated, isolated test database
 * on an authorized local test host and prevents accidental connection to production
 * or development databases.
 */
export function validateDatabaseUrl(rawUrl?: string): DatabaseValidationResult {
  if (!rawUrl || typeof rawUrl !== "string" || !rawUrl.trim()) {
    return { valid: false, error: "DATABASE_URL is required and cannot be empty." };
  }

  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      return { valid: false, error: `Invalid protocol '${parsed.protocol}'. Expected postgres:// or postgresql://.` };
    }

    // Must target safe local test host
    const allowedHosts = ["localhost", "127.0.0.1", "::1", "toktickit-db", "host.docker.internal"];
    if (!allowedHosts.includes(parsed.hostname.toLowerCase())) {
      return {
        valid: false,
        error: `Database host '${parsed.hostname}' is not an authorized local test host (${allowedHosts.join(", ")}).`,
      };
    }

    const dbName = parsed.pathname.replace(/^\//, "").split("?")[0];
    if (!dbName) {
      return { valid: false, error: "Database name is missing from DATABASE_URL." };
    }

    const lowerDbName = dbName.toLowerCase();

    // Explicitly reject development/production/system databases
    const prohibitedDbNames = ["toktickit", "postgres", "template1", "template0"];
    if (prohibitedDbNames.includes(lowerDbName)) {
      return {
        valid: false,
        error: `Database '${dbName}' is a development or system database. Automated tests must target an isolated test database.`,
        dbName,
      };
    }

    // Must be an explicit test database naming convention (not substring match like 'contest' or 'latest')
    const isExplicitTestName =
      lowerDbName === "toktickit_test" ||
      lowerDbName === "toktickit_shadow" ||
      lowerDbName.endsWith("_test") ||
      lowerDbName.endsWith("-test") ||
      lowerDbName.startsWith("test_");

    if (!isExplicitTestName) {
      return {
        valid: false,
        error: `Database '${dbName}' does not follow the required isolated test database naming convention (must be 'toktickit_test', end with '_test', or start with 'test_').`,
        dbName,
      };
    }

    return { valid: true, dbName };
  } catch (err) {
    return { valid: false, error: `Failed to parse DATABASE_URL: ${(err as Error).message}` };
  }
}

// Helper to resolve canonical real path (following symlinks and directory junctions)
function getRealPath(targetPath: string): string {
  try {
    let stat: fs.Stats | undefined;
    try {
      stat = fs.lstatSync(targetPath);
    } catch {
      // path does not exist
    }

    if (stat) {
      return fs.realpathSync.native ? fs.realpathSync.native(targetPath) : fs.realpathSync(targetPath);
    }

    let cur = path.dirname(targetPath);
    const parts: string[] = [path.basename(targetPath)];
    while (cur && !fs.existsSync(cur) && path.dirname(cur) !== cur) {
      parts.unshift(path.basename(cur));
      cur = path.dirname(cur);
    }
    if (fs.existsSync(cur)) {
      const realParent = fs.realpathSync.native ? fs.realpathSync.native(cur) : fs.realpathSync(cur);
      return path.resolve(realParent, ...parts);
    }
  } catch {
    // fallback
  }
  return path.resolve(targetPath);
}

function normalizeForComparison(p: string): string {
  const normalized = path.normalize(p);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function isSameOrDescendant(parentDir: string, targetPath: string): boolean {
  const normParent = normalizeForComparison(parentDir);
  const normTarget = normalizeForComparison(targetPath);
  if (normParent === normTarget) return true;
  const rel = path.relative(normParent, normTarget);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Validates that the upload directory is isolated, within the workspace,
 * and does not collide with development uploads, development subdirectories,
 * project root, system roots, or home directories.
 * Strictly resolves and inspects real paths including symlinks and directory junctions.
 */
export function validateUploadDir(uploadDir?: string, workspaceRoot?: string): UploadDirValidationResult {
  if (!uploadDir || typeof uploadDir !== "string" || !uploadDir.trim()) {
    return { valid: false, error: "UPLOAD_DIR is required and cannot be empty." };
  }

  const root = workspaceRoot ? path.resolve(workspaceRoot) : process.cwd();
  const resolved = path.resolve(root, uploadDir.trim());
  const realResolved = getRealPath(resolved);
  const realRoot = getRealPath(root);

  // Check against root or drive root
  const parsedPath = path.parse(resolved);
  const parsedRealPath = path.parse(realResolved);
  if (resolved === parsedPath.root || realResolved === parsedRealPath.root) {
    return { valid: false, error: "UPLOAD_DIR cannot be the root of the filesystem or drive." };
  }

  // Check against project root / workspace root itself
  if (
    normalizeForComparison(resolved) === normalizeForComparison(root) ||
    normalizeForComparison(realResolved) === normalizeForComparison(realRoot) ||
    resolved === path.resolve(root, "..") ||
    realResolved === path.resolve(realRoot, "..")
  ) {
    return { valid: false, error: `UPLOAD_DIR cannot be the project workspace root '${resolved}'.` };
  }

  // Check against user home directory
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir) {
    const normHome = normalizeForComparison(homeDir);
    const realHome = normalizeForComparison(getRealPath(homeDir));
    if (
      normalizeForComparison(resolved) === normHome ||
      normalizeForComparison(realResolved) === realHome
    ) {
      return { valid: false, error: "UPLOAD_DIR cannot be the user's home directory." };
    }
  }

  // Check against development upload directory (and any subdirectories within them)
  const forbiddenDevDirs = [
    path.resolve(root, "uploads"),
    path.resolve(root, "server", "uploads"),
    path.resolve(root, "..", "uploads"),
    path.resolve(root, "..", "server", "uploads"),
  ];

  for (const devDir of forbiddenDevDirs) {
    const realDevDir = getRealPath(devDir);
    if (
      isSameOrDescendant(devDir, resolved) ||
      isSameOrDescendant(realDevDir, realResolved) ||
      isSameOrDescendant(devDir, realResolved)
    ) {
      return {
        valid: false,
        error: `UPLOAD_DIR '${uploadDir}' (resolved: '${realResolved}') collides with or resides inside development upload directory '${devDir}'.`,
      };
    }
  }

  // Must not escape workspace root if workspaceRoot is provided
  if (workspaceRoot) {
    if (!isSameOrDescendant(root, resolved) || !isSameOrDescendant(realRoot, realResolved)) {
      return {
        valid: false,
        error: `UPLOAD_DIR '${uploadDir}' (resolved: '${realResolved}') escapes the project workspace root '${root}'.`,
      };
    }
  }

  return { valid: true, resolvedPath: realResolved };
}

/**
 * Checks whether a given TCP port is currently available.
 */
export function validatePort(port: number, host = "127.0.0.1"): Promise<PortValidationResult> {
  return new Promise((resolve) => {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      resolve({ available: false, error: `Invalid port number ${port}. Must be between 1024 and 65535.` });
      return;
    }

    const server = net.createServer();
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve({ available: false, error: `Port ${port} is already in use.` });
      } else {
        resolve({ available: false, error: `Port check failed: ${err.message}` });
      }
    });

    server.once("listening", () => {
      server.close(() => {
        resolve({ available: true });
      });
    });

    server.listen(port, host);
  });
}

/**
 * Registry to track created test resources and guarantee deterministic cleanup
 * with explicit error reporting (never swallowing errors).
 */
export class TestHarnessRegistry {
  private registeredFiles = new Set<string>();
  private cleanupHandlers: Array<() => Promise<void> | void> = [];

  registerFile(filePath: string): void {
    this.registeredFiles.add(path.resolve(filePath));
  }

  registerCleanupHandler(handler: () => Promise<void> | void): void {
    this.cleanupHandlers.push(handler);
  }

  async runCleanup(): Promise<{ success: boolean; errors: Error[]; cleanedFiles: string[] }> {
    const errors: Error[] = [];
    const cleanedFiles: string[] = [];

    // Clean registered files
    for (const file of this.registeredFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          cleanedFiles.push(file);
        }
      } catch (err) {
        errors.push(new Error(`Failed to clean up file '${file}': ${(err as Error).message}`));
      }
    }
    this.registeredFiles.clear();

    // Run registered cleanup callbacks
    for (const handler of this.cleanupHandlers) {
      try {
        await handler();
      } catch (err) {
        errors.push(err as Error);
      }
    }
    this.cleanupHandlers = [];

    return {
      success: errors.length === 0,
      errors,
      cleanedFiles,
    };
  }
}

export const globalHarnessRegistry = new TestHarnessRegistry();

/**
 * Pre-flight guard ensuring the test harness is properly isolated before any test suite runs.
 */
export async function ensureTestHarnessReady(options?: {
  dbUrl?: string;
  uploadDir?: string;
  workspaceRoot?: string;
  port?: number;
}): Promise<void> {
  const dbUrl = options?.dbUrl || process.env.DATABASE_URL;
  const dbResult = validateDatabaseUrl(dbUrl);
  if (!dbResult.valid) {
    throw new Error(`[HARNESS-01 GUARD FAILED] Database URL is not safely isolated: ${dbResult.error}`);
  }

  const uploadDir = options?.uploadDir || process.env.UPLOAD_DIR || "uploads_test";
  const uploadResult = validateUploadDir(uploadDir, options?.workspaceRoot);
  if (!uploadResult.valid) {
    throw new Error(`[HARNESS-01 GUARD FAILED] Upload directory is not safely isolated: ${uploadResult.error}`);
  }

  // Enforce isolated upload directory in process.env so attachment storage never falls back to dev
  process.env.UPLOAD_DIR = uploadResult.resolvedPath;
  if (!fs.existsSync(uploadResult.resolvedPath!)) {
    fs.mkdirSync(uploadResult.resolvedPath!, { recursive: true });
  }

  if (options?.port) {
    const portResult = await validatePort(options.port);
    if (!portResult.available) {
      throw new Error(`[HARNESS-01 GUARD FAILED] Port ${options.port} is not available: ${portResult.error}`);
    }
  }
}
