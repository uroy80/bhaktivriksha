import type { Role, UserStatus } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { HierarchyTree, type HierarchyNode } from "./tree";

type TreeUser = {
  id: string;
  name: string;
  role: Role;
  status: UserStatus;
  mentorId: string | null;
  sadhanaLevel: { name: string } | null;
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

  // Build serializable nested trees for the client component (seen-set guards cycles).
  const seen = new Set<string>();
  function build(u: TreeUser): HierarchyNode {
    const children = seen.has(u.id) ? [] : (byMentor.get(u.id) ?? []);
    seen.add(u.id);
    return {
      id: u.id,
      name: u.name,
      role: u.role,
      status: u.status,
      levelName: u.sadhanaLevel?.name ?? null,
      children: children.map(build),
    };
  }

  const adminTrees = users
    .filter((u) => u.role === "ADMIN")
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(build);

  const unassignedTrees = users
    .filter((u) => u.role !== "ADMIN" && !u.mentorId)
    .sort((a, b) => roleRank[a.role] - roleRank[b.role] || a.name.localeCompare(b.name))
    .map(build);

  return (
    <div>
      <PageHeader
        title="Milkyway Hierarchy"
        subtitle="The full mentorship tree — tap + to open a missionary's group, − to collapse it."
      />

      {users.length === 0 ? (
        <EmptyState title="No users yet" hint="Approved devotees will appear in the tree." />
      ) : (
        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-saffron-400 to-saffron-600 text-white shadow-sm">
                <Icon.hierarchy className="h-[18px] w-[18px]" />
              </span>
              <h2 className="text-base font-semibold text-saffron-950">Temple tree</h2>
            </div>
            <HierarchyTree roots={adminTrees} />
          </Card>

          {unassignedTrees.length > 0 && (
            <Card className="ring-maroon-700/20">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-maroon-100 text-maroon-700">
                  <Icon.claim className="h-[18px] w-[18px]" />
                </span>
                <h2 className="text-base font-semibold text-maroon-800">Unassigned</h2>
                <Badge tone="red">{unassignedTrees.length}</Badge>
              </div>
              <p className="mt-1 mb-3 text-xs text-stone-500">
                People without a mentor — they are outside the milkyway tree. Open a profile to
                assign one.
              </p>
              <HierarchyTree roots={unassignedTrees} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
