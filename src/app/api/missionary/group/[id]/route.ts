import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { canAccessUser, visibleUserIds, wouldCreateCycle } from "@/lib/hierarchy";

/**
 * Mentee management — reassign mentor (within the caller's subtree),
 * promote/demote missionary, edit pastoral notes.
 * Levels are NOT touched here (tagged by admin or via applications).
 */
const manageMenteeSchema = z.object({
  mentorId: z.string().min(1, "Choose a missionary").optional(),
  role: z.enum(["MISSIONARY", "DEVOTEE"]).optional(),
  notes: z.string().trim().max(2000, "Notes must be under 2000 characters").optional(),
});

/** GET /api/missionary/group/[id] — mentee detail (scoped to the caller's subtree). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const { id } = await ctx.params;
  if (!(await canAccessUser(user, id))) {
    return NextResponse.json({ error: "Devotee not found in your group" }, { status: 404 });
  }

  const mentee = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      address: true,
      role: true,
      status: true,
      notes: true,
      joinedAt: true,
      createdAt: true,
      mentorId: true,
      levelTaggedAt: true,
      sadhanaLevel: { select: { id: true, slug: true, name: true, order: true } },
      mentor: { select: { id: true, name: true } },
      levelHistory: {
        orderBy: { assignedAt: "desc" },
        take: 20,
        select: {
          id: true,
          assignedAt: true,
          note: true,
          level: { select: { name: true, order: true } },
          assignedBy: { select: { name: true } },
        },
      },
      attendances: {
        orderBy: { session: { date: "desc" } },
        take: 10,
        select: {
          id: true,
          present: true,
          sikshaLevel: true,
          remarks: true,
          session: { select: { id: true, title: true, date: true, type: true } },
        },
      },
      followUpsReceived: {
        orderBy: { occurredAt: "desc" },
        take: 10,
        select: {
          id: true,
          channel: true,
          outcome: true,
          notes: true,
          occurredAt: true,
          by: { select: { name: true } },
        },
      },
      sadhanaEntries: {
        orderBy: { date: "desc" },
        take: 14,
        select: {
          date: true,
          japaRounds: true,
          readingMinutes: true,
          mangalArati: true,
          eveningArati: true,
          lectureHeard: true,
        },
      },
      _count: { select: { mentees: true } },
    },
  });
  if (!mentee) {
    return NextResponse.json({ error: "Devotee not found in your group" }, { status: 404 });
  }

  return NextResponse.json({ mentee });
}

/** PATCH /api/missionary/group/[id] — { mentorId?, role?, notes? }. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = manageMenteeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const data = parsed.data;
  if (data.mentorId === undefined && data.role === undefined && data.notes === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (id === user.id) {
    return NextResponse.json({ error: "You cannot manage your own record here" }, { status: 400 });
  }
  if (!(await canAccessUser(user, id))) {
    return NextResponse.json({ error: "Devotee not found in your group" }, { status: 404 });
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Devotee not found in your group" }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Administrators cannot be managed here" }, { status: 403 });
  }

  const updates: { mentorId?: string; role?: "MISSIONARY" | "DEVOTEE"; notes?: string } = {};

  if (data.mentorId !== undefined) {
    const mentor = await prisma.user.findUnique({ where: { id: data.mentorId } });
    if (!mentor || mentor.status !== "ACTIVE" || (mentor.role !== "MISSIONARY" && mentor.role !== "ADMIN")) {
      return NextResponse.json(
        { error: "The new mentor must be an active missionary" },
        { status: 400 },
      );
    }
    const scope = await visibleUserIds(user); // null = admin = no filter
    if (scope && !scope.includes(mentor.id)) {
      return NextResponse.json(
        { error: "The new mentor must be a missionary inside your own group" },
        { status: 403 },
      );
    }
    if (await wouldCreateCycle(id, mentor.id)) {
      return NextResponse.json(
        { error: "That move would create a cycle in the mentorship tree" },
        { status: 409 },
      );
    }
    updates.mentorId = mentor.id;
  }

  if (data.role !== undefined && data.role !== target.role) {
    if (data.role === "DEVOTEE") {
      const menteeCount = await prisma.user.count({ where: { mentorId: id } });
      if (menteeCount > 0) {
        return NextResponse.json(
          {
            error: `${target.name} still cares for ${menteeCount} mentee${menteeCount === 1 ? "" : "s"} — move them to another missionary first`,
          },
          { status: 409 },
        );
      }
    }
    updates.role = data.role;
  }

  if (data.notes !== undefined) {
    updates.notes = data.notes;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, unchanged: true });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updates,
    select: { id: true, name: true, role: true, mentorId: true, notes: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
