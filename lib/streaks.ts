import { addDays } from "./format.ts";

/** Antal dage i træk med mindst én opgave, talt baglæns fra `end`. */
export function streakEndingAt(dates: Iterable<string>, end: string): number {
  const set = new Set(dates);
  let n = 0;
  while (set.has(addDays(end, -n))) n++;
  return n;
}

/** Den aktuelle streak: tæller fra i dag, eller fra i går hvis barnet ikke har nået dagens opgave endnu. */
export function currentStreak(dates: Iterable<string>, today: string): number {
  const set = new Set(dates);
  return set.has(today) ? streakEndingAt(set, today) : streakEndingAt(set, addDays(today, -1));
}
