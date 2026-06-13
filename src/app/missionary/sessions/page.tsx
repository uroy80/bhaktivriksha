import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { visibleUserIds } from "@/lib/hierarchy";
import { formatDateTime } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { SessionForm } from "./session-form";

const typeTone = { SATSANGA: "saffron", CLASS: "blue", OTHER: "gray" } as const;
const typeLabel = { SATSANGA: "Satsanga", CLASS: "Class", OTHER: "Other" } as const;

export default async function MissionarySessionsPage() {
  const user = await requireRole("MISSIONARY");

  const scope = (await visibleUserIds(user)) ?? [];
  const sessions = await prisma.classSession.findMany({
    where: { conductedById: { in: scope } },
    orderBy: { date: "desc" },
    include: {
      conductedBy: { select: { id: true, name: true } },
      attendances: { select: { present: true } },
    },
  });

  // Group size = the conductor's direct ACTIVE mentees.
  const conductorIds = [...new Set(sessions.map((s) => s.conductedById))];
  const groupCounts =
    conductorIds.length > 0
      ? await prisma.user.groupBy({
          by: ["mentorId"],
          where: { mentorId: { in: conductorIds }, status: "ACTIVE" },
          _count: { _all: true },
        })
      : [];
  const groupSize = new Map(groupCounts.map((g) => [g.mentorId, g._count._all]));

  const now = new Date();

  return (
    <div>
      <PageHeader
        title="Sessions"
        subtitle="Conduct satsangas and classes, and mark attendance live."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2 lg:self-start">
          <h2 className="mb-4 text-base font-semibold text-saffron-950">New session</h2>
          <SessionForm />
        </Card>

        <div className="lg:col-span-3">
          {sessions.length === 0 ? (
            <EmptyState
              title="No sessions yet"
              hint="Create your first satsanga or class — attendance marking opens right after."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Title</Th>
                  <Th>Type</Th>
                  <Th>Conductor</Th>
                  <Th className="text-right">Present / Group</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-saffron-900/5">
                {sessions.map((s) => {
                  const present = s.attendances.filter((a) => a.present).length;
                  const size = groupSize.get(s.conductedById) ?? 0;
                  const upcoming = new Date(s.date) > now;
                  return (
                    <tr key={s.id} className="hover:bg-saffron-50/60">
                      <Td className="whitespace-nowrap">
                        {formatDateTime(s.date)}
                        {upcoming ? (
                          <Badge tone="blue" className="ml-2">
                            Upcoming
                          </Badge>
                        ) : null}
                      </Td>
                      <Td>
                        <Link
                          href={`/missionary/sessions/${s.id}`}
                          className="font-medium text-saffron-800 underline-offset-2 hover:underline"
                        >
                          {s.title}
                        </Link>
                      </Td>
                      <Td>
                        <Badge tone={typeTone[s.type]}>{typeLabel[s.type]}</Badge>
                      </Td>
                      <Td className="whitespace-nowrap">
                        {s.conductedById === user.id ? "You" : s.conductedBy.name}
                      </Td>
                      <Td className="whitespace-nowrap text-right font-medium">
                        {present} / {size}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
