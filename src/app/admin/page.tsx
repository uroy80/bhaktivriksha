import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { formatDate, weekBounds } from "@/lib/utils";
import { Badge, Card, PageHeader } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { AssignMentor } from "./_components/assign-mentor";

/** A StatCard with a saffron icon tile, optional link + accent for emphasis. */
function StatTile({
  icon,
  label,
  value,
  sub,
  href,
  accent = false,
}: {
  icon: IconName;
  label: string;
  value: React.ReactNode;
  sub?: string;
  href?: string;
  accent?: boolean;
}) {
  const IconCmp = Icon[icon];
  const card = (
    <Card
      className={
        accent
          ? "h-full ring-maroon-700/20"
          : "h-full transition-shadow hover:shadow-md"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-saffron-900/60">{label}</p>
        <span
          className={
            accent
              ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-maroon-500 to-maroon-700 text-white shadow-sm"
              : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700"
          }
        >
          <IconCmp className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-1 text-3xl font-bold text-saffron-950">{value}</p>
      {sub ? (
        <p className={accent ? "mt-1 text-xs font-medium text-maroon-700" : "mt-1 text-xs text-stone-500"}>
          {sub}
        </p>
      ) : null}
    </Card>
  );

  if (!href) return card;
  return (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron-600"
    >
      {card}
    </Link>
  );
}

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
    unassigned,
    mentorOptions,
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
    // Active devotees with no mentor — registration is open, so these arrive
    // on their own and need welcoming into a missionary's group. Newest first.
    prisma.user.findMany({
      where: { role: "DEVOTEE", status: "ACTIVE", mentorId: null },
      orderBy: [{ joinedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, name: true, joinedAt: true, sadhanaLevel: { select: { name: true } } },
    }),
    // Possible mentors for the quick "Assign to…" control.
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["MISSIONARY", "ADMIN"] } },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true },
    }),
  ]);

  const mentors = mentorOptions.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role as "ADMIN" | "MISSIONARY",
  }));

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        subtitle={`Hare Krishna, ${admin.name} — here is the temple community at a glance.`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <StatTile icon="devotees" label="Active Devotees" value={activeDevotees} />
        <StatTile icon="group" label="Missionaries" value={activeMissionaries} sub="active" />
        <StatTile
          icon="applications"
          label="Pending Applications"
          value={pendingApplications}
          sub="Review now"
          href="/admin/applications"
        />
        <StatTile
          icon="claim"
          label="Unassigned"
          value={unassigned.length}
          sub={unassigned.length > 0 ? "Needs a mentor" : "All welcomed"}
          href="#unassigned"
          accent={unassigned.length > 0}
        />
        <StatTile icon="sessions" label="Sessions This Month" value={sessionsThisMonth} />
        <StatTile icon="followups" label="Follow-ups This Week" value={followUpsThisWeek} />
      </div>

      {/* Unassigned devotees — prominent, with inline assignment */}
      <Card id="unassigned" className={`mt-6 scroll-mt-20 ${unassigned.length > 0 ? "ring-maroon-700/20" : ""}`}>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600 text-white shadow-sm">
            <Icon.claim className="h-5 w-5" />
          </span>
          <h2 className="text-base font-semibold text-saffron-950">Unassigned devotees</h2>
          {unassigned.length > 0 ? (
            <Badge tone="red">{unassigned.length}</Badge>
          ) : null}
          <Link
            href="/admin/devotees?role=DEVOTEE&status=ACTIVE"
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-saffron-700 hover:text-saffron-800"
          >
            View directory
            <Icon.chevron className="h-4 w-4" />
          </Link>
        </div>
        <p className="mb-4 text-xs text-stone-500">
          Devotees who registered on their own and have no mentor yet. Welcome each one into a
          missionary&apos;s group so no soul is left uncared for.
        </p>

        {unassigned.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-800">
            <Icon.check className="h-4 w-4 shrink-0" />
            Every active devotee has a mentor. Hare Krishna.
          </p>
        ) : (
          <ul className="divide-y divide-saffron-900/10">
            {unassigned.map((u) => (
              <li
                key={u.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/devotees/${u.id}`}
                    className="block truncate text-sm font-medium text-saffron-800 hover:underline"
                  >
                    {u.name}
                  </Link>
                  <span className="flex items-center gap-1.5 text-xs text-stone-500">
                    <Badge tone={u.sadhanaLevel ? "saffron" : "gray"}>
                      {u.sadhanaLevel?.name ?? "No level"}
                    </Badge>
                    <span className="inline-flex items-center gap-1">
                      <Icon.clock className="h-3.5 w-3.5" />
                      Joined {u.joinedAt ? formatDate(u.joinedAt) : "—"}
                    </span>
                  </span>
                </div>
                <AssignMentor devoteeId={u.id} mentors={mentors} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-6">
        {/* Recently joined */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-100 text-saffron-700">
                <Icon.heart className="h-[18px] w-[18px]" />
              </span>
              <h2 className="text-base font-semibold text-saffron-950">Recently joined</h2>
            </div>
            <Link
              href="/admin/devotees"
              className="inline-flex items-center gap-1 text-sm font-medium text-saffron-700 hover:text-saffron-800"
            >
              View all
              <Icon.chevron className="h-4 w-4" />
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
      </div>
    </div>
  );
}
