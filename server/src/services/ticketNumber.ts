/**
 * Formats an auto-increment ID into the canonical official Ticket Number.
 * Format: TKT-<YYYY>-<000000> (padded to 6 digits)
 * Example: ID 42 in year 2026 -> "TKT-2026-000042"
 */
export function formatTicketNumber(id: number, year: number = new Date().getUTCFullYear()): string {
  if (!Number.isInteger(id) || id < 1) {
    throw new Error(`Invalid ticket ID: ${id}`);
  }
  const paddedId = String(id).padStart(6, "0");
  return `TKT-${year}-${paddedId}`;
}
