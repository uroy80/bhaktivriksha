import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  StatCard,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { Icon } from "@/components/icons";

function monthBounds(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(year, month - 1, 1),
    end: new Date(year, month, 0, 23, 59, 59, 999),
  };
}

export default async function AdminReportsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("ADMIN");
  const searchParams = await props.searchParams;

  const authorId = typeof searchParams.authorId === "string" ? searchParams.authorId : "";
  const periodRaw = typeof searchParams.period === "string" ? searchParams.period : "";
  const period = periodRaw === "DAILY" || periodRaw === "WEEKLY" ? periodRaw : "";
  const monthKey =
    typeof searchParams.month === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(searchParams.month)
      ? searchParams.month
      : "";

  const where: Prisma.ProgressReportWhereInput = {};
  if (authorId) where.authorId = authorId;
  if (period) where.period = period;
  if (monthKey) {
    const [y, m] = monthKey.split("-").map(Number);
    const bounds = monthBounds(y, m);
    where.periodStart = { lte: bounds.end };
    where.periodEnd = { gte: bounds.start };
  }

  const now = new Date();
  const currentMonth = monthBounds(now.getFullYear(), now.getMonth() + 1);
  const currentMonthLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  const [reports, authors, totals] = await Promise.all([
    prisma.progressReport.findMany({
      where,
      include: { author: { select: { id: true, name: true, role: true } } },
      orderBy: [{ periodStart: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.user.findMany({
      where: { role: { in: ["MISSIONARY", "ADMIN"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.progressReport.aggregate({
      where: { periodStart: { lte: currentMonth.end }, periodEnd: { gte: currentMonth.start } },
      _sum: { mails: true, calls: true, homeVisits: true, serviceDonors: true, moneyDonors: true },
    }),
  ]);

  const query = new URLSearchParams();
  if (authorId) query.set("authorId", authorId);
  if (period) query.set("period", period);
  if (monthKey) query.set("month", monthKey);
  const qs = query.toString();
  const csvHref = `/api/reports/export${qs ? `?${qs}` : ""}`;

  const stat = (n: number | null | undefined) => n ?? 0;

  return (
    <div>
      <PageHeader
        title="Progress Reports"
        subtitle="Every report submitted across the temple, with this month's combined efforts."
        actions={
          <ButtonLink variant="secondary" href={csvHref}>
            <Icon.download className="h-4 w-4" />
            Download CSV
          </ButtonLink>
        }
      />

      {/* This month's efforts across the temple */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Mails" value={stat(totals._sum.mails)} sub={currentMonthLabel} />
        <StatCard label="Telephone Calls" value={stat(totals._sum.calls)} sub={currentMonthLabel} />
        <StatCard label="Home Visits" value={stat(totals._sum.homeVisits)} sub={currentMonthLabel} />
        <StatCard
          label="Service Donors"
          value={stat(totals._sum.serviceDonors)}
          sub={currentMonthLabel}
        />
        <StatCard
          label="Money Donors"
          value={stat(totals._sum.moneyDonors)}
          sub={currentMonthLabel}
        />
      </div>

      {/* Filters */}
      <form
        method="get"
        className="mb-6 flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-saffron-900/10"
      >
        <Field label="Author">
          <Select name="authorId" defaultValue={authorId} className="w-52">
            <option value="">All authors</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Period">
          <Select name="period" defaultValue={period} className="w-36">
            <option value="">All periods</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </Select>
        </Field>
        <Field label="Month">
          <Input type="month" name="month" defaultValue={monthKey} className="w-44" />
        </Field>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {qs ? (
          <ButtonLink variant="ghost" href="/admin/reports">
            Clear
          </ButtonLink>
        ) : null}
      </form>

      {/* Reports table */}
      {reports.length === 0 ? (
        <EmptyState
          title="No reports match these filters"
          hint="Try clearing the author, period or month filter."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Author</Th>
              <Th>Period</Th>
              <Th>Dates</Th>
              <Th>Summary</Th>
              <Th className="text-center">Mails</Th>
              <Th className="text-center">Calls</Th>
              <Th className="text-center">Visits</Th>
              <Th className="text-center">Service</Th>
              <Th className="text-center">Money</Th>
              <Th>Submitted</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-saffron-900/10">
            {reports.map((r) => {
              const long = r.summary.length > 90;
              const excerpt = long ? `${r.summary.slice(0, 90).trimEnd()}…` : r.summary;
              return (
                <tr key={r.id} className="align-top">
                  <Td className="whitespace-nowrap font-medium">{r.author.name}</Td>
                  <Td>
                    <Badge tone={r.period === "WEEKLY" ? "saffron" : "blue"}>
                      {r.period === "WEEKLY" ? (
                        <Icon.sessions className="mr-1 h-3.5 w-3.5" />
                      ) : (
                        <Icon.clock className="mr-1 h-3.5 w-3.5" />
                      )}
                      {r.period === "WEEKLY" ? "Weekly" : "Daily"}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                  </Td>
                  <Td className="max-w-md">
                    {long ? (
                      <details>
                        <summary className="cursor-pointer text-saffron-800 hover:underline">
                          {excerpt}
                        </summary>
                        <p className="mt-2 whitespace-pre-line text-stone-700">{r.summary}</p>
                      </details>
                    ) : (
                      <span className="whitespace-pre-line">{r.summary}</span>
                    )}
                  </Td>
                  <Td className="text-center font-mono">{r.mails}</Td>
                  <Td className="text-center font-mono">{r.calls}</Td>
                  <Td className="text-center font-mono">{r.homeVisits}</Td>
                  <Td className="text-center font-mono">{r.serviceDonors}</Td>
                  <Td className="text-center font-mono">{r.moneyDonors}</Td>
                  <Td className="whitespace-nowrap text-stone-500">
                    {formatDateTime(r.createdAt)}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
