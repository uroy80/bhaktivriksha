import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { formatDate, weekBounds } from "@/lib/utils";
import { Badge, Card, PageHeader, StatCard } from "@/components/ui";

export default async function AdminDashboardPage() {
  const admin = await requireRole("ADMIN");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const { start: weekStart, end: weekEnd } = weekBounds(now);

  const [
    activeDevotees,
    activeMissionaries,
    pendingApplications,
    sessionsThisMonth,
    followUpsThisWeek,
    recentlyJoined,
    unmentored,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "DEVOTEE", status: "ACTIVE" } }),
    prisma.user.count({ where: { role: "MISSIONARY", status: "ACTIVE" } }),
    prisma.application.count({ where: { status: "PENDING" } }),
    prisma.classSession.count({ where: { date: { gte: monthStart, lt: nextMonthStart } } }),
    prisma.followUp.count({ where: { occurredAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.user.findMany({
      where: { joinedAt: { not: null } },
      orderBy: { joinedAt: "desc" },
      take: 6,
      select: {
        id: true,
        name: true,
        role: true,
        joinedAt: true,
        sadhanaLevel: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "DEVOTEE", status: "ACTIVE", mentorId: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true, joinedAt: true, sadhanaLevel: { select: { name: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle={`Hare Krishna, ${admin.name} — here is the temple community at a glance.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Active Devotees" value={activeDevotees} />
        <StatCard label="Missionaries" value={activeMissionaries} sub="active" />
        <Link
          href="/admin/applications"
          className="block rounded-xl transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-saffron-600"
        >
          <StatCard label="Pending Applications" value={pendingApplications} sub="Review now →" />
        </Link>
        <StatCard label="Sessions This Month" value={sessionsThisMonth} />
        <StatCard label="Follow-ups This Week" value={followUpsThisWeek} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recently joined */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-saffron-950">Recently joined</h2>
            <Link
              href="/admin/devotees"
              className="text-sm font-medium text-saffron-700 hover:text-saffron-800"
            >
              View all →
            </Link>
          </div>
          {recentlyJoined.length === 0 ? (
            <p className="text-sm text-stone-500">
              No one has joined yet. Approved applications will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-saffron-900/10">
              {recentlyJoined.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/admin/devotees/${u.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-saffron-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-saffron-950">
                        {u.name}
                      </span>
                      <span className="text-xs text-stone-500">
                        Joined {u.joinedAt ? formatDate(u.joinedAt) : "—"}
                      </span>
                    </span>
                    <Badge tone={u.sadhanaLevel ? "saffron" : "gray"}>
                      {u.sadhanaLevel?.name ?? "No level"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Needs attention */}
        <Card className="ring-maroon-700/20">
          <h2 className="text-base font-semibold text-maroon-800">Needs attention</h2>
          <p className="mt-0.5 text-xs text-stone-500">
            Active devotees without a mentor — assign them to a missionary so no one is left
            uncared for.
          </p>
          {unmentored.length === 0 ? (
            <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
              Every active devotee has a mentor. 🙏
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-saffron-900/10">
              {unmentored.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/admin/devotees/${u.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 hover:bg-saffron-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-saffron-950">
                        {u.name}
                      </span>
                      <span className="text-xs text-stone-500">
                        {u.sadhanaLevel?.name ?? "No level"}
                        {u.joinedAt ? ` · joined ${formatDate(u.joinedAt)}` : ""}
                      </span>
                    </span>
                    <Badge tone="red">No mentor</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
