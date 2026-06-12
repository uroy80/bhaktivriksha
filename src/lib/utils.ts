/** Join class names, skipping falsy values. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Format a date for display, e.g. "13 Jun 2026". */
export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Format a date with time, e.g. "13 Jun 2026, 6:30 pm". */
export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** YYYY-MM-DD in local time (for <input type="date"> values and date-keyed records). */
export function toDateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Serialize rows to CSV with proper quoting. Pass headers as the first row.
 * Returns a string ready for a text/csv response with Content-Disposition.
 */
export function toCsv(rows: (string | number | boolean | null | undefined)[][]): string {
  const escape = (v: string | number | boolean | null | undefined): string => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((row) => row.map(escape).join(",")).join("\r\n") + "\r\n";
}

/** Standard CSV download response. */
export function csvResponse(filename: string, rows: (string | number | boolean | null | undefined)[][]): Response {
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Monday-start week boundaries for a given date (used by weekly reports/registers). */
export function weekBounds(d: Date): { start: Date; end: Date } {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}
