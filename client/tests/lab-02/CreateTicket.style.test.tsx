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

describe("CreateTicket Style & Accessibility (STYLE-01, STYLE-03 / AC-22)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.setItem(
      "lab2-selected-requester",
      JSON.stringify({ id: 1, name: "Jennifer Anderson" })
    );

    vi.spyOn(api, "fetchCategories").mockResolvedValue([{ id: 1, name: "Hardware" }]);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue([{ id: 1, name: "Corporate Laptop" }]);
  });

  it("STYLE-01: renders required-field asterisk on required labels", async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByLabelText(/summary \*/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/category \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/related system \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description \*/i)).toBeInTheDocument();
  });

  it("STYLE-03 / AC-22: input aria-describedby references the rendered error message id on validation failure", async () => {
    renderScreen();

    await waitFor(() => {
      expect(screen.getByLabelText(/summary \*/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/summary is required/i)).toBeInTheDocument();
    });

    const summaryInput = screen.getByLabelText(/summary \*/i);
    const describedById = summaryInput.getAttribute("aria-describedby");
    expect(describedById).toBe("summary-error");

    const errorElement = document.getElementById("summary-error");
    expect(errorElement).toBeInTheDocument();
    expect(errorElement).toHaveTextContent(/summary is required/i);
  });
});
