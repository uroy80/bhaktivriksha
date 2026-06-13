import { redirect } from "next/navigation";
import { homeFor, requireUser } from "@/lib/guards";

/**
 * Tiny server-side redirector hit right after sign-in.
 * Keeps role/status routing logic on the server: pending users go to the
 * waiting screen, everyone else to their role's home.
 */
export async function GET() {
  const user = await requireUser(); // redirects to /login if not signed in
  if (user.status === "PENDING") redirect("/pending");
  redirect(homeFor(user.role));
}
