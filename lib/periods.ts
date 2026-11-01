import { addDays, mondayOf } from "./format.ts";

export type Period = { from: string; to: string; saved: boolean };

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400_000);
}

/**
 * Indkøbsperioden, som en dato hører til.
 * `saved` er familiens egne perioder (fx søndag-lørdag eller fredag-onsdag), uden overlap.
 * Mellem og efter dem fortsætter appen i blokke af 7 dage fra den seneste egne periode,
 * så en familie, der handler om søndagen, også får søndag-lørdag de følgende uger.
 * Før den første egne periode bruges almindelige uger (mandag-søndag).
 */
export function periodFor(date: string, saved: { from: string; to: string }[]): Period {
  const sorted = [...saved].sort((a, b) => a.from.localeCompare(b.from));
  const hit = sorted.find((p) => p.from <= date && date <= p.to);
  if (hit) return { from: hit.from, to: hit.to, saved: true };

  const before = sorted.filter((p) => p.to < date).at(-1);
  const after = sorted.find((p) => p.from > date);
  let from: string;
  if (before) {
    const start = addDays(before.to, 1);
    from = addDays(start, Math.floor(daysBetween(start, date) / 7) * 7);
  } else {
    from = mondayOf(date);
  }
  let to = addDays(from, 6);
  if (after && after.from <= to) to = addDays(after.from, -1);
  return { from, to, saved: false };
}
