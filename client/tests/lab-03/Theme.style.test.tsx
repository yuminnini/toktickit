import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "../../src/components/Badge";

describe("Theme & Extended Badge Style Tests (T51 / AC-51 / STYLE-03)", () => {
  it("theme.css defines compliant Zen Green color, surface, and badge tokens", async () => {
    // @ts-ignore
    const fs = await import("node:fs");
    // @ts-ignore
    const path = await import("node:path");
    // @ts-ignore
    const cssPath = path.resolve(process.cwd(), "src/styles/theme.css");
    expect(fs.existsSync(cssPath)).toBe(true);
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Core color palette
    expect(cssContent).toContain("--color-primary: #006B3C");
    expect(cssContent).toContain("--color-secondary: #0B7A46");
    expect(cssContent).toContain("--color-bg: #F5F7F6");
    expect(cssContent).toContain("--color-surface: #FFFFFF");
    expect(cssContent).toContain("--color-text: #1F2E27");
    expect(cssContent).toContain("--color-error: #B3261E");

    // Form states
    expect(cssContent).toContain("--color-editable-bg: #FFFFFF");
    expect(cssContent).toContain("--color-editable-border: #C9D3CE");
    expect(cssContent).toContain("--color-readonly-bg: #F1F0E8");

    // Status badge tokens
    expect(cssContent).toContain("--badge-status-new-bg");
    expect(cssContent).toContain("--badge-status-open-bg");
    expect(cssContent).toContain("--badge-status-inprog-bg");
    expect(cssContent).toContain("--badge-status-resolved-bg");
    expect(cssContent).toContain("--badge-status-closed-bg");
  });

  describe("Extended Status Badges (AC-51)", () => {
    it("renders WAITING_FOR_REQUESTER badge with readable text and in-progress color pairing", () => {
      const { container } = render(<Badge type="status" value="WAITING_FOR_REQUESTER" />);
      expect(screen.getByText("Waiting for Requester")).toBeInTheDocument();
      const el = container.querySelector(".status-waiting-for-requester");
      expect(el).toBeInTheDocument();
      expect(el).toHaveClass("badge-zen");
      expect(el).toHaveClass("status-in-progress");
    });

    it("renders REOPENED badge with readable text and open color pairing", () => {
      const { container } = render(<Badge type="status" value="REOPENED" />);
      expect(screen.getByText("Reopened")).toBeInTheDocument();
      const el = container.querySelector(".status-reopened");
      expect(el).toBeInTheDocument();
      expect(el).toHaveClass("badge-zen");
      expect(el).toHaveClass("status-open");
    });

    it("renders CANCELLED badge with readable text and closed color pairing", () => {
      const { container } = render(<Badge type="status" value="CANCELLED" />);
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
      const el = container.querySelector(".status-cancelled");
      expect(el).toBeInTheDocument();
      expect(el).toHaveClass("badge-zen");
      expect(el).toHaveClass("status-closed");
    });

    it("renders standard statuses: NEW, OPEN, IN_PROGRESS, RESOLVED, CLOSED", () => {
      const statuses = [
        { val: "NEW", text: "New", cls: "status-new" },
        { val: "OPEN", text: "Open", cls: "status-open" },
        { val: "IN_PROGRESS", text: "In Progress", cls: "status-in-progress" },
        { val: "RESOLVED", text: "Resolved", cls: "status-resolved" },
        { val: "CLOSED", text: "Closed", cls: "status-closed" },
      ] as const;

      for (const s of statuses) {
        const { container } = render(<Badge type="status" value={s.val} />);
        expect(screen.getByText(s.text)).toBeInTheDocument();
        const el = container.querySelector(`.${s.cls}`);
        expect(el).toBeInTheDocument();
        expect(el).toHaveClass("badge-zen");
      }
    });
  });

  describe("Role Badges (AC-13, AC-51)", () => {
    it("renders role badges with explicit role text and Zen badge styling", () => {
      const roles = [
        { val: "REQUESTER", text: "Requester", cls: "role-requester" },
        { val: "IT_STAFF", text: "IT Staff", cls: "role-staff" },
        { val: "ADMINISTRATOR", text: "Administrator", cls: "role-admin" },
      ] as const;

      for (const r of roles) {
        const { container } = render(<Badge type="role" value={r.val} />);
        expect(screen.getByText(r.text)).toBeInTheDocument();
        const el = container.querySelector(`.${r.cls}`);
        expect(el).toBeInTheDocument();
        expect(el).toHaveClass("badge-zen");
      }
    });
  });

  describe("Priority Badges", () => {
    it("renders priority badges: LOW, MEDIUM, HIGH", () => {
      const prios = [
        { val: "LOW", text: "Low", cls: "priority-low" },
        { val: "MEDIUM", text: "Medium", cls: "priority-medium" },
        { val: "HIGH", text: "High", cls: "priority-high" },
      ] as const;

      for (const p of prios) {
        const { container } = render(<Badge type="priority" value={p.val} />);
        expect(screen.getByText(p.text)).toBeInTheDocument();
        const el = container.querySelector(`.${p.cls}`);
        expect(el).toBeInTheDocument();
        expect(el).toHaveClass("badge-zen");
      }
    });
  });
});
