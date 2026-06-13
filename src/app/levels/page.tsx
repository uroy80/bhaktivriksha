import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { PublicTopBar } from "@/components/public-top-bar";
import { parseSections, groupSections } from "@/lib/levels";

export const metadata: Metadata = {
  title: "The Sadhana Ladder",
  description:
    "The five sadhana levels of the Bhakti Vriksha program — standards, recommended practices and books for each step.",
};

const ladderTones = [
  "bg-saffron-400",
  "bg-saffron-500",
  "bg-saffron-600",
  "bg-saffron-700",
  "bg-saffron-800",
];

export default async function LevelsPage() {
  const levels = await prisma.sadhanaLevel.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="min-h-screen bg-gradient-to-b from-saffron-100 via-saffron-50 to-cream">
      <PublicTopBar />

      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-saffron-950 sm:text-4xl">The Sadhana Ladder</h1>
          <p className="mt-3 text-saffron-900/75">
            Five levels of steady spiritual progress, from first faith to full shelter. Tap any
            level to see its <span className="font-semibold">standards</span> (the do&apos;s to live
            by) and its <span className="font-semibold">recommended</span> songs, practices and
            books.
          </p>
        </div>

        {levels.length === 0 ? (
          <Card className="mt-8 text-sm text-saffron-900/70">
            The sadhana levels will appear here once the temple database is seeded.
          </Card>
        ) : (
          <ol className="relative mt-10 space-y-6">
            <span
              aria-hidden
              className="absolute bottom-6 left-5 top-6 w-px -translate-x-1/2 bg-saffron-300"
            />
            {levels.map((level, i) => {
              const { standards, recommended } = groupSections(parseSections(level.sections));
              const recommendedCount = recommended.reduce((n, s) => n + s.items.length, 0);
              return (
                <li key={level.id} className="relative flex items-start gap-4 sm:gap-6">
                  <span
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-md ring-4 ring-cream ${
                      ladderTones[i % ladderTones.length]
                    }`}
                  >
                    {level.order}
                  </span>
                  <Link href={`/levels/${level.slug}`} className="group flex-1">
                    <Card className="transition-shadow group-hover:shadow-md group-hover:ring-saffron-300">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h2 className="font-semibold text-saffron-950">{level.name}</h2>
                          {level.summary ? (
                            <p className="mt-1 text-sm leading-6 text-saffron-900/70">
                              {level.summary}
                            </p>
                          ) : null}
                          <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-saffron-700">
                            View standards &amp; practices
                            <Icon.chevron className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                          </p>
                        </div>
                        <Icon.levels className="hidden h-6 w-6 shrink-0 text-saffron-300 sm:block" />
                      </div>
                      {standards || recommendedCount > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          {standards ? (
                            <span className="rounded-full bg-saffron-100 px-2.5 py-1 font-medium text-saffron-800">
                              {standards.items.length} standards
                            </span>
                          ) : null}
                          {recommendedCount > 0 ? (
                            <span className="rounded-full bg-saffron-100 px-2.5 py-1 font-medium text-saffron-800">
                              {recommendedCount} recommended
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
