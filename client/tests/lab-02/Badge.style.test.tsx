import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "../../src/components/Badge";

describe("Badge Style & Component Tests (STYLE-02 / §8.8)", () => {
  it("renders correct label, badge-zen, and CSS class for LOW priority", () => {
    const { container } = render(<Badge type="priority" value="LOW" />);
    expect(screen.getByText("Low")).toBeInTheDocument();
    const el = container.querySelector(".priority-low");
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("badge-zen");
  });

  it("renders correct label, badge-zen, and CSS class for MEDIUM priority", () => {
    const { container } = render(<Badge type="priority" value="MEDIUM" />);
    expect(screen.getByText("Medium")).toBeInTheDocument();
    const el = container.querySelector(".priority-medium");
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("badge-zen");
  });

  it("renders correct label, badge-zen, and CSS class for HIGH priority", () => {
    const { container } = render(<Badge type="priority" value="HIGH" />);
    expect(screen.getByText("High")).toBeInTheDocument();
    const el = container.querySelector(".priority-high");
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("badge-zen");
  });

  it("renders correct label, badge-zen, and CSS class for NEW status", () => {
    const { container } = render(<Badge type="status" value="NEW" />);
    expect(screen.getByText("New")).toBeInTheDocument();
    const el = container.querySelector(".status-new");
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("badge-zen");
  });

  it("renders correct label, badge-zen, and CSS class for OPEN status", () => {
    const { container } = render(<Badge type="status" value="OPEN" />);
    expect(screen.getByText("Open")).toBeInTheDocument();
    const el = container.querySelector(".status-open");
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("badge-zen");
  });

  it("renders correct label, badge-zen, and CSS class for IN_PROGRESS status", () => {
    const { container } = render(<Badge type="status" value="IN_PROGRESS" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    const el = container.querySelector(".status-in-progress");
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("badge-zen");
  });

  it("renders correct label, badge-zen, and CSS class for RESOLVED status", () => {
    const { container } = render(<Badge type="status" value="RESOLVED" />);
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    const el = container.querySelector(".status-resolved");
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("badge-zen");
  });

  it("renders correct label, badge-zen, and CSS class for CLOSED status", () => {
    const { container } = render(<Badge type="status" value="CLOSED" />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
    const el = container.querySelector(".status-closed");
    expect(el).toBeInTheDocument();
    expect(el).toHaveClass("badge-zen");
  });
});
