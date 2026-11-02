import { addDays } from "./format.ts";

export type Repeat = "none" | "weekly" | "biweekly" | "monthly";
export const REPEATS: [Repeat, string][] = [
  ["none", "Gentages ikke"],
  ["weekly", "Hver uge"],
  ["biweekly", "Hver 2. uge"],
  ["monthly", "Hver måned"],
];

export function isRepeat(value: string): value is Repeat {
  return REPEATS.some(([r]) => r === value);
}

type Recurring = { starts_at: string; ends_at: string; repeat: string; repeat_until: string | null };

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400_000);
}

/** Flytter "YYYY-MM-DD" eller "YYYY-MM-DDTHH:MM" et antal dage og beholder klokkeslættet. */
const shift = (dt: string, days: number) => addDays(dt.slice(0, 10), days) + dt.slice(10);

function addMonths(date: string, months: number): string | null {
  const [y, m, d] = date.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  if (d > last) return null; // fx den 31. i en måned med 30 dage springes over
  return `${ny}-${String(nm).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Alle forekomster, der ligger (helt eller delvist) mellem from og to (datoer, begge med). */
export function occurrences<T extends Recurring>(e: T, from: string, to: string): T[] {
  const firstDay = e.starts_at.slice(0, 10);
  const length = daysBetween(firstDay, e.ends_at.slice(0, 10));
  const visible = (startDay: string) => startDay <= to && addDays(startDay, length) >= from;
  if (e.repeat === "none" || !isRepeat(e.repeat)) return visible(firstDay) ? [e] : [];

  const until = e.repeat_until && e.repeat_until < to ? e.repeat_until : to;
  const out: T[] = [];
  if (e.repeat === "monthly") {
    for (let i = 0; i < 1200; i++) {
      const day = addMonths(firstDay, i);
      if (day === null) continue;
      if (day > until) break;
      if (visible(day)) {
        const offset = daysBetween(firstDay, day);
        out.push({ ...e, starts_at: shift(e.starts_at, offset), ends_at: shift(e.ends_at, offset) });
      }
    }
    return out;
  }
  const step = e.repeat === "weekly" ? 7 : 14;
  // Spring direkte frem til omkring "from" i stedet for at gå uge for uge fra starten.
  const skip = Math.max(0, Math.floor((daysBetween(firstDay, from) - length) / step));
  for (let i = skip; ; i++) {
    const day = addDays(firstDay, i * step);
    if (day > until) break;
    if (visible(day)) out.push({ ...e, starts_at: shift(e.starts_at, i * step), ends_at: shift(e.ends_at, i * step) });
  }
  return out;
}

/** RRULE til kalender-feedet (iPhone viser selv gentagelserne). */
export function rrule(e: Recurring & { all_day: number }): string | null {
  const base = e.repeat === "weekly" ? "FREQ=WEEKLY" : e.repeat === "biweekly" ? "FREQ=WEEKLY;INTERVAL=2" : e.repeat === "monthly" ? "FREQ=MONTHLY" : null;
  if (!base) return null;
  if (!e.repeat_until) return `RRULE:${base}`;
  const d = e.repeat_until.replace(/-/g, "");
  // Med TZID på DTSTART skal UNTIL være i UTC (RFC 5545); slutningen af dagen dækker sidste forekomst.
  return `RRULE:${base};UNTIL=${e.all_day ? d : `${d}T225959Z`}`;
}
