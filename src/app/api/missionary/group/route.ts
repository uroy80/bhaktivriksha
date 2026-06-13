import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/guards";
import { getGroupRows } from "@/app/missionary/group/group-data";

/** GET /api/missionary/group — the caller's direct mentees with care metrics. */
export async function GET() {
  const guard = await requireApiUser("MISSIONARY", "ADMIN");
  if (guard.response) return guard.response;
  const user = guard.user;

  const mentees = await getGroupRows(user.id);
  return NextResponse.json({ mentees });
}
