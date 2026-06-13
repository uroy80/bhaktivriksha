import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";

export default async function LevelsPage() {
  await requireRole("ADMIN");

  const levels = await prisma.sadhanaLevel.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { users: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Sadhana Levels"
        subtitle="The five steps of the Bhakti Vriksha sadhana ladder — tap a level for its standards and devotees."
      />

      {levels.length === 0 ? (
        <EmptyState
          title="No levels found"
          hint="Run the database seed to load the five sadhana levels."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {levels.map((level) => (
            <Link
              key={level.id}
              href={`/admin/levels/${level.slug}`}
              className="block rounded-xl focus-visible:outline-2 focus-visible:outline-saffron-600"
            >
              <Card className="h-full transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-saffron-400 to-saffron-600 text-base font-bold text-white shadow-sm">
                    {level.order}
                  </span>
                  <Badge tone={level._count.users > 0 ? "green" : "gray"}>
                    {level._count.users} {level._count.users === 1 ? "devotee" : "devotees"}
                  </Badge>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-saffron-950">{level.name}</h2>
                {level.summary ? (
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">{level.summary}</p>
                ) : null}
                <p className="mt-3 inline-flex items-center gap-0.5 text-sm font-medium text-saffron-700">
                  View standards &amp; devotees
                  <Icon.chevron className="h-4 w-4" />
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
