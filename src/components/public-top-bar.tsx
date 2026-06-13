import Link from "next/link";
import { auth } from "@/auth";
import { homeFor } from "@/lib/guards";
import { ButtonLink } from "@/components/ui";
import { LotusLogo } from "@/components/lotus";

/** Top bar for public, standalone pages (levels, etc.). Session-aware CTAs. */
export async function PublicTopBar() {
  const session = await auth();
  const dashboardHref = session?.user?.id ? homeFor(session.user.role) : null;

  return (
    <header className="border-b border-saffron-900/10 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <LotusLogo className="h-9 w-9" />
          <span className="font-bold text-saffron-900">Sadhana Companion</span>
        </Link>
        <div className="flex items-center gap-2">
          {dashboardHref ? (
            <ButtonLink href={dashboardHref} variant="primary">
              My dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" className="hidden sm:inline-flex">
                Sign in
              </ButtonLink>
              <ButtonLink href="/register" variant="primary">
                Create account
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
