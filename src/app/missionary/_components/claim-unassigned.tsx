"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatDate } from "@/lib/utils";

export type UnassignedDevotee = {
  id: string;
  name: string;
  /** ISO datetime the devotee created their account. */
  joinedAt: string;
};

/**
 * Dashboard list of self-registered devotees who have no counsellor yet. The
 * missionary welcomes one into their group via POST /api/missionary/claim,
 * then we refresh so the row leaves both this list and the server data.
 */
export function ClaimUnassigned({ devotees }: { devotees: UnassignedDevotee[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function welcome(devotee: UnassignedDevotee) {
    setBusyId(devotee.id);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/missionary/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devoteeId: devotee.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not welcome this devotee. Please try again.");
        return;
      }
      setSuccess(`${devotee.name} is now in your group. Hare Krishna!`);
      router.refresh();
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
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

      <ul className="divide-y divide-saffron-900/10">
        {devotees.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-saffron-700">
                <Icon.lotus className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-saffron-950">{d.name}</p>
                <p className="flex items-center gap-1 text-xs text-stone-500">
                  <Icon.clock className="h-3.5 w-3.5" />
                  Joined {formatDate(d.joinedAt)}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              className="shrink-0"
              onClick={() => void welcome(d)}
              disabled={busyId !== null}
            >
              <Icon.claim className="h-4 w-4" />
              {busyId === d.id ? "Welcoming…" : "Welcome to my group"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
