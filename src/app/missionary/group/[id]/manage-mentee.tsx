"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Select, Textarea } from "@/components/ui";
import { Icon } from "@/components/icons";

type MentorOption = { id: string; name: string };
type Action = "mentor" | "role" | "notes";

export function ManageMentee({
  menteeId,
  menteeName,
  role,
  mentorId,
  notes,
  mentorOptions,
  hasMentees,
}: {
  menteeId: string;
  menteeName: string;
  role: "MISSIONARY" | "DEVOTEE";
  mentorId: string | null;
  notes: string;
  mentorOptions: MentorOption[];
  hasMentees: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newMentorId, setNewMentorId] = useState(mentorId ?? "");
  const [noteDraft, setNoteDraft] = useState(notes);

  async function patch(action: Action, body: Record<string, unknown>, okMessage: string) {
    setBusy(action);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/missionary/group/${menteeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(okMessage);
      router.refresh();
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  function moveMentee() {
    if (!newMentorId) {
      setError("Choose a missionary to move them to.");
      return;
    }
    if (newMentorId === mentorId) {
      setError("They are already under that missionary.");
      return;
    }
    void patch("mentor", { mentorId: newMentorId }, `${menteeName} has been moved to their new mentor.`);
  }

  function promote() {
    if (
      !window.confirm(
        `Appoint ${menteeName} as a missionary?\n\nThey will be able to care for devotees of their own — this is how the milkyway grows.`,
      )
    )
      return;
    void patch("role", { role: "MISSIONARY" }, `${menteeName} is now a missionary. The milkyway grows!`);
  }

  function demote() {
    if (
      !window.confirm(
        `Return ${menteeName} to devotee?\n\nThey will no longer be able to care for a group of their own.`,
      )
    )
      return;
    void patch("role", { role: "DEVOTEE" }, `${menteeName} now serves as a devotee.`);
  }

  function saveNotes() {
    void patch("notes", { notes: noteDraft }, "Your pastoral notes were saved.");
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p className="rounded-lg bg-maroon-100 px-3 py-2 text-sm text-maroon-800" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800" role="status">
          {success}
        </p>
      ) : null}

      {/* Move to another missionary */}
      <div>
        <Field
          label="Move to another missionary"
          hint="Hand their care over to another missionary in your group."
        >
          <div className="flex gap-2">
            <Select
              value={newMentorId}
              onChange={(e) => setNewMentorId(e.target.value)}
              aria-label="New mentor"
            >
              <option value="">Choose a missionary…</option>
              {mentorOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={moveMentee} disabled={busy !== null}>
              {busy === "mentor" ? "Moving…" : "Move"}
            </Button>
          </div>
        </Field>
      </div>

      {/* Appoint / return */}
      <div>
        {role === "DEVOTEE" ? (
          <>
            <Button onClick={promote} disabled={busy !== null}>
              <Icon.apply className="h-4 w-4" />
              {busy === "role" ? "Appointing…" : "Appoint as missionary"}
            </Button>
            <p className="mt-1 text-xs text-stone-500">
              Ready to care for others? Appointing them lets them shepherd their own group.
            </p>
          </>
        ) : (
          <>
            <Button variant="danger" onClick={demote} disabled={busy !== null || hasMentees}>
              {busy === "role" ? "Updating…" : "Return to devotee"}
            </Button>
            <p className="mt-1 text-xs text-stone-500">
              {hasMentees
                ? "They still care for mentees — move their mentees to another missionary first."
                : "They will keep their sadhana level and history."}
            </p>
          </>
        )}
      </div>

      {/* Pastoral notes */}
      <div>
        <Field label="My pastoral notes" hint="Private — visible only to you and your superiors.">
          <Textarea
            rows={4}
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            maxLength={2000}
            placeholder="Their family situation, what inspires them, prayers and plans…"
          />
        </Field>
        <Button variant="secondary" className="mt-2" onClick={saveNotes} disabled={busy !== null}>
          {busy === "notes" ? "Saving…" : "Save notes"}
        </Button>
      </div>
    </div>
  );
}
