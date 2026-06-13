import Link from "next/link";
import { notFound } from "next/navigation";
import type { UserStatus } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { Badge, ButtonLink, Card, PageHeader, Table, Td, Th } from "@/components/ui";

type Section = { title: string; items: string[] };

const statusTone: Record<UserStatus, "green" | "saffron" | "gray"> = {
  ACTIVE: "green",
  PENDING: "saffron",
  INACTIVE: "gray",
};

export default async function LevelDetailPage(props: { params: Promise<{ slug: string }> }) {
  await requireRole("ADMIN");
  const { slug } = await props.params;

  const level = await prisma.sadhanaLevel.findUnique({ where: { slug } });
  if (!level) notFound();

  const devotees = await prisma.user.findMany({
    where: { sadhanaLevelId: level.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      status: true,
      levelTaggedAt: true,
      mentor: { select: { name: true } },
    },
  });

  const sections: Section[] = Array.isArray(level.sections)
    ? (level.sections as unknown[]).filter(
        (s): s is Section =>
          typeof s === "object" &&
          s !== null &&
          typeof (s as Section).title === "string" &&
          Array.isArray((s as Section).items),
      )
    : [];

  const standards = sections.find((s) => s.title === "Standards");
  const recommended = sections.filter((s) => s.title.startsWith("Recommended"));
  const linkSections = sections.filter((s) => s.title === "Application" || s.title === "Certificates");
  const known = new Set([standards, ...recommended, ...linkSections].filter(Boolean));
  const other = sections.filter((s) => !known.has(s));

  return (
    <div>
      <PageHeader
        title={`Level ${level.order}: ${level.name}`}
        subtitle={level.summary ?? undefined}
        actions={
          <ButtonLink href="/admin/levels" variant="secondary">
            ← All levels
          </ButtonLink>
        }
      />

      <div className="space-y-6">
        {/* Standards */}
        {standards && standards.items.length > 0 && (
          <Card>
            <h2 className="mb-3 text-base font-semibold text-saffron-950">Standards</h2>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-saffron-950 marker:font-semibold marker:text-saffron-600">
              {standards.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          </Card>
        )}

        {/* Recommended groups */}
        {recommended.length > 0 && (
          <div>
            <h2 className="mb-3 text-base font-semibold text-saffron-950">Recommended</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {recommended.map((section) => (
                <Card key={section.title}>
                  <h3 className="text-sm font-semibold text-saffron-800">
                    {section.title.replace(/^Recommended\s*-\s*/, "")}
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-saffron-950">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden className="text-saffron-500">
                          ❖
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Application + Certificates: external links */}
        {linkSections.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {linkSections.map((section) => (
              <Card key={section.title}>
                <h3 className="text-sm font-semibold text-saffron-800">{section.title}</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {section.items.map((item, i) => (
                    <li key={i}>
                      <LinkifiedItem text={item} />
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}

        {/* Any other sections, rendered generically */}
        {other.map((section) => (
          <Card key={section.title}>
            <h3 className="text-sm font-semibold text-saffron-800">{section.title}</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-saffron-950">
              {section.items.map((item, i) => (
                <li key={i}>
                  <LinkifiedItem text={item} />
                </li>
              ))}
            </ul>
          </Card>
        ))}

        {level.sourceUrl ? (
          <p className="text-xs text-stone-500">
            Source:{" "}
            <a
              href={level.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-saffron-700 underline hover:text-saffron-800"
            >
              {level.sourceUrl}
            </a>
          </p>
        ) : null}

        {/* Devotees at this level */}
        <Card>
          <h2 className="mb-3 text-base font-semibold text-saffron-950">
            Devotees at this level{" "}
            <span className="font-normal text-stone-400">({devotees.length})</span>
          </h2>
          {devotees.length === 0 ? (
            <p className="text-sm text-stone-500">No one is tagged at this level yet.</p>
          ) : (
            <Table>
              <thead className="bg-saffron-50">
                <tr>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th>Mentor</Th>
                  <Th>Tagged</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-saffron-900/10">
                {devotees.map((d) => (
                  <tr key={d.id} className="hover:bg-saffron-50/60">
                    <Td>
                      <Link
                        href={`/admin/devotees/${d.id}`}
                        className="font-medium text-saffron-800 hover:underline"
                      >
                        {d.name}
                      </Link>
                    </Td>
                    <Td>
                      <Badge tone={statusTone[d.status]}>{d.status}</Badge>
                    </Td>
                    <Td>{d.mentor?.name ?? <span className="text-stone-400">—</span>}</Td>
                    <Td className="whitespace-nowrap">
                      {d.levelTaggedAt ? formatDate(d.levelTaggedAt) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Renders "Label: https://…" items as an external link on the label; plain text otherwise. */
function LinkifiedItem({ text }: { text: string }) {
  const match = text.match(/^(.*?):\s*(https?:\/\/\S+)\s*$/);
  if (!match) return <span className="text-saffron-950">{text}</span>;
  const [, label, url] = match;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-medium text-saffron-700 underline hover:text-saffron-800"
    >
      {label || url} <span aria-hidden>↗</span>
    </a>
  );
}
