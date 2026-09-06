import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RequesterSelection from "../../src/pages/RequesterSelection";
import * as api from "../../src/api";
import { RequesterProvider } from "../../src/context/RequesterContext";

function renderScreen() {
    render(
        <MemoryRouter initialEntries={["/requester-selection"]}>
            <RequesterProvider>
                <Routes>
                    <Route path="/requester-selection" element={<RequesterSelection />} />
                    <Route path="/my-tickets" element={<div>My Tickets Screen</div>} />
                </Routes>
            </RequesterProvider>
        </MemoryRouter>
    );
}

describe("RequesterSelection (UI-09, UI-10 / AC-16, AC-17)", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        sessionStorage.clear();
    });

    it("UI-09 / AC-16: shows a safe empty state when there are no active requesters", async () => {
        vi.spyOn(api, "fetchRequesters").mockResolvedValue([]);
        renderScreen();

        await waitFor(() => {
            expect(screen.getByText(/no development requesters are available/i)).toBeInTheDocument();
        });
        expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    });

    it("UI-10 / AC-17: shows a safe error state when the requesters API fails, and allows retry", async () => {
        const fetchMock = vi.spyOn(api, "fetchRequesters")
            .mockRejectedValueOnce(new Error("network down"))
            .mockResolvedValueOnce([
                { id: 1, name: "Jennifer Anderson" },
                { id: 2, name: "Michael Brown" },
            ]);

        renderScreen();

        await waitFor(() => {
            expect(screen.getByText(/unable to load requesters/i)).toBeInTheDocument();
        });

        const retryButton = screen.getByRole("button", { name: /retry/i });
        fireEvent.click(retryButton);

        await waitFor(() => {
            expect(screen.getByLabelText(/development requester/i)).toBeInTheDocument();
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(screen.getByRole("option", { name: "Jennifer Anderson" })).toBeInTheDocument();
    });

    it("enables Continue button when a requester is selected and navigates to /my-tickets", async () => {
        vi.spyOn(api, "fetchRequesters").mockResolvedValue([
            { id: 1, name: "Jennifer Anderson" },
            { id: 2, name: "Michael Brown" },
        ]);

        renderScreen();

        await waitFor(() => {
            expect(screen.getByLabelText(/development requester/i)).toBeInTheDocument();
        });

        const continueButton = screen.getByRole("button", { name: /continue/i });
        expect(continueButton).toBeDisabled();

        const select = screen.getByLabelText(/development requester/i);
        fireEvent.change(select, { target: { value: "1" } });

        expect(continueButton).not.toBeDisabled();

        fireEvent.click(continueButton);

        await waitFor(() => {
            expect(screen.getByText("My Tickets Screen")).toBeInTheDocument();
        });
    });

    it("resets selection when Cancel is clicked", async () => {
        vi.spyOn(api, "fetchRequesters").mockResolvedValue([
            { id: 1, name: "Jennifer Anderson" },
        ]);

        renderScreen();

        await waitFor(() => {
            expect(screen.getByLabelText(/development requester/i)).toBeInTheDocument();
        });

        const continueButton = screen.getByRole("button", { name: /continue/i });
        const cancelButton = screen.getByRole("button", { name: /cancel/i });
        const select = screen.getByLabelText(/development requester/i) as HTMLSelectElement;

        expect(cancelButton).toBeDisabled();
        expect(continueButton).toBeDisabled();

        fireEvent.change(select, { target: { value: "1" } });
        expect(cancelButton).not.toBeDisabled();
        expect(continueButton).not.toBeDisabled();

        fireEvent.click(cancelButton);
        expect(select.value).toBe("");
        expect(cancelButton).toBeDisabled();
        expect(continueButton).toBeDisabled();
    });
});