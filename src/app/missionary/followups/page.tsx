import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { prisma } from "@/lib/db";
import { getSubtreeIds, canAccessUser } from "@/lib/hierarchy";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { Icon, channelMeta } from "@/components/icons";
import { FollowUpForm, type SessionOption } from "./_components/FollowUpForm";
import { CHANNEL_OPTIONS, CHANNEL_TONES, isFollowUpChannel } from "./_components/channels";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return s || undefined;
}

export default async function FollowUpsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("MISSIONARY");
  const sp = await props.searchParams;

  // Prefill params (arrive from the attendance screen)
  const prefillDevoteeId = one(sp.devoteeId);
  const prefillSessionId = one(sp.sessionId);

  // Table filter params (GET form below)
  const fDevotee = one(sp.devotee);
  const fChannelRaw = one(sp.channel);
  const fChannel = isFollowUpChannel(fChannelRaw) ? fChannelRaw : undefined;
  const fFromRaw = one(sp.from);
  const fFrom = fFromRaw && DATE_RE.test(fFromRaw) ? fFromRaw : undefined;
  const fToRaw = one(sp.to);
  const fTo = fToRaw && DATE_RE.test(fToRaw) ? fToRaw : undefined;

  const subtreeIds = await getSubtreeIds(user.id);
  const menteeIds = subtreeIds.filter((id) => id !== user.id);

  const where: Prisma.FollowUpWhereInput = {
    OR: [{ devoteeId: { in: subtreeIds } }, { byId: { in: subtreeIds } }],
    ...(fDevotee ? { devoteeId: fDevotee } : {}),
    ...(fChannel ? { channel: fChannel } : {}),
    ...(fFrom || fTo
      ? {
          occurredAt: {
            ...(fFrom ? { gte: new Date(`${fFrom}T00:00:00`) } : {}),
            ...(fTo ? { lte: new Date(`${fTo}T23:59:59.999`) } : {}),
          },
        }
      : {}),
  };

  const [devotees, recentSessions, followUps] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: menteeIds }, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.classSession.findMany({
      where: { conductedById: user.id },
      orderBy: { date: "desc" },
      take: 20,
      select: { id: true, title: true, date: true },
    }),
    prisma.followUp.findMany({
      where,
      include: {
        devotee: { select: { id: true, name: true } },
        by: { select: { id: true, name: true } },
        session: { select: { id: true, title: true, date: true } },
      },
      orderBy: { occurredAt: "desc" },
      take: 100,
    }),
  ]);

  // If a session was passed from the attendance screen but isn't among the
  // caller's recent 20, include it so the preselect still works (scope-checked).
  let sessionRows = recentSessions;
  if (prefillSessionId && !recentSessions.some((s) => s.id === prefillSessionId)) {
    const extra = await prisma.classSession.findUnique({
      where: { id: prefillSessionId },
      select: { id: true, title: true, date: true, conductedById: true },
    });
    if (extra && (await canAccessUser(user, extra.conductedById))) {
      sessionRows = [{ id: extra.id, title: extra.title, date: extra.date }, ...recentSessions];
    }
  }
  const sessionOptions: SessionOption[] = sessionRows.map((s) => ({
    id: s.id,
    label: `${s.title} — ${formatDate(s.date)}`,
  }));

  // CSV export honoring the current filters
  const exportParams = new URLSearchParams();
  if (fDevotee) exportParams.set("devoteeId", fDevotee);
  if (fChannel) exportParams.set("channel", fChannel);
  if (fFrom) exportParams.set("from", fFrom);
  if (fTo) exportParams.set("to", fTo);
  const exportQs = exportParams.toString();
  const exportHref = `/api/followups/export${exportQs ? `?${exportQs}` : ""}`;

  return (
    <>
      <PageHeader
        title="Follow-ups"
        subtitle="After-class care — log every call, message and visit to your devotees."
      />

      <div className="space-y-6">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-saffron-950">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-saffron-100 text-saffron-700">
              <Icon.followups className="h-[18px] w-[18px]" />
            </span>
            Log a follow-up
          </h2>
          <FollowUpForm
            devotees={devotees}
            sessions={sessionOptions}
            defaultDevoteeId={prefillDevoteeId}
            defaultSessionId={prefillSessionId}
          />
        </Card>

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-saffron-950">Recent follow-ups</h2>
            <ButtonLink variant="secondary" href={exportHref}>
              <Icon.download className="h-4 w-4" />
              Download CSV
            </ButtonLink>
          </div>

          <Card className="mb-4">
            <form
              method="get"
              action="/missionary/followups"
              className="grid grid-cols-2 items-end gap-3 sm:grid-cols-3 lg:grid-cols-5"
            >
              <Field label="Devotee">
                <Select name="devotee" defaultValue={fDevotee ?? ""}>
                  <option value="">All devotees</option>
                  {devotees.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Channel">
                <Select name="channel" defaultValue={fChannel ?? ""}>
                  <option value="">All channels</option>
                  {CHANNEL_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="From">
                <Input type="date" name="from" defaultValue={fFrom ?? ""} />
              </Field>
              <Field label="To">
                <Input type="date" name="to" defaultValue={fTo ?? ""} />
              </Field>
              <div className="col-span-2 flex gap-2 sm:col-span-1">
                <Button type="submit" variant="secondary" className="flex-1 sm:flex-none">
                  Filter
                </Button>
                {fDevotee || fChannel || fFrom || fTo ? (
                  <ButtonLink variant="ghost" href="/missionary/followups">
                    Clear
                  </ButtonLink>
                ) : null}
              </div>
            </form>
          </Card>

          {followUps.length === 0 ? (
            <EmptyState
              title="No follow-ups found"
              hint="Log your first follow-up above, or loosen the filters."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Devotee</Th>
                  <Th>Channel</Th>
                  <Th>By</Th>
                  <Th>Outcome</Th>
                  <Th>Session</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-saffron-900/5">
                {followUps.map((f) => {
                  const meta = channelMeta[f.channel] ?? channelMeta.OTHER;
                  const ChannelIcon = meta.icon;
                  return (
                  <tr key={f.id}>
                    <Td className="whitespace-nowrap">{formatDateTime(f.occurredAt)}</Td>
                    <Td className="font-medium">{f.devotee.name}</Td>
                    <Td>
                      <Badge tone={CHANNEL_TONES[f.channel]}>
                        <ChannelIcon className="mr-1 h-3.5 w-3.5" />
                        {meta.label}
                      </Badge>
                    </Td>
                    <Td>{f.by.name}</Td>
                    <Td className="max-w-xs">
                      {f.outcome ? f.outcome : <span className="text-stone-400">—</span>}
                      {f.notes ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">{f.notes}</p>
                      ) : null}
                    </Td>
                    <Td>
                      {f.session ? (
                        <Link
                          href={`/missionary/sessions/${f.session.id}`}
                          className="text-saffron-700 underline decoration-saffron-300 underline-offset-2 hover:text-saffron-900"
                        >
                          {f.session.title} · {formatDate(f.session.date)}
                        </Link>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </Td>
                  </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
          {followUps.length === 100 ? (
            <p className="mt-2 text-xs text-stone-500">
              Showing the latest 100 — narrow the filters or download the CSV for the full list.
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
