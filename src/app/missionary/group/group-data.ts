import type { Role, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Shared computation for "my group" rows — used by the group page,
 * GET /api/missionary/group and the CSV export route.
 */

export type GroupRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  role: Role;
  status: UserStatus;
  levelName: string | null;
  /** Most recent SadhanaEntry date as YYYY-MM-DD, or null if never logged. */
  lastSadhana: string | null;
  /** Percent present over the last 4 weeks (of marked rows), null if nothing marked. */
  attendancePct: number | null;
  attended4w: number;
  marked4w: number;
  /** Most recent follow-up received (ISO datetime), or null. */
  lastFollowUp: string | null;
};

/** Local midnight `n` days ago. */
export function startOfDaysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

/** Direct mentees of `mentorId` with care metrics, missionaries first then by name. */
export async function getGroupRows(mentorId: string): Promise<GroupRow[]> {
  const mentees = await prisma.user.findMany({
    where: { mentorId },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      role: true,
      status: true,
      sadhanaLevel: { select: { name: true } },
    },
  });
  if (mentees.length === 0) return [];
  const ids = mentees.map((m) => m.id);

  const fourWeeksAgo = startOfDaysAgo(28);

  const [sadhana, attendance, followUps] = await Promise.all([
    prisma.sadhanaEntry.groupBy({
      by: ["userId"],
      where: { userId: { in: ids } },
      _max: { date: true },
    }),
    prisma.attendance.findMany({
      where: { devoteeId: { in: ids }, session: { date: { gte: fourWeeksAgo } } },
      select: { devoteeId: true, present: true },
    }),
    prisma.followUp.groupBy({
      by: ["devoteeId"],
      where: { devoteeId: { in: ids } },
      _max: { occurredAt: true },
    }),
  ]);

  const lastSadhanaBy = new Map(sadhana.map((s) => [s.userId, s._max.date]));
  const lastFollowUpBy = new Map(followUps.map((f) => [f.devoteeId, f._max.occurredAt]));
  const att = new Map<string, { present: number; total: number }>();
  for (const a of attendance) {
    const cur = att.get(a.devoteeId) ?? { present: 0, total: 0 };
    cur.total += 1;
    if (a.present) cur.present += 1;
    att.set(a.devoteeId, cur);
  }

  return mentees.map((m) => {
    const last = lastSadhanaBy.get(m.id) ?? null;
    const fu = lastFollowUpBy.get(m.id) ?? null;
    const a = att.get(m.id);
    return {
      id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone,
      whatsapp: m.whatsapp,
      role: m.role,
      status: m.status,
      levelName: m.sadhanaLevel?.name ?? null,
      lastSadhana: last ? last.toISOString().slice(0, 10) : null,
      attendancePct: a && a.total > 0 ? Math.round((a.present / a.total) * 100) : null,
      attended4w: a?.present ?? 0,
      marked4w: a?.total ?? 0,
      lastFollowUp: fu ? fu.toISOString() : null,
    };
  });
}
