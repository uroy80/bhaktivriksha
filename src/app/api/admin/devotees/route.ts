import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/guards";
import { devoteeWhere, parseDevoteeFilters } from "./query";

/** GET /api/admin/devotees — filtered devotee directory (admin only). */
export async function GET(req: Request) {
  const guard = await requireApiUser("ADMIN");
  if (guard.response) return guard.response;

  const url = new URL(req.url);
  const filters = parseDevoteeFilters(url.searchParams);

  const users = await prisma.user.findMany({
    where: devoteeWhere(filters),
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      role: true,
      status: true,
      joinedAt: true,
      levelTaggedAt: true,
      createdAt: true,
      sadhanaLevel: { select: { id: true, name: true, order: true } },
      mentor: { select: { id: true, name: true, role: true } },
    },
  });

  return NextResponse.json({ users });
}
