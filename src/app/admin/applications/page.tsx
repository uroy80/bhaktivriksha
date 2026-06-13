import Link from "next/link";
import type { ApplicationStatus, ApplicationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/guards";
import { cn, formatDateTime } from "@/lib/utils";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { ReviewPanel } from "./review-panel";

const STATUS_TABS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ALL", label: "All" },
] as const;

const TYPE_TABS = [
  { value: "ALL", label: "All types" },
  { value: "JOIN", label: "Join" },
  { value: "LEVEL_CHANGE", label: "Level change" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["value"];
type TypeFilter = (typeof TYPE_TABS)[number]["value"];

function filterHref(status: StatusFilter, type: TypeFilter): string {
  const params = new URLSearchParams();
  if (status !== "PENDING") params.set("status", status);
  if (type !== "ALL") params.set("type", type);
  const qs = params.toString();
  return qs ? `/admin/applications?${qs}` : "/admin/applications";
}

function statusTone(status: ApplicationStatus): "saffron" | "green" | "red" {
  if (status === "APPROVED") return "green";
  if (status === "REJECTED") return "red";
  return "saffron";
}

export default async function AdminApplicationsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireRole("ADMIN");
  const sp = await props.searchParams;

  const statusRaw = typeof sp.status === "string" ? sp.status.toUpperCase() : "PENDING";
  const status: StatusFilter = STATUS_TABS.some((t) => t.value === statusRaw)
    ? (statusRaw as StatusFilter)
    : "PENDING";
  const typeRaw = typeof sp.type === "string" ? sp.type.toUpperCase() : "ALL";
  const type: TypeFilter = TYPE_TABS.some((t) => t.value === typeRaw)
    ? (typeRaw as TypeFilter)
    : "ALL";

  const where: Prisma.ApplicationWhereInput = {};
  if (status !== "ALL") where.status = status as ApplicationStatus;
  if (type !== "ALL") where.type = type as ApplicationType;

  const [applications, mentors, levels, pendingCount] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        applicant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            sadhanaLevel: { select: { name: true } },
          },
        },
        level: { select: { id: true, name: true, order: true } },
        reviewedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["MISSIONARY", "ADMIN"] } },
      select: { id: true, name: true, role: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.sadhanaLevel.findMany({
      select: { id: true, name: true, order: true },
      orderBy: { order: "asc" },
    }),
    prisma.application.count({ where: { status: "PENDING" } }),
  ]);

  const defaultLevelId = levels.find((l) => l.order === 1)?.id ?? levels[0]?.id ?? "";
  const mentorOptions = mentors.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role as "ADMIN" | "MISSIONARY",
  }));

  return (
    <div>
      <PageHeader
        title="Applications"
        subtitle={`Join and level-change requests. ${pendingCount} pending review.`}
      />

      {/* Filters */}
      <div className="mb-6 space-y-2">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={filterHref(tab.value, type)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                tab.value === status
                  ? "bg-saffron-600 text-white shadow-sm"
                  : "bg-white text-saffron-800 ring-1 ring-saffron-300 hover:bg-saffron-50",
              )}
            >
              {tab.label}
              {tab.value === "PENDING" && pendingCount > 0 ? ` (${pendingCount})` : ""}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {TYPE_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={filterHref(status, tab.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                tab.value === type
                  ? "bg-maroon-700 text-white shadow-sm"
                  : "bg-white text-maroon-800 ring-1 ring-maroon-200 hover:bg-maroon-50",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="No applications match these filters"
          hint="New join and level-change requests will appear here."
        />
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-saffron-950">{app.applicant.name}</p>
                    {app.type === "JOIN" ? (
                      <Badge tone="blue">
                        <Icon.apply className="mr-1 h-3.5 w-3.5" />
                        Join
                      </Badge>
                    ) : (
                      <Badge tone="saffron">
                        <Icon.levels className="mr-1 h-3.5 w-3.5" />
                        Level change
                        {app.level ? (
                          <>
                            <Icon.chevron className="mx-0.5 h-3.5 w-3.5" />
                            {app.level.name}
                          </>
                        ) : null}
                      </Badge>
                    )}
                    <Badge tone={statusTone(app.status)}>{app.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-saffron-900/70">
                    {app.applicant.email}
                    {app.applicant.phone ? ` · ${app.applicant.phone}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-stone-500">
                    Current level: {app.applicant.sadhanaLevel?.name ?? "Not assigned yet"}
                  </p>
                </div>
                <p className="shrink-0 text-xs text-stone-500">
                  Applied {formatDateTime(app.createdAt)}
                </p>
              </div>

              {app.message ? (
                <blockquote className="mt-3 rounded-lg border-l-4 border-saffron-300 bg-saffron-50/60 px-3 py-2 text-sm text-saffron-900">
                  {app.message}
                </blockquote>
              ) : null}

              {app.status === "PENDING" ? (
                <ReviewPanel
                  applicationId={app.id}
                  type={app.type}
                  levels={levels}
                  mentors={mentorOptions}
                  defaultLevelId={defaultLevelId}
                />
              ) : (
                <div className="mt-3 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600 ring-1 ring-stone-200">
                  <p className="flex items-center gap-1.5">
                    {app.status === "APPROVED" ? (
                      <Icon.check className="h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <Icon.minus className="h-4 w-4 shrink-0 text-maroon-600" />
                    )}
                    <span>
                      {app.status === "APPROVED" ? "Approved" : "Rejected"}
                      {app.reviewedBy ? ` by ${app.reviewedBy.name}` : ""}
                      {app.reviewedAt ? ` on ${formatDateTime(app.reviewedAt)}` : ""}.
                    </span>
                  </p>
                  {app.reviewNote ? <p className="mt-1 italic">“{app.reviewNote}”</p> : null}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
