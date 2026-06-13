import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";

const typeTone = { SATSANGA: "saffron", CLASS: "blue", OTHER: "gray" } as const;
const typeLabel = { SATSANGA: "Satsanga", CLASS: "Class", OTHER: "Other" } as const;

export default async function AdminSessionsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("ADMIN");
  const sp = await props.searchParams;

  const month = typeof sp.month === "string" && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : "";
  const conductorId = typeof sp.conductorId === "string" ? sp.conductorId : "";

  const where: Prisma.ClassSessionWhereInput = {};
  if (conductorId) where.conductedById = conductorId;
  if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
  }

  const [sessions, conductors] = await Promise.all([
    prisma.classSession.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        conductedBy: { select: { id: true, name: true } },
        attendances: { select: { present: true } },
      },
    }),
    prisma.user.findMany({
      where: { sessionsConducted: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const filtered = Boolean(month || conductorId);

  return (
    <div>
      <PageHeader
        title="Sessions"
        subtitle="Every satsanga and class across the whole milkyway."
      />

      {/* Filters */}
      <Card className="mb-6">
        <form method="get" action="/admin/sessions" className="grid items-end gap-4 sm:grid-cols-4">
          <Field label="Month">
            <Input type="month" name="month" defaultValue={month} />
          </Field>
          <Field label="Conductor">
            <Select name="conductorId" defaultValue={conductorId}>
              <option value="">All conductors</option>
              {conductors.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" variant="secondary">
              Apply filters
            </Button>
            {filtered ? (
              <ButtonLink href="/admin/sessions" variant="ghost">
                Clear
              </ButtonLink>
            ) : null}
          </div>
        </form>
      </Card>

      {sessions.length === 0 ? (
        <EmptyState
          title={filtered ? "No sessions match these filters" : "No sessions yet"}
          hint={
            filtered
              ? "Try a different month or conductor."
              : "Sessions appear here as soon as missionaries conduct them."
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Title</Th>
              <Th>Type</Th>
              <Th>Conductor</Th>
              <Th className="text-right">Present / Total</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-saffron-900/5">
            {sessions.map((s) => {
              const present = s.attendances.filter((a) => a.present).length;
              return (
                <tr key={s.id} className="hover:bg-saffron-50/60">
                  <Td className="whitespace-nowrap">{formatDateTime(s.date)}</Td>
                  <Td>
                    <Link
                      href={`/admin/sessions/${s.id}`}
                      className="font-medium text-saffron-800 underline-offset-2 hover:underline"
                    >
                      {s.title}
                    </Link>
                  </Td>
                  <Td>
                    <Badge tone={typeTone[s.type]}>{typeLabel[s.type]}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap">{s.conductedBy.name}</Td>
                  <Td className="whitespace-nowrap text-right font-medium">
                    {present} / {s.attendances.length}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
