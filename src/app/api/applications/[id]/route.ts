import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/guards";
import { wouldCreateCycle } from "@/lib/hierarchy";
import { reviewApplicationSchema } from "@/lib/validators";

/**
 * PATCH /api/applications/[id] — review an application (ADMIN only).
 * Body: { action: APPROVE|REJECT, reviewNote?, mentorId?, levelId? } (reviewApplicationSchema).
 *
 * APPROVE of JOIN: applicant becomes ACTIVE, joinedAt set, mentor assigned
 * (must be an ACTIVE MISSIONARY or the ADMIN), starting level tagged + LevelHistory row.
 * APPROVE of LEVEL_CHANGE: applicant's level set to the requested level + LevelHistory row.
 * Re-reviewing a non-PENDING application is refused with 409.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireApiUser("ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = reviewApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { action, reviewNote, mentorId, levelId } = parsed.data;

  const application = await prisma.application.findUnique({
    where: { id },
    include: { applicant: { select: { id: true, name: true } } },
  });
  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }
  if (application.status !== "PENDING") {
    return NextResponse.json(
      { error: "This application has already been reviewed." },
      { status: 409 },
    );
  }

  const now = new Date();
  const reviewData = {
    reviewedById: user.id,
    reviewNote: reviewNote || null,
    reviewedAt: now,
  };

  if (action === "REJECT") {
    const updated = await prisma.application.update({
      where: { id },
      data: { status: "REJECTED", ...reviewData },
    });
    return NextResponse.json(updated);
  }

  // APPROVE
  if (application.type === "JOIN") {
    if (!mentorId) {
      return NextResponse.json(
        { error: "Select a mentor for the new devotee before approving." },
        { status: 400 },
      );
    }
    if (!levelId) {
      return NextResponse.json(
        { error: "Select a starting sadhana level before approving." },
        { status: 400 },
      );
    }

    const mentor = await prisma.user.findUnique({ where: { id: mentorId } });
    if (
      !mentor ||
      mentor.status !== "ACTIVE" ||
      (mentor.role !== "MISSIONARY" && mentor.role !== "ADMIN")
    ) {
      return NextResponse.json(
        { error: "The mentor must be an active missionary or the admin." },
        { status: 400 },
      );
    }
    if (await wouldCreateCycle(application.applicantId, mentorId)) {
      return NextResponse.json(
        { error: "That mentor assignment would create a cycle in the hierarchy." },
        { status: 400 },
      );
    }

    const level = await prisma.sadhanaLevel.findUnique({ where: { id: levelId } });
    if (!level) {
      return NextResponse.json(
        { error: "The selected starting level does not exist." },
        { status: 400 },
      );
    }

    const [updated] = await prisma.$transaction([
      prisma.application.update({
        where: { id },
        data: { status: "APPROVED", ...reviewData },
      }),
      prisma.user.update({
        where: { id: application.applicantId },
        data: {
          status: "ACTIVE",
          joinedAt: now,
          mentorId,
          sadhanaLevelId: levelId,
          levelTaggedAt: now,
        },
      }),
      prisma.levelHistory.create({
        data: {
          userId: application.applicantId,
          levelId,
          assignedById: user.id,
          note: "Initial level on joining",
        },
      }),
    ]);
    return NextResponse.json(updated);
  }

  // APPROVE of LEVEL_CHANGE
  if (!application.levelId) {
    return NextResponse.json(
      { error: "This application has no requested level and cannot be approved." },
      { status: 400 },
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.application.update({
      where: { id },
      data: { status: "APPROVED", ...reviewData },
    }),
    prisma.user.update({
      where: { id: application.applicantId },
      data: { sadhanaLevelId: application.levelId, levelTaggedAt: now },
    }),
    prisma.levelHistory.create({
      data: {
        userId: application.applicantId,
        levelId: application.levelId,
        assignedById: user.id,
        note: reviewNote?.trim() ? reviewNote.trim() : "Level application approved",
      },
    }),
  ]);
  return NextResponse.json(updated);
}
