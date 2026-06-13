import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/guards";
import { csvResponse, toDateKey } from "@/lib/utils";
import { buildReportWhere } from "../_shared";

/** CSV export of progress reports — same scoping and filters as GET /api/reports. */
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
    include: { author: { select: { name: true } } },
  });

  const rows: (string | number)[][] = [
    [
      "Author",
      "Period",
      "Start",
      "End",
      "Summary",
      "Mails",
      "Calls",
      "HomeVisits",
      "ServiceDonors",
      "MoneyDonors",
    ],
    ...reports.map((r) => [
      r.author.name,
      r.period,
      toDateKey(r.periodStart),
      toDateKey(r.periodEnd),
      r.summary,
      r.mails,
      r.calls,
      r.homeVisits,
      r.serviceDonors,
      r.moneyDonors,
    ]),
  ];

  return csvResponse("progress-reports.csv", rows);
}
