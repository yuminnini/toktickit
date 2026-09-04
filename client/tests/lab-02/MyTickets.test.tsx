import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyTickets from "../../src/pages/MyTickets";
import * as api from "../../src/api";
import { RequesterContext } from "../../src/context/RequesterContext";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("MyTickets Component (UI-05, UI-06, UI-07, UI-11)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockReset();

    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 1, name: "Hardware" },
      { id: 2, name: "Software" },
    ]);
  });

  it("UI-05 / AC-07: shows Empty state with Create Ticket CTA (navigating to /tickets/new) when 0 tickets exist", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
      unfilteredTotal: 0,
    });

    render(
      <MemoryRouter>
        <RequesterContext.Provider
          value={{
            requester: { id: 1, name: "Alice" },
            setRequester: vi.fn(),
            clearRequester: vi.fn(),
          }}
        >
          <MyTickets />
        </RequesterContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no tickets yet/i)).toBeInTheDocument();
    });

    // Verify it is Empty state, not No results
    expect(screen.queryByText(/no tickets found/i)).not.toBeInTheDocument();

    const createCta = screen.getByRole("button", { name: /create your first ticket/i });
    fireEvent.click(createCta);

    expect(mockNavigate).toHaveBeenCalledWith("/tickets/new");
  });

  it("UI-06 / AC-08: shows No-results state with Clear Filters CTA when filter matches 0 tickets", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
      unfilteredTotal: 5,
    });

    render(
      <MemoryRouter>
        <RequesterContext.Provider
          value={{
            requester: { id: 1, name: "Alice" },
            setRequester: vi.fn(),
            clearRequester: vi.fn(),
          }}
        >
          <MyTickets />
        </RequesterContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/no tickets found/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /clear filters/i })).toBeInTheDocument();
  });

  it("UI-07 / AC-10: switching Requester clears old list immediately and fetches new requester's tickets", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets");

    fetchSpy.mockResolvedValueOnce({
      data: [
        {
          id: 101,
          ticketNumber: "TKT-2026-000101",
          summary: "Alice ticket about laptop",
          category: "Hardware",
          requestedPriority: "MEDIUM",
          currentStatus: "NEW",
          createdAt: "2026-09-01T10:00:00Z",
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
      unfilteredTotal: 1,
    });

    const { rerender } = render(
      <MemoryRouter>
        <RequesterContext.Provider
          value={{
            requester: { id: 1, name: "Alice" },
            setRequester: vi.fn(),
            clearRequester: vi.fn(),
          }}
        >
          <MyTickets />
        </RequesterContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000101")[0]).toBeInTheDocument();
    });

    // Now switch to Bob
    fetchSpy.mockResolvedValueOnce({
      data: [
        {
          id: 202,
          ticketNumber: "TKT-2026-000202",
          summary: "Bob ticket about VPN",
          category: "Software",
          requestedPriority: "HIGH",
          currentStatus: "NEW",
          createdAt: "2026-09-02T10:00:00Z",
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
      unfilteredTotal: 1,
    });

    rerender(
      <MemoryRouter>
        <RequesterContext.Provider
          value={{
            requester: { id: 2, name: "Bob" },
            setRequester: vi.fn(),
            clearRequester: vi.fn(),
          }}
        >
          <MyTickets />
        </RequesterContext.Provider>
      </MemoryRouter>
    );

    // Old ticket is cleared immediately
    expect(screen.queryByText("TKT-2026-000101")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000202")[0]).toBeInTheDocument();
    });
  });

  it("UI-07 / AC-10: late-resolving response from previous Requester A cannot overwrite new Requester B data", async () => {
    let resolveReqA: (val: any) => void;
    const reqAPromise = new Promise((resolve) => {
      resolveReqA = resolve;
    });

    const fetchSpy = vi.spyOn(api, "fetchTickets");

    // First call (Requester A) stays pending
    fetchSpy.mockImplementationOnce(() => reqAPromise as any);

    const { rerender } = render(
      <MemoryRouter>
        <RequesterContext.Provider
          value={{
            requester: { id: 1, name: "Alice" },
            setRequester: vi.fn(),
            clearRequester: vi.fn(),
          }}
        >
          <MyTickets />
        </RequesterContext.Provider>
      </MemoryRouter>
    );

    // Switch to Requester B while Requester A request is still in flight
    fetchSpy.mockResolvedValueOnce({
      data: [
        {
          id: 202,
          ticketNumber: "TKT-2026-000202",
          summary: "Bob ticket about VPN",
          category: "Software",
          requestedPriority: "HIGH",
          currentStatus: "NEW",
          createdAt: "2026-09-02T10:00:00Z",
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
      unfilteredTotal: 1,
    });

    rerender(
      <MemoryRouter>
        <RequesterContext.Provider
          value={{
            requester: { id: 2, name: "Bob" },
            setRequester: vi.fn(),
            clearRequester: vi.fn(),
          }}
        >
          <MyTickets />
        </RequesterContext.Provider>
      </MemoryRouter>
    );

    // Wait for Bob's data to appear
    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000202")[0]).toBeInTheDocument();
    });

    // Now resolve Alice's late response
    resolveReqA!({
      data: [
        {
          id: 101,
          ticketNumber: "TKT-2026-000101",
          summary: "Alice stale ticket",
          category: "Hardware",
          requestedPriority: "LOW",
          currentStatus: "NEW",
          createdAt: "2026-09-01T10:00:00Z",
        },
      ],
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1,
      unfilteredTotal: 1,
    });

    // Alice's data must NEVER overwrite Bob's data
    await waitFor(() => {
      expect(screen.queryByText("TKT-2026-000101")).not.toBeInTheDocument();
      expect(screen.getAllByText("TKT-2026-000202")[0]).toBeInTheDocument();
    });
  });

  it("UI-11 / AC-09: clicking Next on pagination requests page=2 from API and updates view", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets");

    fetchSpy.mockResolvedValueOnce({
      data: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        ticketNumber: `TKT-2026-00000${i + 1}`,
        summary: `Page 1 Ticket ${i + 1}`,
        category: "Hardware",
        requestedPriority: "LOW",
        currentStatus: "NEW",
        createdAt: "2026-09-01T10:00:00Z",
      })),
      page: 1,
      pageSize: 10,
      total: 15,
      totalPages: 2,
      unfilteredTotal: 15,
    });

    render(
      <MemoryRouter>
        <RequesterContext.Provider
          value={{
            requester: { id: 1, name: "Alice" },
            setRequester: vi.fn(),
            clearRequester: vi.fn(),
          }}
        >
          <MyTickets />
        </RequesterContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000001")[0]).toBeInTheDocument();
    });

    fetchSpy.mockResolvedValueOnce({
      data: Array.from({ length: 5 }, (_, i) => ({
        id: i + 11,
        ticketNumber: `TKT-2026-0000${i + 11}`,
        summary: `Page 2 Ticket ${i + 11}`,
        category: "Hardware",
        requestedPriority: "LOW",
        currentStatus: "NEW",
        createdAt: "2026-09-01T10:00:00Z",
      })),
      page: 2,
      pageSize: 10,
      total: 15,
      totalPages: 2,
      unfilteredTotal: 15,
    });

    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).toBeEnabled();
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.any(AbortSignal)
      );
      expect(screen.getAllByText("TKT-2026-000011")[0]).toBeInTheDocument();
    });
  });
});
