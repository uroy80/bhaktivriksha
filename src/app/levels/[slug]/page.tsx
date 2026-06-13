import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ButtonLink, Card } from "@/components/ui";
import { Icon } from "@/components/icons";
import { PublicTopBar } from "@/components/public-top-bar";
import { LevelSections } from "@/components/level-sections";
import { parseSections } from "@/lib/levels";
import { auth } from "@/auth";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const level = await prisma.sadhanaLevel.findUnique({ where: { slug } });
  if (!level) return { title: "Level" };
  return {
    title: level.name,
    description: level.summary ?? `Standards and recommended practices for ${level.name}.`,
  };
}

export default async function PublicLevelPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  const [level, allLevels, session] = await Promise.all([
    prisma.sadhanaLevel.findUnique({ where: { slug } }),
    prisma.sadhanaLevel.findMany({ orderBy: { order: "asc" }, select: { slug: true, name: true, order: true } }),
    auth(),
  ]);
  if (!level) notFound();

  const sections = parseSections(level.sections);
  const idx = allLevels.findIndex((l) => l.slug === slug);
  const prev = idx > 0 ? allLevels[idx - 1] : null;
  const next = idx >= 0 && idx < allLevels.length - 1 ? allLevels[idx + 1] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-saffron-100 via-saffron-50 to-cream">
      <PublicTopBar />

      <main className="mx-auto max-w-3xl px-4 py-10">
        <Link
          href="/levels"
          className="inline-flex items-center gap-1 text-sm font-medium text-saffron-700 hover:text-saffron-800"
        >
          <Icon.chevron className="h-4 w-4 rotate-180" />
          All levels
        </Link>

        {/* Hero */}
        <div className="mt-4 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 text-lg font-bold text-white shadow-md">
            {level.order}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-saffron-700">
              Level {level.order} of {allLevels.length}
            </p>
            <h1 className="text-2xl font-bold text-saffron-950 sm:text-3xl">{level.name}</h1>
            {level.summary ? (
              <p className="mt-2 text-sm leading-6 text-saffron-900/75">{level.summary}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-8">
          <LevelSections sections={sections} />
        </div>

        {level.sourceUrl ? (
          <p className="mt-6 text-xs text-stone-500">
            Source:{" "}
            <a
              href={level.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-saffron-700 underline hover:text-saffron-800"
            >
              bhaktisteps.com
            </a>
          </p>
        ) : null}

        {/* Prev / next */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link href={`/levels/${prev.slug}`} className="group">
              <Card className="flex items-center gap-3 transition-shadow group-hover:shadow-md">
                <Icon.chevron className="h-5 w-5 shrink-0 rotate-180 text-saffron-500" />
                <div>
                  <p className="text-xs text-saffron-900/60">Previous</p>
                  <p className="text-sm font-semibold text-saffron-950">{prev.name}</p>
                </div>
              </Card>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/levels/${next.slug}`} className="group">
              <Card className="flex items-center justify-end gap-3 text-right transition-shadow group-hover:shadow-md">
                <div>
                  <p className="text-xs text-saffron-900/60">Next</p>
                  <p className="text-sm font-semibold text-saffron-950">{next.name}</p>
                </div>
                <Icon.chevron className="h-5 w-5 shrink-0 text-saffron-500" />
              </Card>
            </Link>
          ) : (
            <span />
          )}
        </div>

        {/* CTA */}
        {!session?.user?.id ? (
          <Card className="mt-8 bg-saffron-50/70 text-center">
            <h2 className="font-semibold text-saffron-950">Ready to walk this path?</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-saffron-900/70">
              Create a free account to track your sadhana — a counsellor can guide you through each
              level.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <ButtonLink href="/register">Begin my sadhana</ButtonLink>
              <ButtonLink href="/login" variant="secondary">
                Sign in
              </ButtonLink>
            </div>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
