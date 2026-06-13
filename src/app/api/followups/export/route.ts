import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireApiUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { visibleUserIds } from "@/lib/hierarchy";
import { csvResponse, formatDate, formatDateTime, toDateKey } from "@/lib/utils";
import { CHANNEL_PLAIN_LABELS } from "@/app/missionary/followups/_components/channels";

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

export async function GET(req: Request) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const url = new URL(req.url);
  const filters = parseFilters(url.searchParams);
  if (filters.error) {
    return NextResponse.json({ error: filters.error }, { status: 400 });
  }

  const visible = await visibleUserIds(user);
  const scope: Prisma.FollowUpWhereInput = visible
    ? { OR: [{ devoteeId: { in: visible } }, { byId: { in: visible } }] }
    : {};

  const followUps = await prisma.followUp.findMany({
    where: { ...scope, ...filters.where },
    include: {
      devotee: { select: { name: true } },
      by: { select: { name: true } },
      session: { select: { title: true, date: true } },
    },
    orderBy: { occurredAt: "desc" },
    take: 5000,
  });

  const rows: (string | number | null | undefined)[][] = [
    ["Date", "Devotee", "Channel", "Outcome", "Notes", "By", "Session", "SessionDate"],
    ...followUps.map((f) => [
      formatDateTime(f.occurredAt),
      f.devotee.name,
      CHANNEL_PLAIN_LABELS[f.channel],
      f.outcome ?? "",
      f.notes ?? "",
      f.by.name,
      f.session?.title ?? "",
      f.session ? formatDate(f.session.date) : "",
    ]),
  ];

  return csvResponse(`followups-${toDateKey()}.csv`, rows);
}
