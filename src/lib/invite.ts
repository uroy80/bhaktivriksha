import { randomBytes } from "crypto";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { wouldCreateCycle } from "@/lib/hierarchy";

/** A URL-safe invite token. */
function newToken(): string {
  return randomBytes(9).toString("base64url"); // 12 chars
}

/**
 * Return the missionary's stable invite token, creating one on first use.
 * Only MISSIONARY/ADMIN can host a join link.
 */
export async function getOrCreateInviteToken(user: Pick<User, "id" | "role" | "inviteToken">): Promise<string> {
  if (user.role !== "MISSIONARY" && user.role !== "ADMIN") {
    throw new Error("Only missionaries can host an invite link");
  }
  if (user.inviteToken) return user.inviteToken;

  // Retry on the (astronomically unlikely) unique collision.
  for (let i = 0; i < 5; i++) {
    const token = newToken();
    try {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { inviteToken: token },
        select: { inviteToken: true },
      });
      return updated.inviteToken!;
    } catch {
      // unique violation → try again
    }
  }
  throw new Error("Could not allocate an invite token");
}

export type JoinResult =
  | { ok: true; missionaryName: string }
  | { ok: false; reason: "INVALID" | "SELF" | "ALREADY_IN_GROUP" | "NOT_A_DEVOTEE" | "CYCLE" };

/**
 * Assign `actor` (the person opening the link) under the missionary that owns
 * `token`. Used by the /join flow.
 *
 * Rules:
 *  - token must resolve to an ACTIVE MISSIONARY/ADMIN
 *  - a DEVOTEE may join if currently unassigned (mentorId == null)
 *  - a DEVOTEE already in a group is told so (no silent re-parenting)
 *  - missionaries/admins cannot be claimed via a link
 */
export async function assignViaToken(actor: User, token: string): Promise<JoinResult> {
  const host = await prisma.user.findUnique({ where: { inviteToken: token } });
  if (!host || host.status !== "ACTIVE" || (host.role !== "MISSIONARY" && host.role !== "ADMIN")) {
    return { ok: false, reason: "INVALID" };
  }
  if (host.id === actor.id) return { ok: false, reason: "SELF" };
  if (actor.role !== "DEVOTEE") return { ok: false, reason: "NOT_A_DEVOTEE" };
  if (actor.mentorId) return { ok: false, reason: "ALREADY_IN_GROUP" };
  if (await wouldCreateCycle(actor.id, host.id)) return { ok: false, reason: "CYCLE" };

  await prisma.user.update({ where: { id: actor.id }, data: { mentorId: host.id } });
  return { ok: true, missionaryName: host.name };
}

/** Resolve a token to its missionary for display (used on the join landing). */
export async function getInviteHost(token: string) {
  return prisma.user.findUnique({
    where: { inviteToken: token },
    select: { id: true, name: true, role: true, status: true, sadhanaLevel: { select: { name: true } } },
  });
}
