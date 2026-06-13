import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Card } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  // Already signed in? Route to the right home via the server-side redirector.
  const session = await auth();
  if (session?.user?.id) redirect("/post-login");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-saffron-100 to-cream px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <span className="text-3xl">🪷</span>
        <span className="text-xl font-bold text-saffron-900">Sadhana Companion</span>
      </Link>

      <Card className="w-full max-w-md p-6 sm:p-8">
        <h1 className="text-xl font-bold text-saffron-950">Hare Krishna, welcome back</h1>
        <p className="mt-1 text-sm text-saffron-900/70">Sign in to continue your sadhana.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </Card>

      <p className="mt-6 text-sm text-saffron-900/70">
        New devotee?{" "}
        <Link href="/apply" className="font-semibold text-saffron-700 hover:text-saffron-800">
          Apply to join
        </Link>
      </p>
      <p className="mt-2 text-xs text-saffron-900/50">
        <Link href="/" className="hover:text-saffron-700">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
