import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { ButtonLink, Card } from "@/components/ui";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "One-time setup" };

export default async function SetupPage() {
  await connection(); // always check the database at request time
  const adminExists = (await prisma.user.count({ where: { role: "ADMIN" } })) > 0;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-saffron-100 to-cream px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <span className="text-3xl">🪷</span>
        <span className="text-xl font-bold text-saffron-900">Sadhana Companion</span>
      </Link>

      <Card className="w-full max-w-md p-6 sm:p-8">
        {adminExists ? (
          <div className="text-center">
            <span className="text-3xl">🔒</span>
            <h1 className="mt-3 text-xl font-bold text-saffron-950">Admin already exists</h1>
            <p className="mt-2 text-sm text-saffron-900/70">
              This temple has already been set up. Please sign in with your account instead.
            </p>
            <div className="mt-6">
              <ButtonLink href="/login" className="w-full">
                Sign in
              </ButtonLink>
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-saffron-950">One-time temple setup</h1>
            <p className="mt-1 text-sm text-saffron-900/70">
              Create the administrator account. You will need the secret setup code configured on
              the server.
            </p>
            <div className="mt-6">
              <SetupForm />
            </div>
          </>
        )}
      </Card>

      <p className="mt-6 text-xs text-saffron-900/50">
        <Link href="/" className="hover:text-saffron-700">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
