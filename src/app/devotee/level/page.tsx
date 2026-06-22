import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { cn, formatDate } from "@/lib/utils";
import { Badge, ButtonLink, Card, PageHeader } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { LotusFeet } from "@/components/devotional";

type LevelSection = { title: string; items: string[] };

function parseSections(raw: unknown): LevelSection[] {
  if (!Array.isArray(raw)) return [];
  const out: LevelSection[] = [];
  for (const s of raw) {
    if (s && typeof s === "object") {
      const rec = s as Record<string, unknown>;
      if (
        typeof rec.title === "string" &&
        Array.isArray(rec.items) &&
        rec.items.every((i) => typeof i === "string")
      ) {
        out.push({ title: rec.title, items: rec.items as string[] });
      }
    }
  }
  return out;
}

/** "Application Form (PDF): https://…" → { label, url }. */
function splitLink(item: string): { label: string; url: string | null } {
  const m = item.match(/^(.*?):\s*(https?:\/\/\S+)$/);
  return m ? { label: m[1], url: m[2] } : { label: item, url: null };
}

const GROUP_ICONS: Record<string, IconName> = {
  Songs: "lecture",
  Practices: "japa",
  Books: "reading",
  "Additional Books": "reading",
};

export default async function MyLevelPage() {
  const user = await requireRole("DEVOTEE", "MISSIONARY", "ADMIN");

  const [level, allLevels, history, mentor] = await Promise.all([
    user.sadhanaLevelId
      ? prisma.sadhanaLevel.findUnique({ where: { id: user.sadhanaLevelId } })
      : Promise.resolve(null),
    prisma.sadhanaLevel.findMany({ orderBy: { order: "asc" } }),
    prisma.levelHistory.findMany({
      where: { userId: user.id },
      include: { level: { select: { name: true, order: true } }, assignedBy: { select: { name: true } } },
      orderBy: { assignedAt: "desc" },
    }),
    user.mentorId
      ? prisma.user.findUnique({ where: { id: user.mentorId }, select: { name: true } })
      : Promise.resolve(null),
  ]);

  const latestTag = history[0] ?? null;
  const sections = level ? parseSections(level.sections) : [];
  const standards = sections.find((s) => s.title === "Standards");
  const recommended = sections.filter((s) => s.title.startsWith("Recommended - "));
  const linkSections = sections.filter(
    (s) => s.title === "Application" || s.title === "Certificates",
  );

  return (
    <div>
      <PageHeader
        title="My Level"
        subtitle="Your place on the sadhana path, and what it calls you to"
      />

      {level ? (
        <>
          {/* Hero */}
          <Card className="bg-gradient-to-br from-saffron-50 to-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <LotusFeet className="h-14 w-14 shrink-0 drop-shadow-sm" />
                <div>
                  <Badge>Level {level.order} of 5</Badge>
                  <h2 className="mt-2 text-3xl font-bold text-saffron-950">{level.name}</h2>
                  {level.summary ? (
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-saffron-900/80">
                      {level.summary}
                    </p>
                  ) : null}
                  {latestTag ? (
                    <p className="mt-3 text-xs text-saffron-900/60">
                      Tagged on {formatDate(latestTag.assignedAt)}
                      {latestTag.assignedBy ? ` by ${latestTag.assignedBy.name}` : ""}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-3.5 w-3.5 rounded-full",
                      i <= level.order ? "bg-saffron-600" : "bg-saffron-200",
                    )}
                  />
                ))}
              </div>
            </div>
          </Card>

          {/* Standards */}
          {standards && standards.items.length > 0 ? (
            <section className="mt-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-saffron-950">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700">
                  <Icon.star className="h-4 w-4" />
                </span>
                Standards
              </h3>
              <Card>
                <ol className="space-y-3">
                  {standards.items.map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-sm font-bold text-saffron-800">
                        {i + 1}
                      </span>
                      <p className="pt-0.5 text-sm leading-relaxed text-saffron-950">{item}</p>
                    </li>
                  ))}
                </ol>
              </Card>
            </section>
          ) : null}

          {/* Recommended groups */}
          {recommended.length > 0 ? (
            <section className="mt-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-saffron-950">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700">
                  <Icon.lotus className="h-4 w-4" />
                </span>
                Recommended
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {recommended.map((group) => {
                  const name = group.title.replace("Recommended - ", "");
                  const GroupIcon = Icon[GROUP_ICONS[name] ?? "lotus"];
                  return (
                    <Card key={group.title}>
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-saffron-900">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700">
                          <GroupIcon className="h-4 w-4" />
                        </span>
                        {name}
                      </p>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {group.items.map((item, i) => (
                          <div
                            key={i}
                            className="rounded-lg bg-saffron-50 px-3 py-2 text-sm text-saffron-950 ring-1 ring-saffron-900/10"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ) : null}

          {/* Application / Certificates links */}
          {linkSections.length > 0 ? (
            <section className="mt-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-saffron-950">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700">
                  <Icon.applications className="h-4 w-4" />
                </span>
                Forms &amp; certificates
              </h3>
              <Card>
                <div className="flex flex-wrap gap-3">
                  {linkSections.flatMap((s) =>
                    s.items.map((item, i) => {
                      const { label, url } = splitLink(item);
                      const LinkIcon = s.title === "Certificates" ? Icon.star : Icon.apply;
                      return url ? (
                        <a
                          key={`${s.title}-${i}`}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-saffron-800 ring-1 ring-saffron-300 transition-colors hover:bg-saffron-50"
                        >
                          <LinkIcon className="h-4 w-4" /> {label}
                          <Icon.chevron className="h-4 w-4 -rotate-45" />
                        </a>
                      ) : (
                        <span key={`${s.title}-${i}`} className="text-sm text-saffron-950">
                          {item}
                        </span>
                      );
                    }),
                  )}
                </div>
              </Card>
            </section>
          ) : null}
        </>
      ) : (
        /* No level yet */
        <Card className="bg-gradient-to-br from-saffron-50 to-white p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 text-white shadow-sm">
            <Icon.lotus className="h-8 w-8" />
          </span>
          <h2 className="mt-3 text-xl font-bold text-saffron-950">
            Your journey is just beginning
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-saffron-900/70">
            You haven&apos;t been tagged with a sadhana level yet.{" "}
            {mentor
              ? `Speak with your counsellor, ${mentor.name} — they will walk the first steps with you.`
              : "Your counsellor will guide you once you are connected."}{" "}
            Meanwhile, explore the five levels of the path below.
          </p>
          <div className="mt-4">
            <ButtonLink href="/devotee/sadhana" variant="secondary">
              <Icon.japa className="h-4 w-4" />
              Start your sadhana journal
            </ButtonLink>
          </div>
        </Card>
      )}

      {/* The full path */}
      <section className="mt-8">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-saffron-950">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700">
            <Icon.levels className="h-4 w-4" />
          </span>
          The full path
        </h3>
        <div className="space-y-0">
          {allLevels.map((l, idx) => {
            const mine = level?.id === l.id;
            const completed = level ? l.order < level.order : false;
            return (
              <div key={l.id} className="flex gap-4">
                {/* Rail */}
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-2",
                      mine
                        ? "bg-saffron-600 text-white ring-saffron-600"
                        : completed
                          ? "bg-green-100 text-green-700 ring-green-500/50"
                          : "bg-white text-saffron-400 ring-saffron-200",
                    )}
                  >
                    {completed ? <Icon.check className="h-5 w-5" /> : l.order}
                  </span>
                  {idx < allLevels.length - 1 ? (
                    <span
                      className={cn(
                        "w-0.5 flex-1",
                        completed ? "bg-green-300" : "bg-saffron-200",
                      )}
                    />
                  ) : null}
                </div>
                {/* Body */}
                <div className={cn("min-w-0 flex-1", idx < allLevels.length - 1 && "pb-6")}>
                  <div
                    className={cn(
                      "rounded-xl p-4 ring-1",
                      mine
                        ? "bg-saffron-50 ring-saffron-600/40 shadow-sm"
                        : "bg-white ring-saffron-900/10",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-saffron-950">{l.name}</p>
                      {mine ? <Badge>You are here</Badge> : null}
                      {completed ? <Badge tone="green">Completed</Badge> : null}
                    </div>
                    {l.summary ? (
                      <p className="mt-1 text-xs leading-relaxed text-saffron-900/60">
                        {l.summary}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Level history timeline */}
      {history.length > 0 ? (
        <section className="mt-8">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-saffron-950">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700">
              <Icon.clock className="h-4 w-4" />
            </span>
            My level history
          </h3>
          <Card>
            <ul className="space-y-4">
              {history.map((h, idx) => (
                <li key={h.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
                        idx === 0 ? "bg-saffron-600" : "bg-saffron-300",
                      )}
                    />
                    {idx < history.length - 1 ? (
                      <span className="w-px flex-1 bg-saffron-200" />
                    ) : null}
                  </div>
                  <div className={cn(idx < history.length - 1 && "pb-1")}>
                    <p className="text-sm font-medium text-saffron-950">
                      Tagged <span className="font-semibold">{h.level.name}</span>
                      {h.assignedBy ? (
                        <span className="text-saffron-900/60"> by {h.assignedBy.name}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-saffron-900/50">{formatDate(h.assignedAt)}</p>
                    {h.note ? (
                      <p className="mt-1 text-xs italic text-stone-500">&ldquo;{h.note}&rdquo;</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
