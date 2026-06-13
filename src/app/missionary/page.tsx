import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getDescendantIds } from "@/lib/hierarchy";
import { formatDate, toDateKey, weekBounds } from "@/lib/utils";
import { Badge, ButtonLink, Card, PageHeader, StatCard } from "@/components/ui";
import { startOfDaysAgo } from "./group/group-data";

export default async function MissionaryDashboardPage() {
  const user = await requireRole("MISSIONARY");

  const [mentees, descendantIds] = await Promise.all([
    prisma.user.findMany({
      where: { mentorId: user.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true, status: true },
    }),
    getDescendantIds(user.id),
  ]);
  const menteeIds = mentees.map((m) => m.id);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const { start: weekStart, end: weekEnd } = weekBounds(now);
  const sevenDaysAgo = startOfDaysAgo(7);
  const fourteenDaysAgo = startOfDaysAgo(14);
  const today = new Date(toDateKey());

  const [sessionsThisMonth, followUpsThisWeek, latestSession, recentSadhana, todayEntries, lastFollowUps] =
    await Promise.all([
      prisma.classSession.count({
        where: { conductedById: user.id, date: { gte: monthStart, lte: now } },
      }),
      prisma.followUp.count({
        where: { byId: user.id, occurredAt: { gte: weekStart, lte: weekEnd } },
      }),
      prisma.classSession.findFirst({
        where: { conductedById: user.id, date: { lte: now } },
        orderBy: { date: "desc" },
        select: {
          id: true,
          title: true,
          date: true,
          attendances: { where: { present: false }, select: { devoteeId: true } },
        },
      }),
      prisma.sadhanaEntry.findMany({
        where: { userId: { in: menteeIds }, date: { gte: sevenDaysAgo } },
        select: { userId: true },
        distinct: ["userId"],
      }),
      prisma.sadhanaEntry.findMany({
        where: { userId: { in: menteeIds }, date: { gte: today } },
        select: { userId: true, japaRounds: true },
      }),
      prisma.followUp.groupBy({
        by: ["devoteeId"],
        where: { devoteeId: { in: menteeIds } },
        _max: { occurredAt: true },
      }),
    ]);

  const directDevotees = mentees.filter((m) => m.role === "DEVOTEE").length;
  const subMissionaries = mentees.filter((m) => m.role === "MISSIONARY").length;

  const absentLastSession = new Set(latestSession?.attendances.map((a) => a.devoteeId) ?? []);
  const loggedThisWeek = new Set(recentSadhana.map((e) => e.userId));
  const lastFollowUpBy = new Map(lastFollowUps.map((f) => [f.devoteeId, f._max.occurredAt]));
  const todayJapaBy = new Map(todayEntries.map((e) => [e.userId, e.japaRounds]));

  const needsAttention = mentees.flatMap((m) => {
    const reasons: string[] = [];
    if (absentLastSession.has(m.id)) reasons.push("Missed last session");
    if (!loggedThisWeek.has(m.id)) reasons.push("No sadhana in 7 days");
    if (m.status === "INACTIVE") {
      const fu = lastFollowUpBy.get(m.id);
      if (!fu || fu < fourteenDaysAgo) reasons.push("Inactive · no follow-up in 14 days");
    }
    return reasons.length > 0 ? [{ id: m.id, name: m.name, reasons }] : [];
  });

  return (
    <div>
      <PageHeader
        title={`Hare Krishna, ${user.name}`}
        subtitle="Your group at a glance — care, connect, cultivate."
        actions={
          <>
            <ButtonLink href="/missionary/sessions">+ New session</ButtonLink>
            <ButtonLink href="/missionary/reports" variant="secondary">
              Submit report
            </ButtonLink>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="My devotees" value={directDevotees} sub="directly under my care" />
        <StatCard label="My missionaries" value={subMissionaries} sub="leaders I have raised" />
        <StatCard label="Whole group" value={descendantIds.length} sub="souls in my milkyway" />
        <StatCard label="Sessions this month" value={sessionsThisMonth} sub="satsangas & classes held" />
        <StatCard label="Follow-ups this week" value={followUpsThisWeek} sub="calls, visits & messages" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Needs attention */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-saffron-950">Needs attention</h2>
            {latestSession ? (
              <span className="text-xs text-stone-500">
                Last session: {latestSession.title} · {formatDate(latestSession.date)}
              </span>
            ) : null}
          </div>
          {mentees.length === 0 ? (
            <p className="text-sm text-stone-500">
              No one is under your care yet. As devotees are assigned to you, the friends who need a
              little extra care will appear here.
            </p>
          ) : needsAttention.length === 0 ? (
            <p className="text-sm text-saffron-900/80">
              Everyone in your group is engaged this week — beautiful. Keep the kirtan going! 🪷
            </p>
          ) : (
            <ul className="divide-y divide-saffron-900/10">
              {needsAttention.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/missionary/group/${m.id}`}
                      className="text-sm font-medium text-saffron-950 hover:text-saffron-700 hover:underline"
                    >
                      {m.name}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {m.reasons.map((r) => (
                        <Badge key={r} tone="red">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/missionary/followups?devoteeId=${m.id}`}
                    className="shrink-0 text-sm font-semibold text-saffron-700 hover:text-saffron-800 hover:underline"
                  >
                    Log follow-up →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Today's sadhana */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-saffron-950">Today&apos;s sadhana of my group</h2>
            <span className="text-xs text-stone-500">{formatDate(now)}</span>
          </div>
          {mentees.length === 0 ? (
            <p className="text-sm text-stone-500">Your group&apos;s daily japa and reading will show up here.</p>
          ) : (
            <ul className="divide-y divide-saffron-900/10">
              {mentees.map((m) => {
                const japa = todayJapaBy.get(m.id);
                const logged = japa !== undefined;
                return (
                  <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                    <Link
                      href={`/missionary/group/${m.id}`}
                      className="truncate text-sm text-saffron-950 hover:text-saffron-700 hover:underline"
                    >
                      {m.name}
                    </Link>
                    {logged ? (
                      <Badge tone="green">✓ logged · {japa} rounds</Badge>
                    ) : (
                      <Badge tone="gray">✗ not yet</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Quick paths */}
      <Card className="mt-6">
        <h2 className="text-base font-semibold text-saffron-950">Quick paths to serve</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href="/missionary/sessions" variant="secondary">
            📅 Hold a session
          </ButtonLink>
          <ButtonLink href="/missionary/followups" variant="secondary">
            📞 Log a follow-up
          </ButtonLink>
          <ButtonLink href="/missionary/reports" variant="secondary">
            📊 Submit my report
          </ButtonLink>
          <ButtonLink href="/missionary/group" variant="secondary">
            🙏 See my group
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
