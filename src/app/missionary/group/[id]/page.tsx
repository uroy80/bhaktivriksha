import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { canAccessUser, getSubtreeIds } from "@/lib/hierarchy";
import { formatDate, formatDateTime, toDateKey } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { Icon, channelMeta } from "@/components/icons";
import { startOfDaysAgo } from "../group-data";
import { ManageMentee } from "./manage-mentee";

function waLink(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

export default async function MenteeDetailPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireRole("MISSIONARY");
  const { id } = await props.params;

  if (id === user.id) notFound();
  if (!(await canAccessUser(user, id))) notFound();

  const mentee = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      address: true,
      role: true,
      status: true,
      notes: true,
      joinedAt: true,
      createdAt: true,
      mentorId: true,
      levelTaggedAt: true,
      sadhanaLevel: { select: { name: true, order: true } },
      mentor: { select: { id: true, name: true } },
    },
  });
  if (!mentee || mentee.role === "ADMIN") notFound();

  const [levelHistory, sadhanaEntries, attendance, followUps, ownMentees, mySubtree, targetSubtree] =
    await Promise.all([
      prisma.levelHistory.findMany({
        where: { userId: id },
        orderBy: { assignedAt: "desc" },
        take: 20,
        select: {
          id: true,
          assignedAt: true,
          note: true,
          level: { select: { name: true, order: true } },
          assignedBy: { select: { name: true } },
        },
      }),
      prisma.sadhanaEntry.findMany({
        where: { userId: id },
        orderBy: { date: "desc" },
        take: 90,
        select: { date: true, japaRounds: true, readingMinutes: true },
      }),
      prisma.attendance.findMany({
        where: { devoteeId: id },
        orderBy: { session: { date: "desc" } },
        take: 10,
        select: {
          id: true,
          present: true,
          sikshaLevel: true,
          remarks: true,
          session: { select: { title: true, date: true, type: true } },
        },
      }),
      prisma.followUp.findMany({
        where: { devoteeId: id },
        orderBy: { occurredAt: "desc" },
        take: 10,
        select: {
          id: true,
          channel: true,
          outcome: true,
          notes: true,
          occurredAt: true,
          by: { select: { name: true } },
          session: { select: { title: true } },
        },
      }),
      prisma.user.findMany({
        where: { mentorId: id },
        orderBy: { name: "asc" },
        select: { id: true, name: true, role: true, status: true, sadhanaLevel: { select: { name: true } } },
      }),
      getSubtreeIds(user.id),
      getSubtreeIds(id),
    ]);

  // Eligible new mentors: active missionaries in MY subtree, outside the mentee's own subtree (no cycles).
  const blocked = new Set(targetSubtree);
  const mentorOptions = await prisma.user.findMany({
    where: {
      id: { in: mySubtree.filter((sid) => !blocked.has(sid)) },
      role: "MISSIONARY",
      status: "ACTIVE",
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  // Sadhana consistency — last 14 days strip, current streak, average japa.
  const entryByDay = new Map(sadhanaEntries.map((e) => [e.date.toISOString().slice(0, 10), e]));
  const strip = Array.from({ length: 14 }, (_, i) => {
    const day = startOfDaysAgo(13 - i);
    const key = toDateKey(day);
    return { key, entry: entryByDay.get(key) ?? null };
  });
  const last14 = strip.filter((d) => d.entry !== null);
  const avgJapa =
    last14.length > 0
      ? Math.round((last14.reduce((sum, d) => sum + (d.entry?.japaRounds ?? 0), 0) / last14.length) * 10) / 10
      : 0;
  let streak = 0;
  {
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    if (!entryByDay.has(toDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    while (entryByDay.has(toDateKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }

  const statusTone = mentee.status === "ACTIVE" ? "green" : mentee.status === "PENDING" ? "saffron" : "gray";

  return (
    <div>
      <PageHeader
        title={mentee.name}
        subtitle="Walking the path together — their practice, presence and care history."
        actions={
          <Link
            href={`/missionary/followups?devoteeId=${mentee.id}`}
            className="flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800 hover:underline"
          >
            Log follow-up
            <Icon.chevron className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left rail: profile + shepherd's tools */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-saffron-950">Profile</h2>
              <div className="flex gap-1.5">
                <Badge tone={mentee.role === "MISSIONARY" ? "blue" : "saffron"}>
                  {mentee.role === "MISSIONARY" ? "Missionary" : "Devotee"}
                </Badge>
                <Badge tone={statusTone}>
                  {mentee.status.charAt(0) + mentee.status.slice(1).toLowerCase()}
                </Badge>
              </div>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-saffron-900/60">Email</dt>
                <dd>
                  <a href={`mailto:${mentee.email}`} className="text-saffron-700 hover:underline">
                    {mentee.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-saffron-900/60">Phone</dt>
                <dd>
                  {mentee.phone ? (
                    <a href={`tel:${mentee.phone}`} className="text-saffron-700 hover:underline">
                      {mentee.phone}
                    </a>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-saffron-900/60">WhatsApp</dt>
                <dd>
                  {mentee.whatsapp ? (
                    <a
                      href={waLink(mentee.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-saffron-700 hover:underline"
                    >
                      {mentee.whatsapp}
                    </a>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </dd>
              </div>
              {mentee.address ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-saffron-900/60">Address</dt>
                  <dd className="whitespace-pre-line text-saffron-950">{mentee.address}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-saffron-900/60">Mentor</dt>
                <dd>{mentee.mentor?.name ?? <span className="text-stone-400">—</span>}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-saffron-900/60">Joined</dt>
                <dd>{mentee.joinedAt ? formatDate(mentee.joinedAt) : formatDate(mentee.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 text-base font-semibold text-saffron-950">Shepherd&apos;s tools</h2>
            <ManageMentee
              menteeId={mentee.id}
              menteeName={mentee.name}
              role={mentee.role === "MISSIONARY" ? "MISSIONARY" : "DEVOTEE"}
              mentorId={mentee.mentorId}
              notes={mentee.notes ?? ""}
              mentorOptions={mentorOptions}
              hasMentees={ownMentees.length > 0}
            />
          </Card>
        </div>

        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Level + history */}
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-saffron-950">Sadhana level</h2>
              {mentee.sadhanaLevel ? (
                <Badge>
                  {mentee.sadhanaLevel.order}. {mentee.sadhanaLevel.name}
                </Badge>
              ) : (
                <Badge tone="gray">Not yet tagged</Badge>
              )}
            </div>
            {levelHistory.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">
                No level history yet — levels are tagged by the admin or through level applications.
              </p>
            ) : (
              <ol className="mt-4 space-y-3 border-l-2 border-saffron-200 pl-4">
                {levelHistory.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[1.45rem] top-1.5 h-2.5 w-2.5 rounded-full bg-saffron-500" />
                    <p className="text-sm font-medium text-saffron-950">
                      {h.level.order}. {h.level.name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatDate(h.assignedAt)}
                      {h.assignedBy ? <> · by {h.assignedBy.name}</> : null}
                    </p>
                    {h.note ? <p className="mt-0.5 text-xs text-saffron-900/70">“{h.note}”</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Sadhana consistency */}
          <Card>
            <h2 className="text-base font-semibold text-saffron-950">Sadhana consistency</h2>
            <div className="mt-3 flex flex-wrap items-center gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-saffron-900/60">Current streak</p>
                <p className="text-2xl font-bold text-saffron-950">
                  {streak} <span className="text-sm font-medium text-stone-500">{streak === 1 ? "day" : "days"}</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-saffron-900/60">Avg japa (14d)</p>
                <p className="text-2xl font-bold text-saffron-950">
                  {avgJapa} <span className="text-sm font-medium text-stone-500">rounds</span>
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-saffron-900/60">Days logged (14d)</p>
                <p className="text-2xl font-bold text-saffron-950">
                  {last14.length}
                  <span className="text-sm font-medium text-stone-500">/14</span>
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-saffron-900/60">Last 14 days</p>
              <div className="flex flex-wrap gap-1.5">
                {strip.map((d) => (
                  <span
                    key={d.key}
                    title={
                      d.entry
                        ? `${formatDate(d.key)} — ${d.entry.japaRounds} rounds, ${d.entry.readingMinutes} min reading`
                        : `${formatDate(d.key)} — not logged`
                    }
                    className={
                      "flex h-7 w-7 items-center justify-center rounded text-[10px] font-semibold " +
                      (d.entry ? "bg-saffron-500 text-white" : "bg-stone-200 text-stone-400")
                    }
                  >
                    {d.entry ? d.entry.japaRounds : "·"}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-stone-500">Squares show japa rounds; grey days were not logged.</p>
            </div>
          </Card>

          {/* Attendance */}
          <Card>
            <h2 className="mb-3 text-base font-semibold text-saffron-950">Attendance (last 10)</h2>
            {attendance.length === 0 ? (
              <p className="text-sm text-stone-500">No attendance marked yet.</p>
            ) : (
              <ul className="divide-y divide-saffron-900/10">
                {attendance.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-saffron-950">{a.session.title}</p>
                      <p className="text-xs text-stone-500">
                        {formatDate(a.session.date)}
                        {a.sikshaLevel ? <> · S: {a.sikshaLevel}</> : null}
                        {a.remarks ? <> · {a.remarks}</> : null}
                      </p>
                    </div>
                    {a.present ? <Badge tone="green">Present</Badge> : <Badge tone="red">Absent</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Follow-ups */}
          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-saffron-950">Follow-ups received (last 10)</h2>
              <Link
                href={`/missionary/followups?devoteeId=${mentee.id}`}
                className="flex items-center gap-1 text-sm font-semibold text-saffron-700 hover:text-saffron-800 hover:underline"
              >
                Log follow-up
                <Icon.chevron className="h-4 w-4" />
              </Link>
            </div>
            {followUps.length === 0 ? (
              <p className="text-sm text-stone-500">
                No follow-ups logged yet — a phone call or visit goes a long way.
              </p>
            ) : (
              <ul className="divide-y divide-saffron-900/10">
                {followUps.map((f) => {
                  const meta = channelMeta[f.channel] ?? channelMeta.OTHER;
                  const ChannelIcon = meta.icon;
                  return (
                  <li key={f.id} className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="blue">
                        <ChannelIcon className="mr-1 h-3.5 w-3.5" />
                        {meta.label}
                      </Badge>
                      <span className="text-xs text-stone-500">
                        {formatDateTime(f.occurredAt)} · by {f.by.name}
                        {f.session ? <> · re: {f.session.title}</> : null}
                      </span>
                    </div>
                    {f.outcome ? <p className="mt-1 text-sm text-saffron-950">{f.outcome}</p> : null}
                    {f.notes ? <p className="mt-0.5 text-xs text-saffron-900/70">{f.notes}</p> : null}
                  </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {/* Their own group, if missionary */}
          {mentee.role === "MISSIONARY" ? (
            <Card>
              <h2 className="mb-3 text-base font-semibold text-saffron-950">
                {mentee.name}&apos;s own group ({ownMentees.length})
              </h2>
              {ownMentees.length === 0 ? (
                <p className="text-sm text-stone-500">No mentees assigned to them yet.</p>
              ) : (
                <ul className="divide-y divide-saffron-900/10">
                  {ownMentees.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                      <Link
                        href={`/missionary/group/${m.id}`}
                        className="truncate text-sm font-medium text-saffron-950 hover:text-saffron-700 hover:underline"
                      >
                        {m.name}
                      </Link>
                      <div className="flex shrink-0 gap-1.5">
                        {m.sadhanaLevel ? <Badge>{m.sadhanaLevel.name}</Badge> : null}
                        <Badge tone={m.role === "MISSIONARY" ? "blue" : "saffron"}>
                          {m.role === "MISSIONARY" ? "Missionary" : "Devotee"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
