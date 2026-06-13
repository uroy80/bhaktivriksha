import { NextResponse } from "next/server";
import type { Prisma, User } from "@prisma/client";
import { visibleUserIds } from "@/lib/hierarchy";

/** Parse a YYYY-MM key into local-time month boundaries. Returns null if malformed. */
export function monthRange(key: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(key)) return null;
  const [y, m] = key.split("-").map(Number);
  if (m < 1 || m > 12) return null;
  return {
    start: new Date(y, m - 1, 1),
    end: new Date(y, m, 0, 23, 59, 59, 999),
  };
}

/**
 * Build the scoped Prisma filter for listing/exporting progress reports.
 * ADMIN sees everything; everyone else only authors inside their own subtree.
 * Supported filters: ?authorId= &period=DAILY|WEEKLY &month=YYYY-MM (overlap).
 */
export async function buildReportWhere(
  user: User,
  params: URLSearchParams,
): Promise<
  | { where: Prisma.ProgressReportWhereInput; error?: never }
  | { where?: never; error: NextResponse }
> {
  const where: Prisma.ProgressReportWhereInput = {};
  const visible = await visibleUserIds(user); // null = admin = no filter

  const authorId = params.get("authorId");
  if (authorId) {
    if (visible && !visible.includes(authorId)) {
      return {
        error: NextResponse.json(
          { error: "You may only view reports from missionaries in your own group." },
          { status: 403 },
        ),
      };
    }
    where.authorId = authorId;
  } else if (visible) {
    where.authorId = { in: visible };
  }

  const period = params.get("period");
  if (period) {
    if (period !== "DAILY" && period !== "WEEKLY") {
      return {
        error: NextResponse.json({ error: "period must be DAILY or WEEKLY" }, { status: 400 }),
      };
    }
    where.period = period;
  }

  const month = params.get("month");
  if (month) {
    const range = monthRange(month);
    if (!range) {
      return {
        error: NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 }),
      };
    }
    // A report belongs to a month if its period overlaps that month.
    where.periodStart = { lte: range.end };
    where.periodEnd = { gte: range.start };
  }

  return { where };
}
