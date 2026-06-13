import type { FollowUpChannel, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSubtreeIds } from "@/lib/hierarchy";
import { weekBounds } from "@/lib/utils";

/*
 * Digitized "Bhakti Vriksha Group Weekly Report Format".
 * Week 1 = the Monday–Sunday week containing the 1st of the month; weeks 1–5 run consecutively.
 * TABLE 1: rows = the missionary's direct ACTIVE mentees;
 *   A = "P" (attended a subtree session that week) / "A" (sessions held, attended none) / "" (no session);
 *   S = the devotee's current siksha level order (1–5).
 * TABLE 2: the five EFFORTS counters per week from the missionary's progress reports,
 *   falling back to live follow-up logs (mails/calls/home visits) for weeks with no report.
 */

export type RegisterWeek = { index: number; start: Date; end: Date; sessionCount: number };

export type RegisterRow = {
  id: string;
  name: string;
  /** Current siksha level order as a string, "" when untagged. */
  levelOrder: string;
  /** One mark per week: "P" present, "A" absent, "" no session that week. */
  marks: ("P" | "A" | "")[];
  /** Latest non-empty attendance remark within the calendar month. */
  remarks: string;
};

export type EffortRow = { label: string; weekly: number[]; total: number };

export type RegisterData = {
  weeks: RegisterWeek[];
  rows: RegisterRow[];
  efforts: EffortRow[];
  levels: { order: number; name: string }[];
};

export function resolveMonth(raw: string | string[] | undefined | null): {
  year: number;
  month: number;
  key: string;
  label: string;
} {
  const value = Array.isArray(raw) ? raw[0] : raw;
  let year: number;
  let month: number;
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    [year, month] = value.split("-").map(Number);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }
  return {
    year,
    month,
    key: `${year}-${String(month).padStart(2, "0")}`,
    label: new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    }),
  };
}

export function weekRangeLabel(w: { start: Date; end: Date }): string {
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${fmt(w.start)} – ${fmt(w.end)}`;
}

const EFFORT_FIELDS: {
  label: string;
  report: "mails" | "calls" | "homeVisits" | "serviceDonors" | "moneyDonors";
  channel: FollowUpChannel | null;
}[] = [
  { label: "No. of Mails", report: "mails", channel: "EMAIL" },
  { label: "No. of Telephone Calls", report: "calls", channel: "PHONE_CALL" },
  { label: "No. of Home Visits", report: "homeVisits", channel: "HOME_VISIT" },
  { label: "No. of Service Donors", report: "serviceDonors", channel: null },
  { label: "No. of Money Donors", report: "moneyDonors", channel: null },
];

export async function buildRegisterData(
  missionary: User,
  year: number,
  month: number,
): Promise<RegisterData> {
  // Weeks 1–5, Monday-start, week 1 contains the 1st of the month.
  const w1 = weekBounds(new Date(year, month - 1, 1));
  const weeks: RegisterWeek[] = Array.from({ length: 5 }, (_, i) => {
    const start = new Date(w1.start);
    start.setDate(start.getDate() + i * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { index: i + 1, start, end, sessionCount: 0 };
  });

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
  const rangeStart = weeks[0].start;
  // Sessions queried over the union of the 5 weeks and the calendar month
  // (remarks come from the calendar month, which can outrun week 5).
  const rangeEnd = monthEnd > weeks[4].end ? monthEnd : weeks[4].end;

  const [subtreeIds, mentees, levels] = await Promise.all([
    getSubtreeIds(missionary.id),
    prisma.user.findMany({
      where: { mentorId: missionary.id, status: "ACTIVE" },
      orderBy: { name: "asc" },
      include: { sadhanaLevel: { select: { order: true } } },
    }),
    prisma.sadhanaLevel.findMany({
      orderBy: { order: "asc" },
      select: { order: true, name: true },
    }),
  ]);

  const sessions = await prisma.classSession.findMany({
    where: { conductedById: { in: subtreeIds }, date: { gte: rangeStart, lte: rangeEnd } },
    select: { id: true, date: true },
  });
  const sessionDate = new Map(sessions.map((s) => [s.id, s.date]));

  const attendances =
    sessions.length > 0 && mentees.length > 0
      ? await prisma.attendance.findMany({
          where: {
            sessionId: { in: sessions.map((s) => s.id) },
            devoteeId: { in: mentees.map((m) => m.id) },
          },
          select: { devoteeId: true, sessionId: true, present: true, remarks: true },
        })
      : [];

  const weekSessionIds = weeks.map((w) => {
    const ids = new Set(
      sessions.filter((s) => s.date >= w.start && s.date <= w.end).map((s) => s.id),
    );
    w.sessionCount = ids.size;
    return ids;
  });

  const rows: RegisterRow[] = mentees.map((m) => {
    const mine = attendances.filter((a) => a.devoteeId === m.id);

    const marks = weeks.map((_, i): "P" | "A" | "" => {
      const ids = weekSessionIds[i];
      if (ids.size === 0) return "";
      return mine.some((a) => ids.has(a.sessionId) && a.present) ? "P" : "A";
    });

    // Latest non-empty remark from a session held within the calendar month.
    const remark = mine
      .filter((a) => {
        const d = sessionDate.get(a.sessionId);
        return Boolean(a.remarks?.trim()) && d !== undefined && d >= monthStart && d <= monthEnd;
      })
      .sort(
        (a, b) =>
          (sessionDate.get(b.sessionId)?.getTime() ?? 0) -
          (sessionDate.get(a.sessionId)?.getTime() ?? 0),
      )[0]?.remarks;

    return {
      id: m.id,
      name: m.name,
      levelOrder: m.sadhanaLevel ? String(m.sadhanaLevel.order) : "",
      marks,
      remarks: remark?.trim() ?? "",
    };
  });

  // EFFORTS: per-week sums from the missionary's reports overlapping the week;
  // weeks with no report fall back to live follow-up counts (mails/calls/home visits).
  const [reports, followUps] = await Promise.all([
    prisma.progressReport.findMany({
      where: {
        authorId: missionary.id,
        periodStart: { lte: weeks[4].end },
        periodEnd: { gte: weeks[0].start },
      },
    }),
    prisma.followUp.findMany({
      where: {
        byId: missionary.id,
        occurredAt: { gte: weeks[0].start, lte: weeks[4].end },
        channel: { in: ["EMAIL", "PHONE_CALL", "HOME_VISIT"] },
      },
      select: { channel: true, occurredAt: true },
    }),
  ]);

  const efforts: EffortRow[] = EFFORT_FIELDS.map((f) => ({
    label: f.label,
    weekly: [],
    total: 0,
  }));

  for (const w of weeks) {
    const overlapping = reports.filter((r) => r.periodStart <= w.end && r.periodEnd >= w.start);
    EFFORT_FIELDS.forEach((f, fi) => {
      let n = 0;
      if (overlapping.length > 0) {
        n = overlapping.reduce((sum, r) => sum + r[f.report], 0);
      } else if (f.channel) {
        n = followUps.filter(
          (fu) => fu.channel === f.channel && fu.occurredAt >= w.start && fu.occurredAt <= w.end,
        ).length;
      }
      efforts[fi].weekly.push(n);
      efforts[fi].total += n;
    });
  }

  return { weeks, rows, efforts, levels };
}
