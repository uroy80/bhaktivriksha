import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getDescendantIds } from "@/lib/hierarchy";
import { formatDate, toDateKey, weekBounds } from "@/lib/utils";
import { Badge, ButtonLink, Card, PageHeader, StatCard } from "@/components/ui";
import { Icon } from "@/components/icons";
import { startOfDaysAgo } from "./group/group-data";
import { ClaimUnassigned } from "./_components/claim-unassigned";

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

  const [
    sessionsThisMonth,
    followUpsThisWeek,
    latestSession,
    recentSadhana,
    todayEntries,
    lastFollowUps,
    unassigned,
  ] =
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
      // Devotees who self-registered and have no counsellor yet — newest first.
      prisma.user.findMany({
        where: { role: "DEVOTEE", status: "ACTIVE", mentorId: null },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, name: true, createdAt: true },
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
            <ButtonLink href="/missionary/sessions">
              <Icon.plus className="h-4 w-4" />
              New session
            </ButtonLink>
            <ButtonLink href="/missionary/reports" variant="secondary">
              <Icon.reports className="h-4 w-4" />
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
            <h2 className="flex items-center gap-2 text-base font-semibold text-saffron-950">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-100 text-saffron-700">
                <Icon.heart className="h-[18px] w-[18px]" />
              </span>
              Needs attention
            </h2>
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
            <p className="flex items-center gap-1.5 text-sm text-saffron-900/80">
              <Icon.lotus className="h-4 w-4 shrink-0 text-saffron-600" />
              Everyone in your group is engaged this week — beautiful. Keep the kirtan going!
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
                    className="flex shrink-0 items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800 hover:underline"
                  >
                    Log follow-up
                    <Icon.chevron className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Today's sadhana */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-saffron-950">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-100 text-saffron-700">
                <Icon.sadhana className="h-[18px] w-[18px]" />
              </span>
              Today&apos;s sadhana of my group
            </h2>
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
                      <Badge tone="green">
                        <Icon.check className="mr-1 h-3.5 w-3.5" />
                        logged · {japa} rounds
                      </Badge>
                    ) : (
                      <Badge tone="gray">not yet</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {/* Devotees seeking a counsellor */}
      <Card className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600 text-white shadow-sm">
              <Icon.apply className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-saffron-950">
                Devotees seeking a counsellor
              </h2>
              <p className="mt-0.5 max-w-md text-sm text-saffron-900/70">
                These souls are practising on their own — invite them into your care.
              </p>
            </div>
          </div>
          <ButtonLink href="/missionary/invite" variant="secondary">
            <Icon.invite className="h-4 w-4" />
            Share your invite QR
            <Icon.chevron className="h-4 w-4" />
          </ButtonLink>
        </div>

        <div className="mt-4">
          {unassigned.length === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-saffron-900/70">
              <Icon.check className="h-4 w-4 shrink-0 text-green-600" />
              Every active devotee already has a counsellor. Share your invite QR to welcome new
              souls.
            </p>
          ) : (
            <ClaimUnassigned
              devotees={unassigned.map((d) => ({
                id: d.id,
                name: d.name,
                joinedAt: d.createdAt.toISOString(),
              }))}
            />
          )}
        </div>
      </Card>

      {/* Quick paths */}
      <Card className="mt-6">
        <h2 className="text-base font-semibold text-saffron-950">Quick paths to serve</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href="/missionary/sessions" variant="secondary">
            <Icon.sessions className="h-4 w-4" />
            Hold a session
          </ButtonLink>
          <ButtonLink href="/missionary/followups" variant="secondary">
            <Icon.followups className="h-4 w-4" />
            Log a follow-up
          </ButtonLink>
          <ButtonLink href="/missionary/reports" variant="secondary">
            <Icon.reports className="h-4 w-4" />
            Submit my report
          </ButtonLink>
          <ButtonLink href="/missionary/group" variant="secondary">
            <Icon.group className="h-4 w-4" />
            See my group
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
