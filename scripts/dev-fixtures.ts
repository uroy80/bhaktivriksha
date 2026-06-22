/**
 * DEV FIXTURES — realistic test data for local development only.
 * Run: npx tsx scripts/dev-fixtures.ts
 * Idempotent: upserts by email. Refuses to run in production.
 */
import { PrismaClient, Role, UserStatus, SessionType, FollowUpChannel } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "Test@12345";

function daysAgo(n: number, hour = 18, min = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, min, 0, 0);
  return d;
}

function dateOnly(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return new Date(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
}

async function upsertUser(opts: {
  name: string;
  email: string;
  role: Role;
  status?: UserStatus;
  mentorId?: string | null;
  levelSlug?: string;
  phone?: string;
}) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const level = opts.levelSlug
    ? await prisma.sadhanaLevel.findUnique({ where: { slug: opts.levelSlug } })
    : null;
  return prisma.user.upsert({
    where: { email: opts.email },
    update: {
      mentorId: opts.mentorId ?? undefined,
      role: opts.role,
      status: opts.status ?? "ACTIVE",
      sadhanaLevelId: level?.id,
    },
    create: {
      name: opts.name,
      email: opts.email,
      passwordHash,
      role: opts.role,
      status: opts.status ?? "ACTIVE",
      mentorId: opts.mentorId ?? null,
      sadhanaLevelId: level?.id,
      levelTaggedAt: level ? daysAgo(60) : null,
      joinedAt: daysAgo(90),
      phone: opts.phone,
      whatsapp: opts.phone,
    },
  });
}

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.SEED_DEMO !== "1") {
    throw new Error("Refusing to run fixtures in production without SEED_DEMO=1.");
  }
  const levelCount = await prisma.sadhanaLevel.count();
  if (levelCount === 0) throw new Error("Run `npm run db:seed` first (levels missing).");

  // Admin (the one admin; same as /setup would create)
  const admin = await upsertUser({
    name: "Temple Admin",
    email: "admin@temple.test",
    role: "ADMIN",
    phone: "+91 90000 00001",
  });

  // Missionaries — milkyway: Madhava & Nitai under admin; Gauranga under Madhava
  const madhava = await upsertUser({
    name: "Madhava Das",
    email: "madhava@temple.test",
    role: "MISSIONARY",
    mentorId: admin.id,
    levelSlug: "srila-prabhupada-asraya",
    phone: "+91 90000 00002",
  });
  const nitai = await upsertUser({
    name: "Nitai Das",
    email: "nitai@temple.test",
    role: "MISSIONARY",
    mentorId: admin.id,
    levelSlug: "krishna-sadhaka",
    phone: "+91 90000 00003",
  });
  const gauranga = await upsertUser({
    name: "Gauranga Das",
    email: "gauranga@temple.test",
    role: "MISSIONARY",
    mentorId: madhava.id,
    levelSlug: "krishna-sadhaka",
    phone: "+91 90000 00004",
  });

  // Devotees
  const devoteeSpecs = [
    { name: "Radha Devi", email: "radha@temple.test", mentor: madhava.id, level: "krishna-sevaka" },
    { name: "Govinda Kumar", email: "govinda@temple.test", mentor: madhava.id, level: "sraddhavan" },
    { name: "Yamuna Devi", email: "yamuna@temple.test", mentor: madhava.id, level: "sraddhavan" },
    { name: "Krishna Chandra", email: "krishnac@temple.test", mentor: gauranga.id, level: "sraddhavan" },
    { name: "Tulasi Devi", email: "tulasi@temple.test", mentor: gauranga.id, level: "krishna-sevaka" },
    { name: "Balaram Singh", email: "balaram@temple.test", mentor: nitai.id, level: "krishna-sevaka" },
    { name: "Subhadra Devi", email: "subhadra@temple.test", mentor: nitai.id, level: "sraddhavan" },
    { name: "Arjuna Patel", email: "arjuna@temple.test", mentor: nitai.id, level: "sraddhavan" },
  ];
  const devotees: Record<string, { id: string; name: string }> = {};
  for (const [i, spec] of devoteeSpecs.entries()) {
    const u = await upsertUser({
      name: spec.name,
      email: spec.email,
      role: "DEVOTEE",
      mentorId: spec.mentor,
      levelSlug: spec.level,
      phone: `+91 90000 1000${i}`,
    });
    devotees[spec.email] = { id: u.id, name: u.name };
  }

  // A pending applicant (application area flow)
  const pendingHash = await bcrypt.hash(PASSWORD, 10);
  const pending = await prisma.user.upsert({
    where: { email: "newcomer@temple.test" },
    update: {},
    create: {
      name: "Vrinda Sharma",
      email: "newcomer@temple.test",
      passwordHash: pendingHash,
      role: "DEVOTEE",
      status: "PENDING",
      phone: "+91 90000 20001",
    },
  });
  const hasJoinApp = await prisma.application.findFirst({
    where: { applicantId: pending.id, type: "JOIN" },
  });
  if (!hasJoinApp) {
    await prisma.application.create({
      data: {
        type: "JOIN",
        applicantId: pending.id,
        message: "I attended the Sunday feast twice and wish to begin the bhakti path.",
      },
    });
  }

  // A level-change application from an active devotee
  const radha = devotees["radha@temple.test"];
  const sadhaka = await prisma.sadhanaLevel.findUnique({ where: { slug: "krishna-sadhaka" } });
  const hasLevelApp = await prisma.application.findFirst({
    where: { applicantId: radha.id, type: "LEVEL_CHANGE", status: "PENDING" },
  });
  if (!hasLevelApp && sadhaka) {
    await prisma.application.create({
      data: {
        type: "LEVEL_CHANGE",
        applicantId: radha.id,
        levelId: sadhaka.id,
        message: "Chanting 8 rounds daily for 6 months, home altar established.",
      },
    });
  }

  // Sessions + attendance for the last 3 weeks (idempotent: skip if sessions exist)
  const sessionCount = await prisma.classSession.count();
  if (sessionCount === 0) {
    const groups: { conductor: { id: string }; members: { id: string; name: string }[] }[] = [
      {
        conductor: madhava,
        members: [devotees["radha@temple.test"], devotees["govinda@temple.test"], devotees["yamuna@temple.test"], gauranga],
      },
      {
        conductor: gauranga,
        members: [devotees["krishnac@temple.test"], devotees["tulasi@temple.test"]],
      },
      {
        conductor: nitai,
        members: [devotees["balaram@temple.test"], devotees["subhadra@temple.test"], devotees["arjuna@temple.test"]],
      },
    ];
    for (const g of groups) {
      for (const weeksBack of [2, 1, 0]) {
        const session = await prisma.classSession.create({
          data: {
            title: weeksBack === 0 ? "Bhagavad Gita Satsanga" : "Weekly Bhakti Vriksha Satsanga",
            type: "SATSANGA" as SessionType,
            date: daysAgo(weeksBack * 7 + 1, 18, 30),
            location: "Temple Hall",
            conductedById: g.conductor.id,
          },
        });
        for (const [idx, m] of g.members.entries()) {
          const present = (idx + weeksBack) % 3 !== 0; // deterministic mix of P/A
          const member = await prisma.user.findUnique({
            where: { id: m.id },
            include: { sadhanaLevel: true },
          });
          await prisma.attendance.create({
            data: {
              sessionId: session.id,
              devoteeId: m.id,
              present,
              sikshaLevel: member?.sadhanaLevel?.name ?? null,
              markedById: g.conductor.id,
              remarks: !present && idx === 0 ? "Travelling this week" : null,
            },
          });
          if (!present) {
            await prisma.followUp.create({
              data: {
                devoteeId: m.id,
                sessionId: session.id,
                channel: (["PHONE_CALL", "WHATSAPP", "HOME_VISIT"] as FollowUpChannel[])[idx % 3],
                outcome: "Spoke briefly — will join next week",
                notes: "Missed satsanga; shared the class recording.",
                byId: g.conductor.id,
                occurredAt: daysAgo(weeksBack * 7, 11, 0),
              },
            });
          }
        }
      }
    }
  }

  // Weekly progress reports (last week) from each missionary
  const reportCount = await prisma.progressReport.count();
  if (reportCount === 0) {
    for (const [m, summary] of [
      [madhava, "Group steady. Radha ready for Krishna Sadhaka. Two home visits made."],
      [gauranga, "Krishna Chandra missed one satsanga; followed up by phone. Tulasi very enthusiastic."],
      [nitai, "Arjuna inconsistent in japa; planning a home visit. Others steady."],
    ] as const) {
      await prisma.progressReport.create({
        data: {
          authorId: (m as { id: string }).id,
          period: "WEEKLY",
          periodStart: daysAgo(8),
          periodEnd: daysAgo(2),
          summary: summary as string,
          mails: 1,
          calls: 3,
          homeVisits: 1,
          serviceDonors: 2,
          moneyDonors: 1,
        },
      });
    }
  }

  // Sadhana entries — streaks for some devotees, gaps for others
  const entryCount = await prisma.sadhanaEntry.count();
  if (entryCount === 0) {
    const patterns: [string, number[]][] = [
      ["radha@temple.test", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]], // 14-day streak
      ["govinda@temple.test", [0, 1, 3, 4, 6, 8, 11]], // patchy
      ["tulasi@temple.test", [0, 1, 2, 3, 4, 5]], // 6-day streak
      ["balaram@temple.test", [2, 5, 9]], // sparse
      ["krishnac@temple.test", [9, 10, 11]], // stopped a week ago — needs attention
    ];
    for (const [email, days] of patterns) {
      const u = devotees[email];
      if (!u) continue;
      for (const n of days) {
        await prisma.sadhanaEntry.create({
          data: {
            userId: u.id,
            date: dateOnly(n),
            japaRounds: 4 + ((n * 7) % 5),
            readingMinutes: 10 + ((n * 3) % 20),
            mangalArati: n % 3 === 0,
            eveningArati: n % 2 === 0,
            lectureHeard: n % 4 === 0,
          },
        });
      }
    }
  }

  // Self-registered, UNASSIGNED devotees (open registration) — ACTIVE, no mentor.
  // These appear in the admin "Unassigned" list and the missionary "claim" list.
  const unassignedSpecs = [
    { name: "Lakshmi Iyer", email: "lakshmi@temple.test" },
    { name: "Mohan Verma", email: "mohan@temple.test" },
    { name: "Priya Nair", email: "priya@temple.test" },
  ];
  for (const [i, spec] of unassignedSpecs.entries()) {
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    await prisma.user.upsert({
      where: { email: spec.email },
      update: {},
      create: {
        name: spec.name,
        email: spec.email,
        passwordHash,
        role: "DEVOTEE",
        status: "ACTIVE",
        mentorId: null,
        joinedAt: daysAgo(i + 1),
        phone: `+91 90000 3000${i}`,
      },
    });
  }

  // Give missionaries a stable invite token (so /missionary/invite QR renders).
  for (const [m, token] of [
    [madhava, "demo-madhava1"],
    [nitai, "demo-nitai001"],
    [gauranga, "demo-gauranga"],
  ] as const) {
    await prisma.user.update({
      where: { id: (m as { id: string }).id },
      data: { inviteToken: token as string },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    unassigned: await prisma.user.count({ where: { role: "DEVOTEE", status: "ACTIVE", mentorId: null } }),
    sessions: await prisma.classSession.count(),
    attendance: await prisma.attendance.count(),
    followUps: await prisma.followUp.count(),
    reports: await prisma.progressReport.count(),
    sadhanaEntries: await prisma.sadhanaEntry.count(),
    applications: await prisma.application.count(),
  };
  console.log("Fixtures ready:", counts);
  console.log(`\nLogins (password for all: ${PASSWORD})`);
  console.log("  admin@temple.test      — ADMIN");
  console.log("  madhava@temple.test    — MISSIONARY (group of 3 devotees + sub-missionary Gauranga)");
  console.log("  gauranga@temple.test   — MISSIONARY under Madhava (milkyway)");
  console.log("  nitai@temple.test      — MISSIONARY (group of 3)");
  console.log("  radha@temple.test      — DEVOTEE (14-day streak, pending level application)");
  console.log("  newcomer@temple.test   — PENDING applicant");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
