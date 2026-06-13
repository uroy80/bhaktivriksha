import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { LevelApplyForm, type ApplyLevelOption } from "./level-apply-form";

function extractStandards(sections: unknown): string[] {
  if (!Array.isArray(sections)) return [];
  const section = (sections as { title?: unknown; items?: unknown }[]).find(
    (s) => s && typeof s === "object" && s.title === "Standards",
  );
  if (!section || !Array.isArray(section.items)) return [];
  return section.items.filter((item): item is string => typeof item === "string");
}

function statusTone(status: ApplicationStatus): "saffron" | "green" | "red" {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED") return "red";
  return "saffron";
}

export default async function DevoteeApplyPage() {
  const user = await requireRole("DEVOTEE", "MISSIONARY", "ADMIN");

  const [levels, applications] = await Promise.all([
    prisma.sadhanaLevel.findMany({ orderBy: { order: "asc" } }),
    prisma.application.findMany({
      where: { applicantId: user.id },
      include: {
        level: { select: { name: true, order: true } },
        reviewedBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const currentLevel = user.sadhanaLevelId
    ? (levels.find((l) => l.id === user.sadhanaLevelId) ?? null)
    : null;
  const hasPending = applications.some((a) => a.status === "PENDING");

  const formLevels: ApplyLevelOption[] = levels.map((l) => ({
    id: l.id,
    name: l.name,
    order: l.order,
    summary: l.summary,
    sourceUrl: l.sourceUrl,
    standards: extractStandards(l.sections),
  }));

  return (
    <div>
      <PageHeader
        title="Apply for Advancement"
        subtitle="Request a change of sadhana level when you are living its standards."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* How advancement works */}
        <Card>
          <h2 className="flex items-center gap-2 font-semibold text-saffron-950">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700">
              <Icon.apply className="h-5 w-5" />
            </span>
            How advancement works
          </h2>
          <p className="mt-2 text-sm text-saffron-900/80">
            Each sadhana level comes with standards of practice. Advancement is not a formality —
            the standards must already be a living part of your daily sadhana before you apply.
            Your application is reviewed by the temple, and on approval your level is updated and
            recorded in your level history.
          </p>

          <div className="mt-4 rounded-lg bg-saffron-50 px-3 py-2 text-sm ring-1 ring-saffron-200">
            <span className="text-saffron-900/70">Your current level: </span>
            {currentLevel ? (
              <Badge tone="saffron">
                Level {currentLevel.order} — {currentLevel.name}
              </Badge>
            ) : (
              <span className="font-medium text-saffron-950">Not assigned yet</span>
            )}
          </div>

          <h3 className="mt-5 text-sm font-semibold text-saffron-950">The five levels</h3>
          <ol className="mt-2 space-y-2">
            {levels.map((l) => (
              <li key={l.id} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-xs font-bold text-saffron-800">
                  {l.order}
                </span>
                <span className="min-w-0">
                  {l.sourceUrl ? (
                    <a
                      href={l.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-0.5 font-medium text-saffron-800 underline hover:text-saffron-900"
                    >
                      {l.name}
                      <Icon.chevron className="h-3.5 w-3.5 -rotate-45 no-underline" />
                    </a>
                  ) : (
                    <span className="font-medium text-saffron-950">{l.name}</span>
                  )}
                  {l.id === currentLevel?.id ? (
                    <Badge tone="green" className="ml-2">
                      Current
                    </Badge>
                  ) : null}
                  {l.summary ? (
                    <span className="mt-0.5 block text-xs text-stone-500">{l.summary}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        {/* Apply form */}
        <Card>
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-saffron-950">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700">
              <Icon.levels className="h-5 w-5" />
            </span>
            Apply for a different level
          </h2>
          <LevelApplyForm
            levels={formLevels}
            currentLevelId={user.sadhanaLevelId}
            hasPending={hasPending}
          />
        </Card>
      </div>

      {/* History */}
      <h2 className="mt-8 mb-3 flex items-center gap-2 text-lg font-semibold text-saffron-950">
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-saffron-100 text-saffron-700">
          <Icon.applications className="h-4 w-4" />
        </span>
        My applications
      </h2>
      {applications.length === 0 ? (
        <EmptyState
          title="No applications yet"
          hint="When you apply for a level, it will appear here with its review status."
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {app.type === "JOIN" ? (
                    <Badge tone="blue">Joining application</Badge>
                  ) : (
                    <Badge tone="saffron">
                      Level change
                      {app.level ? (
                        <>
                          <Icon.chevron className="mx-0.5 h-3 w-3" />
                          {app.level.name}
                        </>
                      ) : null}
                    </Badge>
                  )}
                  <Badge tone={statusTone(app.status)}>{app.status}</Badge>
                </div>
                <p className="shrink-0 text-xs text-stone-500">
                  Applied {formatDateTime(app.createdAt)}
                </p>
              </div>

              {app.message ? (
                <p className="mt-2 text-sm text-saffron-900/80">{app.message}</p>
              ) : null}

              {app.status !== "PENDING" ? (
                <div className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600 ring-1 ring-stone-200">
                  <p>
                    {app.status === "APPROVED" ? "Approved" : "Rejected"}
                    {app.reviewedBy ? ` by ${app.reviewedBy.name}` : ""}
                    {app.reviewedAt ? ` on ${formatDate(app.reviewedAt)}` : ""}.
                  </p>
                  {app.reviewNote ? <p className="mt-1 italic">“{app.reviewNote}”</p> : null}
                </div>
              ) : (
                <p className="mt-3 text-xs text-stone-500">Awaiting review by the temple.</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
