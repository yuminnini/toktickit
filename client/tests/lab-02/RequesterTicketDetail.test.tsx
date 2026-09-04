import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TicketDetail from "../../src/pages/TicketDetail";
import * as api from "../../src/api";
import { RequesterContext } from "../../src/context/RequesterContext";

describe("TicketDetail Component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders ticket details correctly when ticket is found and owned", async () => {
    vi.spyOn(api, "fetchTicketDetail").mockResolvedValue({
      id: 42,
      ticketNumber: "TKT-2026-000042",
      summary: "Monitor flickering issue",
      description: "External monitor flickers whenever HDMI is connected.",
      category: { id: 1, name: "Hardware" },
      relatedSystem: { id: 2, name: "Corporate Laptop" },
      requestedPriority: "HIGH",
      currentStatus: "NEW",
      createdAt: "2026-09-03T12:00:00Z",
      attachments: [
        {
          id: 1,
          originalName: "flicker.png",
          mimeType: "image/png",
          sizeBytes: 102400,
          uploadedAt: "2026-09-03T12:05:00Z",
          removedAt: null,
          removalReason: null,
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/tickets/42"]}>
        <RequesterContext.Provider
          value={{
            requester: { id: 1, name: "Jennifer Anderson" },
            setRequester: vi.fn(),
            clearRequester: vi.fn(),
          }}
        >
          <Routes>
            <Route path="/tickets/:id" element={<TicketDetail />} />
          </Routes>
        </RequesterContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000042")).toBeInTheDocument();
      expect(screen.getByText("Monitor flickering issue")).toBeInTheDocument();
      expect(
        screen.getByText("External monitor flickers whenever HDMI is connected.")
      ).toBeInTheDocument();
      expect(screen.getByText("Hardware")).toBeInTheDocument();
      expect(screen.getByText("Corporate Laptop")).toBeInTheDocument();
      expect(screen.getByText(/flicker\.png/)).toBeInTheDocument();
    });
  });

  it("renders 404 Not Found state when ticket does not exist or is not owned", async () => {
    const errorWithStatus = new Error("Ticket not found") as Error & { status?: number };
    errorWithStatus.status = 404;

    vi.spyOn(api, "fetchTicketDetail").mockRejectedValue(errorWithStatus);

    render(
      <MemoryRouter initialEntries={["/tickets/999"]}>
        <RequesterContext.Provider
          value={{
            requester: { id: 1, name: "Jennifer Anderson" },
            setRequester: vi.fn(),
            clearRequester: vi.fn(),
          }}
        >
          <Routes>
            <Route path="/tickets/:id" element={<TicketDetail />} />
          </Routes>
        </RequesterContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/ticket not found/i)).toBeInTheDocument();
      expect(
        screen.getByText(/the ticket you requested does not exist/i)
      ).toBeInTheDocument();
    });
  });
});
