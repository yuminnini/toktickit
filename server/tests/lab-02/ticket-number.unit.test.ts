import { describe, it, expect } from "vitest";
import { formatTicketNumber } from "../../src/services/ticketNumber.js";

describe("Ticket Number Generator (UNIT-01 / BR-01)", () => {
  it("formats IDs with padding and current UTC year according to TKT-<year>-<id padded 6>", () => {
    const regex = /^TKT-\d{4}-\d{6}$/;

    const tkt1 = formatTicketNumber(1, 2026);
    expect(tkt1).toBe("TKT-2026-000001");
    expect(tkt1).toMatch(regex);

    const tkt42 = formatTicketNumber(42, 2026);
    expect(tkt42).toBe("TKT-2026-000042");
    expect(tkt42).toMatch(regex);

    const tkt999999 = formatTicketNumber(999999, 2026);
    expect(tkt999999).toBe("TKT-2026-999999");
    expect(tkt999999).toMatch(regex);
  });

  it("throws for invalid ID values", () => {
    expect(() => formatTicketNumber(0)).toThrow();
    expect(() => formatTicketNumber(-5)).toThrow();
    expect(() => formatTicketNumber(1.5)).toThrow();
  });
});
