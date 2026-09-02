import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateTicket from "../../src/pages/CreateTicket";
import * as api from "../../src/api";
import { RequesterProvider } from "../../src/context/RequesterContext";

function renderScreen() {
  render(
    <MemoryRouter>
      <RequesterProvider>
        <CreateTicket />
      </RequesterProvider>
    </MemoryRouter>
  );
}

describe("CreateTicket Component (UI-02, UI-03, UI-04)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.setItem(
      "lab2-selected-requester",
      JSON.stringify({ id: 1, name: "Jennifer Anderson" })
    );

    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 1, name: "Hardware" },
      { id: 2, name: "Software" },
    ]);

    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([
      { id: 1, name: "Corporate Laptop" },
      { id: 2, name: "Email" },
    ]);
  });

  it("UI-02 / AC-04: shows field-level message and does not call createTicket when summary is empty", async () => {
    const createSpy = vi.spyOn(api, "createTicket");
    renderScreen();

    await waitFor(() => {
      expect(screen.getByLabelText(/summary/i)).toBeInTheDocument();
    });

    const descInput = screen.getByLabelText(/description/i);
    fireEvent.change(descInput, { target: { value: "Valid description" } });

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/summary is required/i)).toBeInTheDocument();
    });

    expect(createSpy).not.toHaveBeenCalled();
  });

  it("UI-03 / AC-05: disables submit button while request is in flight to prevent duplicate submission", async () => {
    let resolveCreate: (val: any) => void;
    const promise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    const createSpy = vi.spyOn(api, "createTicket").mockImplementation(() => promise as any);

    renderScreen();

    await waitFor(() => {
      expect(screen.getByLabelText(/summary/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Valid summary" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Valid description" } });

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    // Button should be disabled immediately
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/submitting/i)).toBeInTheDocument();

    // Second click attempt should not trigger a second call
    fireEvent.click(submitBtn);
    expect(createSpy).toHaveBeenCalledTimes(1);

    // Resolve promise
    resolveCreate!({
      id: 1,
      ticketNumber: "TKT-2026-000001",
      summary: "Valid summary",
      description: "Valid description",
      category: "Hardware",
      categoryId: 1,
      relatedSystem: "Corporate Laptop",
      relatedSystemId: 1,
      requestedPriority: "MEDIUM",
      currentStatus: "NEW",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument();
    });
  });

  it("UI-04 / AC-06: retains form values when API rejects submission", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Unable to save your ticket. Please try again."));

    renderScreen();

    await waitFor(() => {
      expect(screen.getByLabelText(/summary/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/summary/i), { target: { value: "Important Summary" } });
    fireEvent.change(screen.getByLabelText(/description/i), { target: { value: "Important Description" } });

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/unable to save your ticket/i)).toBeInTheDocument();
    });

    // Form values still present in inputs (BR-09)
    expect((screen.getByLabelText(/summary/i) as HTMLInputElement).value).toBe("Important Summary");
    expect((screen.getByLabelText(/description/i) as HTMLTextAreaElement).value).toBe("Important Description");
  });
});
