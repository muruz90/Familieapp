import { addDays } from "./format.ts";

/**
 * Antal dage i træk med mindst én opgave, talt baglæns fra `end`.
 * Dage i `held` (forældre har holdt streaken i live) bryder ikke streaken, men tæller heller ikke med.
 */
export function streakEndingAt(dates: Iterable<string>, end: string, held: Iterable<string> = []): number {
  const set = new Set(dates);
  const hold = new Set(held);
  let n = 0;
  for (let d = end; ; d = addDays(d, -1)) {
    if (set.has(d)) n++;
    else if (!hold.has(d)) break;
  }
  return n;
}

/** Den aktuelle streak: tæller fra i dag, eller fra i går hvis barnet ikke har nået dagens opgave endnu. */
export function currentStreak(dates: Iterable<string>, today: string, held: Iterable<string> = []): number {
  const set = new Set(dates);
  const hold = new Set(held);
  const start = set.has(today) || hold.has(today) ? today : addDays(today, -1);
  return streakEndingAt(set, start, hold);
}

/** Dagene fra og med `from` til og med `to`. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to && out.length < 62; d = addDays(d, 1)) out.push(d);
  return out;
}
