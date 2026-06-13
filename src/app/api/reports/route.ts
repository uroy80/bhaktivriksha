import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/guards";
import { progressReportSchema } from "@/lib/validators";
import { buildReportWhere } from "./_shared";

/** Submit a progress report. Author is always the caller — never client-supplied. */
export async function POST(req: Request) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = progressReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid report data" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  if (data.periodStart.getTime() > data.periodEnd.getTime()) {
    return NextResponse.json(
      { error: "Period start must be on or before period end" },
      { status: 400 },
    );
  }

  const report = await prisma.progressReport.create({
    data: {
      authorId: user.id,
      period: data.period,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      summary: data.summary,
      mails: data.mails,
      calls: data.calls,
      homeVisits: data.homeVisits,
      serviceDonors: data.serviceDonors,
      moneyDonors: data.moneyDonors,
    },
  });

  return NextResponse.json({ report }, { status: 201 });
}

/**
 * List progress reports.
 * ADMIN: all reports (?authorId=&period=&month=). MISSIONARY: authors in own subtree only.
 */
export async function GET(req: Request) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const params = new URL(req.url).searchParams;
  const scoped = await buildReportWhere(user, params);
  if (scoped.error) return scoped.error;

  const reports = await prisma.progressReport.findMany({
    where: scoped.where,
    orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
    take: 500,
    include: { author: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json({ reports });
}
