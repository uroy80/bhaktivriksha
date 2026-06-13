import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/guards";
import { csvResponse, formatDate, toDateKey } from "@/lib/utils";
import { devoteeWhere, parseDevoteeFilters } from "../query";

/** GET /api/admin/devotees/export — CSV download honoring the directory filters (admin only). */
export async function GET(req: Request) {
  const guard = await requireApiUser("ADMIN");
  if (guard.response) return guard.response;

  const url = new URL(req.url);
  const filters = parseDevoteeFilters(url.searchParams);

  const users = await prisma.user.findMany({
    where: devoteeWhere(filters),
    orderBy: [{ name: "asc" }],
    select: {
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      role: true,
      status: true,
      joinedAt: true,
      sadhanaLevel: { select: { name: true } },
      mentor: { select: { name: true } },
    },
  });

  const rows: (string | null)[][] = [
    ["Name", "Email", "Phone", "WhatsApp", "Role", "Status", "Level", "Mentor", "Joined"],
    ...users.map((u) => [
      u.name,
      u.email,
      u.phone,
      u.whatsapp,
      u.role,
      u.status,
      u.sadhanaLevel?.name ?? "",
      u.mentor?.name ?? "",
      u.joinedAt ? formatDate(u.joinedAt) : "",
    ]),
  ];

  return csvResponse(`devotees-${toDateKey()}.csv`, rows);
}
