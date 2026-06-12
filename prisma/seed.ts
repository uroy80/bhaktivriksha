import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

type LevelSeed = {
  slug: string;
  name: string;
  order: number;
  summary: string;
  sourceUrl: string;
  sections: { title: string; items: string[] }[];
};

async function main() {
  const levels: LevelSeed[] = JSON.parse(
    readFileSync(join(__dirname, "data", "sadhana-levels.json"), "utf-8"),
  );

  for (const level of levels) {
    await prisma.sadhanaLevel.upsert({
      where: { slug: level.slug },
      update: {
        name: level.name,
        order: level.order,
        summary: level.summary,
        sourceUrl: level.sourceUrl,
        sections: level.sections,
      },
      create: {
        slug: level.slug,
        name: level.name,
        order: level.order,
        summary: level.summary,
        sourceUrl: level.sourceUrl,
        sections: level.sections,
      },
    });
  }
  console.log(`Seeded ${levels.length} sadhana levels.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
