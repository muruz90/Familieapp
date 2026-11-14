import { minGapDays } from "./tasks";

export function repeatText(repeat: "once" | "daily" | "weekly", timesPerWeek: number, shared = false): string {
  const base = repeatBase(repeat, timesPerWeek);
  return shared && repeat !== "once" ? `${base} · ét barn tager den` : base;
}

function repeatBase(repeat: "once" | "daily" | "weekly", timesPerWeek: number): string {
  if (repeat === "daily") return "Hver dag";
  if (repeat === "once") return "Fri opgave";
  if (timesPerWeek <= 1) return "1 gang om ugen";
  return `${timesPerWeek} gange om ugen, mindst ${minGapDays(timesPerWeek)} dage imellem`;
}
