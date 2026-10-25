export const TZ = "Europe/Copenhagen";

/** Formatér øre som kroner, fx 2550 -> "25,50 kr." */
export function kr(ore: number): string {
  return (ore / 100).toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " kr.";
}

/** Læs et kronebeløb fra en formular ("25", "25,50", "25.5") og returnér øre. */
export function parseKr(input: string): number | null {
  const cleaned = input.trim().replace(/\s|kr\.?/gi, "").replace(",", ".");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * 100);
}

/** Dagens dato (YYYY-MM-DD) i dansk tid. */
export function todayLocal(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Mandag i ugen for en given dato. */
export function mondayOf(date: string): string {
  const d = new Date(date + "T12:00:00Z");
  const weekday = (d.getUTCDay() + 6) % 7;
  return addDays(date, -weekday);
}

/** ISO-ugenummer, fx "2026-W43". */
export function isoWeek(date: string): string {
  const d = new Date(date + "T12:00:00Z");
  const weekday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - weekday + 3);
  const year = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((d.getTime() - jan4.getTime()) / 86400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function weekNumber(date: string): number {
  return Number(isoWeek(date).split("W")[1]);
}

/** Den periode en opgave kan udføres i: én gang, pr. dag eller pr. uge. */
export function taskPeriod(repeat: "once" | "daily" | "weekly", now = new Date()): string {
  const today = todayLocal(now);
  if (repeat === "daily") return today;
  if (repeat === "weekly") return isoWeek(today);
  return "once";
}

const weekdayFmt = new Intl.DateTimeFormat("da-DK", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });

export function prettyDate(date: string): string {
  const s = weekdayFmt.format(new Date(date + "T12:00:00Z"));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function prettyDateTime(iso: string): string {
  return new Date(iso).toLocaleString("da-DK", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });
}

export function prettyNumber(n: number): string {
  return n.toLocaleString("da-DK", { maximumFractionDigits: 2 });
}
