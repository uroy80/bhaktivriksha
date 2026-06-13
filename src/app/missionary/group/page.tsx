import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { getDescendantIds } from "@/lib/hierarchy";
import { formatDate, toDateKey } from "@/lib/utils";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";
import { getGroupRows, startOfDaysAgo } from "./group-data";

export default async function MyGroupPage() {
  const user = await requireRole("MISSIONARY");
  const rows = await getGroupRows(user.id);

  const missionaries = rows.filter((r) => r.role === "MISSIONARY");
  const groupSizes = new Map(
    await Promise.all(
      missionaries.map(async (m) => [m.id, (await getDescendantIds(m.id)).length] as const),
    ),
  );

  const staleCutoff = toDateKey(startOfDaysAgo(7)); // YYYY-MM-DD; string compare works for ISO dates

  return (
    <div>
      <PageHeader
        title="My group"
        subtitle="The devotees and missionaries directly under your care."
        actions={<ButtonLink href="/api/missionary/group/export" variant="secondary">⬇ Download CSV</ButtonLink>}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="No one is under your care yet"
          hint="When devotees are assigned to you (or approved with you as mentor), they will appear here."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Level</Th>
              <Th>Last sadhana</Th>
              <Th>Attendance (4w)</Th>
              <Th>Last follow-up</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-saffron-900/10">
            {rows.map((r) => {
              const sadhanaStale = !r.lastSadhana || r.lastSadhana < staleCutoff;
              return (
                <tr key={r.id} className="hover:bg-saffron-50/60">
                  <Td>
                    <Link
                      href={`/missionary/group/${r.id}`}
                      className="font-medium text-saffron-950 hover:text-saffron-700 hover:underline"
                    >
                      {r.name}
                    </Link>
                    {r.status !== "ACTIVE" ? (
                      <Badge tone={r.status === "INACTIVE" ? "gray" : "saffron"} className="ml-2">
                        {r.status === "INACTIVE" ? "Inactive" : "Pending"}
                      </Badge>
                    ) : null}
                  </Td>
                  <Td>
                    <Badge tone={r.role === "MISSIONARY" ? "blue" : "saffron"}>
                      {r.role === "MISSIONARY" ? "Missionary" : "Devotee"}
                    </Badge>
                  </Td>
                  <Td>{r.levelName ? <Badge>{r.levelName}</Badge> : <span className="text-stone-400">—</span>}</Td>
                  <Td>
                    {r.lastSadhana ? (
                      <span className={sadhanaStale ? "font-semibold text-maroon-700" : ""}>
                        {formatDate(r.lastSadhana)}
                      </span>
                    ) : (
                      <span className="font-semibold text-maroon-700">never</span>
                    )}
                  </Td>
                  <Td>
                    {r.attendancePct === null ? (
                      <span className="text-stone-400">—</span>
                    ) : (
                      <span>
                        {r.attendancePct}%{" "}
                        <span className="text-xs text-stone-500">
                          ({r.attended4w}/{r.marked4w})
                        </span>
                      </span>
                    )}
                  </Td>
                  <Td>
                    {r.lastFollowUp ? formatDate(r.lastFollowUp) : <span className="text-stone-400">—</span>}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* My missionaries */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-saffron-950">My missionaries</h2>
        {missionaries.length === 0 ? (
          <Card>
            <p className="text-sm text-stone-500">
              You have not appointed any missionaries yet. When a devotee is ready to care for their
              own group, open their page and appoint them — that is how the milkyway grows.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {missionaries.map((m) => (
              <Card key={m.id}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/missionary/group/${m.id}`}
                      className="font-semibold text-saffron-950 hover:text-saffron-700 hover:underline"
                    >
                      {m.name}
                    </Link>
                    {m.levelName ? <p className="mt-0.5 text-xs text-stone-500">{m.levelName}</p> : null}
                  </div>
                  <Badge tone="blue">Missionary</Badge>
                </div>
                <p className="mt-3 text-sm text-saffron-900/80">
                  Cares for <span className="font-semibold">{groupSizes.get(m.id) ?? 0}</span>{" "}
                  {(groupSizes.get(m.id) ?? 0) === 1 ? "soul" : "souls"} in their group
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
