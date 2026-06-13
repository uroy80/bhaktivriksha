"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, inputStyles, Select, Textarea } from "@/components/ui";

/** "YYYY-MM-DDTHH:mm" in local time for <input type="datetime-local">. */
function localDateTimeValue(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** New-session form: POST /api/sessions, then jump straight to the attendance screen. */
export function SessionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"SATSANGA" | "CLASS" | "OTHER">("SATSANGA");
  const dateRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Default the (uncontrolled) date input to "now" — written to the DOM after
  // mount so server and client markup never disagree.
  useEffect(() => {
    const el = dateRef.current;
    if (el && !el.value) el.value = localDateTimeValue();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const date = dateRef.current?.value ?? "";
    if (!date) {
      setError("Pick a date and time for the session");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          date,
          ...(location.trim() ? { location: location.trim() } : {}),
          ...(notes.trim() ? { notes: notes.trim() } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { session?: { id: string }; error?: string }
        | null;
      if (!res.ok || !data?.session) {
        throw new Error(data?.error ?? "Could not create the session");
      }
      setSuccess("Session created — opening attendance…");
      router.push(`/missionary/sessions/${data.session.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the session");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Title">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Weekly Bhakti Vriksha satsanga"
          required
          minLength={2}
          maxLength={200}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="SATSANGA">Satsanga</option>
            <option value="CLASS">Class</option>
            <option value="OTHER">Other</option>
          </Select>
        </Field>
        <Field label="Date & time">
          <input ref={dateRef} type="datetime-local" required className={inputStyles} />
        </Field>
      </div>

      <Field label="Location" hint="Optional — e.g. a host devotee's home">
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Where is it held?"
          maxLength={300}
        />
      </Field>

      <Field label="Notes">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Topic, chapter, special guests… (optional)"
          rows={2}
          maxLength={2000}
        />
      </Field>

      {error ? (
        <p className="rounded-lg bg-maroon-50 px-3 py-2 text-sm text-maroon-800">{error}</p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{success}</p>
      ) : null}

      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Creating…" : "Create session"}
      </Button>
    </form>
  );
}
