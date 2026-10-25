import { prettyNumber } from "./format.ts";

export type Ingredient = { name: string; quantity: number | null; unit: string };
export type ShoppingItem = { key: string; name: string; amount: string; quantity: number | null; unit: string; recipes: string[] };

// Enheder der kan lægges sammen på tværs: alt omregnes til gram eller milliliter.
const MASS: Record<string, number> = { g: 1, gr: 1, gram: 1, kg: 1000 };
const VOLUME: Record<string, number> = { ml: 1, cl: 10, dl: 100, l: 1000, liter: 1000 };

function normUnit(unit: string) {
  return unit.trim().toLowerCase().replace(/\.$/, "");
}

export function normName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function formatAmount(quantity: number | null, dimension: string): { amount: string; unit: string } {
  if (quantity === null) return { amount: "", unit: "" };
  if (dimension === "mass") {
    return quantity >= 1000 ? { amount: `${prettyNumber(quantity / 1000)} kg`, unit: "kg" } : { amount: `${prettyNumber(quantity)} g`, unit: "g" };
  }
  if (dimension === "volume") {
    if (quantity >= 1000) return { amount: `${prettyNumber(quantity / 1000)} l`, unit: "l" };
    if (quantity >= 100) return { amount: `${prettyNumber(quantity / 100)} dl`, unit: "dl" };
    return { amount: `${prettyNumber(quantity)} ml`, unit: "ml" };
  }
  return { amount: dimension ? `${prettyNumber(quantity)} ${dimension}` : prettyNumber(quantity), unit: dimension };
}

/**
 * Læg ingredienser fra flere opskrifter sammen. Samme vare med enheder der kan
 * omregnes (fx 500 g + 1 kg) bliver til én linje; andre enheder holdes adskilt.
 */
export function aggregate(entries: { recipe: string; factor: number; ingredients: Ingredient[] }[]): ShoppingItem[] {
  const map = new Map<string, { name: string; quantity: number | null; dimension: string; recipes: Set<string> }>();
  for (const entry of entries) {
    for (const ing of entry.ingredients) {
      const unit = normUnit(ing.unit);
      let dimension = unit;
      let base = ing.quantity;
      if (unit in MASS) { dimension = "mass"; base = ing.quantity === null ? null : ing.quantity * MASS[unit]; }
      else if (unit in VOLUME) { dimension = "volume"; base = ing.quantity === null ? null : ing.quantity * VOLUME[unit]; }
      const scaled = base === null ? null : base * entry.factor;
      const key = `${normName(ing.name)}|${dimension}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity = existing.quantity === null || scaled === null ? existing.quantity ?? scaled : existing.quantity + scaled;
        existing.recipes.add(entry.recipe);
      } else {
        map.set(key, { name: ing.name.trim(), quantity: scaled, dimension, recipes: new Set([entry.recipe]) });
      }
    }
  }
  return [...map.entries()]
    .map(([key, v]) => {
      const rounded = v.quantity === null ? null : Math.round(v.quantity * 100) / 100;
      const { amount, unit } = formatAmount(rounded, v.dimension);
      return { key, name: v.name, amount, quantity: rounded, unit, recipes: [...v.recipes] };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "da"));
}
