/** Stable unique identifiers (RFC 4122 v4 when available). */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for very old environments.
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
}

export function now(): number {
  return Date.now();
}

/** Local calendar date key, YYYY-MM-DD. */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
