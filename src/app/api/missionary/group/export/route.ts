import { requireApiUser } from "@/lib/guards";
import { csvResponse, toDateKey } from "@/lib/utils";
import { getGroupRows } from "@/app/missionary/group/group-data";

/** GET /api/missionary/group/export — CSV download of the caller's direct mentees. */
export async function GET() {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const rows = await getGroupRows(user.id);

  const csvRows: (string | number | null)[][] = [
    ["Name", "Email", "Phone", "WhatsApp", "Role", "Level", "LastSadhana", "Attendance4w", "LastFollowUp"],
    ...rows.map((r) => [
      r.name,
      r.email,
      r.phone ?? "",
      r.whatsapp ?? "",
      r.role,
      r.levelName ?? "",
      r.lastSadhana ?? "",
      r.attendancePct === null ? "" : `${r.attendancePct}%`,
      r.lastFollowUp ? r.lastFollowUp.slice(0, 10) : "",
    ]),
  ];

  return csvResponse(`my-group-${toDateKey()}.csv`, csvRows);
}
