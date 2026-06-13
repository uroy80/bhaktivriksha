import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { sadhanaEntrySchema } from "@/lib/validators";
import { toDateKey } from "@/lib/utils";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * PUT /api/sadhana — upsert the caller's journal entry for a given date.
 * Everyone (admin, missionary, devotee) keeps a sadhana, so no role filter —
 * but the entry is ALWAYS written against the caller's own id.
 */
export async function PUT(req: Request) {
  const guard = await requireApiUser();
  if (guard.response) return guard.response;
  const user = guard.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = sadhanaEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid sadhana entry" },
      { status: 400 },
    );
  }

  const {
    date,
    japaRounds,
    chantingQuality,
    readingMinutes,
    mangalArati,
    eveningArati,
    lectureHeard,
    notes,
  } = parsed.data;

  // YYYY-MM-DD strings compare correctly lexicographically.
  if (date > toDateKey(new Date())) {
    return NextResponse.json(
      { error: "You cannot log sadhana for a future date" },
      { status: 400 },
    );
  }

  // "YYYY-MM-DD" parses to UTC midnight — matches the @db.Date column exactly.
  const day = new Date(date);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
    return NextResponse.json({ error: "That is not a real calendar date" }, { status: 400 });
  }

  const fields = {
    japaRounds,
    chantingQuality: chantingQuality ?? null,
    readingMinutes,
    mangalArati,
    eveningArati,
    lectureHeard,
    notes: notes && notes.length > 0 ? notes : null,
  };

  const entry = await prisma.sadhanaEntry.upsert({
    where: { userId_date: { userId: user.id, date: day } },
    create: { userId: user.id, date: day, ...fields },
    update: fields,
  });

  return NextResponse.json({ entry });
}

/**
 * GET /api/sadhana?from=YYYY-MM-DD&to=YYYY-MM-DD — the caller's own entries,
 * newest first, capped at 100 rows.
 */
export async function GET(req: Request) {
  const guard = await requireApiUser();
  if (guard.response) return guard.response;
  const user = guard.user;

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if ((from && !DATE_RE.test(from)) || (to && !DATE_RE.test(to))) {
    return NextResponse.json({ error: "from/to must be YYYY-MM-DD" }, { status: 400 });
  }

  const entries = await prisma.sadhanaEntry.findMany({
    where: {
      userId: user.id,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  return NextResponse.json({ entries });
}
