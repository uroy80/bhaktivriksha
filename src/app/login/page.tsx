import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LotusLogo } from "@/components/lotus";
import { KrishnaImage } from "@/components/devotional";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  // Already signed in? Route to the right home via the server-side redirector.
  const session = await auth();
  if (session?.user?.id) redirect("/post-login");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-saffron-100 via-saffron-50 to-cream px-4 py-10">
      {/* Lord Krishna — backdrop */}
      <KrishnaImage className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[90vh] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-40 blur-[1px]" />
      {/* gentle wash to keep the form legible over the artwork */}
      <div
        aria-hidden
        className="absolute inset-0 z-0 bg-gradient-to-b from-cream/50 via-transparent to-cream/70"
      />

      <div className="relative z-10 flex w-full flex-col items-center">
        <Link href="/" className="mb-5 flex items-center gap-2 drop-shadow-sm">
          <LotusLogo className="h-12 w-12" />
          <span className="text-xl font-bold text-saffron-900">Sadhana Companion</span>
        </Link>

        {/* Transparent / frosted-glass form */}
        <div className="w-full max-w-md rounded-2xl border border-white/50 bg-white/25 p-6 shadow-xl ring-1 ring-saffron-900/5 backdrop-blur-md sm:p-8">
          <h1 className="text-xl font-bold text-saffron-950 drop-shadow-sm">
            Hare Krishna, welcome back
          </h1>
          <p className="mt-1 text-sm font-medium text-saffron-900/80">
            Sign in to continue your sadhana.
          </p>
          <div className="mt-6">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>

        <p className="mt-6 text-sm font-medium text-saffron-900/80 drop-shadow-sm">
          New devotee?{" "}
          <Link href="/register" className="font-semibold text-saffron-700 hover:text-saffron-800">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-xs text-saffron-900/60 drop-shadow-sm">
          <Link href="/" className="hover:text-saffron-700">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
