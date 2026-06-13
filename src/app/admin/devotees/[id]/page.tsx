import Link from "next/link";
import { notFound } from "next/navigation";
import type { Role, UserStatus } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getDirectMentees, getSuperiorChain } from "@/lib/hierarchy";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge, ButtonLink, Card, PageHeader, Table, Td, Th } from "@/components/ui";
import { ManageDevotee } from "./manage-devotee";

const roleTone: Record<Role, "red" | "blue" | "saffron"> = {
  ADMIN: "red",
  MISSIONARY: "blue",
  DEVOTEE: "saffron",
};

const statusTone: Record<UserStatus, "green" | "saffron" | "gray"> = {
  ACTIVE: "green",
  PENDING: "saffron",
  INACTIVE: "gray",
};

export default async function DevoteeDetailPage(props: { params: Promise<{ id: string }> }) {
  await requireRole("ADMIN");
  const { id } = await props.params;

  const devotee = await prisma.user.findUnique({
    where: { id },
    include: { sadhanaLevel: true, mentor: { select: { id: true, name: true, role: true } } },
  });
  if (!devotee) notFound();

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [chain, mentees, levelHistory, attendance, followUps, sadhanaEntries, levels, mentorOptions] =
    await Promise.all([
      getSuperiorChain(devotee.id),
      devotee.role === "MISSIONARY" || devotee.role === "ADMIN"
        ? getDirectMentees(devotee.id)
        : Promise.resolve([]),
      prisma.levelHistory.findMany({
        where: { userId: devotee.id },
        include: {
          level: { select: { name: true, order: true } },
          assignedBy: { select: { name: true } },
        },
        orderBy: { assignedAt: "desc" },
        take: 15,
      }),
      prisma.attendance.findMany({
        where: { devoteeId: devotee.id },
        include: { session: { select: { id: true, title: true, date: true } } },
        orderBy: { session: { date: "desc" } },
        take: 10,
      }),
      prisma.followUp.findMany({
        where: { devoteeId: devotee.id },
        include: {
          by: { select: { name: true } },
          session: { select: { title: true } },
        },
        orderBy: { occurredAt: "desc" },
        take: 10,
      }),
      prisma.sadhanaEntry.findMany({
        where: { userId: devotee.id, date: { gte: sevenDaysAgo } },
        orderBy: { date: "desc" },
      }),
      prisma.sadhanaLevel.findMany({
        orderBy: { order: "asc" },
        select: { id: true, name: true, order: true },
      }),
      prisma.user.findMany({
        where: {
          status: "ACTIVE",
          role: { in: ["MISSIONARY", "ADMIN"] },
          id: { not: devotee.id },
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: { id: true, name: true, role: true },
      }),
    ]);

  return (
    <div>
      <PageHeader
        title={devotee.name}
        subtitle={devotee.email}
        actions={
          <ButtonLink href="/admin/devotees" variant="secondary">
            ← All devotees
          </ButtonLink>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: profile + history + activity */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile */}
          <Card>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-saffron-950">Profile</h2>
              <Badge tone={roleTone[devotee.role]}>{devotee.role}</Badge>
              <Badge tone={statusTone[devotee.status]}>{devotee.status}</Badge>
            </div>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <ProfileField label="Email" value={devotee.email} />
              <ProfileField label="Phone" value={devotee.phone} />
              <ProfileField label="WhatsApp" value={devotee.whatsapp} />
              <ProfileField
                label="Joined"
                value={devotee.joinedAt ? formatDate(devotee.joinedAt) : null}
              />
              <div className="sm:col-span-2">
                <ProfileField label="Address" value={devotee.address} />
              </div>
            </dl>
          </Card>

          {/* Current level + history */}
          <Card>
            <h2 className="text-base font-semibold text-saffron-950">Sadhana level</h2>
            {devotee.sadhanaLevel ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="saffron" className="text-sm">
                  {devotee.sadhanaLevel.order}. {devotee.sadhanaLevel.name}
                </Badge>
                {devotee.levelTaggedAt ? (
                  <span className="text-xs text-stone-500">
                    tagged {formatDate(devotee.levelTaggedAt)}
                  </span>
                ) : null}
                <Link
                  href={`/admin/levels/${devotee.sadhanaLevel.slug}`}
                  className="text-xs font-medium text-saffron-700 hover:underline"
                >
                  View level standards →
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-stone-500">
                No level tagged yet — use the Manage panel to assign one.
              </p>
            )}

            <h3 className="mt-5 text-sm font-semibold text-saffron-950">Level history</h3>
            {levelHistory.length === 0 ? (
              <p className="mt-1 text-sm text-stone-500">No level changes recorded yet.</p>
            ) : (
              <ol className="mt-2 space-y-3 border-l-2 border-saffron-200 pl-4">
                {levelHistory.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[1.39rem] top-1.5 h-2.5 w-2.5 rounded-full bg-saffron-500" />
                    <p className="text-sm font-medium text-saffron-950">
                      {h.level.order}. {h.level.name}
                    </p>
                    <p className="text-xs text-stone-500">
                      {formatDateTime(h.assignedAt)}
                      {h.assignedBy ? ` · by ${h.assignedBy.name}` : ""}
                    </p>
                    {h.note ? <p className="mt-0.5 text-xs italic text-stone-600">“{h.note}”</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {/* Recent attendance */}
          <Card>
            <h2 className="mb-3 text-base font-semibold text-saffron-950">
              Recent attendance <span className="font-normal text-stone-400">(last 10)</span>
            </h2>
            {attendance.length === 0 ? (
              <p className="text-sm text-stone-500">No attendance records yet.</p>
            ) : (
              <Table>
                <thead className="bg-saffron-50">
                  <tr>
                    <Th>Session</Th>
                    <Th>Date</Th>
                    <Th>Present</Th>
                    <Th>Siksha</Th>
                    <Th>Remarks</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-saffron-900/10">
                  {attendance.map((a) => (
                    <tr key={a.id}>
                      <Td>{a.session.title}</Td>
                      <Td className="whitespace-nowrap">{formatDate(a.session.date)}</Td>
                      <Td>
                        {a.present ? (
                          <Badge tone="green">Present</Badge>
                        ) : (
                          <Badge tone="red">Absent</Badge>
                        )}
                      </Td>
                      <Td className="text-xs text-stone-600">{a.sikshaLevel ?? "—"}</Td>
                      <Td className="text-xs text-stone-600">{a.remarks ?? "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          {/* Recent follow-ups */}
          <Card>
            <h2 className="mb-3 text-base font-semibold text-saffron-950">
              Recent follow-ups received
            </h2>
            {followUps.length === 0 ? (
              <p className="text-sm text-stone-500">No follow-ups logged for this devotee yet.</p>
            ) : (
              <ul className="divide-y divide-saffron-900/10">
                {followUps.map((f) => (
                  <li key={f.id} className="py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="blue">{f.channel.replace(/_/g, " ")}</Badge>
                      <span className="text-xs text-stone-500">
                        {formatDateTime(f.occurredAt)} · by {f.by.name}
                        {f.session ? ` · re: ${f.session.title}` : ""}
                      </span>
                    </div>
                    {f.outcome ? (
                      <p className="mt-1 text-sm text-saffron-950">{f.outcome}</p>
                    ) : null}
                    {f.notes ? <p className="mt-0.5 text-xs text-stone-600">{f.notes}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Recent sadhana */}
          <Card>
            <h2 className="mb-3 text-base font-semibold text-saffron-950">
              Sadhana journal <span className="font-normal text-stone-400">(last 7 days)</span>
            </h2>
            {sadhanaEntries.length === 0 ? (
              <p className="text-sm text-stone-500">No sadhana entries in the last 7 days.</p>
            ) : (
              <Table>
                <thead className="bg-saffron-50">
                  <tr>
                    <Th>Date</Th>
                    <Th>Japa rounds</Th>
                    <Th>Reading (min)</Th>
                    <Th>Aratis</Th>
                    <Th>Lecture</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-saffron-900/10">
                  {sadhanaEntries.map((s) => (
                    <tr key={s.id}>
                      <Td className="whitespace-nowrap">{formatDate(s.date)}</Td>
                      <Td>{s.japaRounds}</Td>
                      <Td>{s.readingMinutes}</Td>
                      <Td className="text-xs">
                        {[s.mangalArati ? "Mangal" : null, s.eveningArati ? "Evening" : null]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </Td>
                      <Td>{s.lectureHeard ? "Yes" : "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        {/* Right: manage panel + hierarchy context + notes */}
        <div className="space-y-6">
          <ManageDevotee
            devotee={{
              id: devotee.id,
              name: devotee.name,
              role: devotee.role,
              status: devotee.status,
              mentorId: devotee.mentorId,
              sadhanaLevelId: devotee.sadhanaLevelId,
              phone: devotee.phone,
              whatsapp: devotee.whatsapp,
              address: devotee.address,
              notes: devotee.notes,
            }}
            menteeCount={mentees.length}
            levels={levels}
            mentors={mentorOptions.filter(
              (m): m is { id: string; name: string; role: "ADMIN" | "MISSIONARY" } =>
                m.role === "ADMIN" || m.role === "MISSIONARY",
            )}
          />

          {/* Mentor chain */}
          <Card>
            <h2 className="text-base font-semibold text-saffron-950">Mentor chain</h2>
            {chain.length === 0 ? (
              <p className="mt-2 text-sm text-stone-500">
                {devotee.role === "ADMIN"
                  ? "Root of the hierarchy."
                  : "No mentor assigned — this devotee is outside the milkyway tree."}
              </p>
            ) : (
              <ol className="mt-2 space-y-1.5">
                {chain.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="text-stone-400">↑</span>
                    <Link
                      href={`/admin/devotees/${c.id}`}
                      className="font-medium text-saffron-800 hover:underline"
                    >
                      {c.name}
                    </Link>
                    <Badge tone={roleTone[c.role]} className="text-[10px]">
                      {c.role}
                    </Badge>
                  </li>
                ))}
              </ol>
            )}
            <Link
              href="/admin/hierarchy"
              className="mt-3 inline-block text-xs font-medium text-saffron-700 hover:underline"
            >
              View full hierarchy →
            </Link>
          </Card>

          {/* Direct mentees */}
          {(devotee.role === "MISSIONARY" || devotee.role === "ADMIN") && (
            <Card>
              <h2 className="text-base font-semibold text-saffron-950">
                Direct mentees{" "}
                <span className="font-normal text-stone-400">({mentees.length})</span>
              </h2>
              {mentees.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">No mentees assigned yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-saffron-900/10">
                  {mentees.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/admin/devotees/${m.id}`}
                        className="flex items-center justify-between gap-2 py-2 hover:bg-saffron-50"
                      >
                        <span className="text-sm font-medium text-saffron-950">{m.name}</span>
                        <span className="text-xs text-stone-500">
                          {m.sadhanaLevel?.name ?? "No level"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {/* Admin notes */}
          <Card>
            <h2 className="text-base font-semibold text-saffron-950">Private notes</h2>
            {devotee.notes ? (
              <p className="mt-2 whitespace-pre-wrap text-sm text-saffron-950">{devotee.notes}</p>
            ) : (
              <p className="mt-2 text-sm text-stone-500">
                No notes yet — add some from the Manage panel.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-saffron-900/60">{label}</dt>
      <dd className="mt-0.5 text-saffron-950">{value || <span className="text-stone-400">—</span>}</dd>
    </div>
  );
}
