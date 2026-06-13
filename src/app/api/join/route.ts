import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/guards";
import { assignViaToken } from "@/lib/invite";
import { joinSchema } from "@/lib/validators";

const REASONS: Record<string, string> = {
  INVALID: "This invite link is not valid.",
  SELF: "You cannot join your own group.",
  ALREADY_IN_GROUP: "You are already in a group. Ask your counsellor if you need to move.",
  NOT_A_DEVOTEE: "Only devotees can join a group via an invite link.",
  CYCLE: "That assignment isn't allowed.",
};

/** A signed-in devotee accepts a missionary's invite (QR scan / link). */
export async function POST(req: Request) {
  const guard = await requireApiUser(); // any authenticated user
  if (guard.response) return guard.response;
  const user = guard.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing invite token" }, { status: 400 });
  }

  const result = await assignViaToken(user, parsed.data.token);
  if (!result.ok) {
    const status = result.reason === "INVALID" ? 404 : 409;
    return NextResponse.json({ error: REASONS[result.reason] }, { status });
  }
  return NextResponse.json({ ok: true, missionaryName: result.missionaryName });
}
