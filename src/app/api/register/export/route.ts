import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/guards";
import { csvResponse } from "@/lib/utils";
import {
  buildRegisterData,
  resolveMonth,
  weekRangeLabel,
} from "@/app/missionary/register/_lib/data";

/**
 * CSV of the Bhakti Vriksha weekly register: TABLE 1 (attendance grid),
 * a blank line, then TABLE 2 (efforts). ?month=YYYY-MM defaults to the
 * current month. Admin may pass ?missionaryId= to export any missionary's register.
 */
export async function GET(req: Request) {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const params = new URL(req.url).searchParams;
  const { year, month, key } = resolveMonth(params.get("month"));

  let target = user;
  const missionaryId = params.get("missionaryId");
  if (missionaryId && missionaryId !== user.id) {
    if (user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only the admin may export another missionary's register." },
        { status: 403 },
      );
    }
    const found = await prisma.user.findUnique({ where: { id: missionaryId } });
    if (!found) {
      return NextResponse.json({ error: "Missionary not found" }, { status: 404 });
    }
    if (found.role !== "MISSIONARY") {
      return NextResponse.json(
        { error: "The selected user is not a missionary" },
        { status: 400 },
      );
    }
    target = found;
  }

  const data = await buildRegisterData(target, year, month);

  const rows: (string | number)[][] = [];

  // TABLE 1 — double header (Week N spanning A and S), then one row per devotee.
  rows.push([
    "Names",
    ...data.weeks.flatMap((w) => [`Week ${w.index} (${weekRangeLabel(w)})`, ""]),
    "Remarks",
  ]);
  rows.push(["", ...data.weeks.flatMap(() => ["A", "S"]), ""]);
  for (const r of data.rows) {
    rows.push([r.name, ...r.marks.flatMap((m) => [m, r.levelOrder]), r.remarks]);
  }

  rows.push([""]); // blank line between the two tables

  // TABLE 2 — EFFORTS.
  rows.push(["Efforts", ...data.weeks.map((w) => `Week ${w.index}`), "Total"]);
  for (const e of data.efforts) {
    rows.push([e.label, ...e.weekly, e.total]);
  }

  const slug = target.name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/(^-|-$)/g, "").toLowerCase();
  return csvResponse(`bhakti-vriksha-register-${slug || "missionary"}-${key}.csv`, rows);
}
