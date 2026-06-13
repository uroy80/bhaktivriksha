import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { claimSchema } from "@/lib/validators";
import { wouldCreateCycle } from "@/lib/hierarchy";

/**
 * A missionary (or admin) volunteers to take an UNASSIGNED devotee into their
 * group. Only works on devotees who currently have no mentor.
 */
export async function POST(req: Request) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const actor = guard.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing devotee" }, { status: 400 });
  }

  const devotee = await prisma.user.findUnique({ where: { id: parsed.data.devoteeId } });
  if (!devotee || devotee.role !== "DEVOTEE" || devotee.status !== "ACTIVE") {
    return NextResponse.json({ error: "Devotee not found" }, { status: 404 });
  }
  if (devotee.mentorId) {
    return NextResponse.json(
      { error: "This devotee is already in a group." },
      { status: 409 },
    );
  }
  if (await wouldCreateCycle(devotee.id, actor.id)) {
    return NextResponse.json({ error: "That assignment isn't allowed." }, { status: 409 });
  }

  await prisma.user.update({ where: { id: devotee.id }, data: { mentorId: actor.id } });
  return NextResponse.json({ ok: true });
}
