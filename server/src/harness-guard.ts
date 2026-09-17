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
 * and prevents accidental connection to production or development databases.
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

    const dbName = parsed.pathname.replace(/^\//, "").split("?")[0];
    if (!dbName) {
      return { valid: false, error: "Database name is missing from DATABASE_URL." };
    }

    // Explicitly reject development/production databases
    if (dbName === "toktickit" || dbName === "postgres" || dbName === "template1") {
      return {
        valid: false,
        error: `Database '${dbName}' is a development or system database. Automated tests must target an isolated test database.`,
        dbName,
      };
    }

    // Must be an explicit test database (e.g. toktickit_test)
    if (!dbName.endsWith("_test") && !dbName.includes("test")) {
      return {
        valid: false,
        error: `Database '${dbName}' does not appear to be an isolated test database (must include 'test' or end with '_test').`,
        dbName,
      };
    }

    return { valid: true, dbName };
  } catch (err) {
    return { valid: false, error: `Failed to parse DATABASE_URL: ${(err as Error).message}` };
  }
}

/**
 * Validates that the upload directory is isolated, within the workspace,
 * and does not collide with development uploads, system roots, or home directories.
 */
export function validateUploadDir(uploadDir?: string, workspaceRoot?: string): UploadDirValidationResult {
  if (!uploadDir || typeof uploadDir !== "string" || !uploadDir.trim()) {
    return { valid: false, error: "UPLOAD_DIR is required and cannot be empty." };
  }

  const root = workspaceRoot ? path.resolve(workspaceRoot) : process.cwd();
  const resolved = path.resolve(root, uploadDir.trim());

  // Check against root or drive root
  const parsedPath = path.parse(resolved);
  if (resolved === parsedPath.root) {
    return { valid: false, error: "UPLOAD_DIR cannot be the root of the filesystem or drive." };
  }

  // Check against user home directory
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (homeDir && path.resolve(homeDir) === resolved) {
    return { valid: false, error: "UPLOAD_DIR cannot be the user's home directory." };
  }

  // Check against development upload directory
  const devUploadDirs = [
    path.resolve(root, "uploads"),
    path.resolve(root, "server", "uploads"),
    path.resolve(root, "..", "uploads"),
    path.resolve(root, "..", "server", "uploads"),
  ];

  for (const devDir of devUploadDirs) {
    if (resolved === devDir) {
      return {
        valid: false,
        error: `UPLOAD_DIR '${resolved}' collides with the development upload directory '${devDir}'.`,
      };
    }
  }

  // Must not escape workspace root if workspaceRoot is provided
  if (workspaceRoot) {
    const relative = path.relative(root, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return {
        valid: false,
        error: `UPLOAD_DIR '${resolved}' escapes the project workspace root '${root}'.`,
      };
    }
  }

  return { valid: true, resolvedPath: resolved };
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

  if (options?.port) {
    const portResult = await validatePort(options.port);
    if (!portResult.available) {
      throw new Error(`[HARNESS-01 GUARD FAILED] Port ${options.port} is not available: ${portResult.error}`);
    }
  }
}
