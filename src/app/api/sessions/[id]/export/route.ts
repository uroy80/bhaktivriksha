import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/guards";
import { canAccessUser } from "@/lib/hierarchy";
import { csvResponse, formatDateTime, toDateKey } from "@/lib/utils";

/**
 * GET /api/sessions/[id]/export — attendance register as CSV.
 * Session metadata rows, then Name / Level (S) / Present (A: P/A) / Remarks / Marked At.
 * Roster = conductor's direct ACTIVE mentees + anyone with an attendance row.
 * Same scoping as the session detail.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const { id } = await ctx.params;
  const session = await prisma.classSession.findUnique({
    where: { id },
    include: {
      conductedBy: { select: { id: true, name: true } },
      attendances: {
        include: {
          devotee: { select: { id: true, name: true, sadhanaLevel: { select: { name: true } } } },
        },
      },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!(await canAccessUser(user, session.conductedById))) {
    return NextResponse.json({ error: "This session is outside your group" }, { status: 403 });
  }

  const mentees = await prisma.user.findMany({
    where: { mentorId: session.conductedById, status: "ACTIVE" },
    select: { id: true, name: true, sadhanaLevel: { select: { name: true } } },
  });

  type RosterRow = {
    name: string;
    level: string;
    present: boolean;
    remarks: string;
    markedAt: string;
  };
  const roster = new Map<string, RosterRow>();
  for (const m of mentees) {
    roster.set(m.id, {
      name: m.name,
      level: m.sadhanaLevel?.name ?? "",
      present: false,
      remarks: "",
      markedAt: "",
    });
  }
  for (const a of session.attendances) {
    roster.set(a.devoteeId, {
      name: a.devotee.name,
      // prefer the snapshot taken at marking time; fall back to the current level
      level: a.sikshaLevel ?? a.devotee.sadhanaLevel?.name ?? "",
      present: a.present,
      remarks: a.remarks ?? "",
      markedAt: formatDateTime(a.markedAt),
    });
  }
  const rows = [...roster.values()].sort((a, b) => a.name.localeCompare(b.name));
  const presentCount = rows.filter((r) => r.present).length;

  return csvResponse(`session-${toDateKey(new Date(session.date))}-attendance.csv`, [
    ["Session", session.title],
    ["Type", session.type],
    ["Date", formatDateTime(session.date)],
    ["Location", session.location ?? ""],
    ["Conducted By", session.conductedBy.name],
    ["Present", `${presentCount} of ${rows.length}`],
    [],
    ["Name", "Level (S)", "Present (A)", "Remarks", "Marked At"],
    ...rows.map((r) => [r.name, r.level, r.present ? "P" : "A", r.remarks, r.markedAt]),
  ]);
}
