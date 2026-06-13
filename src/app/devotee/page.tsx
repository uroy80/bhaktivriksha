import Link from "next/link";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { cn, formatDate, toDateKey } from "@/lib/utils";
import { Badge, ButtonLink, Card } from "@/components/ui";

export default async function DevoteeHomePage() {
  const user = await requireRole("DEVOTEE", "MISSIONARY", "ADMIN");

  const todayKey = toDateKey(new Date());
  const now = new Date();
  const fourWeeksAgo = new Date(now.getTime() - 28 * 86_400_000);

  const [todayEntry, level, mentor, pendingApp, recentAttendance] = await Promise.all([
    prisma.sadhanaEntry.findUnique({
      where: { userId_date: { userId: user.id, date: new Date(todayKey) } },
    }),
    user.sadhanaLevelId
      ? prisma.sadhanaLevel.findUnique({ where: { id: user.sadhanaLevelId } })
      : Promise.resolve(null),
    user.mentorId
      ? prisma.user.findUnique({
          where: { id: user.mentorId },
          select: { name: true, phone: true, whatsapp: true },
        })
      : Promise.resolve(null),
    prisma.application.findFirst({
      where: { applicantId: user.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { level: { select: { name: true } } },
    }),
    prisma.attendance.findMany({
      where: { devoteeId: user.id, session: { date: { gte: fourWeeksAgo, lte: now } } },
      select: { present: true },
    }),
  ]);

  const attended = recentAttendance.filter((a) => a.present).length;
  const totalSessions = recentAttendance.length;
  const firstName = user.name.split(" ")[0];

  return (
    <div>
      {/* Warm greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-saffron-950 sm:text-3xl">
          Hare Krishna, {firstName} 🙏
        </h1>
        <p className="mt-1 text-sm text-saffron-900/70">{formatDate(now)} · Sadhana Companion</p>
      </div>

      {/* Pending application banner */}
      {pendingApp ? (
        <Link href="/devotee/apply" className="mb-6 block">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-saffron-100 px-5 py-4 ring-1 ring-saffron-600/30 transition-colors hover:bg-saffron-200/70">
            <p className="text-sm font-medium text-saffron-900">
              📨 Your{" "}
              {pendingApp.type === "LEVEL_CHANGE"
                ? `application to advance to ${pendingApp.level?.name ?? "a new level"}`
                : "application to join"}{" "}
              is awaiting review.
            </p>
            <span className="text-sm font-semibold text-saffron-800">View →</span>
          </div>
        </Link>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's sadhana */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-saffron-950">📿 Today&apos;s sadhana</h2>
            {todayEntry ? <Badge tone="green">Logged</Badge> : <Badge tone="gray">Not yet</Badge>}
          </div>
          {todayEntry ? (
            <div className="space-y-2 text-sm text-saffron-950">
              <div className="flex items-center gap-6">
                <span>
                  <span className="text-2xl font-bold">{todayEntry.japaRounds}</span>{" "}
                  <span className="text-saffron-900/60">rounds</span>
                </span>
                <span>
                  <span className="text-2xl font-bold">{todayEntry.readingMinutes}</span>{" "}
                  <span className="text-saffron-900/60">min reading</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <MiniCheck done={todayEntry.mangalArati}>🌅 Mangal Arati</MiniCheck>
                <MiniCheck done={todayEntry.eveningArati}>🪔 Evening Arati</MiniCheck>
                <MiniCheck done={todayEntry.lectureHeard}>🎧 Lecture</MiniCheck>
              </div>
            </div>
          ) : (
            <p className="text-sm text-saffron-900/70">
              You haven&apos;t logged today&apos;s sadhana yet. Even one round counts 🙏
            </p>
          )}
          <div className="mt-4">
            <ButtonLink href="/devotee/sadhana" className="w-full">
              Update today&apos;s sadhana
            </ButtonLink>
          </div>
        </Card>

        {/* Current level */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-saffron-950">🪜 My level</h2>
            {level ? <Badge>Level {level.order} of 5</Badge> : null}
          </div>
          {level ? (
            <>
              <p className="text-xl font-bold text-saffron-950">{level.name}</p>
              <div className="mt-3 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-3 w-3 rounded-full",
                      i <= level.order ? "bg-saffron-600" : "bg-saffron-200",
                    )}
                  />
                ))}
                <span className="ml-1 text-xs text-saffron-900/60">{level.order}/5</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-saffron-900/70">
              Your sadhana level hasn&apos;t been tagged yet — your counsellor will guide you.
            </p>
          )}
          <div className="mt-4">
            <ButtonLink href="/devotee/level" variant="secondary" className="w-full">
              View my level &amp; standards
            </ButtonLink>
          </div>
        </Card>

        {/* My counsellor */}
        <Card>
          <h2 className="mb-3 font-semibold text-saffron-950">🤝 My counsellor</h2>
          {mentor ? (
            <div className="space-y-3">
              <p className="text-lg font-bold text-saffron-950">{mentor.name}</p>
              <div className="flex flex-wrap gap-2">
                {mentor.phone ? (
                  <a
                    href={`tel:${mentor.phone.replace(/[^+\d]/g, "")}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-saffron-800 ring-1 ring-saffron-300 transition-colors hover:bg-saffron-50"
                  >
                    📞 Call
                  </a>
                ) : null}
                {mentor.whatsapp ? (
                  <a
                    href={`https://wa.me/${mentor.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                  >
                    💬 WhatsApp
                  </a>
                ) : null}
                {!mentor.phone && !mentor.whatsapp ? (
                  <p className="text-sm text-saffron-900/60">
                    No contact details on record — ask at your next satsanga.
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <p className="text-sm text-saffron-900/70">
              A counsellor hasn&apos;t been assigned yet. You&apos;ll be connected to one soon 🙏
            </p>
          )}
        </Card>

        {/* Attendance snapshot */}
        <Card>
          <h2 className="mb-3 font-semibold text-saffron-950">✅ My attendance</h2>
          {totalSessions > 0 ? (
            <>
              <p className="text-3xl font-bold text-saffron-950">
                {attended}
                <span className="text-lg font-semibold text-saffron-900/50">
                  {" "}
                  of {totalSessions}
                </span>
              </p>
              <p className="mt-1 text-sm text-saffron-900/70">
                sessions attended in the last 4 weeks (
                {Math.round((attended / totalSessions) * 100)}%)
              </p>
            </>
          ) : (
            <p className="text-sm text-saffron-900/70">
              No sessions on your register in the last 4 weeks.
            </p>
          )}
          <div className="mt-4">
            <ButtonLink href="/devotee/attendance" variant="secondary" className="w-full">
              View full attendance
            </ButtonLink>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniCheck({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset",
        done
          ? "bg-green-100 text-green-800 ring-green-600/20"
          : "bg-stone-100 text-stone-500 ring-stone-500/20",
      )}
    >
      {children} {done ? "✓" : "·"}
    </span>
  );
}
