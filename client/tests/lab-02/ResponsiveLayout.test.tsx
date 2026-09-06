import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyTickets from "../../src/pages/MyTickets";
import CreateTicket from "../../src/pages/CreateTicket";
import AppShell from "../../src/components/AppShell";
import { AttachmentPicker } from "../../src/components/AttachmentPicker";
import * as api from "../../src/api";
import { RequesterProvider } from "../../src/context/RequesterContext";

const mockTickets = [
  {
    id: 1,
    ticketNumber: "TKT-2026-000001",
    summary: "VPN Connection drops frequently during video meetings",
    category: "Network",
    requestedPriority: "HIGH" as const,
    currentStatus: "NEW" as const,
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
  },
];

describe("Responsive Layout & Accessibility (RESP-01, RESP-02, §8.7, §8.8)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.setItem(
      "lab2-selected-requester",
      JSON.stringify({ id: 1, name: "Jennifer Anderson" })
    );

    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Network" }]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([{ id: 1, name: "Corporate VPN" }]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: mockTickets,
      total: 1,
      unfilteredTotal: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });
  });

  it("MyTickets renders both desktop table (d-none d-lg-block) and mobile cards (d-lg-none)", async () => {
    render(
      <MemoryRouter>
        <RequesterProvider>
          <MyTickets />
        </RequesterProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      const ticketNumbers = screen.getAllByText("TKT-2026-000001");
      expect(ticketNumbers.length).toBeGreaterThanOrEqual(1);
    });

    const desktopContainer = document.querySelector(".d-none.d-lg-block");
    expect(desktopContainer).toBeInTheDocument();
    expect(desktopContainer?.querySelector(".ticket-table-container")).toBeInTheDocument();

    const mobileContainer = document.querySelector(".d-lg-none");
    expect(mobileContainer).toBeInTheDocument();
    expect(mobileContainer?.querySelector(".ticket-cards")).toBeInTheDocument();
  });

  it("AppShell mobile navigation toggler toggles menu and sets aria-expanded", () => {
    render(
      <MemoryRouter>
        <RequesterProvider>
          <AppShell />
        </RequesterProvider>
      </MemoryRouter>
    );

    const toggler = screen.getByRole("button", { name: /toggle navigation/i });
    expect(toggler).toBeInTheDocument();
    expect(toggler.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(toggler);
    expect(toggler.getAttribute("aria-expanded")).toBe("true");

    fireEvent.click(toggler);
    expect(toggler.getAttribute("aria-expanded")).toBe("false");
  });

  it("AttachmentPicker truncates long filenames and provides full name in title attribute", () => {
    const longFileName = "extremely_long_system_diagnostic_report_for_corporate_laptop_v2_final.png";
    const dummyFile = new File(["dummy content"], longFileName, { type: "image/png" });

    render(
      <AttachmentPicker
        files={[dummyFile]}
        onChange={() => {}}
      />
    );

    const fileSpan = screen.getByTitle(longFileName);
    expect(fileSpan).toBeInTheDocument();
    expect(fileSpan).toHaveClass("text-truncate-filename");
    expect(fileSpan.getAttribute("title")).toBe(longFileName);

    const removeBtn = screen.getByRole("button", { name: new RegExp(`remove ${longFileName}`, "i") });
    expect(removeBtn).toBeInTheDocument();
    expect(removeBtn).toHaveClass("btn-zen-destructive");
  });

  it("CreateTicket renders read-only fields with ivory background styling token", async () => {
    render(
      <MemoryRouter>
        <RequesterProvider>
          <CreateTicket />
        </RequesterProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/ticket date/i)).toBeInTheDocument();
    });

    const ticketDateInput = screen.getByLabelText(/ticket date/i);
    expect(ticketDateInput).toHaveClass("form-control-readonly-zen");
    expect(ticketDateInput).toHaveAttribute("readonly");

    const requesterInput = screen.getByLabelText(/requester/i);
    expect(requesterInput).toHaveClass("form-control-readonly-zen");
    expect(requesterInput).toHaveAttribute("readonly");
  });
});
