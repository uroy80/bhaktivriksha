"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";

type LevelOption = { id: string; name: string; order: number };
type MentorOption = { id: string; name: string; role: "ADMIN" | "MISSIONARY" };

export function ReviewPanel({
  applicationId,
  type,
  levels,
  mentors,
  defaultLevelId,
}: {
  applicationId: string;
  type: "JOIN" | "LEVEL_CHANGE";
  levels: LevelOption[];
  mentors: MentorOption[];
  defaultLevelId: string;
}) {
  const router = useRouter();
  const [reviewNote, setReviewNote] = useState("");
  const [mentorId, setMentorId] = useState("");
  const [levelId, setLevelId] = useState(defaultLevelId);
  const [busy, setBusy] = useState<"APPROVE" | "REJECT" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function review(action: "APPROVE" | "REJECT") {
    setError(null);
    setSuccess(null);

    if (type === "JOIN" && action === "APPROVE") {
      if (!mentorId) {
        setError("Select a mentor before approving.");
        return;
      }
      if (!levelId) {
        setError("Select a starting level before approving.");
        return;
      }
    }

    setBusy(action);
    try {
      const res = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewNote: reviewNote.trim() || undefined,
          ...(type === "JOIN" && action === "APPROVE" ? { mentorId, levelId } : {}),
        }),
      });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(action === "APPROVE" ? "Application approved." : "Application rejected.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 rounded-lg bg-saffron-50/70 p-4 ring-1 ring-saffron-200">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-saffron-950">
        <Icon.applications className="h-4 w-4 text-saffron-600" />
        Review
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {type === "JOIN" ? (
          <>
            <Field label="Mentor (required to approve)">
              <Select value={mentorId} onChange={(e) => setMentorId(e.target.value)}>
                <option value="">Select a mentor…</option>
                {mentors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role === "ADMIN" ? "Admin" : "Missionary"})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Starting level">
              <Select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
                {levels.map((l) => (
                  <option key={l.id} value={l.id}>
                    Level {l.order} — {l.name}
                  </option>
                ))}
              </Select>
            </Field>
          </>
        ) : null}

        <div className="sm:col-span-2">
          <Field label="Review note (optional)">
            {type === "JOIN" ? (
              <Input
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="A note for the record…"
                maxLength={1000}
              />
            ) : (
              <Textarea
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="A note for the record — included in the level history on approval…"
                rows={2}
                maxLength={1000}
              />
            )}
          </Field>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-maroon-700">{error}</p> : null}
      {success ? <p className="mt-3 text-sm font-medium text-green-700">{success}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => review("APPROVE")} disabled={busy !== null}>
          <Icon.check className="h-4 w-4" />
          {busy === "APPROVE" ? "Approving…" : "Approve"}
        </Button>
        <Button variant="danger" onClick={() => review("REJECT")} disabled={busy !== null}>
          <Icon.minus className="h-4 w-4" />
          {busy === "REJECT" ? "Rejecting…" : "Reject"}
        </Button>
      </div>
    </div>
  );
}
