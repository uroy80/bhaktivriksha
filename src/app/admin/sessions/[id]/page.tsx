import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { formatDateTime } from "@/lib/utils";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  PageHeader,
  StatCard,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";

const typeLabel = { SATSANGA: "Satsanga", CLASS: "Class", OTHER: "Other" } as const;
const typeTone = { SATSANGA: "saffron", CLASS: "blue", OTHER: "gray" } as const;
const typeIcon: Record<"SATSANGA" | "CLASS" | "OTHER", IconName> = {
  SATSANGA: "lotus",
  CLASS: "reading",
  OTHER: "sessions",
};

// Admin read-only view of a session's attendance register.
export default async function AdminSessionDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await props.params;

  const session = await prisma.classSession.findUnique({
    where: { id },
    include: {
      conductedBy: { select: { id: true, name: true } },
      attendances: {
        orderBy: { devotee: { name: "asc" } },
        include: {
          devotee: { select: { id: true, name: true } },
          markedBy: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!session) notFound();

  const presentCount = session.attendances.filter((a) => a.present).length;
  const TypeIcon = Icon[typeIcon[session.type]];

  return (
    <div>
      <PageHeader
        title={session.title}
        subtitle={`${formatDateTime(session.date)}${session.location ? ` · ${session.location}` : ""}`}
        actions={
          <ButtonLink href={`/api/sessions/${session.id}/export`} variant="secondary">
            <Icon.download className="h-4 w-4" />
            Download CSV
          </ButtonLink>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-saffron-900/70">
        <Badge tone={typeTone[session.type]}>
          <TypeIcon className="mr-1 h-3.5 w-3.5" />
          {typeLabel[session.type]}
        </Badge>
        <span>
          Conducted by{" "}
          <span className="font-medium text-saffron-950">{session.conductedBy.name}</span>
        </span>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Marked present" value={presentCount} />
        <StatCard label="Marked absent" value={session.attendances.length - presentCount} />
        <StatCard label="Total marked" value={session.attendances.length} />
      </div>

      {session.notes ? (
        <Card className="mb-6 text-sm text-saffron-900/80">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-saffron-900/60">
            Session notes
          </p>
          {session.notes}
        </Card>
      ) : null}

      {session.attendances.length === 0 ? (
        <EmptyState
          title="No attendance marked for this session"
          hint="The conductor has not marked anyone yet."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Present (A)</Th>
              <Th>Siksha (S)</Th>
              <Th>Remarks</Th>
              <Th>Marked by / at</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-saffron-900/5">
            {session.attendances.map((a) => (
              <tr key={a.id}>
                <Td className="font-medium">{a.devotee.name}</Td>
                <Td>
                  {a.present ? (
                    <Badge tone="green">Present</Badge>
                  ) : (
                    <Badge tone="red">Absent</Badge>
                  )}
                </Td>
                <Td>
                  {a.sikshaLevel ? <Badge>{a.sikshaLevel}</Badge> : <Badge tone="gray">—</Badge>}
                </Td>
                <Td className="max-w-60 text-saffron-900/80">{a.remarks || "—"}</Td>
                <Td className="whitespace-nowrap text-saffron-900/70">
                  {a.markedBy?.name ?? "—"} · {formatDateTime(a.markedAt)}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="mt-6">
        <Link
          href="/admin/sessions"
          className="inline-flex items-center gap-1 text-sm text-saffron-900/60 underline-offset-2 hover:underline"
        >
          <Icon.sessions className="h-4 w-4" />
          All sessions
        </Link>
      </div>
    </div>
  );
}
