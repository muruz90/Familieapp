import { addDays, isoWeek } from "./format.ts";

export type Repeat = "once" | "daily" | "weekly";

/** Mindste antal dage mellem to udførelser, fx 2 gange om ugen -> 3 dage. 1 gang om ugen styres kun af ugen. */
export function minGapDays(timesPerWeek: number): number {
  return timesPerWeek >= 2 ? Math.floor(7 / timesPerWeek) : 0;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400_000);
}

export type Availability = { allowed: boolean; doneInPeriod: number; nextDate?: string };

/**
 * Må opgaven udføres i dag?
 * `dates` er de lokale datoer (YYYY-MM-DD) for barnets tidligere, ikke-afviste udførelser af opgaven.
 */
export function availability(repeat: Repeat, timesPerWeek: number, dates: string[], today: string): Availability {
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
