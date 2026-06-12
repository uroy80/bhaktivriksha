import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Role, User } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Page guard: returns the fresh DB user or redirects to /login.
 * Status is always re-checked against the DB (not the JWT), so deactivating
 * a user locks them out immediately.
 */
export async function requireUser(): Promise<User> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status === "INACTIVE") redirect("/login");
  return user;
}

/** Page guard: requireUser + role check. Wrong role redirects to that role's home. */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  // Pending users only ever see the pending screen
  if (user.status === "PENDING" && user.role === "DEVOTEE") redirect("/pending");
  return user;
}

export function homeFor(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "MISSIONARY":
      return "/missionary";
    default:
      return "/devotee";
  }
}

/** API guard: returns { user } or { response } with the right status code. */
export async function requireApiUser(
  ...roles: Role[]
): Promise<{ user: User; response?: never } | { user?: never; response: NextResponse }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.status === "INACTIVE") {
    return { response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (roles.length > 0 && !roles.includes(user.role)) {
    return { response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}
