import type { FollowUpChannel, ProgressReport } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { getDescendantIds } from "@/lib/hierarchy";
import { formatDate, formatDateTime, toDateKey, weekBounds } from "@/lib/utils";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ReportForm, type EffortPrefill } from "./_components/ReportForm";

async function effortCounts(byId: string, start: Date, end: Date): Promise<EffortPrefill> {
  const groups = await prisma.followUp.groupBy({
    by: ["channel"],
    where: { byId, occurredAt: { gte: start, lte: end } },
    _count: { _all: true },
  });
  const count = (channel: FollowUpChannel) =>
    groups.find((g) => g.channel === channel)?._count._all ?? 0;
  return {
    mails: count("EMAIL"),
    calls: count("PHONE_CALL"),
    homeVisits: count("HOME_VISIT"),
    whatsapp: count("WHATSAPP"),
    sms: count("SMS"),
    inPerson: count("IN_PERSON"),
  };
}

function ReportCard({ report }: { report: ProgressReport }) {
  const counters = [
    ["Mails", report.mails],
    ["Calls", report.calls],
    ["Home visits", report.homeVisits],
    ["Service donors", report.serviceDonors],
    ["Money donors", report.moneyDonors],
  ] as const;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={report.period === "WEEKLY" ? "saffron" : "blue"}>
          {report.period === "WEEKLY" ? "Weekly" : "Daily"}
        </Badge>
        <span className="text-sm font-semibold text-saffron-950">
          {formatDate(report.periodStart)} – {formatDate(report.periodEnd)}
        </span>
        <span className="ml-auto text-xs text-stone-500">
          Submitted {formatDateTime(report.createdAt)}
        </span>
      </div>
      <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-stone-700">
        {report.summary}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {counters.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-saffron-50 px-2 py-1.5 text-center ring-1 ring-saffron-200">
            <p className="text-base font-bold text-saffron-950">{value}</p>
            <p className="text-[11px] text-saffron-900/70">{label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default async function MissionaryReportsPage() {
  const user = await requireRole("MISSIONARY");

  // Prefill windows: today, and the current Monday–Sunday week.
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);
  const week = weekBounds(now);

  const [dailyCounts, weeklyCounts, myReports, descendantIds] = await Promise.all([
    effortCounts(user.id, dayStart, dayEnd),
    effortCounts(user.id, week.start, week.end),
    prisma.progressReport.findMany({
      where: { authorId: user.id },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
      take: 20,
    }),
    getDescendantIds(user.id),
  ]);

  const subtreeReports =
    descendantIds.length > 0
      ? await prisma.progressReport.findMany({
          where: { authorId: { in: descendantIds } },
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
          take: 100,
        })
      : [];

  // Group subtree reports by author, authors sorted by name.
  const byAuthor = new Map<
    string,
    { author: { id: string; name: string; role: string }; reports: typeof subtreeReports }
  >();
  for (const r of subtreeReports) {
    const entry = byAuthor.get(r.authorId) ?? { author: r.author, reports: [] };
    entry.reports.push(r);
    byAuthor.set(r.authorId, entry);
  }
  const authorGroups = [...byAuthor.values()].sort((a, b) =>
    a.author.name.localeCompare(b.author.name),
  );

  return (
    <div>
      <PageHeader
        title="Progress Reports"
        subtitle="Send your daily or weekly update up the chain, and read updates from your missionaries."
        actions={
          <>
            <ButtonLink variant="secondary" href="/missionary/register">
              <Icon.attendance className="h-4 w-4" />
              Weekly Register
            </ButtonLink>
            <ButtonLink variant="secondary" href="/api/reports/export">
              <Icon.download className="h-4 w-4" />
              Download CSV
            </ButtonLink>
          </>
        }
      />

      {/* Submit report */}
      <Card>
        <h2 className="mb-4 text-lg font-bold text-saffron-950">Submit a report</h2>
        <ReportForm
          daily={{ start: toDateKey(dayStart), end: toDateKey(dayEnd), counts: dailyCounts }}
          weekly={{ start: toDateKey(week.start), end: toDateKey(week.end), counts: weeklyCounts }}
        />
      </Card>

      {/* My reports */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-saffron-950">My reports</h2>
        {myReports.length === 0 ? (
          <EmptyState
            title="No reports submitted yet"
            hint="Your daily and weekly updates will appear here once submitted."
          />
        ) : (
          <div className="space-y-3">
            {myReports.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        )}
      </section>

      {/* Reports from the subtree */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-saffron-950">Reports from my missionaries</h2>
        {authorGroups.length === 0 ? (
          <EmptyState
            title="No reports from your missionaries yet"
            hint="When missionaries under you submit progress reports, they will appear here grouped by person."
          />
        ) : (
          <div className="space-y-6">
            {authorGroups.map((group) => (
              <div key={group.author.id}>
                <div className="mb-2 flex items-center gap-2">
                  <h3 className="text-base font-semibold text-saffron-950">{group.author.name}</h3>
                  <Badge tone={group.author.role === "MISSIONARY" ? "saffron" : "gray"}>
                    {group.author.role === "MISSIONARY" ? "Missionary" : "Devotee"}
                  </Badge>
                  <span className="text-xs text-stone-500">
                    {group.reports.length} report{group.reports.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="space-y-3">
                  {group.reports.map((r) => (
                    <ReportCard key={r.id} report={r} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
