import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validators";
import { assignViaToken } from "@/lib/invite";

/**
 * Open self-registration. Creates an ACTIVE, unassigned DEVOTEE who can use the
 * sadhana app immediately. They appear as "Unassigned" for any missionary/admin
 * to take into their group. If a join token is supplied (from a missionary's QR
 * link) the new devotee is placed under that missionary right away.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { name, email, password, phone, whatsapp, joinToken } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let assignedTo: string | null = null;
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        phone: phone || null,
        whatsapp: whatsapp || null,
        role: "DEVOTEE",
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });

    // Best-effort assignment from a QR/invite token — never blocks registration.
    if (joinToken) {
      const result = await assignViaToken(user, joinToken);
      if (result.ok) assignedTo = result.missionaryName;
    }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true, assignedTo }, { status: 201 });
}
