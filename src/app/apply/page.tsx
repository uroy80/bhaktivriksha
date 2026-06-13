import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = { title: "Apply to join" };

const steps = [
  {
    title: "We review your application",
    text: "A temple counsellor reads your application, usually within a few days.",
  },
  {
    title: "A counsellor is assigned to you",
    text: "On approval you join a Bhakti Vriksha group under a missionary/counsellor who will personally guide you.",
  },
  {
    title: "You begin at a sadhana level",
    text: "You start the ladder — usually at Sraddhavan — with clear standards, practices and books for each step.",
  },
];

export default async function ApplyPage() {
  await connection(); // fetch the ladder fresh at request time
  const levels = await prisma.sadhanaLevel.findMany({
    orderBy: { order: "asc" },
    select: { id: true, order: true, name: true },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-saffron-100 to-cream">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl">🪷</span>
            <span className="text-xl font-bold text-saffron-900">Sadhana Companion</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-saffron-950 sm:text-3xl">Apply to join</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-saffron-900/70">
            Take the first step on the path of bhakti. Tell us a little about yourself and a
            counsellor will welcome you.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Application form */}
          <Card className="p-6 sm:p-8 lg:col-span-2">
            <ApplyForm />
          </Card>

          {/* Sidebar: flow + the path */}
          <div className="space-y-6">
            <Card>
              <h2 className="font-semibold text-saffron-950">What happens after I apply?</h2>
              <ol className="mt-4 space-y-4">
                {steps.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-saffron-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-saffron-950">{step.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-saffron-900/70">{step.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-4 rounded-lg bg-saffron-50 px-3 py-2 text-xs leading-5 text-saffron-900/80">
                You can sign in any time after applying to check the status of your application.
              </p>
            </Card>

            {levels.length > 0 ? (
              <Card>
                <h2 className="font-semibold text-saffron-950">The path</h2>
                <p className="mt-1 text-xs text-saffron-900/60">
                  Five sadhana levels of steady progress.
                </p>
                <ul className="mt-3 space-y-2">
                  {levels.map((level) => (
                    <li key={level.id} className="flex items-center gap-2 text-sm text-saffron-950">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-[11px] font-bold text-saffron-800 ring-1 ring-saffron-300">
                        {level.order}
                      </span>
                      {level.name}
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-saffron-900/70">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-saffron-700 hover:text-saffron-800">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
