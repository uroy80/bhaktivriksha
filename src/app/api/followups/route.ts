import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireApiUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { canAccessUser, visibleUserIds } from "@/lib/hierarchy";
import { followUpSchema } from "@/lib/validators";

const CHANNEL_VALUES = [
  "PHONE_CALL",
  "WHATSAPP",
  "EMAIL",
  "SMS",
  "HOME_VISIT",
  "IN_PERSON",
  "OTHER",
] as const;

const filterSchema = z.object({
  devoteeId: z.string().trim().min(1).optional(),
  sessionId: z.string().trim().min(1).optional(),
  channel: z.enum(CHANNEL_VALUES, { message: "Unknown channel" }).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD").optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD").optional(),
});

/** Parse ?devoteeId=&channel=&from=&to=&sessionId= into a Prisma where fragment. */
function parseFilters(
  searchParams: URLSearchParams,
): { error: string; where?: never } | { error?: never; where: Prisma.FollowUpWhereInput } {
  const raw: Record<string, string> = {};
  for (const key of ["devoteeId", "sessionId", "channel", "from", "to"] as const) {
    const v = searchParams.get(key);
    if (v) raw[key] = v;
  }
  const parsed = filterSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid filters" };
  }
  const f = parsed.data;
  const where: Prisma.FollowUpWhereInput = {
    ...(f.devoteeId ? { devoteeId: f.devoteeId } : {}),
    ...(f.sessionId ? { sessionId: f.sessionId } : {}),
    ...(f.channel ? { channel: f.channel } : {}),
    ...(f.from || f.to
      ? {
          occurredAt: {
            ...(f.from ? { gte: new Date(`${f.from}T00:00:00`) } : {}),
            ...(f.to ? { lte: new Date(`${f.to}T23:59:59.999`) } : {}),
          },
        }
      : {}),
  };
  return { where };
}

export async function POST(req: Request) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = followUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid follow-up data" },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const sessionId = data.sessionId?.trim() ? data.sessionId.trim() : null;

  const devotee = await prisma.user.findUnique({
    where: { id: data.devoteeId },
    select: { id: true },
  });
  if (!devotee) {
    return NextResponse.json({ error: "Devotee not found" }, { status: 400 });
  }
  if (!(await canAccessUser(user, data.devoteeId))) {
    return NextResponse.json(
      { error: "You can only log follow-ups for devotees in your own group" },
      { status: 403 },
    );
  }

  if (sessionId) {
    const session = await prisma.classSession.findUnique({
      where: { id: sessionId },
      select: { id: true, conductedById: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Linked session not found" }, { status: 400 });
    }
    if (!(await canAccessUser(user, session.conductedById))) {
      return NextResponse.json(
        { error: "You can only link sessions conducted within your own group" },
        { status: 403 },
      );
    }
  }

  const followUp = await prisma.followUp.create({
    data: {
      devoteeId: data.devoteeId,
      sessionId,
      channel: data.channel,
      outcome: data.outcome || null,
      notes: data.notes || null,
      byId: user.id,
      occurredAt: data.occurredAt ?? new Date(),
    },
    include: {
      devotee: { select: { id: true, name: true } },
      by: { select: { id: true, name: true } },
      session: { select: { id: true, title: true, date: true } },
    },
  });

  return NextResponse.json({ followUp }, { status: 201 });
}

export async function GET(req: Request) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const url = new URL(req.url);
  const filters = parseFilters(url.searchParams);
  if (filters.error) {
    return NextResponse.json({ error: filters.error }, { status: 400 });
  }

  // ADMIN sees all (null = no filter); MISSIONARY sees rows where the devotee
  // OR the author is inside their own subtree.
  const visible = await visibleUserIds(user);
  const scope: Prisma.FollowUpWhereInput = visible
    ? { OR: [{ devoteeId: { in: visible } }, { byId: { in: visible } }] }
    : {};

  const followUps = await prisma.followUp.findMany({
    where: { ...scope, ...filters.where },
    include: {
      devotee: { select: { id: true, name: true } },
      by: { select: { id: true, name: true } },
      session: { select: { id: true, title: true, date: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 500,
  });

  return NextResponse.json({ followUps });
}
