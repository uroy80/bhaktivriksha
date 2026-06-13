import { Fragment } from "react";
import { requireRole } from "@/lib/guards";
import { cn } from "@/lib/utils";
import { ButtonLink, PageHeader } from "@/components/ui";
import { buildRegisterData, resolveMonth, weekRangeLabel } from "./_lib/data";
import { RegisterControls } from "./_components/RegisterControls";

const headCell =
  "border border-stone-800 bg-saffron-50 px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-saffron-950 print:bg-white";
const bodyCell = "border border-stone-800 px-2 py-1 text-saffron-950";
const markCell = cn(bodyCell, "w-9 text-center font-mono text-xs");

export default async function RegisterPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole("MISSIONARY");
  const searchParams = await props.searchParams;
  const { year, month, key, label } = resolveMonth(searchParams.month);
  const data = await buildRegisterData(user, year, month);

  return (
    <div>
      {/* Print sizing — keeps the register on a single landscape page. */}
      <style>{`@media print { @page { size: A4 landscape; margin: 10mm; } }`}</style>

      <div className="no-print">
        <PageHeader
          title="Weekly Register"
          subtitle="Bhakti Vriksha Group Weekly Report Format — the paper register, digitized and printable."
          actions={
            <ButtonLink variant="secondary" href={`/api/register/export?month=${key}`}>
              Download CSV
            </ButtonLink>
          }
        />
        <div className="mb-6">
          <RegisterControls month={key} />
        </div>
      </div>

      {/* The printable sheet */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-saffron-900/10 print:rounded-none print:p-0 print:shadow-none print:ring-0">
        {/* Form header */}
        <div className="mb-4 text-center">
          <p className="text-base font-bold uppercase tracking-wider text-saffron-950">
            Bhakti Vriksha Group Weekly Report
          </p>
          <p className="mt-1 text-sm text-saffron-950">
            ISKCON Temple:{" "}
            <span className="inline-block min-w-56 border-b border-dotted border-stone-500 align-bottom">
              &nbsp;
            </span>
          </p>
        </div>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 text-sm text-saffron-950">
          <p>
            Missionary / Servant Leader: <span className="font-semibold">{user.name}</span>
          </p>
          <p>
            Month: <span className="font-semibold">{label}</span>
          </p>
        </div>

        {/* TABLE 1 — attendance grid */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th rowSpan={2} className={cn(headCell, "text-left")}>
                  Names
                </th>
                {data.weeks.map((w) => (
                  <th key={w.index} colSpan={2} className={headCell}>
                    Week {w.index}
                    <span className="block text-[10px] font-normal normal-case tracking-normal text-stone-600">
                      {weekRangeLabel(w)}
                    </span>
                  </th>
                ))}
                <th rowSpan={2} className={headCell}>
                  Remarks
                </th>
              </tr>
              <tr>
                {data.weeks.map((w) => (
                  <Fragment key={w.index}>
                    <th className={cn(headCell, "w-9")}>A</th>
                    <th className={cn(headCell, "w-9")}>S</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className={cn(bodyCell, "py-4 text-center text-stone-500")}>
                    No active devotees in your group yet.
                  </td>
                </tr>
              ) : (
                data.rows.map((r) => (
                  <tr key={r.id}>
                    <td className={cn(bodyCell, "whitespace-nowrap font-medium")}>{r.name}</td>
                    {r.marks.map((mark, i) => (
                      <Fragment key={i}>
                        <td className={markCell}>{mark}</td>
                        <td className={markCell}>{r.levelOrder}</td>
                      </Fragment>
                    ))}
                    <td className={cn(bodyCell, "text-xs")}>{r.remarks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-stone-600">
          <span className="font-semibold">A</span> (attendance): P = present, A = absent (session
          held that week), blank = no session that week. <span className="font-semibold">S</span>{" "}
          (siksha level):{" "}
          {data.levels.map((l, i) => (
            <span key={l.order}>
              {i > 0 ? " · " : ""}
              {l.order} = {l.name}
            </span>
          ))}
          .
        </p>

        {/* TABLE 2 — efforts */}
        <p className="mt-6 mb-2 text-sm font-bold uppercase tracking-wider text-saffron-950">
          Efforts
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className={cn(headCell, "text-left")}>Efforts</th>
                {data.weeks.map((w) => (
                  <th key={w.index} className={headCell}>
                    Week {w.index}
                  </th>
                ))}
                <th className={headCell}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.efforts.map((e) => (
                <tr key={e.label}>
                  <td className={cn(bodyCell, "font-medium")}>{e.label}</td>
                  {e.weekly.map((n, i) => (
                    <td key={i} className={cn(bodyCell, "text-center font-mono")}>
                      {n}
                    </td>
                  ))}
                  <td className={cn(bodyCell, "text-center font-mono font-bold")}>{e.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] leading-4 text-stone-600">
          Effort counters come from your submitted progress reports for each week; weeks without a
          report fall back to your live follow-up logs (mails, telephone calls, home visits).
        </p>
      </div>
    </div>
  );
}
