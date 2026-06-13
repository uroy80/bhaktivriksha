import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { canAccessUser } from "@/lib/hierarchy";
import { formatDateTime } from "@/lib/utils";
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from "@/components/ui";
import { AttendanceRow } from "../attendance-row";

const typeLabel = { SATSANGA: "Satsanga", CLASS: "Class", OTHER: "Other" } as const;
const typeTone = { SATSANGA: "saffron", CLASS: "blue", OTHER: "gray" } as const;

// The live attendance screen — mobile-first, used in class while devotees arrive.
export default async function SessionAttendancePage(props: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("MISSIONARY");
  const { id } = await props.params;

  const session = await prisma.classSession.findUnique({
    where: { id },
    include: {
      conductedBy: { select: { id: true, name: true } },
      attendances: {
        include: {
          devotee: { select: { id: true, name: true, sadhanaLevel: { select: { name: true } } } },
        },
      },
    },
  });
  if (!session) notFound();
  if (!(await canAccessUser(user, session.conductedById))) notFound();

  // Roster: the conductor's DIRECT mentees (any role, ACTIVE only) plus anyone
  // who already has an attendance row on this session.
  const mentees = await prisma.user.findMany({
    where: { mentorId: session.conductedById, status: "ACTIVE" },
    select: { id: true, name: true, sadhanaLevel: { select: { name: true } } },
  });

  type RosterEntry = {
    id: string;
    name: string;
    levelName: string | null;
    present: boolean;
    remarks: string;
  };
  const roster = new Map<string, RosterEntry>();
  for (const m of mentees) {
    roster.set(m.id, {
      id: m.id,
      name: m.name,
      levelName: m.sadhanaLevel?.name ?? null,
      present: false,
      remarks: "",
    });
  }
  for (const a of session.attendances) {
    roster.set(a.devoteeId, {
      id: a.devoteeId,
      name: a.devotee.name,
      levelName: a.sikshaLevel ?? a.devotee.sadhanaLevel?.name ?? null,
      present: a.present,
      remarks: a.remarks ?? "",
    });
  }
  const rows = [...roster.values()].sort((a, b) => a.name.localeCompare(b.name));
  const presentCount = rows.filter((r) => r.present).length;
  const absentees = rows.filter((r) => !r.present);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={session.title}
        subtitle={`${formatDateTime(session.date)}${session.location ? ` · ${session.location}` : ""}`}
        actions={
          <>
            <ButtonLink href={`/api/sessions/${session.id}/export`} variant="secondary">
              Download CSV
            </ButtonLink>
            <ButtonLink href="/missionary/register" variant="ghost">
              Open register view
            </ButtonLink>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-saffron-900/70">
        <Badge tone={typeTone[session.type]}>{typeLabel[session.type]}</Badge>
        <span>
          Conducted by{" "}
          <span className="font-medium text-saffron-950">
            {session.conductedById === user.id ? "you" : session.conductedBy.name}
          </span>
        </span>
      </div>

      {session.notes ? (
        <Card className="mb-4 text-sm text-saffron-900/80">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-saffron-900/60">
            Session notes
          </p>
          {session.notes}
        </Card>
      ) : null}

      {/* The live roster */}
      {rows.length === 0 ? (
        <EmptyState
          title="No devotees in this group yet"
          hint="Attendance rows appear here once devotees are assigned to the conductor."
        />
      ) : (
        <>
          <Card className="divide-y divide-saffron-900/10 py-1">
            {rows.map((r) => (
              <AttendanceRow
                key={r.id}
                sessionId={session.id}
                devoteeId={r.id}
                name={r.name}
                levelName={r.levelName}
                initialPresent={r.present}
                initialRemarks={r.remarks}
              />
            ))}
          </Card>

          {/* Summary */}
          <p className="mt-4 text-center text-sm font-semibold text-saffron-950">
            {presentCount} of {rows.length} marked present
          </p>

          {/* Absentees → follow-up */}
          {absentees.length > 0 ? (
            <Card className="mt-4">
              <h2 className="text-sm font-semibold text-saffron-950">
                Absent ({absentees.length})
              </h2>
              <p className="mt-1 text-xs text-saffron-900/60">
                A loving call or visit keeps every devotee connected.
              </p>
              <ul className="mt-3 divide-y divide-saffron-900/5">
                {absentees.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate text-sm text-saffron-950">{r.name}</span>
                    <Link
                      href={`/missionary/followups?devoteeId=${r.id}&sessionId=${session.id}`}
                      className="shrink-0 text-sm font-medium text-saffron-700 underline-offset-2 hover:underline"
                    >
                      Log follow-up →
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <p className="mt-2 text-center text-xs text-green-700">
              Full house — everyone is present. 🙏
            </p>
          )}
        </>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/missionary/sessions"
          className="text-sm text-saffron-900/60 underline-offset-2 hover:underline"
        >
          ← All sessions
        </Link>
      </div>
    </div>
  );
}
