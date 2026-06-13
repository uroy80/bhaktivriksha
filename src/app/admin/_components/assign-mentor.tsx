"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Select } from "@/components/ui";
import { Icon } from "@/components/icons";

type MentorOption = { id: string; name: string; role: "ADMIN" | "MISSIONARY" };

/**
 * Inline "Assign to…" control for an unassigned devotee. Picks an active
 * missionary/admin and PATCHes the existing admin devotee endpoint, which
 * validates the mentor and guards against hierarchy cycles. On success we
 * refresh so the row drops off the unassigned list.
 */
export function AssignMentor({
  devoteeId,
  mentors,
}: {
  devoteeId: string;
  mentors: MentorOption[];
}) {
  const router = useRouter();
  const [mentorId, setMentorId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function assign() {
    if (!mentorId) {
      setError("Choose a missionary first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/devotees/${devoteeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mentorId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      // Row leaves the unassigned list on refresh.
      router.refresh();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Assign to missionary"
          value={mentorId}
          onChange={(e) => {
            setMentorId(e.target.value);
            setError(null);
          }}
          disabled={busy || mentors.length === 0}
          className="h-9 py-1.5 text-xs sm:w-52"
        >
          <option value="">
            {mentors.length === 0 ? "No missionaries available" : "Assign to…"}
          </option>
          {mentors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.role === "ADMIN" ? "Admin" : "Missionary"})
            </option>
          ))}
        </Select>
        <Button
          type="button"
          variant="secondary"
          className="h-9 px-3 py-1.5 text-xs"
          disabled={busy || !mentorId}
          onClick={() => void assign()}
        >
          <Icon.claim className="h-4 w-4" />
          {busy ? "Assigning…" : "Assign"}
        </Button>
      </div>
      {error ? (
        <p className="text-xs font-medium text-maroon-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
