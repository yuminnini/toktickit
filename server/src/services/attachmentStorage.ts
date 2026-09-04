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

export async function deleteFileFromStorage(storedFilename: string): Promise<void> {
  try {
    const uploadDir = getUploadDir();
    const filePath = path.join(uploadDir, storedFilename);
    // Security check: ensure filePath is inside uploadDir
    if (!filePath.startsWith(uploadDir)) {
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
