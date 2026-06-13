"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

export type EffortPrefill = {
  mails: number;
  calls: number;
  homeVisits: number;
  whatsapp: number;
  sms: number;
  inPerson: number;
};

export type PeriodPrefill = {
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD */
  end: string;
  counts: EffortPrefill;
};

type Period = "DAILY" | "WEEKLY";

const COUNTER_FIELDS: { key: "mails" | "calls" | "homeVisits" | "serviceDonors" | "moneyDonors"; label: string }[] = [
  { key: "mails", label: "No. of Mails" },
  { key: "calls", label: "No. of Telephone Calls" },
  { key: "homeVisits", label: "No. of Home Visits" },
  { key: "serviceDonors", label: "No. of Service Donors" },
  { key: "moneyDonors", label: "No. of Money Donors" },
];

export function ReportForm({ daily, weekly }: { daily: PeriodPrefill; weekly: PeriodPrefill }) {
  const router = useRouter();

  const [period, setPeriod] = useState<Period>("WEEKLY");
  const [periodStart, setPeriodStart] = useState(weekly.start);
  const [periodEnd, setPeriodEnd] = useState(weekly.end);
  const [summary, setSummary] = useState("");
  const [counters, setCounters] = useState({
    mails: weekly.counts.mails,
    calls: weekly.counts.calls,
    homeVisits: weekly.counts.homeVisits,
    serviceDonors: 0,
    moneyDonors: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const context = period === "DAILY" ? daily.counts : weekly.counts;

  function switchPeriod(p: Period) {
    if (p === period) return;
    const preset = p === "DAILY" ? daily : weekly;
    setPeriod(p);
    setPeriodStart(preset.start);
    setPeriodEnd(preset.end);
    setCounters((prev) => ({
      ...prev,
      mails: preset.counts.mails,
      calls: preset.counts.calls,
      homeVisits: preset.counts.homeVisits,
    }));
    setError(null);
    setSuccess(null);
  }

  function setCounter(key: keyof typeof counters, raw: string) {
    const n = Math.max(0, Math.floor(Number(raw)));
    setCounters((prev) => ({ ...prev, [key]: Number.isFinite(n) ? n : 0 }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!summary.trim()) {
      setError("Please write a short summary before submitting.");
      return;
    }
    if (!periodStart || !periodEnd) {
      setError("Please choose both period dates.");
      return;
    }
    if (periodStart > periodEnd) {
      setError("Period start must be on or before period end.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, periodStart, periodEnd, summary: summary.trim(), ...counters }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : "Could not submit the report.");
        return;
      }
      setSuccess("Hare Krishna — report submitted.");
      setSummary("");
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Period toggle */}
      <div>
        <p className="mb-1 block text-sm font-medium text-saffron-950">Report period</p>
        <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-saffron-300">
          {(["DAILY", "WEEKLY"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => switchPeriod(p)}
              className={cn(
                "px-4 py-2 text-sm font-semibold transition-colors cursor-pointer",
                p === period ? "bg-saffron-600 text-white" : "bg-white text-saffron-800 hover:bg-saffron-50",
              )}
            >
              {p === "DAILY" ? "Daily" : "Weekly"}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-stone-500">
          {period === "DAILY" ? "Defaults to today." : "Defaults to the current Monday–Sunday week."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Period start">
          <Input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            required
          />
        </Field>
        <Field label="Period end">
          <Input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            required
          />
        </Field>
      </div>

      <Field label="Summary" hint="What happened this period — satsangas held, devotees contacted, anything your senior should know.">
        <Textarea
          rows={4}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Hare Krishna! This week we..."
          maxLength={5000}
          required
        />
      </Field>

      {/* The five EFFORTS counters */}
      <div>
        <p className="mb-1 block text-sm font-medium text-saffron-950">Efforts</p>
        <p className="mb-2 text-xs text-stone-500">
          Mails, calls and home visits are prefilled from your follow-up logs for this period — adjust if needed.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {COUNTER_FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-medium text-saffron-900/80" htmlFor={`effort-${f.key}`}>
                {f.label}
              </label>
              <Input
                id={`effort-${f.key}`}
                type="number"
                min={0}
                value={counters[f.key]}
                onChange={(e) => setCounter(f.key, e.target.value)}
                className="text-center"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Read-only context from other follow-up channels */}
      <div className="rounded-lg bg-saffron-50 px-3 py-2 text-xs text-saffron-900/80 ring-1 ring-saffron-200">
        Other outreach logged in this {period === "DAILY" ? "day" : "week"} (for context, not counted above):{" "}
        <span className="font-semibold">{context.whatsapp}</span> WhatsApp ·{" "}
        <span className="font-semibold">{context.sms}</span> SMS ·{" "}
        <span className="font-semibold">{context.inPerson}</span> in person
      </div>

      {error ? <p className="text-sm font-medium text-maroon-700">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-green-700">{success}</p> : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Submitting…" : "Submit report"}
      </Button>
    </form>
  );
}
