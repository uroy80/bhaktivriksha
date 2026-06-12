import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * The "milkyway" tree: User.mentorId links every devotee/missionary to the
 * missionary (or admin) above them. These helpers walk that tree.
 */

/** All user ids in the subtree rooted at `rootId` (including the root). */
export async function getSubtreeIds(rootId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    WITH RECURSIVE subtree AS (
      SELECT id FROM "User" WHERE id = ${rootId}
      UNION ALL
      SELECT u.id FROM "User" u JOIN subtree s ON u."mentorId" = s.id
    )
    SELECT id FROM subtree
  `;
  return rows.map((r) => r.id);
}

/** Subtree ids EXCLUDING the root — i.e. everyone under this person. */
export async function getDescendantIds(rootId: string): Promise<string[]> {
  const ids = await getSubtreeIds(rootId);
  return ids.filter((id) => id !== rootId);
}

/**
 * Scope of people `actor` may see/act on:
 *  - ADMIN: everyone (returns null, meaning "no filter")
 *  - others: their own subtree (self + all descendants)
 */
export async function visibleUserIds(actor: User): Promise<string[] | null> {
  if (actor.role === "ADMIN") return null;
  return getSubtreeIds(actor.id);
}

/** True if actor is admin, is the target, or the target sits anywhere under actor. */
export async function canAccessUser(actor: User, targetId: string): Promise<boolean> {
  if (actor.role === "ADMIN") return true;
  if (actor.id === targetId) return true;
  const ids = await getSubtreeIds(actor.id);
  return ids.includes(targetId);
}

/**
 * Guard against cycles when re-assigning mentors: the new mentor must not be
 * the user themself or anyone in the user's own subtree.
 */
export async function wouldCreateCycle(userId: string, newMentorId: string): Promise<boolean> {
  if (userId === newMentorId) return true;
  const subtree = await getSubtreeIds(userId);
  return subtree.includes(newMentorId);
}

/** Direct mentees of a user, newest first. */
export function getDirectMentees(mentorId: string, role?: Role) {
  return prisma.user.findMany({
    where: { mentorId, ...(role ? { role } : {}) },
    orderBy: { createdAt: "desc" },
    include: { sadhanaLevel: true },
  });
}

/** The chain of superiors above a user (mentor, mentor's mentor, ... up to the root). */
export async function getSuperiorChain(userId: string): Promise<{ id: string; name: string; role: Role }[]> {
  const rows = await prisma.$queryRaw<{ id: string; name: string; role: Role }[]>`
    WITH RECURSIVE chain AS (
      SELECT u2.id, u2.name, u2.role, 1 AS depth
      FROM "User" u1 JOIN "User" u2 ON u1."mentorId" = u2.id
      WHERE u1.id = ${userId}
      UNION ALL
      SELECT u3.id, u3.name, u3.role, c.depth + 1
      FROM "User" u3 JOIN chain c ON (
        SELECT "mentorId" FROM "User" WHERE id = c.id
      ) = u3.id
      WHERE c.depth < 32
    )
    SELECT id, name, role FROM chain ORDER BY depth
  `;
  return rows;
}
