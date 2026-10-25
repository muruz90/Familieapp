import { minGapDays } from "./tasks";

export function repeatText(repeat: "once" | "daily" | "weekly", timesPerWeek: number): string {
  if (repeat === "daily") return "Hver dag";
  if (repeat === "once") return "Én gang";
  if (timesPerWeek <= 1) return "1 gang om ugen";
  return `${timesPerWeek} gange om ugen, mindst ${minGapDays(timesPerWeek)} dage imellem`;
}
