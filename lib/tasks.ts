import { addDays, isoWeek } from "./format.ts";

export type Repeat = "once" | "daily" | "weekly";

/** Mindste antal dage mellem to udførelser, fx 2 gange om ugen -> 3 dage. 1 gang om ugen styres kun af ugen. */
export function minGapDays(timesPerWeek: number): number {
  return timesPerWeek >= 2 ? Math.floor(7 / timesPerWeek) : 0;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400_000);
}

/** 1 = mandag ... 7 = søndag */
export const isoWeekday = (date: string) => ((new Date(date + "T12:00:00Z").getUTCDay() + 6) % 7) + 1;

/** "2,4" -> [2, 4]; tom/ugyldig -> []. */
export function parseWeekdays(raw: string | null | undefined): number[] {
  return [...new Set((raw ?? "").split(",").map(Number).filter((n) => n >= 1 && n <= 7))].sort();
}

/** Første dag efter `date` (eller fra og med, hvis `inclusive`) der falder på en af ugedagene. */
export function nextWeekday(date: string, weekdays: number[], inclusive = false): string {
  let d = inclusive ? date : addDays(date, 1);
  for (let i = 0; i < 7 && !weekdays.includes(isoWeekday(d)); i++) d = addDays(d, 1);
  return d;
}

export type Availability = { allowed: boolean; doneInPeriod: number; nextDate?: string };

/**
 * Må opgaven udføres i dag?
 * `dates` er de lokale datoer (YYYY-MM-DD) for barnets tidligere, ikke-afviste udførelser af opgaven.
 */
export function availability(repeat: Repeat, timesPerWeek: number, dates: string[], today: string, weekdays: number[] = []): Availability {
  if (repeat === "daily" && weekdays.length) {
    // Fast opgave på bestemte ugedage: kan gøres én gang på hver af dagene og kommer igen hver uge.
    const done = dates.filter((d) => d === today).length;
    if (!weekdays.includes(isoWeekday(today))) return { allowed: false, doneInPeriod: 0, nextDate: nextWeekday(today, weekdays) };
    return done ? { allowed: false, doneInPeriod: done, nextDate: nextWeekday(today, weekdays) } : { allowed: true, doneInPeriod: 0 };
  }
  if (repeat === "once") return { allowed: dates.length === 0, doneInPeriod: dates.length };
  if (repeat === "daily") {
    const done = dates.filter((d) => d === today).length;
    return done ? { allowed: false, doneInPeriod: done, nextDate: addDays(today, 1) } : { allowed: true, doneInPeriod: 0 };
  }

  const week = isoWeek(today);
  const doneInPeriod = dates.filter((d) => isoWeek(d) === week).length;
  const limit = Math.max(1, timesPerWeek);
  if (doneInPeriod >= limit) {
    let next = addDays(today, 1);
    while (isoWeek(next) === week) next = addDays(next, 1);
    const last = dates.sort().at(-1)!;
    const afterGap = addDays(last, minGapDays(limit));
    return { allowed: false, doneInPeriod, nextDate: afterGap > next ? afterGap : next };
  }
  const gap = minGapDays(limit);
  const last = dates.filter((d) => d <= today).sort().at(-1);
  if (gap && last && daysBetween(last, today) < gap) {
    return { allowed: false, doneInPeriod, nextDate: addDays(last, gap) };
  }
  return { allowed: true, doneInPeriod };
}
