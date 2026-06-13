import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/guards";
import { wouldCreateCycle } from "@/lib/hierarchy";
import { updateDevoteeSchema } from "@/lib/validators";

/** updateDevoteeSchema plus an optional audit note recorded in LevelHistory on level changes. */
const patchSchema = updateDevoteeSchema.extend({
  levelNote: z.string().trim().max(1000).optional(),
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  whatsapp: true,
  address: true,
  role: true,
  status: true,
  notes: true,
  mentorId: true,
  sadhanaLevelId: true,
  levelTaggedAt: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
  sadhanaLevel: { select: { id: true, slug: true, name: true, order: true } },
  mentor: { select: { id: true, name: true, role: true } },
  _count: { select: { mentees: true } },
} satisfies Prisma.UserSelect;

/** GET /api/admin/devotees/[id] — single devotee detail (admin only). */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser("ADMIN");
  if (guard.response) return guard.response;

  const { id } = await ctx.params;
  const target = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!target) {
    return NextResponse.json({ error: "Devotee not found" }, { status: 404 });
  }
  return NextResponse.json({ user: target });
}

/**
 * PATCH /api/admin/devotees/[id] — admin management actions:
 * level tagging (audited via LevelHistory), mentor assignment (cycle-checked),
 * promote/demote (demote refused while mentees remain), status + contact edits.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser("ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const { id } = await ctx.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Devotee not found" }, { status: 404 });
  }

  const json = await req.json().catch(() => null);
  if (!json || typeof json !== "object") {
    return NextResponse.json({ error: "Invalid request body — expected JSON." }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? `${issue.path.join(".")}: ` : "";
    return NextResponse.json(
      { error: issue ? `${where}${issue.message}` : "Invalid input." },
      { status: 400 },
    );
  }
  const body = parsed.data;

  // The admin account is the root of the tree — its role, status and mentor are immutable here.
  if (
    target.role === "ADMIN" &&
    (body.role !== undefined || body.status !== undefined || body.mentorId !== undefined)
  ) {
    return NextResponse.json(
      { error: "The admin account's role, status and mentor cannot be changed." },
      { status: 400 },
    );
  }

  // Demoting a missionary is only allowed once they have no mentees.
  if (body.role === "DEVOTEE" && target.role === "MISSIONARY") {
    const menteeCount = await prisma.user.count({ where: { mentorId: target.id } });
    if (menteeCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot demote ${target.name}: they still mentor ${menteeCount} ${
            menteeCount === 1 ? "person" : "people"
          }. Reassign their mentees first.`,
        },
        { status: 409 },
      );
    }
  }

  // Mentor reassignment: mentor must exist, be an active missionary/admin, and not create a cycle.
  if (body.mentorId !== undefined && body.mentorId !== null) {
    const mentor = await prisma.user.findUnique({ where: { id: body.mentorId } });
    if (!mentor) {
      return NextResponse.json({ error: "The selected mentor was not found." }, { status: 400 });
    }
    if (mentor.status !== "ACTIVE" || (mentor.role !== "MISSIONARY" && mentor.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "Mentor must be an active missionary or the admin." },
        { status: 400 },
      );
    }
    if (await wouldCreateCycle(target.id, body.mentorId)) {
      return NextResponse.json(
        {
          error:
            "That assignment would create a cycle in the hierarchy — the selected mentor is this person or already sits under them.",
        },
        { status: 400 },
      );
    }
  }

  // Level tagging: verify the level, and audit every (re)tag in LevelHistory.
  let taggedLevelId: string | null = null;
  if (body.sadhanaLevelId !== undefined && body.sadhanaLevelId !== null) {
    const level = await prisma.sadhanaLevel.findUnique({ where: { id: body.sadhanaLevelId } });
    if (!level) {
      return NextResponse.json({ error: "The selected sadhana level was not found." }, { status: 400 });
    }
    taggedLevelId = level.id;
  }

  const data: Prisma.UserUncheckedUpdateInput = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.phone !== undefined) data.phone = body.phone;
  if (body.whatsapp !== undefined) data.whatsapp = body.whatsapp;
  if (body.address !== undefined) data.address = body.address;
  if (body.notes !== undefined) data.notes = body.notes;
  if (body.role !== undefined) data.role = body.role;
  if (body.status !== undefined) {
    data.status = body.status;
    // First activation stamps the joining date.
    if (body.status === "ACTIVE" && !target.joinedAt) data.joinedAt = new Date();
  }
  if (body.mentorId !== undefined) data.mentorId = body.mentorId;
  if (body.sadhanaLevelId !== undefined) {
    data.sadhanaLevelId = body.sadhanaLevelId;
    data.levelTaggedAt = body.sadhanaLevelId === null ? null : new Date();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({ where: { id: target.id }, data, select: userSelect });
    if (taggedLevelId) {
      await tx.levelHistory.create({
        data: {
          userId: target.id,
          levelId: taggedLevelId,
          assignedById: user.id,
          note: body.levelNote || null,
        },
      });
    }
    return u;
  });

  return NextResponse.json({ user: updated });
}
