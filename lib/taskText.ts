import { minGapDays, parseWeekdays } from "./tasks.ts";

const DAYS = ["mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag"];

export function repeatText(repeat: "once" | "daily" | "weekly", timesPerWeek: number, shared = false, weekdays: string | null = null): string {
  const days = repeat === "daily" ? parseWeekdays(weekdays) : [];
  const base = days.length ? daysText(days) : repeatBase(repeat, timesPerWeek);
  return shared && repeat !== "once" ? `${base} · ét barn tager den` : base;
}

function repeatBase(repeat: "once" | "daily" | "weekly", timesPerWeek: number): string {
  if (repeat === "daily") return "Hver dag";
  if (repeat === "once") return "Fri opgave";
  if (timesPerWeek <= 1) return "1 gang om ugen";
  return `${timesPerWeek} gange om ugen, mindst ${minGapDays(timesPerWeek)} dage imellem`;
}

/** [2, 4] -> "Hver tirsdag og torsdag" */
export function daysText(days: number[]): string {
  if (days.join() === "1,2,3,4,5") return "Hverdage";
  if (days.join() === "6,7") return "Hver weekend";
  const names = days.map((d) => DAYS[d - 1]);
  return "Hver " + (names.length > 1 ? `${names.slice(0, -1).join(", ")} og ${names.at(-1)}` : names[0]);
}
