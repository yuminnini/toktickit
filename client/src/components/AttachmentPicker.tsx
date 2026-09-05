import React, { useState, useRef } from "react";

export const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export interface AttachmentPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function isValidFile(file: File): { valid: boolean; error?: string } {
  const name = file.name.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));

  if (!hasValidExt) {
    return {
      valid: false,
      error: `Invalid file type for "${file.name}". Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.`,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds the maximum size limit of 5 MB (${formatBytes(file.size)}).`,
    };
  }

  return { valid: true };
}

export const AttachmentPicker: React.FC<AttachmentPickerProps> = ({
  files,
  onChange,
  maxFiles = 5,
  disabled = false,
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
    if (selectedFiles.length === 0) return;

    // Check quota
    if (files.length + selectedFiles.length > maxFiles) {
      setErrorMessage(`You can only attach up to ${maxFiles} files in total.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const validNewFiles: File[] = [];

    for (const file of selectedFiles) {
      const validation = isValidFile(file);
      if (!validation.valid) {
        setErrorMessage(validation.error || "Invalid file selected.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return; // Reject completely without adding invalid file
      }
      validNewFiles.push(file);
    }

    onChange([...files, ...validNewFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (indexToRemove: number) => {
    setErrorMessage(null);
    onChange(files.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className="attachment-picker mb-3">
      <label htmlFor="attachment-input" className="form-label fw-semibold small">
        Attachments{" "}
        <span className="text-muted fw-normal">
          (Optional, max {maxFiles} files, up to 5 MB each)
        </span>
      </label>

      <div className="d-flex align-items-center gap-2 mb-1">
        <input
          id="attachment-input"
          ref={fileInputRef}
          type="file"
          className="form-control form-control-zen"
          accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
          onChange={handleFileChange}
          disabled={disabled || files.length >= maxFiles}
          aria-describedby={errorMessage ? "attachment-error" : "attachment-hint"}
        />
      </div>

      <div id="attachment-hint" className="text-muted small mb-2" style={{ fontSize: "12px" }}>
        Accepted formats: JPG, PNG, WEBP, PDF — up to 5MB, max {maxFiles} files.
      </div>

      {errorMessage && (
        <div id="attachment-error" className="alert alert-danger py-2 px-3 small mb-2" role="alert">
          ⚠️ {errorMessage}
        </div>
      )}

      {files.length >= maxFiles && (
        <div className="text-muted small mb-2">
          Maximum attachment limit reached ({maxFiles}/{maxFiles}).
        </div>
      )}

      {files.length > 0 && (
        <ul className="list-group list-group-flush border rounded" aria-label="Staged attachments">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="list-group-item d-flex justify-content-between align-items-center py-2 px-3 flex-wrap gap-2"
            >
              <div className="d-flex align-items-center gap-2 text-truncate">
                <span className="badge bg-secondary">
                  {file.name.split(".").pop()?.toUpperCase() || "FILE"}
                </span>
                <span className="text-truncate-filename fw-medium" title={file.name}>
                  {file.name}
                </span>
                <span className="text-muted small">({formatBytes(file.size)})</span>
              </div>
              <button
                type="button"
                className="btn-zen-destructive btn-sm"
                onClick={() => handleRemove(idx)}
                disabled={disabled}
                aria-label={`Remove ${file.name}`}
                title={`Remove ${file.name}`}
              >
                ✕ Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
