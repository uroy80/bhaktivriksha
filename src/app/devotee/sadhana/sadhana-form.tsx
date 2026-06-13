"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { cn } from "@/lib/utils";
import { chantingQualityWord } from "./sadhana-stats";

export type SadhanaInitial = {
  japaRounds: number;
  chantingQuality: number | null;
  readingMinutes: number;
  mangalArati: boolean;
  eveningArati: boolean;
  lectureHeard: boolean;
  notes: string;
};

const JAPA_MAX = 192;
const JAPA_SLIDER_MAX = 64; // slider hero range; values above reachable via nudge
const JAPA_CHIPS = [1, 16, 32, 64];

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
  const [quality, setQuality] = useState<number | null>(initial?.chantingQuality ?? null);
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
          chantingQuality: quality,
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
          text:
            dateKey === todayKey
              ? "Hare Krishna! Today's sadhana saved"
              : "Hare Krishna! Sadhana saved",
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

  const isToday = dateKey === todayKey;

  return (
    <Card className="overflow-hidden p-0">
      {/* Warm devotional header */}
      <div className="bg-gradient-to-br from-saffron-400 to-saffron-600 px-6 py-5 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-white/30">
            <Icon.lotus className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-bold leading-tight">
              {isToday ? "Today's offering" : "Daily offering"}
            </h2>
            <p className="text-sm text-white/85">A loving record of your practice</p>
          </div>
        </div>
      </div>

      <div className="space-y-7 p-6">
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

        {/* JAPA — the hero slider */}
        <JapaSlider value={japa} onChange={setJapa} />

        {/* QUALITY OF CHANTING — reflective slider */}
        <QualitySlider value={quality} onChange={setQuality} />

        {/* READING minutes */}
        <ReadingStepper value={reading} onChange={setReading} />

        {/* PRACTICES toggles */}
        <div>
          <Label>Practices</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <PracticeChip
              icon="mangalArati"
              label="Mangal Arati"
              active={mangal}
              onClick={() => setMangal((v) => !v)}
            />
            <PracticeChip
              icon="eveningArati"
              label="Evening Arati"
              active={evening}
              onClick={() => setEvening((v) => !v)}
            />
            <PracticeChip
              icon="lecture"
              label="Lecture heard"
              active={lecture}
              onClick={() => setLecture((v) => !v)}
            />
          </div>
        </div>

        {/* NOTES */}
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
          {saving ? (
            "Saving…"
          ) : (
            <>
              <Icon.lotus className="h-5 w-5" />
              Save sadhana
            </>
          )}
        </Button>

        {msg ? (
          <p
            role="status"
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-center text-sm font-medium",
              msg.kind === "ok"
                ? "bg-green-50 text-green-800 ring-1 ring-green-600/20"
                : "bg-maroon-50 text-maroon-800 ring-1 ring-maroon-600/20",
            )}
          >
            {msg.kind === "ok" ? <Icon.check className="h-4 w-4 shrink-0" /> : null}
            {msg.text}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- *
 * Japa rounds — the hero slider (0..64) with quick-set vow chips.   *
 * ---------------------------------------------------------------- */
function JapaSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.max(0, Math.min(JAPA_MAX, Math.round(v)));
  // Fill ratio is capped at the slider's visual range for the track.
  const pct = Math.min(100, (Math.min(value, JAPA_SLIDER_MAX) / JAPA_SLIDER_MAX) * 100);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-saffron-100 text-saffron-700">
          <Icon.japa className="h-4 w-4" />
        </span>
        <Label className="mb-0">Japa rounds</Label>
      </div>

      <div className="rounded-xl bg-saffron-50 p-5 ring-1 ring-saffron-900/10">
        {/* Big current value */}
        <div className="mb-4 flex items-end justify-center gap-2">
          <span className="text-6xl font-extrabold leading-none text-saffron-600 tabular-nums">
            {value}
          </span>
          <span className="mb-1.5 text-lg font-semibold text-saffron-900/60">
            {value === 1 ? "round" : "rounds"}
          </span>
        </div>

        {/* Custom slider track */}
        <div className="relative mt-2 h-12">
          {/* base track */}
          <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-saffron-200" />
          {/* saffron fill */}
          <div
            className="pointer-events-none absolute left-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-gradient-to-r from-saffron-400 to-saffron-600"
            style={{ width: `${pct}%` }}
          />
          {/* thumb */}
          <div
            className="pointer-events-none absolute top-1/2 z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-saffron-600 shadow-md"
            style={{ left: `${pct}%` }}
          />
          <input
            type="range"
            min={0}
            max={JAPA_SLIDER_MAX}
            step={1}
            value={Math.min(value, JAPA_SLIDER_MAX)}
            aria-label="Japa rounds"
            onChange={(e) => onChange(clamp(Number(e.target.value)))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        {/* Quick-set vow chips */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {JAPA_CHIPS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={value === n}
              className={cn(
                "cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold ring-1 transition-colors",
                value === n
                  ? "bg-saffron-600 text-white ring-saffron-600 shadow-sm"
                  : "bg-white text-saffron-800 ring-saffron-300 hover:bg-saffron-100",
              )}
            >
              {n}
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-saffron-300" aria-hidden />
          <NudgeButton
            label="Decrease japa rounds"
            disabled={value <= 0}
            onClick={() => onChange(clamp(value - 1))}
          >
            <Icon.minus className="h-4 w-4" />
          </NudgeButton>
          <NudgeButton
            label="Increase japa rounds"
            disabled={value >= JAPA_MAX}
            onClick={() => onChange(clamp(value + 1))}
          >
            <Icon.plus className="h-4 w-4" />
          </NudgeButton>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Quality of chanting — reflective slider (1..10), optional/null.   *
 * ---------------------------------------------------------------- */
function QualitySlider({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const rated = value != null;
  const shown = value ?? 1;
  const pct = ((shown - 1) / 9) * 100;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-saffron-100 text-saffron-700">
          <Icon.bliss className="h-4 w-4" />
        </span>
        <Label className="mb-0">Quality of chanting</Label>
        <span className="ml-auto text-xs text-saffron-900/50">1 distracted · 10 blissful</span>
      </div>

      <div className="rounded-xl bg-saffron-50 p-5 ring-1 ring-saffron-900/10">
        {/* Current value + reflective word */}
        <div className="mb-4 flex items-end justify-center gap-3">
          {rated ? (
            <>
              <span className="text-6xl font-extrabold leading-none text-saffron-700 tabular-nums">
                {value}
              </span>
              <span className="mb-1.5 flex flex-col">
                <span className="text-lg font-semibold text-saffron-900/60">/ 10</span>
                <span className="text-base font-semibold text-saffron-700">
                  {chantingQualityWord(value)}
                </span>
              </span>
            </>
          ) : (
            <span className="py-2 text-lg font-medium text-saffron-900/40">Not rated yet</span>
          )}
        </div>

        {/* Custom gradient slider track (maroon → saffron → gold) */}
        <div className="relative mt-2 h-12">
          <div
            className={cn(
              "pointer-events-none absolute left-0 right-0 top-1/2 h-3 -translate-y-1/2 rounded-full",
              "bg-[linear-gradient(to_right,#8a1c2b,#d97706,#f59e0b,#fbbf24)]",
              !rated && "opacity-30",
            )}
          />
          {rated ? (
            <div
              className="pointer-events-none absolute top-1/2 z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-md"
              style={{
                left: `${pct}%`,
                backgroundColor: qualityColor(shown),
              }}
            />
          ) : null}
          <input
            type="range"
            min={1}
            max={10}
            step={1}
            value={shown}
            aria-label="Quality of chanting"
            aria-valuetext={rated ? `${value} of 10, ${chantingQualityWord(value)}` : "Not rated"}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        {/* Tick scale + clear */}
        <div className="mt-3 flex items-center justify-between px-0.5 text-[10px] font-medium text-saffron-900/40">
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
        {rated ? (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => onChange(null)}
              className="cursor-pointer text-xs font-medium text-saffron-700 underline-offset-2 hover:underline"
            >
              Clear rating
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Warm color along the maroon → saffron → gold scale for quality 1..10. */
function qualityColor(q: number): string {
  if (q <= 2) return "#8a1c2b"; // maroon
  if (q <= 4) return "#b45309"; // deep amber
  if (q <= 6) return "#d97706"; // saffron
  if (q <= 8) return "#f59e0b"; // bright saffron
  return "#fbbf24"; // gold
}

/* ---------------------------------------------------------------- *
 * Reading minutes — clean stepper (step 5).                        *
 * ---------------------------------------------------------------- */
function ReadingStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const max = 1440;
  const clamp = (v: number) => Math.max(0, Math.min(max, Math.round(v)));
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-saffron-100 text-saffron-700">
          <Icon.reading className="h-4 w-4" />
        </span>
        <Label className="mb-0">Reading (minutes)</Label>
      </div>
      <div className="flex items-center justify-center gap-5 rounded-xl bg-saffron-50 px-4 py-3 ring-1 ring-saffron-900/10">
        <button
          type="button"
          aria-label="Decrease reading minutes"
          onClick={() => onChange(clamp(value - 5))}
          className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-saffron-700 shadow-sm ring-1 ring-saffron-300 transition-colors hover:bg-saffron-100 active:bg-saffron-200"
        >
          <Icon.minus className="h-6 w-6" />
        </button>
        <div className="flex w-28 items-baseline justify-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={max}
            value={value}
            aria-label="Reading minutes"
            onChange={(e) => {
              const n = Number(e.target.value);
              onChange(Number.isFinite(n) ? clamp(n) : 0);
            }}
            className="w-20 bg-transparent text-center text-4xl font-bold text-saffron-950 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-sm font-semibold text-saffron-900/50">min</span>
        </div>
        <button
          type="button"
          aria-label="Increase reading minutes"
          onClick={() => onChange(clamp(value + 5))}
          className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full bg-saffron-600 text-white shadow-sm transition-colors hover:bg-saffron-700 active:bg-saffron-800"
        >
          <Icon.plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}

function NudgeButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-saffron-700 ring-1 ring-saffron-300 transition-colors hover:bg-saffron-100 active:bg-saffron-200 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function PracticeChip({
  icon,
  label,
  active,
  onClick,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const IconCmp = Icon[icon];
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold ring-1 transition-colors",
        active
          ? "bg-saffron-600 text-white ring-saffron-600 shadow-sm"
          : "bg-white text-saffron-800 ring-saffron-300 hover:bg-saffron-50",
      )}
    >
      <IconCmp className="h-5 w-5 shrink-0" />
      <span className="truncate">{label}</span>
      {active ? <Icon.check className="h-4 w-4 shrink-0" /> : null}
    </button>
  );
}
