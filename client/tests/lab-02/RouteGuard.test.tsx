import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequesterRouteGuard from "../../src/components/RequesterRouteGuard";
import { RequesterProvider } from "../../src/context/RequesterContext";

describe("RequesterRouteGuard (UI-01 / AC-02)", () => {
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
});
