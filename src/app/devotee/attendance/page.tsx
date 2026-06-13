import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  StatCard,
  Table,
  Td,
  Th,
} from "@/components/ui";
import type { FollowUpChannel, SessionType } from "@prisma/client";

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const CHANNEL_META: Record<FollowUpChannel, { icon: string; label: string }> = {
  PHONE_CALL: { icon: "📞", label: "Phone call" },
  WHATSAPP: { icon: "💬", label: "WhatsApp" },
  EMAIL: { icon: "✉️", label: "Email" },
  SMS: { icon: "📱", label: "SMS" },
  HOME_VISIT: { icon: "🏠", label: "Home visit" },
  IN_PERSON: { icon: "🤝", label: "In person" },
  OTHER: { icon: "📝", label: "Other" },
};

const TYPE_TONES: Record<SessionType, "saffron" | "blue" | "gray"> = {
  SATSANGA: "saffron",
  CLASS: "blue",
  OTHER: "gray",
};

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(y: number, m: number): string {
  return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export default async function MyAttendancePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("DEVOTEE", "MISSIONARY", "ADMIN");
  const sp = await props.searchParams;

  const now = new Date();
  const currentKey = monthKey(now);
  const raw = typeof sp.month === "string" && MONTH_RE.test(sp.month) ? sp.month : currentKey;
  const selectedKey = raw <= currentKey ? raw : currentKey;
  const [y, m] = selectedKey.split("-").map(Number);

  // Window: selected month + the 3 months before it (for the trend cards).
  const trendStart = new Date(y, m - 4, 1);
  const nextMonthStart = new Date(y, m, 1);

  const [rows, followUps] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        devoteeId: user.id,
        session: { date: { gte: trendStart, lt: nextMonthStart } },
      },
      include: {
        session: {
          select: {
            title: true,
            type: true,
            date: true,
            location: true,
            conductedBy: { select: { name: true } },
          },
        },
      },
      orderBy: { session: { date: "desc" } },
    }),
    prisma.followUp.findMany({
      where: { devoteeId: user.id },
      include: {
        by: { select: { name: true } },
        session: { select: { title: true, date: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 15,
    }),
  ]);

  // Bucket attendance per month for the trend.
  const buckets = new Map<string, { present: number; total: number }>();
  for (const r of rows) {
    const k = monthKey(r.session.date);
    const b = buckets.get(k) ?? { present: 0, total: 0 };
    b.total += 1;
    if (r.present) b.present += 1;
    buckets.set(k, b);
  }

  const monthCards = [0, -1, -2, -3].map((offset) => {
    const d = new Date(y, m - 1 + offset, 1);
    const k = monthKey(d);
    const b = buckets.get(k) ?? { present: 0, total: 0 };
    return {
      key: k,
      label:
        offset === 0
          ? k === currentKey
            ? "This month"
            : monthLabel(d.getFullYear(), d.getMonth() + 1)
          : monthLabel(d.getFullYear(), d.getMonth() + 1),
      present: b.present,
      total: b.total,
      pct: b.total > 0 ? Math.round((b.present / b.total) * 100) : null,
    };
  });

  const monthRows = rows.filter((r) => monthKey(r.session.date) === selectedKey);

  // Prev / next month navigation
  const prev = new Date(y, m - 2, 1);
  const next = new Date(y, m, 1);
  const prevKey = monthKey(prev);
  const nextKey = monthKey(next);

  return (
    <div>
      <PageHeader
        title="My Attendance ✅"
        subtitle="Your presence at satsangas and classes — and the care you receive"
      />

      {/* Summary: selected month + 3-month trend */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {monthCards.map((c) => (
          <StatCard
            key={c.key}
            label={c.label}
            value={c.total > 0 ? `${c.present}/${c.total}` : "—"}
            sub={c.pct !== null ? `${c.pct}% present` : "no sessions"}
          />
        ))}
      </div>

      {/* Month filter */}
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <form method="get" className="flex items-end gap-2">
          <Field label="Month">
            <Input type="month" name="month" defaultValue={selectedKey} max={currentKey} />
          </Field>
          <Button type="submit" variant="secondary">
            View
          </Button>
        </form>
        <div className="flex gap-2 pb-0.5">
          <ButtonLink variant="ghost" href={`/devotee/attendance?month=${prevKey}`}>
            ← {monthLabel(prev.getFullYear(), prev.getMonth() + 1)}
          </ButtonLink>
          {nextKey <= currentKey ? (
            <ButtonLink variant="ghost" href={`/devotee/attendance?month=${nextKey}`}>
              {monthLabel(next.getFullYear(), next.getMonth() + 1)} →
            </ButtonLink>
          ) : null}
        </div>
      </div>

      {/* Attendance table */}
      {monthRows.length === 0 ? (
        <EmptyState
          title={`No sessions on your register in ${monthLabel(y, m)}`}
          hint="Sessions appear here once your counsellor marks attendance."
        />
      ) : (
        <Table>
          <thead className="bg-saffron-50">
            <tr>
              <Th>Date</Th>
              <Th>Session</Th>
              <Th>Type</Th>
              <Th>Conducted by</Th>
              <Th>Status</Th>
              <Th>Remarks</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-saffron-900/5">
            {monthRows.map((r) => (
              <tr key={r.id} className="hover:bg-saffron-50/50">
                <Td className="whitespace-nowrap">{formatDate(r.session.date)}</Td>
                <Td className="font-medium">{r.session.title}</Td>
                <Td>
                  <Badge tone={TYPE_TONES[r.session.type]}>{r.session.type}</Badge>
                </Td>
                <Td>{r.session.conductedBy.name}</Td>
                <Td>
                  {r.present ? <Badge tone="green">P · Present</Badge> : <Badge tone="red">A · Absent</Badge>}
                </Td>
                <Td className="max-w-xs truncate text-stone-500">{r.remarks ?? ""}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Follow-ups received — the care you receive */}
      <section className="mt-8">
        <h2 className="mb-1 text-lg font-semibold text-saffron-950">💝 Care you&apos;ve received</h2>
        <p className="mb-3 text-sm text-saffron-900/60">
          Every time your counsellor reached out to you.
        </p>
        {followUps.length === 0 ? (
          <EmptyState
            title="No follow-ups yet"
            hint="When your counsellor calls or visits, it will show here."
          />
        ) : (
          <div className="space-y-3">
            {followUps.map((f) => {
              const meta = CHANNEL_META[f.channel];
              return (
                <Card key={f.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-saffron-950">
                      {meta.icon} {f.by.name} reached out
                    </span>
                    <Badge tone="blue">{meta.label}</Badge>
                    <span className="text-xs text-saffron-900/50">{formatDate(f.occurredAt)}</span>
                  </div>
                  {f.session ? (
                    <p className="mt-1 text-xs text-saffron-900/60">
                      About the session &ldquo;{f.session.title}&rdquo; ({formatDate(f.session.date)})
                    </p>
                  ) : null}
                  {f.outcome ? (
                    <p className="mt-1 text-sm text-saffron-950">{f.outcome}</p>
                  ) : null}
                  {f.notes ? (
                    <p className="mt-1 text-sm italic text-stone-500">&ldquo;{f.notes}&rdquo;</p>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
