"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";

export type ApplyLevelOption = {
  id: string;
  name: string;
  order: number;
  summary: string | null;
  sourceUrl: string | null;
  standards: string[];
};

export function LevelApplyForm({
  levels,
  currentLevelId,
  hasPending,
}: {
  levels: ApplyLevelOption[];
  currentLevelId: string | null;
  hasPending: boolean;
}) {
  const router = useRouter();
  const [levelId, setLevelId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const options = levels.filter((l) => l.id !== currentLevelId);
  const selected = options.find((l) => l.id === levelId) ?? null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!levelId) {
      setError("Choose the level you want to apply for.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levelId, message: message.trim() || undefined }),
      });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess("Hare Krishna! Your application has been submitted for review.");
      setLevelId("");
      setMessage("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {hasPending ? (
        <div className="flex items-start gap-2 rounded-lg bg-saffron-50 px-3 py-2 text-sm text-saffron-900 ring-1 ring-saffron-300">
          <Icon.clock className="mt-0.5 h-4 w-4 shrink-0 text-saffron-700" />
          <span>
            You already have a pending application. You can submit a new one after it has been
            reviewed.
          </span>
        </div>
      ) : null}

      <Field label="Level you are applying for">
        <Select
          value={levelId}
          onChange={(e) => setLevelId(e.target.value)}
          disabled={hasPending || busy}
        >
          <option value="">Choose a level…</option>
          {options.map((l) => (
            <option key={l.id} value={l.id}>
              Level {l.order} — {l.name}
            </option>
          ))}
        </Select>
      </Field>

      {selected ? (
        <div className="rounded-lg bg-saffron-50/70 p-4 ring-1 ring-saffron-200">
          <p className="flex items-center gap-2 text-sm font-semibold text-saffron-950">
            <Icon.star className="h-4 w-4 shrink-0 text-saffron-600" />
            Standards for {selected.name} — what you are committing to
          </p>
          {selected.standards.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm text-saffron-900">
              {selected.standards.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Icon.check className="mt-0.5 h-4 w-4 shrink-0 text-saffron-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-saffron-900/70">
              No standards are listed for this level.
            </p>
          )}
        </div>
      ) : null}

      <Field
        label="Message to the reviewer (optional)"
        hint="Share how you have been living these standards in your daily sadhana."
      >
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="E.g. I have been chanting four rounds daily for the past six months…"
          disabled={hasPending || busy}
        />
      </Field>

      {error ? <p className="text-sm font-medium text-maroon-700">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-green-700">{success}</p> : null}

      <Button type="submit" disabled={hasPending || busy || !levelId}>
        {busy ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
