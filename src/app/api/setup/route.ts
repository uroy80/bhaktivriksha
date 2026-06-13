import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { adminSetupSchema } from "@/lib/validators";

/**
 * One-time admin bootstrap. Public by design, but protected by:
 *  - the ADMIN_SETUP_CODE environment secret, and
 *  - a hard refusal once any admin exists.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = adminSetupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const expectedCode = process.env.ADMIN_SETUP_CODE;
  if (!expectedCode) {
    return NextResponse.json({ error: "Setup code not configured" }, { status: 500 });
  }
  if (parsed.data.setupCode !== expectedCode) {
    return NextResponse.json({ error: "Invalid setup code" }, { status: 401 });
  }

  const adminExists = (await prisma.user.count({ where: { role: "ADMIN" } })) > 0;
  if (adminExists) {
    return NextResponse.json(
      { error: "An admin already exists — please sign in instead" },
      { status: 409 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: "ADMIN",
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
