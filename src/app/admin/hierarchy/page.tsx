import Link from "next/link";
import type { Role, UserStatus } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

type TreeUser = {
  id: string;
  name: string;
  role: Role;
  status: UserStatus;
  mentorId: string | null;
  sadhanaLevel: { name: string } | null;
  _count: { mentees: number };
};

const roleTone: Record<Role, "red" | "blue" | "saffron"> = {
  ADMIN: "red",
  MISSIONARY: "blue",
  DEVOTEE: "saffron",
};

const roleRank: Record<Role, number> = { ADMIN: 0, MISSIONARY: 1, DEVOTEE: 2 };

export default async function HierarchyPage() {
  await requireRole("ADMIN");

  const users: TreeUser[] = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
      status: true,
      mentorId: true,
      sadhanaLevel: { select: { name: true } },
      _count: { select: { mentees: true } },
    },
  });

  const byMentor = new Map<string, TreeUser[]>();
  for (const u of users) {
    if (!u.mentorId) continue;
    const list = byMentor.get(u.mentorId) ?? [];
    list.push(u);
    byMentor.set(u.mentorId, list);
  }
  for (const list of byMentor.values()) {
    list.sort((a, b) => roleRank[a.role] - roleRank[b.role] || a.name.localeCompare(b.name));
  }

  const admins = users
    .filter((u) => u.role === "ADMIN")
    .sort((a, b) => a.name.localeCompare(b.name));
  const unassigned = users
    .filter((u) => u.role !== "ADMIN" && !u.mentorId)
    .sort((a, b) => roleRank[a.role] - roleRank[b.role] || a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Milkyway Hierarchy"
        subtitle="The full mentorship tree — every superior cares for everyone in their branch."
      />

      {users.length === 0 ? (
        <EmptyState title="No users yet" hint="Approved devotees will appear in the tree." />
      ) : (
        <div className="space-y-6">
          <Card>
            <h2 className="mb-3 text-base font-semibold text-saffron-950">Temple tree</h2>
            <ul className="space-y-1">
              {admins.map((a) => (
                <TreeNode key={a.id} node={a} byMentor={byMentor} />
              ))}
            </ul>
          </Card>

          {unassigned.length > 0 && (
            <Card className="ring-maroon-700/20">
              <h2 className="text-base font-semibold text-maroon-800">Unassigned</h2>
              <p className="mt-0.5 mb-3 text-xs text-stone-500">
                People without a mentor — they are outside the milkyway tree. Open a profile to
                assign one.
              </p>
              <ul className="space-y-1">
                {unassigned.map((u) => (
                  <TreeNode key={u.id} node={u} byMentor={byMentor} />
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function TreeNode({ node, byMentor }: { node: TreeUser; byMentor: Map<string, TreeUser[]> }) {
  const children = byMentor.get(node.id) ?? [];
  return (
    <li>
      <Link
        href={`/admin/devotees/${node.id}`}
        className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-saffron-50"
      >
        <span
          className={
            node.status === "INACTIVE"
              ? "text-sm font-medium text-stone-400 line-through"
              : "text-sm font-medium text-saffron-950"
          }
        >
          {node.name}
        </span>
        <Badge tone={roleTone[node.role]} className="text-[10px]">
          {node.role}
        </Badge>
        {node.sadhanaLevel ? (
          <span className="text-xs text-stone-500">{node.sadhanaLevel.name}</span>
        ) : null}
        {node.status === "PENDING" ? <Badge tone="gray">PENDING</Badge> : null}
        {node._count.mentees > 0 ? (
          <span className="text-xs text-saffron-700">
            · {node._count.mentees} {node._count.mentees === 1 ? "mentee" : "mentees"}
          </span>
        ) : null}
      </Link>
      {children.length > 0 && (
        <ul className="ml-4 space-y-1 border-l-2 border-saffron-200 pl-3">
          {children.map((c) => (
            <TreeNode key={c.id} node={c} byMentor={byMentor} />
          ))}
        </ul>
      )}
    </li>
  );
}
