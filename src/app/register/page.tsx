import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import { homeFor } from "@/lib/guards";
import { getInviteHost } from "@/lib/invite";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { Icon, LotusMark } from "@/components/icons";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Create your account" };

const benefits = [
  { icon: "sadhana" as const, title: "Track your daily sadhana", text: "Japa rounds, quality of chanting, reading, aratis — see your streaks grow." },
  { icon: "levels" as const, title: "Walk the sadhana ladder", text: "Clear standards and practices for each of the five levels." },
  { icon: "heart" as const, title: "Be cared for", text: "A counsellor can take you into their group — or you can start on your own." },
];

export default async function RegisterPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const session = await auth();
  if (session?.user?.id) redirect(homeFor(session.user.role));

  const sp = await props.searchParams;
  const joinToken = typeof sp.join === "string" ? sp.join : undefined;
  const host = joinToken ? await getInviteHost(joinToken) : null;
  const missionaryName = host && host.status === "ACTIVE" ? host.name : undefined;

  const levels = await prisma.sadhanaLevel.findMany({
    orderBy: { order: "asc" },
    select: { id: true, order: true, name: true },
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-saffron-100 via-saffron-50 to-cream">
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 text-white shadow-md">
              <LotusMark className="h-6 w-6" />
            </span>
            <span className="text-xl font-bold text-saffron-900">Sadhana Companion</span>
          </Link>
          <h1 className="mt-5 text-2xl font-bold text-saffron-950 sm:text-3xl">
            Begin your sadhana today
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-saffron-900/70">
            Create a free account and start tracking your spiritual practice right away — no
            approval needed. A counsellor can welcome you into their group whenever you&apos;re ready.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-6 sm:p-8 lg:col-span-2">
            <RegisterForm joinToken={joinToken} missionaryName={missionaryName} />
          </Card>

          <div className="space-y-6">
            <Card>
              <h2 className="font-semibold text-saffron-950">Why join?</h2>
              <ul className="mt-4 space-y-4">
                {benefits.map((b) => {
                  const IconCmp = Icon[b.icon];
                  return (
                    <li key={b.title} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-saffron-700">
                        <IconCmp className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-saffron-950">{b.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-saffron-900/70">{b.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>

            {levels.length > 0 ? (
              <Card>
                <h2 className="font-semibold text-saffron-950">The path</h2>
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
      </div>
    </div>
  );
}
