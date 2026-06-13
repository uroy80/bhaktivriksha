"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Slide-to-mark attendance control.
 *
 * A real touch slider built on pointer events (works for finger, pen and
 * mouse). Drag the thumb right past 70% of the track to mark PRESENT; when
 * present, drag it left past 70% to unmark. A plain tap toggles as a
 * fallback. The change is optimistic: the parent state flips immediately via
 * `onChange`, the PUT fires in the background, and a failure reverts + shows
 * an inline error.
 */

const TRACK_FALLBACK_W = 160; // matches w-40 before the first measure
const THUMB_W = 28; // h-7 w-7
const PAD = 4; // inset of the thumb inside the track

export function SlideToMark({
  sessionId,
  devoteeId,
  present,
  onChange,
}: {
  sessionId: string;
  devoteeId: string;
  present: boolean;
  /** Parent owns the `present` state; called optimistically and on revert. */
  onChange: (next: boolean) => void;
}) {
  const router = useRouter();
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startPos: number;
    lastPos: number;
    moved: boolean;
  } | null>(null);
  const busy = useRef(false);

  const [dragPos, setDragPos] = useState<number | null>(null);
  const [grabbed, setGrabbed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Horizontal distance the thumb can travel inside the track. */
  function travel(): number {
    const w = trackRef.current?.getBoundingClientRect().width ?? TRACK_FALLBACK_W;
    return Math.max(0, w - THUMB_W - PAD * 2);
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (busy.current || drag.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const startPos = present ? travel() : 0;
    drag.current = { pointerId: e.pointerId, startX: e.clientX, startPos, lastPos: startPos, moved: false };
    setGrabbed(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const delta = e.clientX - d.startX;
    if (Math.abs(delta) > 4) d.moved = true;
    d.lastPos = Math.min(travel(), Math.max(0, d.startPos + delta));
    setDragPos(d.lastPos);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setGrabbed(false);
    setDragPos(null); // snap back unless we commit below

    if (!d.moved) {
      // Tap fallback: a simple click toggles.
      void commit(!present);
      return;
    }
    const fraction = travel() > 0 ? d.lastPos / travel() : 0;
    if (!present && fraction >= 0.7) void commit(true);
    else if (present && fraction <= 0.3) void commit(false);
  }

  function onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    setGrabbed(false);
    setDragPos(null);
  }

  function showError(message: string) {
    setError(message);
    if (errorTimer.current) clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setError(null), 3500);
  }

  async function commit(next: boolean) {
    if (busy.current || next === present) return;
    busy.current = true;
    setError(null);
    onChange(next); // optimistic flip
    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devoteeId, present: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Could not save attendance");
      }
      router.refresh();
    } catch (err) {
      onChange(present); // revert to the value before the flip
      showError(err instanceof Error ? err.message : "Could not save attendance");
    } finally {
      busy.current = false;
    }
  }

  // While dragging the thumb follows the pointer via inline `left`; at rest the
  // position comes from CSS classes so render never has to measure the track.
  const dragging = dragPos !== null;

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <div
        ref={trackRef}
        role="switch"
        aria-checked={present}
        aria-label={present ? "Marked present — slide left or tap to unmark" : "Absent — slide right or tap to mark present"}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            void commit(!present);
          }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className={cn(
          "relative h-9 w-40 cursor-pointer touch-none select-none rounded-full ring-1 ring-inset transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-saffron-600",
          present ? "bg-green-500 ring-green-700/30" : "bg-stone-200 ring-stone-400/40",
        )}
      >
        {/* Track label, kept clear of the thumb */}
        <span
          className={cn(
            "pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-semibold tracking-wide transition-colors duration-300",
            present ? "pr-7 text-white" : "pl-7 text-stone-500",
          )}
        >
          {present ? "Present ✓" : "Absent"}
        </span>

        {/* Thumb */}
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[11px] font-bold shadow-md ring-1 ring-black/10",
            grabbed ? "scale-110 shadow-lg" : "scale-100",
            dragging ? "transition-none" : "transition-all duration-300 ease-out",
            // rest position: 4px inset on the left, or thumb+inset from the right
            !dragging && (present ? "left-[calc(100%-2rem)]" : "left-1"),
            present ? "text-green-600" : "text-stone-400",
          )}
          style={dragging ? { left: PAD + dragPos } : undefined}
        >
          {present ? "✓" : "›"}
        </span>
      </div>
      {error ? <p className="max-w-40 text-right text-xs text-maroon-700">{error}</p> : null}
    </div>
  );
}
