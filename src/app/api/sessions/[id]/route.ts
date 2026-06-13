import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/guards";
import { canAccessUser } from "@/lib/hierarchy";

/**
 * GET /api/sessions/[id] — session detail with attendance rows.
 * Scoped: admin, or the session's conductor sits inside the caller's subtree.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const { id } = await ctx.params;
  const session = await prisma.classSession.findUnique({
    where: { id },
    include: {
      conductedBy: { select: { id: true, name: true, role: true } },
      attendances: {
        orderBy: { devotee: { name: "asc" } },
        include: {
          devotee: {
            select: { id: true, name: true, role: true, sadhanaLevel: { select: { name: true } } },
          },
          markedBy: { select: { id: true, name: true } },
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

  return NextResponse.json({ session });
}
