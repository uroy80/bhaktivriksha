import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { homeFor } from "@/lib/guards";
import { ButtonLink, Card } from "@/components/ui";

// Public landing page — the front door of Sadhana Companion.
// No auth required; signed-in users get a shortcut to their dashboard.

const ladderTones = [
  "bg-saffron-400",
  "bg-saffron-500",
  "bg-saffron-600",
  "bg-saffron-700",
  "bg-saffron-800",
];

const features = [
  {
    icon: "📿",
    title: "Sadhana journal",
    text: "Japa rounds, reading, mangal arati — a daily record of your practice with streaks and weekly stats.",
  },
  {
    icon: "✅",
    title: "Weekly attendance",
    text: "The Bhakti Vriksha weekly register, digital: attendance and siksha level for every satsanga.",
  },
  {
    icon: "📞",
    title: "Loving follow-ups",
    text: "Every call, WhatsApp and home visit logged, so no devotee is ever forgotten.",
  },
  {
    icon: "📊",
    title: "Progress reports",
    text: "Daily and weekly EFFORTS reports flow up the missionary tree, from group to temple.",
  },
];

export default async function LandingPage() {
  const [session, levels] = await Promise.all([
    auth(),
    prisma.sadhanaLevel.findMany({ orderBy: { order: "asc" } }),
  ]);

  const dashboardHref = session?.user?.id ? homeFor(session.user.role) : null;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="border-b border-saffron-900/10 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🪷</span>
            <span className="font-bold text-saffron-900">Sadhana Companion</span>
          </Link>
          <div className="flex items-center gap-2">
            {dashboardHref ? (
              <ButtonLink href={dashboardHref} variant="primary">
                Go to my dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" className="hidden sm:inline-flex">
                  Sign in
                </ButtonLink>
                <ButtonLink href="/apply" variant="primary">
                  Apply to join
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-saffron-200 via-saffron-100 to-cream">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-10 -top-10 select-none text-[14rem] opacity-10 sm:text-[20rem]"
          >
            🪷
          </span>
          <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
            <p className="text-sm font-semibold uppercase tracking-widest text-saffron-800">
              ISKCON · Bhakti Vriksha Program
            </p>
            <h1 className="mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-saffron-950 sm:text-5xl">
              Walk the path of bhakti,
              <span className="block text-saffron-700">one step at a time.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-saffron-900/80">
              Sadhana Companion helps devotees grow through the five sadhana levels — and helps
              counsellors care for every soul in their group with attendance, follow-ups and
              progress reports.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {dashboardHref ? (
                <ButtonLink href={dashboardHref} className="px-6 py-3 text-base">
                  Go to my dashboard
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/apply" className="px-6 py-3 text-base">
                    Apply to join
                  </ButtonLink>
                  <ButtonLink href="/login" variant="secondary" className="px-6 py-3 text-base">
                    Sign in
                  </ButtonLink>
                </>
              )}
            </div>
          </div>
        </section>

        {/* The five-level ladder */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-saffron-950 sm:text-3xl">
              The sadhana ladder
            </h2>
            <p className="mt-2 text-saffron-900/70">
              Five levels of steady spiritual progress, from first faith to full shelter. Each
              level has clear standards, recommended practices and books.
            </p>
          </div>

          {levels.length === 0 ? (
            <Card className="mt-8 text-sm text-saffron-900/70">
              The sadhana levels will appear here once the temple database is seeded.
            </Card>
          ) : (
            <ol className="relative mt-10 space-y-8">
              {/* connector line */}
              <span
                aria-hidden
                className="absolute bottom-5 left-5 top-5 w-px -translate-x-1/2 bg-saffron-300"
              />
              {levels.map((level, i) => (
                <li key={level.id} className="relative flex items-start gap-4 sm:gap-6">
                  <span
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-md ring-4 ring-cream ${
                      ladderTones[i % ladderTones.length]
                    }`}
                  >
                    {level.order}
                  </span>
                  <Card className="flex-1">
                    <h3 className="font-semibold text-saffron-950">{level.name}</h3>
                    {level.summary ? (
                      <p className="mt-1 text-sm leading-6 text-saffron-900/70">{level.summary}</p>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* What's inside */}
        <section className="border-y border-saffron-900/10 bg-saffron-50/60">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
            <h2 className="text-2xl font-bold text-saffron-950 sm:text-3xl">
              Care for every devotee
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <Card key={f.title}>
                  <span className="text-2xl">{f.icon}</span>
                  <h3 className="mt-2 font-semibold text-saffron-950">{f.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-saffron-900/70">{f.text}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="mx-auto max-w-6xl px-4 py-14 text-center sm:py-20">
          <span className="text-4xl">🪷</span>
          <h2 className="mt-3 text-2xl font-bold text-saffron-950 sm:text-3xl">
            Ready to begin your journey?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-saffron-900/70">
            Apply today — a counsellor will welcome you and walk with you from the very first
            level.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {dashboardHref ? (
              <ButtonLink href={dashboardHref} className="px-6 py-3 text-base">
                Go to my dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/apply" className="px-6 py-3 text-base">
                  Apply to join
                </ButtonLink>
                <ButtonLink href="/login" variant="secondary" className="px-6 py-3 text-base">
                  Sign in
                </ButtonLink>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-saffron-900/10 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-sm text-saffron-900/60">
          <p>Hare Krishna 🙏 · Sadhana Companion</p>
          <p>ISKCON Bhakti Vriksha program</p>
        </div>
      </footer>
    </div>
  );
}
