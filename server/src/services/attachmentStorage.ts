import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { randomUUID } from "node:crypto";

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

export const ALLOWED_MIME_MAP: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".pdf": ["application/pdf"],
};

export function getUploadDir(): string {
  const dir = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads", "attachments");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function isValidFileType(originalName: string, mimeType: string): boolean {
  const ext = path.extname(originalName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return false;
  }
  const allowedMimes = ALLOWED_MIME_MAP[ext];
  return allowedMimes ? allowedMimes.includes(mimeType.toLowerCase()) : false;
}

/**
 * Inspect magic numbers from file buffer to determine actual file type
 */
export function detectMimeFromBuffer(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 3) {
    return null;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  // PDF: %PDF- (25 50 44 46 2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  ) {
    return "application/pdf";
  }

  // WEBP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50 // P
  ) {
    return "image/webp";
  }

  return null;
}

/**
 * Validate that the stored file actually matches its expected extension and MIME type
 * by reading its magic bytes directly from disk.
 */
export async function validateFileContent(
  filePath: string,
  originalName: string,
  claimedMime: string
): Promise<boolean> {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const handle = await fs.promises.open(filePath, "r");
    const buffer = Buffer.alloc(32);
    const { bytesRead } = await handle.read(buffer, 0, 32, 0);
    await handle.close();

    if (bytesRead < 3) {
      return false;
    }

    const detectedMime = detectMimeFromBuffer(buffer.subarray(0, bytesRead));
    if (!detectedMime) {
      return false;
    }

    const ext = path.extname(originalName).toLowerCase();
    const allowedMimes = ALLOWED_MIME_MAP[ext];
    if (!allowedMimes || !allowedMimes.includes(detectedMime)) {
      return false;
    }

    if (claimedMime && claimedMime.toLowerCase() !== detectedMime) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function resolveSafeFilePath(storedFilename: string): string | null {
  if (!storedFilename || typeof storedFilename !== "string") {
    return null;
  }
  const root = path.resolve(getUploadDir());
  const filePath = path.resolve(root, storedFilename);
  const relative = path.relative(root, filePath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return filePath;
}

export async function deleteFileFromStorage(storedFilename: string): Promise<void> {
  try {
    const filePath = resolveSafeFilePath(storedFilename);
    if (!filePath) {
      return;
    }
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch {
    // Ignore deletion errors in compensation
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, getUploadDir());
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeFilename = `${randomUUID()}${ext}`;
    cb(null, safeFilename);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, cb) => {
    if (!isValidFileType(file.originalname, file.mimetype)) {
      const err = new Error("UNSUPPORTED_TYPE");
      return cb(err);
    }
    cb(null, true);
  },
});
