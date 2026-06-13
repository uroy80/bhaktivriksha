import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { toDateKey } from "@/lib/utils";
import {
  computeStreaks,
  entryDateKey,
  monthAggregates,
} from "@/app/devotee/sadhana/sadhana-stats";

/**
 * GET /api/sadhana/stats — the caller's own streaks + current-month aggregates.
 * Computed in TS from the caller's entries; date keys are UTC-consistent.
 */
export async function GET() {
  const guard = await requireApiUser();
  if (guard.response) return guard.response;
  const user = guard.user;

  const entries = await prisma.sadhanaEntry.findMany({
    where: { userId: user.id },
    select: { date: true, japaRounds: true },
    orderBy: { date: "asc" },
  });

  const todayKey = toDateKey(new Date());
  const keys = new Set(entries.map((e) => entryDateKey(e.date)));
  const { current, longest } = computeStreaks(keys, todayKey);
  const { daysLogged, avgJapa } = monthAggregates(entries, todayKey);

  return NextResponse.json({
    totalEntries: entries.length,
    currentStreak: current,
    longestStreak: longest,
    month: {
      key: todayKey.slice(0, 7),
      daysLogged,
      avgJapa,
    },
  });
}
