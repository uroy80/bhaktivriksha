import Link from "next/link";
import type { Role, UserStatus } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import {
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import {
  devoteeWhere,
  filtersToQueryString,
  parseDevoteeFilters,
} from "@/app/api/admin/devotees/query";

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

export default async function DevoteesDirectoryPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("ADMIN");
  const searchParams = await props.searchParams;
  const filters = parseDevoteeFilters(searchParams);

  const [users, levels] = await Promise.all([
    prisma.user.findMany({
      where: devoteeWhere(filters),
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        joinedAt: true,
        sadhanaLevel: { select: { name: true } },
        mentor: { select: { id: true, name: true } },
      },
    }),
    prisma.sadhanaLevel.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true, order: true } }),
  ]);

  const exportHref = `/api/admin/devotees/export${filtersToQueryString(filters)}`;

  return (
    <div>
      <PageHeader
        title="Devotee Directory"
        subtitle={`${users.length} ${users.length === 1 ? "person" : "people"} matching the current filters.`}
        actions={
          <ButtonLink href={exportHref} variant="secondary">
            <Icon.download className="h-4 w-4" />
            Download CSV
          </ButtonLink>
        }
      />

      {/* Quick views */}
      <div className="mb-4 flex flex-wrap gap-2">
        <ButtonLink href="/admin/devotees" variant="ghost" className="text-xs">
          <Icon.devotees className="h-4 w-4" />
          Everyone
        </ButtonLink>
        <ButtonLink
          href="/admin/devotees?role=DEVOTEE&status=ACTIVE"
          variant="ghost"
          className="text-xs"
        >
          <Icon.claim className="h-4 w-4" />
          Active devotees
        </ButtonLink>
        <ButtonLink
          href="/admin/devotees?role=MISSIONARY&status=ACTIVE"
          variant="ghost"
          className="text-xs"
        >
          <Icon.group className="h-4 w-4" />
          Missionaries
        </ButtonLink>
      </div>

      {/* GET-form filters: submits back to this page via the query string */}
      <form
        method="get"
        className="mb-6 grid grid-cols-2 items-end gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-saffron-900/10 md:grid-cols-5"
      >
        <div className="col-span-2">
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-saffron-950">
            Search
          </label>
          <Input
            id="q"
            name="q"
            type="search"
            placeholder="Name, email or phone…"
            defaultValue={filters.q ?? ""}
          />
        </div>
        <div>
          <label htmlFor="role" className="mb-1 block text-xs font-medium text-saffron-950">
            Role
          </label>
          <Select id="role" name="role" defaultValue={filters.role ?? ""}>
            <option value="">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MISSIONARY">Missionary</option>
            <option value="DEVOTEE">Devotee</option>
          </Select>
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-saffron-950">
            Status
          </label>
          <Select id="status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>
        <div>
          <label htmlFor="levelId" className="mb-1 block text-xs font-medium text-saffron-950">
            Level
          </label>
          <Select id="levelId" name="levelId" defaultValue={filters.levelId ?? ""}>
            <option value="">All levels</option>
            {levels.map((l) => (
              <option key={l.id} value={l.id}>
                {l.order}. {l.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="col-span-2 flex gap-2 md:col-span-5">
          <Button type="submit">Filter</Button>
          <ButtonLink href="/admin/devotees" variant="ghost">
            Reset
          </ButtonLink>
        </div>
      </form>

      {users.length === 0 ? (
        <EmptyState
          title="No devotees match these filters"
          hint="Try clearing the search or choosing different filters."
        />
      ) : (
        <Table>
          <thead className="bg-saffron-50">
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Level</Th>
              <Th>Mentor</Th>
              <Th>Status</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-saffron-900/10">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-saffron-50/60">
                <Td>
                  <Link
                    href={`/admin/devotees/${u.id}`}
                    className="font-medium text-saffron-800 hover:text-saffron-900 hover:underline"
                  >
                    {u.name}
                  </Link>
                  <span className="block text-xs text-stone-500">{u.email}</span>
                </Td>
                <Td>
                  <Badge tone={roleTone[u.role]}>{u.role}</Badge>
                </Td>
                <Td>
                  {u.sadhanaLevel ? (
                    <Badge tone="saffron">{u.sadhanaLevel.name}</Badge>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </Td>
                <Td>
                  {u.mentor ? (
                    <Link
                      href={`/admin/devotees/${u.mentor.id}`}
                      className="text-saffron-800 hover:underline"
                    >
                      {u.mentor.name}
                    </Link>
                  ) : u.role === "DEVOTEE" ? (
                    <Badge tone="red">No mentor</Badge>
                  ) : (
                    <span className="text-stone-400">—</span>
                  )}
                </Td>
                <Td>
                  <Badge tone={statusTone[u.status]}>{u.status}</Badge>
                </Td>
                <Td className="whitespace-nowrap">
                  {u.joinedAt ? formatDate(u.joinedAt) : <span className="text-stone-400">—</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
