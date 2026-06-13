import { NextResponse } from "next/server";
import type { ApplicationStatus, ApplicationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/guards";
import { visibleUserIds } from "@/lib/hierarchy";
import { levelApplySchema } from "@/lib/validators";

const STATUSES: readonly string[] = ["PENDING", "APPROVED", "REJECTED"];
const TYPES: readonly string[] = ["JOIN", "LEVEL_CHANGE"];

/**
 * GET /api/applications — list applications, scoped to the actor:
 *  - ADMIN: all applications
 *  - MISSIONARY: applications from anyone in their subtree
 *  - DEVOTEE: only their own
 * Optional filters: ?status=PENDING|APPROVED|REJECTED & ?type=JOIN|LEVEL_CHANGE
 */
export async function GET(req: Request) {
  const guard = await requireApiUser();
  if (guard.response) return guard.response;
  const user = guard.user;

  const where: Prisma.ApplicationWhereInput = {};

  if (user.role === "DEVOTEE") {
    where.applicantId = user.id;
  } else {
    const ids = await visibleUserIds(user); // null = admin = no filter
    if (ids) where.applicantId = { in: ids };
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const type = url.searchParams.get("type");
  if (status && STATUSES.includes(status)) where.status = status as ApplicationStatus;
  if (type && TYPES.includes(type)) where.type = type as ApplicationType;

  const applications = await prisma.application.findMany({
    where,
    include: {
      applicant: { select: { id: true, name: true, email: true, phone: true } },
      level: { select: { id: true, name: true, order: true } },
      reviewedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(applications);
}

/**
 * POST /api/applications — a signed-in user applies to change their sadhana level.
 * Body: { levelId, message? } (levelApplySchema).
 *  - 409 if they already have a PENDING application (of any type)
 *  - 400 if the requested level equals their current level
 */
export async function POST(req: Request) {
  const guard = await requireApiUser("DEVOTEE", "MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = levelApplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { levelId, message } = parsed.data;

  const level = await prisma.sadhanaLevel.findUnique({ where: { id: levelId } });
  if (!level) {
    return NextResponse.json({ error: "The requested level does not exist." }, { status: 400 });
  }

  if (user.sadhanaLevelId === levelId) {
    return NextResponse.json(
      { error: `You are already at the ${level.name} level. Choose a different level.` },
      { status: 400 },
    );
  }

  const existingPending = await prisma.application.findFirst({
    where: { applicantId: user.id, status: "PENDING" },
  });
  if (existingPending) {
    return NextResponse.json(
      { error: "You already have a pending application. Please wait for it to be reviewed." },
      { status: 409 },
    );
  }

  const application = await prisma.application.create({
    data: {
      type: "LEVEL_CHANGE",
      applicantId: user.id,
      levelId,
      message: message || null,
    },
    include: { level: { select: { id: true, name: true, order: true } } },
  });

  return NextResponse.json(application, { status: 201 });
}
