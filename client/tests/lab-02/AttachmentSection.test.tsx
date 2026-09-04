import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AttachmentSection } from "../../src/components/AttachmentSection";
import { AttachmentPicker } from "../../src/components/AttachmentPicker";
import * as api from "../../src/api";

describe("Attachment Components and UI-08 / AC-12", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("UI-08 / AC-12: Client-side file rejection", () => {
    it("UI-08 / AC-12: rejects .exe file client-side in AttachmentPicker without calling onChange or upload", async () => {
      const onChange = vi.fn();
      const uploadSpy = vi.spyOn(api, "uploadAttachment");

      render(<AttachmentPicker files={[]} onChange={onChange} />);

      const input = screen.getByLabelText(/attachments/i, { selector: "input" });
      const exeFile = new File(["dummy binary"], "malware.exe", {
        type: "application/x-msdownload",
      });

      fireEvent.change(input, { target: { files: [exeFile] } });

      await waitFor(() => {
        expect(
          screen.getByText(/invalid file type for "malware.exe"/i)
        ).toBeInTheDocument();
      });

      expect(onChange).not.toHaveBeenCalled();
      expect(uploadSpy).not.toHaveBeenCalled();
    });

    it("rejects .exe file in AttachmentSection without calling uploadAttachment", async () => {
      const uploadSpy = vi.spyOn(api, "uploadAttachment");
      const onAttachmentChanged = vi.fn();

      render(
        <AttachmentSection
          ticketId={10}
          requesterId={1}
          attachments={[]}
          onAttachmentChanged={onAttachmentChanged}
        />
      );

      const input = screen.getByLabelText(/select file to upload/i);
      const exeFile = new File(["dummy executable"], "setup.exe", {
        type: "application/x-msdownload",
      });

      fireEvent.change(input, { target: { files: [exeFile] } });

      await waitFor(() => {
        expect(
          screen.getByText(/invalid file type for "setup.exe"/i)
        ).toBeInTheDocument();
      });

      expect(uploadSpy).not.toHaveBeenCalled();
      expect(onAttachmentChanged).not.toHaveBeenCalled();
    });

    it("rejects file exceeding 5 MB limit in AttachmentPicker without calling onChange", async () => {
      const onChange = vi.fn();
      render(<AttachmentPicker files={[]} onChange={onChange} />);

      const input = screen.getByLabelText(/attachments/i, { selector: "input" });
      // 5 MB + 1 byte
      const largeContent = new Uint8Array(5 * 1024 * 1024 + 1);
      const largeFile = new File([largeContent], "huge-image.png", {
        type: "image/png",
      });

      fireEvent.change(input, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(
          screen.getByText(/exceeds the maximum size limit of 5 MB/i)
        ).toBeInTheDocument();
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("AttachmentSection rendering and interactions", () => {
    const mockAttachments: api.AttachmentItem[] = [
      {
        id: 1,
        originalName: "diagnostic.png",
        mimeType: "image/png",
        sizeBytes: 204800, // 200 KB
        uploadedAt: "2026-09-01T10:00:00.000Z",
        removedAt: null,
        removalReason: null,
      },
      {
        id: 2,
        originalName: "old_error.log.pdf",
        mimeType: "application/pdf",
        sizeBytes: 102400, // 100 KB
        uploadedAt: "2026-09-01T09:00:00.000Z",
        removedAt: "2026-09-01T11:30:00.000Z",
        removalReason: "Uploaded wrong log file",
      },
    ];

    it("renders active attachment with download link and remove button", () => {
      render(
        <AttachmentSection
          ticketId={10}
          requesterId={1}
          attachments={mockAttachments}
          onAttachmentChanged={vi.fn()}
        />
      );

      expect(screen.getByText("diagnostic.png")).toBeInTheDocument();
      expect(screen.getByText(/200 KB/)).toBeInTheDocument();

      const downloadLink = screen.getByRole("link", { name: /download diagnostic.png/i });
      expect(downloadLink).toBeInTheDocument();
      expect(downloadLink).toHaveAttribute(
        "href",
        expect.stringContaining("/api/attachments/1/download?requesterId=1")
      );

      expect(
        screen.getByRole("button", { name: /remove diagnostic.png/i })
      ).toBeInTheDocument();
    });

    it("renders soft-removed attachment with Removed badge, removal reason, and NO download link", () => {
      render(
        <AttachmentSection
          ticketId={10}
          requesterId={1}
          attachments={mockAttachments}
          onAttachmentChanged={vi.fn()}
        />
      );

      expect(screen.getByText("old_error.log.pdf")).toBeInTheDocument();
      expect(screen.getByText("Removed")).toBeInTheDocument();
      expect(screen.getByText(/Uploaded wrong log file/)).toBeInTheDocument();

      // Download and Remove actions must NOT be rendered for removed attachment
      expect(
        screen.queryByRole("link", { name: /download old_error.log.pdf/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /remove old_error.log.pdf/i })
      ).not.toBeInTheDocument();
    });

    it("uploads valid file when selected in AttachmentSection", async () => {
      const uploadSpy = vi.spyOn(api, "uploadAttachment").mockResolvedValue({
        id: 3,
        originalName: "system_report.pdf",
        mimeType: "application/pdf",
        sizeBytes: 50000,
        uploadedAt: "2026-09-04T12:00:00.000Z",
        removedAt: null,
        removalReason: null,
      });

      const onAttachmentChanged = vi.fn();

      render(
        <AttachmentSection
          ticketId={10}
          requesterId={1}
          attachments={mockAttachments}
          onAttachmentChanged={onAttachmentChanged}
        />
      );

      const input = screen.getByLabelText(/select file to upload/i);
      const validFile = new File(["valid pdf content"], "system_report.pdf", {
        type: "application/pdf",
      });

      fireEvent.change(input, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(uploadSpy).toHaveBeenCalledWith(10, 1, validFile);
        expect(onAttachmentChanged).toHaveBeenCalled();
      });
    });

    it("opens removal modal, validates reason, and submits soft-remove", async () => {
      const removeSpy = vi.spyOn(api, "removeAttachment").mockResolvedValue({
        id: 1,
        originalName: "diagnostic.png",
        mimeType: "image/png",
        sizeBytes: 204800,
        uploadedAt: "2026-09-01T10:00:00.000Z",
        removedAt: "2026-09-04T12:00:00.000Z",
        removalReason: "Replaced by newer diagnostic",
      });

      const onAttachmentChanged = vi.fn();

      render(
        <AttachmentSection
          ticketId={10}
          requesterId={1}
          attachments={mockAttachments}
          onAttachmentChanged={onAttachmentChanged}
        />
      );

      // Click remove on active attachment
      const removeBtn = screen.getByRole("button", { name: /remove diagnostic.png/i });
      fireEvent.click(removeBtn);

      // Modal should open
      expect(screen.getByText(/remove attachment/i, { selector: "h5" })).toBeInTheDocument();

      const reasonInput = screen.getByLabelText(/reason for removal/i);
      const confirmBtn = screen.getByRole("button", { name: /confirm removal/i });

      // Initially confirm button is disabled because reason is empty
      expect(confirmBtn).toBeDisabled();

      // Enter valid reason
      fireEvent.change(reasonInput, {
        target: { value: "Replaced by newer diagnostic" },
      });
      expect(confirmBtn).not.toBeDisabled();

      // Click confirm
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(removeSpy).toHaveBeenCalledWith(1, 1, "Replaced by newer diagnostic");
        expect(onAttachmentChanged).toHaveBeenCalled();
      });
    });

    it("displays quota reached message when 5 active attachments exist", () => {
      const fiveActive: api.AttachmentItem[] = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        originalName: `file_${i + 1}.png`,
        mimeType: "image/png",
        sizeBytes: 1000,
        uploadedAt: "2026-09-01T10:00:00.000Z",
        removedAt: null,
        removalReason: null,
      }));

      render(
        <AttachmentSection
          ticketId={10}
          requesterId={1}
          attachments={fiveActive}
          onAttachmentChanged={vi.fn()}
        />
      );

      expect(
        screen.getByText(/this ticket has reached the maximum quota of 5 active attachments/i)
      ).toBeInTheDocument();
      expect(screen.queryByLabelText(/select file to upload/i)).not.toBeInTheDocument();
    });
  });
});
