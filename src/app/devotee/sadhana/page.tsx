import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { cn, formatDate, toDateKey, weekBounds } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader, StatCard, Table, Td, Th } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LotusLogo } from "@/components/lotus";
import { SadhanaForm } from "./sadhana-form";
import {
  computeStreaks,
  entryDateKey,
  monthAggregates,
  monthChantingQuality,
} from "./sadhana-stats";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function SadhanaJournalPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("DEVOTEE", "MISSIONARY", "ADMIN");
  const sp = await props.searchParams;

  const todayKey = toDateKey(new Date());
  const raw = typeof sp.date === "string" ? sp.date : undefined;
  const dateKey =
    raw &&
    DATE_RE.test(raw) &&
    raw <= todayKey &&
    new Date(raw).toISOString().slice(0, 10) === raw
      ? raw
      : todayKey;

  const [entry, allEntries, recentEntries] = await Promise.all([
    prisma.sadhanaEntry.findUnique({
      where: { userId_date: { userId: user.id, date: new Date(dateKey) } },
    }),
    prisma.sadhanaEntry.findMany({
      where: { userId: user.id },
      select: { date: true, japaRounds: true, chantingQuality: true },
      orderBy: { date: "asc" },
    }),
    prisma.sadhanaEntry.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 14,
    }),
  ]);

  const keys = new Set(allEntries.map((e) => entryDateKey(e.date)));
  const { current, longest } = computeStreaks(keys, todayKey);
  const { daysLogged, avgJapa } = monthAggregates(allEntries, todayKey);
  const { avg: avgQuality, rated: ratedDays } = monthChantingQuality(allEntries, todayKey);
  const dayOfMonth = Number(todayKey.slice(8, 10));

  // This week, Monday → Sunday
  const { start } = weekBounds(new Date());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toDateKey(d);
    return { key, label: DAY_LABELS[i], logged: keys.has(key), isToday: key === todayKey, future: key > todayKey };
  });

  return (
    <div>
      <PageHeader
        title="My Sadhana"
        subtitle={
          dateKey === todayKey
            ? `Logging for today, ${formatDate(dateKey)}`
            : `Logging for ${formatDate(dateKey)}`
        }
        actions={<LotusLogo className="h-11 w-11" />}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* The journal form */}
        <div className="lg:col-span-3">
          <SadhanaForm
            key={dateKey}
            dateKey={dateKey}
            todayKey={todayKey}
            initial={
              entry
                ? {
                    japaRounds: entry.japaRounds,
                    chantingQuality: entry.chantingQuality,
                    readingMinutes: entry.readingMinutes,
                    mangalArati: entry.mangalArati,
                    eveningArati: entry.eveningArati,
                    lectureHeard: entry.lectureHeard,
                    notes: entry.notes ?? "",
                  }
                : null
            }
          />
        </div>

        {/* This week + stats */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-saffron-900/60">
              This week
            </p>
            <div className="flex items-start justify-between">
              {weekDays.map((d) => (
                <div key={d.key} className="flex flex-col items-center gap-1.5">
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                      d.logged
                        ? "bg-saffron-600 text-white"
                        : d.future
                          ? "bg-saffron-50 text-saffron-300"
                          : "bg-saffron-100 text-saffron-400",
                      d.isToday && "ring-2 ring-saffron-600 ring-offset-2",
                    )}
                    title={formatDate(d.key)}
                  >
                    {d.logged ? (
                      <Icon.check className="h-4 w-4" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    )}
                  </span>
                  <span className="text-[10px] font-medium text-saffron-900/60">{d.label}</span>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Current streak"
              value={
                <span className="flex items-center gap-2">
                  {current}
                  <Icon.streak className="h-7 w-7 text-saffron-500" />
                </span>
              }
              sub={current === 1 ? "day in a row" : "days in a row"}
            />
            <StatCard label="Longest streak" value={longest} sub="days, all time" />
            <StatCard
              label="This month"
              value={daysLogged}
              sub={`of ${dayOfMonth} days logged`}
            />
            <StatCard label="Avg japa" value={avgJapa} sub="rounds/day this month" />
            <StatCard
              label="Avg chanting"
              value={
                avgQuality == null ? (
                  "—"
                ) : (
                  <span className="flex items-baseline gap-1">
                    {avgQuality}
                    <span className="text-lg font-semibold text-saffron-900/50">/ 10</span>
                  </span>
                )
              }
              sub={
                avgQuality == null
                  ? "not rated yet this month"
                  : `from ${ratedDays} rated ${ratedDays === 1 ? "day" : "days"}`
              }
            />
          </div>
        </div>
      </div>

      {/* Last 14 entries */}
      <h2 className="mb-3 mt-8 text-lg font-semibold text-saffron-950">Recent entries</h2>
      {recentEntries.length === 0 ? (
        <EmptyState
          title="No entries yet"
          hint="Save your first day above — your journey begins with one round. Hare Krishna"
        />
      ) : (
        <Table>
          <thead className="bg-saffron-50">
            <tr>
              <Th>Date</Th>
              <Th>
                <span className="flex items-center gap-1.5">
                  <Icon.japa className="h-4 w-4 text-saffron-600" /> Japa
                </span>
              </Th>
              <Th>
                <span className="flex items-center gap-1.5">
                  <Icon.bliss className="h-4 w-4 text-saffron-600" /> Chanting
                </span>
              </Th>
              <Th>
                <span className="flex items-center gap-1.5">
                  <Icon.reading className="h-4 w-4 text-saffron-600" /> Reading
                </span>
              </Th>
              <Th>
                <span className="flex justify-center" title="Mangal Arati">
                  <Icon.mangalArati className="h-4 w-4 text-saffron-600" />
                  <span className="sr-only">Mangal Arati</span>
                </span>
              </Th>
              <Th>
                <span className="flex justify-center" title="Evening Arati">
                  <Icon.eveningArati className="h-4 w-4 text-saffron-600" />
                  <span className="sr-only">Evening Arati</span>
                </span>
              </Th>
              <Th>
                <span className="flex justify-center" title="Lecture heard">
                  <Icon.lecture className="h-4 w-4 text-saffron-600" />
                  <span className="sr-only">Lecture heard</span>
                </span>
              </Th>
              <Th>Notes</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-saffron-900/5">
            {recentEntries.map((e) => {
              const k = entryDateKey(e.date);
              return (
                <tr key={e.id} className="hover:bg-saffron-50/50">
                  <Td className="whitespace-nowrap font-medium">
                    {formatDate(k)}
                    {k === todayKey ? <Badge className="ml-2">Today</Badge> : null}
                  </Td>
                  <Td className="font-medium tabular-nums">{e.japaRounds}</Td>
                  <Td>
                    <QualityMeter value={e.chantingQuality} />
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums">{e.readingMinutes} min</Td>
                  <Td>
                    <PracticeMark on={e.mangalArati} label="Mangal Arati" />
                  </Td>
                  <Td>
                    <PracticeMark on={e.eveningArati} label="Evening Arati" />
                  </Td>
                  <Td>
                    <PracticeMark on={e.lectureHeard} label="Lecture heard" />
                  </Td>
                  <Td className="max-w-xs truncate text-stone-500">{e.notes ?? ""}</Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}

/** A small 10-dot meter for a day's chanting quality; "—" when unrated. */
function QualityMeter({ value }: { value: number | null }) {
  if (value == null) return <span className="text-stone-400">—</span>;
  return (
    <span
      className="flex items-center gap-1.5"
      title={`Quality of chanting: ${value} of 10`}
    >
      <span className="flex gap-0.5" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 w-1.5 rounded-sm",
              i < value ? "bg-saffron-500" : "bg-saffron-100",
            )}
          />
        ))}
      </span>
      <span className="text-xs font-semibold tabular-nums text-saffron-900/70">{value}/10</span>
    </span>
  );
}

/** A practice cell: saffron check when done, gentle dash when not. */
function PracticeMark({ on, label }: { on: boolean; label: string }) {
  return on ? (
    <span className="flex justify-center text-saffron-600" title={`${label} done`}>
      <Icon.check className="h-4 w-4" />
      <span className="sr-only">{label} done</span>
    </span>
  ) : (
    <span className="flex justify-center text-stone-300" title={`${label} not done`} aria-hidden>
      —
    </span>
  );
}
