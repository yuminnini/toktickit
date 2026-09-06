import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequesterRouteGuard from "../../src/components/RequesterRouteGuard";
import AppShell from "../../src/components/AppShell";
import { RequesterProvider } from "../../src/context/RequesterContext";

describe("RequesterRouteGuard & Session Management (UI-01 / AC-02, BR-05)", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("redirects unauthenticated/unselected requester to /requester-selection", () => {
    render(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <RequesterProvider>
          <Routes>
            <Route path="/requester-selection" element={<div>Requester Selection Screen</div>} />
            <Route element={<RequesterRouteGuard />}>
              <Route path="/my-tickets" element={<div>Protected My Tickets</div>} />
            </Route>
          </Routes>
        </RequesterProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Requester Selection Screen")).toBeInTheDocument();
    expect(screen.queryByText("Protected My Tickets")).not.toBeInTheDocument();
  });

  it("allows access to protected route when a requester is selected", () => {
    sessionStorage.setItem(
      "lab2-selected-requester",
      JSON.stringify({ id: 1, name: "Jennifer Anderson" })
    );

    render(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <RequesterProvider>
          <Routes>
            <Route path="/requester-selection" element={<div>Requester Selection Screen</div>} />
            <Route element={<RequesterRouteGuard />}>
              <Route path="/my-tickets" element={<div>Protected My Tickets</div>} />
            </Route>
          </Routes>
        </RequesterProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Protected My Tickets")).toBeInTheDocument();
    expect(screen.queryByText("Requester Selection Screen")).not.toBeInTheDocument();
  });

  it("clears requester session and navigates to /requester-selection when Change is clicked", async () => {
    sessionStorage.setItem(
      "lab2-selected-requester",
      JSON.stringify({ id: 1, name: "Jennifer Anderson" })
    );

    render(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <RequesterProvider>
          <Routes>
            <Route path="/requester-selection" element={<div>Requester Selection Screen</div>} />
            <Route element={<RequesterRouteGuard />}>
              <Route element={<AppShell />}>
                <Route path="/my-tickets" element={<div>Protected My Tickets</div>} />
              </Route>
            </Route>
          </Routes>
        </RequesterProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Jennifer Anderson/)).toBeInTheDocument();
    const changeBtn = screen.getByRole("button", { name: /change/i });
    fireEvent.click(changeBtn);

    await waitFor(() => {
      expect(sessionStorage.getItem("lab2-selected-requester")).toBeNull();
      expect(screen.getByText("Requester Selection Screen")).toBeInTheDocument();
    });
  });

  it("ignores corrupted or invalid data in sessionStorage", () => {
    sessionStorage.setItem("lab2-selected-requester", "invalid-json-{");

    render(
      <MemoryRouter initialEntries={["/my-tickets"]}>
        <RequesterProvider>
          <Routes>
            <Route path="/requester-selection" element={<div>Requester Selection Screen</div>} />
            <Route element={<RequesterRouteGuard />}>
              <Route path="/my-tickets" element={<div>Protected My Tickets</div>} />
            </Route>
          </Routes>
        </RequesterProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("Requester Selection Screen")).toBeInTheDocument();
  });
});
