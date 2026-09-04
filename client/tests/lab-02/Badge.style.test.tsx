import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Badge from "../../src/components/Badge";

describe("Badge Style & Component Tests (STYLE-02)", () => {
  it("renders correct label and CSS class for LOW priority", () => {
    const { container } = render(<Badge type="priority" value="LOW" />);
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(container.querySelector(".priority-low")).toBeInTheDocument();
  });

  it("renders correct label and CSS class for MEDIUM priority", () => {
    const { container } = render(<Badge type="priority" value="MEDIUM" />);
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(container.querySelector(".priority-medium")).toBeInTheDocument();
  });

  it("renders correct label and CSS class for HIGH priority", () => {
    const { container } = render(<Badge type="priority" value="HIGH" />);
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(container.querySelector(".priority-high")).toBeInTheDocument();
  });

  it("renders correct label and CSS class for NEW status", () => {
    const { container } = render(<Badge type="status" value="NEW" />);
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(container.querySelector(".status-new")).toBeInTheDocument();
  });

  it("renders correct label and CSS class for OPEN status", () => {
    const { container } = render(<Badge type="status" value="OPEN" />);
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(container.querySelector(".status-open")).toBeInTheDocument();
  });

  it("renders correct label and CSS class for IN_PROGRESS status", () => {
    const { container } = render(<Badge type="status" value="IN_PROGRESS" />);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(container.querySelector(".status-in-progress")).toBeInTheDocument();
  });

  it("renders correct label and CSS class for RESOLVED status", () => {
    const { container } = render(<Badge type="status" value="RESOLVED" />);
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(container.querySelector(".status-resolved")).toBeInTheDocument();
  });

  it("renders correct label and CSS class for CLOSED status", () => {
    const { container } = render(<Badge type="status" value="CLOSED" />);
    expect(screen.getByText("Closed")).toBeInTheDocument();
    expect(container.querySelector(".status-closed")).toBeInTheDocument();
  });
});
