"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";

export type SadhanaInitial = {
  japaRounds: number;
  readingMinutes: number;
  mangalArati: boolean;
  eveningArati: boolean;
  lectureHeard: boolean;
  notes: string;
};

export function SadhanaForm({
  dateKey,
  todayKey,
  initial,
}: {
  dateKey: string;
  todayKey: string;
  initial: SadhanaInitial | null;
}) {
  const router = useRouter();
  const [pickedDate, setPickedDate] = useState(dateKey);
  const [japa, setJapa] = useState(initial?.japaRounds ?? 0);
  const [reading, setReading] = useState(initial?.readingMinutes ?? 0);
  const [mangal, setMangal] = useState(initial?.mangalArati ?? false);
  const [evening, setEvening] = useState(initial?.eveningArati ?? false);
  const [lecture, setLecture] = useState(initial?.lectureHeard ?? false);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onDateChange(value: string) {
    setPickedDate(value);
    if (!value || value > todayKey) return;
    router.replace(`/devotee/sadhana?date=${value}`);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    try {
      const res = await fetch("/api/sadhana", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateKey,
          japaRounds: japa,
          readingMinutes: reading,
          mangalArati: mangal,
          eveningArati: evening,
          lectureHeard: lecture,
          notes: notes.trim() ? notes.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setMsg({ kind: "err", text: data?.error ?? "Could not save. Please try again." });
      } else {
        setMsg({
          kind: "ok",
          text: dateKey === todayKey ? "Hare Krishna! Today's sadhana saved 🙏" : "Sadhana saved 🙏",
        });
        toastTimer.current = setTimeout(() => setMsg(null), 4000);
        router.refresh();
      }
    } catch {
      setMsg({ kind: "err", text: "Network error — please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="max-w-xs">
          <Label htmlFor="sadhana-date">Day</Label>
          <Input
            id="sadhana-date"
            type="date"
            value={pickedDate}
            max={todayKey}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>

        <Stepper
          label="Japa rounds"
          icon="📿"
          value={japa}
          onChange={setJapa}
          step={1}
          max={192}
        />
        <Stepper
          label="Reading (minutes)"
          icon="📖"
          value={reading}
          onChange={setReading}
          step={5}
          max={1440}
        />

        <div>
          <Label>Practices</Label>
          <div className="flex flex-wrap gap-2">
            <Chip active={mangal} onClick={() => setMangal((v) => !v)}>
              🌅 Mangal Arati
            </Chip>
            <Chip active={evening} onClick={() => setEvening((v) => !v)}>
              🪔 Evening Arati
            </Chip>
            <Chip active={lecture} onClick={() => setLecture((v) => !v)}>
              🎧 Lecture heard
            </Chip>
          </div>
        </div>

        <div>
          <Label htmlFor="sadhana-notes">Notes</Label>
          <Textarea
            id="sadhana-notes"
            rows={3}
            maxLength={2000}
            placeholder="Realizations, struggles, gratitude…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <Button
          onClick={save}
          disabled={saving}
          className="w-full py-3 text-base"
          aria-busy={saving}
        >
          {saving ? "Saving…" : "Save sadhana"}
        </Button>

        {msg ? (
          <p
            role="status"
            className={cn(
              "rounded-lg px-4 py-3 text-center text-sm font-medium",
              msg.kind === "ok"
                ? "bg-green-50 text-green-800 ring-1 ring-green-600/20"
                : "bg-maroon-50 text-maroon-800 ring-1 ring-maroon-600/20",
            )}
          >
            {msg.text}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

/* Big-touch-target number stepper — mobile first. */
function Stepper({
  label,
  icon,
  value,
  onChange,
  step,
  max,
}: {
  label: string;
  icon: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  max: number;
}) {
  const clamp = (v: number) => Math.max(0, Math.min(max, Math.round(v)));
  return (
    <div>
      <Label>
        {icon} {label}
      </Label>
      <div className="flex items-center justify-center gap-5 rounded-xl bg-saffron-50 px-4 py-3 ring-1 ring-saffron-900/10">
        <button
          type="button"
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={() => onChange(clamp(value - step))}
          className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-2xl font-bold text-saffron-700 shadow-sm ring-1 ring-saffron-300 transition-colors hover:bg-saffron-100 active:bg-saffron-200"
        >
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={max}
          value={value}
          aria-label={label}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) ? clamp(n) : 0);
          }}
          className="w-24 bg-transparent text-center text-4xl font-bold text-saffron-950 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => onChange(clamp(value + step))}
          className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-saffron-600 text-2xl font-bold text-white shadow-sm transition-colors hover:bg-saffron-700 active:bg-saffron-800"
        >
          +
        </button>
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition-colors",
        active
          ? "bg-saffron-600 text-white ring-saffron-600 shadow-sm"
          : "bg-white text-saffron-800 ring-saffron-300 hover:bg-saffron-50",
      )}
    >
      {children} {active ? "✓" : ""}
    </button>
  );
}
