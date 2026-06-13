import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/guards";
import { canAccessUser } from "@/lib/hierarchy";
import { attendanceMarkSchema } from "@/lib/validators";

/**
 * PUT /api/sessions/[id]/attendance — mark (or update) one devotee's attendance.
 * Caller must be ADMIN, or have BOTH the session's conductor and the devotee
 * inside their own subtree. sikshaLevel is snapshotted server-side from the
 * devotee's CURRENT level — never trusted from the client.
 */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const { id: sessionId } = await ctx.params;

  const body = await req.json().catch(() => null);
  const parsed = attendanceMarkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid attendance data" },
      { status: 400 },
    );
  }
  const { devoteeId, present, remarks } = parsed.data;

  const session = await prisma.classSession.findUnique({
    where: { id: sessionId },
    select: { id: true, conductedById: true },
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (!(await canAccessUser(user, session.conductedById))) {
    return NextResponse.json({ error: "This session is outside your group" }, { status: 403 });
  }
  if (!(await canAccessUser(user, devoteeId))) {
    return NextResponse.json({ error: "This devotee is outside your group" }, { status: 403 });
  }

  const devotee = await prisma.user.findUnique({
    where: { id: devoteeId },
    select: { id: true, sadhanaLevel: { select: { name: true } } },
  });
  if (!devotee) {
    return NextResponse.json({ error: "Devotee not found" }, { status: 404 });
  }

  const sikshaLevel = devotee.sadhanaLevel?.name ?? null;
  const now = new Date();

  const attendance = await prisma.attendance.upsert({
    where: { sessionId_devoteeId: { sessionId, devoteeId } },
    create: {
      sessionId,
      devoteeId,
      present,
      remarks: remarks ?? null,
      sikshaLevel,
      markedById: user.id,
      markedAt: now,
    },
    update: {
      present,
      // remarks only change when the client actually sent them
      ...(remarks !== undefined ? { remarks: remarks || null } : {}),
      sikshaLevel,
      markedById: user.id,
      markedAt: now,
    },
  });

  return NextResponse.json({ attendance });
}
