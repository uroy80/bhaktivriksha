"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { CHANNEL_OPTIONS } from "./channels";

export type DevoteeOption = { id: string; name: string };
export type SessionOption = { id: string; label: string };

/** Current local time as a value for <input type="datetime-local">. */
function nowLocalInput(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function FollowUpForm({
  devotees,
  sessions,
  defaultDevoteeId,
  defaultSessionId,
}: {
  devotees: DevoteeOption[];
  sessions: SessionOption[];
  defaultDevoteeId?: string;
  defaultSessionId?: string;
}) {
  const router = useRouter();

  const [devoteeId, setDevoteeId] = useState(
    defaultDevoteeId && devotees.some((d) => d.id === defaultDevoteeId) ? defaultDevoteeId : "",
  );
  const [sessionId, setSessionId] = useState(
    defaultSessionId && sessions.some((s) => s.id === defaultSessionId) ? defaultSessionId : "",
  );
  const [channel, setChannel] = useState<string>("PHONE_CALL");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  // Lazy initializer: minute-granular, so SSR and hydration values match in practice.
  const [occurredAt, setOccurredAt] = useState(() => nowLocalInput());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!devoteeId) {
      setError("Choose a devotee to log the follow-up for.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          devoteeId,
          sessionId: sessionId || undefined,
          channel,
          outcome: outcome.trim() || undefined,
          notes: notes.trim() || undefined,
          occurredAt: occurredAt ? new Date(occurredAt).toISOString() : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not log the follow-up. Please try again.");
        return;
      }
      setSuccess("Follow-up logged. Hare Krishna!");
      setOutcome("");
      setNotes("");
      setOccurredAt(nowLocalInput());
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Devotee">
          <Select
            value={devoteeId}
            onChange={(e) => setDevoteeId(e.target.value)}
            required
            aria-label="Devotee"
          >
            <option value="">Choose a devotee…</option>
            {devotees.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Related session (optional)">
          <Select value={sessionId} onChange={(e) => setSessionId(e.target.value)} aria-label="Related session">
            <option value="">No linked session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Channel">
          <Select value={channel} onChange={(e) => setChannel(e.target.value)} aria-label="Channel">
            {CHANNEL_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="When">
          <Input
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            aria-label="When the follow-up happened"
          />
        </Field>
      </div>

      <Field label="Outcome" hint="One line — what came of it.">
        <Input
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          placeholder="Spoke to him — will come next week"
          maxLength={300}
        />
      </Field>

      <Field label="Notes (optional)">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything worth remembering for next time…"
          maxLength={2000}
        />
      </Field>

      {error ? <p className="text-sm font-medium text-maroon-700">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-green-700">{success}</p> : null}

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Logging…" : "Log follow-up"}
      </Button>
    </form>
  );
}
