"use client";

import { useState } from "react";
import Link from "next/link";
import type { Role, UserStatus } from "@prisma/client";
import { Badge } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";

export type HierarchyNode = {
  id: string;
  name: string;
  role: Role;
  status: UserStatus;
  levelName: string | null;
  children: HierarchyNode[];
};

const roleTone: Record<Role, "red" | "blue" | "saffron"> = {
  ADMIN: "red",
  MISSIONARY: "blue",
  DEVOTEE: "saffron",
};

const roleIcon: Record<Role, IconName> = {
  ADMIN: "lotus",
  MISSIONARY: "group",
  DEVOTEE: "heart",
};

const tileClass: Record<Role, string> = {
  ADMIN: "bg-maroon-100 text-maroon-700",
  MISSIONARY: "bg-sky-100 text-sky-700",
  DEVOTEE: "bg-saffron-100 text-saffron-700",
};

/** Count every descendant so a collapsed branch can show its full size. */
function countDescendants(node: HierarchyNode): number {
  return node.children.reduce((n, c) => n + 1 + countDescendants(c), 0);
}

export function HierarchyTree({ roots }: { roots: HierarchyNode[] }) {
  // Bumping `epoch` remounts the tree so every node re-reads its initial open state.
  const [epoch, setEpoch] = useState(0);
  const [forceOpen, setForceOpen] = useState<boolean | null>(null);

  return (
    <div>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setForceOpen(true);
            setEpoch((e) => e + 1);
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-saffron-700 ring-1 ring-saffron-300 hover:bg-saffron-50"
        >
          <Icon.plus className="h-3.5 w-3.5" />
          Expand all
        </button>
        <button
          type="button"
          onClick={() => {
            setForceOpen(false);
            setEpoch((e) => e + 1);
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-saffron-700 ring-1 ring-saffron-300 hover:bg-saffron-50"
        >
          <Icon.minus className="h-3.5 w-3.5" />
          Collapse all
        </button>
      </div>
      <ul key={epoch} className="space-y-1">
        {roots.map((r) => (
          <Node key={r.id} node={r} depth={0} forceOpen={forceOpen} />
        ))}
      </ul>
    </div>
  );
}

function Node({
  node,
  depth,
  forceOpen,
}: {
  node: HierarchyNode;
  depth: number;
  forceOpen: boolean | null;
}) {
  const hasChildren = node.children.length > 0;
  // Default: only the top level (admins) is open, so big branches start collapsed.
  const initialOpen = forceOpen === null ? depth === 0 : forceOpen;
  const [open, setOpen] = useState(initialOpen);
  const RoleIcon = Icon[roleIcon[node.role]];
  const total = hasChildren ? countDescendants(node) : 0;

  return (
    <li>
      <div className="flex items-center gap-1">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? `Collapse ${node.name}'s group` : `Expand ${node.name}'s group`}
            aria-expanded={open}
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-saffron-300 bg-white text-saffron-700 shadow-sm transition-colors hover:bg-saffron-100"
          >
            {open ? <Icon.minus className="h-3.5 w-3.5" /> : <Icon.plus className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" aria-hidden />
        )}

        <Link
          href={`/admin/devotees/${node.id}`}
          className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-saffron-50"
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${tileClass[node.role]} ${
              node.status === "INACTIVE" ? "opacity-50" : ""
            }`}
          >
            <RoleIcon className="h-3.5 w-3.5" />
          </span>
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
          {node.levelName ? <span className="text-xs text-stone-500">{node.levelName}</span> : null}
          {node.status === "PENDING" ? <Badge tone="gray">PENDING</Badge> : null}
          {hasChildren ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-saffron-700">
              <Icon.devotees className="h-3.5 w-3.5" />
              {node.children.length} direct
              {total > node.children.length ? (
                <span className="text-saffron-900/50">· {total} in all</span>
              ) : null}
            </span>
          ) : null}
        </Link>
      </div>

      {hasChildren && open ? (
        <ul className="ml-5 space-y-1 border-l-2 border-saffron-200 pl-3">
          {node.children.map((c) => (
            <Node key={c.id} node={c} depth={depth + 1} forceOpen={forceOpen} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
