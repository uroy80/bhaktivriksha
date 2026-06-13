import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/guards";
import { visibleUserIds } from "@/lib/hierarchy";
import { sessionSchema } from "@/lib/validators";

/** Parse "YYYY-MM" into a [start, nextMonthStart) date range, or null if malformed. */
function monthRange(month: string): { gte: Date; lt: Date } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [y, m] = month.split("-").map(Number);
  if (m < 1 || m > 12) return null;
  return { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
}

/** POST /api/sessions — create a class/satsanga conducted by the caller. */
export async function POST(req: Request) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const body = await req.json().catch(() => null);
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid session details" },
      { status: 400 },
    );
  }

  const { title, type, date, location, notes } = parsed.data;
  const session = await prisma.classSession.create({
    data: {
      title,
      type,
      date,
      location: location || null,
      notes: notes || null,
      conductedById: user.id,
    },
  });

  return NextResponse.json({ session }, { status: 201 });
}

/**
 * GET /api/sessions — list sessions.
 * ADMIN: all (optional ?conductorId= & ?month=YYYY-MM).
 * MISSIONARY: sessions conducted by anyone in their own subtree.
 */
export async function GET(req: Request) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const url = new URL(req.url);
  const conductorId = url.searchParams.get("conductorId");
  const month = url.searchParams.get("month");

  const scope = await visibleUserIds(user); // null = admin = no filter
  const where: Prisma.ClassSessionWhereInput = {};
  if (scope) where.conductedById = { in: scope };

  if (conductorId) {
    if (scope && !scope.includes(conductorId)) {
      return NextResponse.json({ error: "That conductor is outside your group" }, { status: 403 });
    }
    where.conductedById = conductorId;
  }

  if (month) {
    const range = monthRange(month);
    if (!range) {
      return NextResponse.json({ error: "month must be in YYYY-MM format" }, { status: 400 });
    }
    where.date = range;
  }

  const sessions = await prisma.classSession.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      conductedBy: { select: { id: true, name: true } },
      _count: { select: { attendances: true } },
    },
  });

  return NextResponse.json({ sessions });
}
