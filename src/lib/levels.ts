import type { Prisma } from "@prisma/client";

export type LevelSection = { title: string; items: string[] };

/** Safely parse a SadhanaLevel.sections JSON value into typed sections. */
export function parseSections(sections: Prisma.JsonValue): LevelSection[] {
  if (!Array.isArray(sections)) return [];
  return (sections as unknown[]).filter(
    (s): s is LevelSection =>
      typeof s === "object" &&
      s !== null &&
      typeof (s as LevelSection).title === "string" &&
      Array.isArray((s as LevelSection).items),
  );
}

/** Group the sections into the buckets the UI renders. */
export function groupSections(sections: LevelSection[]) {
  const standards = sections.find((s) => s.title === "Standards");
  const recommended = sections.filter((s) => s.title.startsWith("Recommended"));
  const linkSections = sections.filter(
    (s) => s.title === "Application" || s.title === "Certificates",
  );
  const known = new Set([standards, ...recommended, ...linkSections].filter(Boolean));
  const other = sections.filter((s) => !known.has(s));
  return { standards, recommended, linkSections, other };
}
