"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input } from "@/components/ui";
import { Icon } from "@/components/icons";
import { SlideToMark } from "./slide-to-mark";

/**
 * One devotee row on the live attendance screen: name + level badge on the
 * left, the slide-to-mark control on the right, and an inline remarks editor
 * underneath. Owns the optimistic `present` state so the remarks save always
 * carries the latest value.
 */
export function AttendanceRow({
  sessionId,
  devoteeId,
  name,
  levelName,
  initialPresent,
  initialRemarks,
}: {
  sessionId: string;
  devoteeId: string;
  name: string;
  levelName: string | null;
  initialPresent: boolean;
  initialRemarks: string;
}) {
  const router = useRouter();
  const [present, setPresent] = useState(initialPresent);
  const [remarks, setRemarks] = useState(initialRemarks);
  const [savedRemarks, setSavedRemarks] = useState(initialRemarks);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep in sync when router.refresh() brings fresh server data
  // (render-time adjustment — see "storing information from previous renders").
  const [prevPresent, setPrevPresent] = useState(initialPresent);
  if (prevPresent !== initialPresent) {
    setPrevPresent(initialPresent);
    setPresent(initialPresent);
  }
  const [prevRemarks, setPrevRemarks] = useState(initialRemarks);
  if (prevRemarks !== initialRemarks) {
    setPrevRemarks(initialRemarks);
    setRemarks(initialRemarks);
    setSavedRemarks(initialRemarks);
  }

  const dirty = remarks.trim() !== savedRemarks.trim();

  async function saveRemarks() {
    if (!dirty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devoteeId, present, remarks: remarks.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not save remarks");
      }
      setSavedRemarks(remarks.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save remarks");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-saffron-950">{name}</p>
          <div className="mt-1">
            {levelName ? <Badge>{levelName}</Badge> : <Badge tone="gray">No level</Badge>}
          </div>
        </div>
        <SlideToMark
          sessionId={sessionId}
          devoteeId={devoteeId}
          present={present}
          onChange={setPresent}
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Input
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void saveRemarks();
            }
          }}
          placeholder="Remarks…"
          maxLength={500}
          className="h-8 py-1 text-xs"
        />
        {dirty ? (
          <Button
            type="button"
            variant="secondary"
            className="h-8 shrink-0 px-3 py-1 text-xs"
            onClick={() => void saveRemarks()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        ) : saved ? (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-green-700">
            <Icon.check className="h-3.5 w-3.5" />
            Saved
          </span>
        ) : null}
      </div>
      {error ? <p className="mt-1 text-xs text-maroon-700">{error}</p> : null}
    </div>
  );
}
