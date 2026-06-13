/**
 * Pure helpers for sadhana streaks & monthly aggregates.
 * Date keys are YYYY-MM-DD strings. SadhanaEntry.date is a Postgres `date`
 * (UTC midnight when read back through Prisma), so deriving keys via
 * toISOString() always reproduces the stored calendar date exactly.
 */

const DAY_MS = 86_400_000;

/** Calendar-date key of a stored @db.Date value (UTC-safe). */
export function entryDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function keyToUtcMs(key: string): number {
  return Date.parse(`${key}T00:00:00Z`);
}

/** Shift a YYYY-MM-DD key by N days (UTC arithmetic, no DST surprises). */
export function shiftKey(key: string, days: number): string {
  return new Date(keyToUtcMs(key) + days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * current  — consecutive days with an entry ending today (or yesterday, if
 *            today hasn't been logged yet — the streak isn't broken until
 *            the day is over).
 * longest  — longest run of consecutive days ever.
 */
export function computeStreaks(
  keys: Set<string>,
  todayKey: string,
): { current: number; longest: number } {
  let cursor = keys.has(todayKey) ? todayKey : shiftKey(todayKey, -1);
  let current = 0;
  while (keys.has(cursor)) {
    current += 1;
    cursor = shiftKey(cursor, -1);
  }

  const sorted = [...keys].sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of sorted) {
    run = prev !== null && keyToUtcMs(k) - keyToUtcMs(prev) === DAY_MS ? run + 1 : 1;
    if (run > longest) longest = run;
    prev = k;
  }
  return { current, longest };
}

/** Days logged + average japa rounds for the month containing `todayKey`. */
export function monthAggregates(
  entries: { date: Date; japaRounds: number }[],
  todayKey: string,
): { daysLogged: number; avgJapa: number } {
  const prefix = todayKey.slice(0, 7); // YYYY-MM
  const monthEntries = entries.filter((e) => entryDateKey(e.date).startsWith(prefix));
  const daysLogged = monthEntries.length;
  const avgJapa =
    daysLogged === 0
      ? 0
      : Math.round((monthEntries.reduce((s, e) => s + e.japaRounds, 0) / daysLogged) * 10) / 10;
  return { daysLogged, avgJapa };
}

/**
 * Average chanting quality (1..10) for the month containing `todayKey`,
 * counting only days the devotee actually rated. Returns `{ avg: null, rated: 0 }`
 * when nothing was rated, so the UI can show a gentle "—" instead of a misleading 0.
 */
export function monthChantingQuality(
  entries: { date: Date; chantingQuality: number | null }[],
  todayKey: string,
): { avg: number | null; rated: number } {
  const prefix = todayKey.slice(0, 7); // YYYY-MM
  const rated = entries.filter(
    (e) => e.chantingQuality != null && entryDateKey(e.date).startsWith(prefix),
  );
  if (rated.length === 0) return { avg: null, rated: 0 };
  const sum = rated.reduce((s, e) => s + (e.chantingQuality ?? 0), 0);
  return { avg: Math.round((sum / rated.length) * 10) / 10, rated: rated.length };
}

/** The reflective word for a chanting-quality value (1..10). */
export function chantingQualityWord(q: number): string {
  if (q <= 2) return "Distracted";
  if (q <= 4) return "Struggling";
  if (q <= 6) return "Attentive";
  if (q <= 8) return "Absorbed";
  return "Blissful";
}
