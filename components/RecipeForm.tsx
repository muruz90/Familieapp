"use client";

import { useActionState, useState } from "react";
import { saveRecipe } from "@/app/actions";
import FormMessage from "./FormMessage";

type Ing = { name: string; quantity: string; unit: string };
type Props = {
  recipe?: { id: number; name: string; servings: number; instructions: string; ingredients: { name: string; quantity: number | null; unit: string }[] };
};

const UNITS = ["g", "kg", "ml", "dl", "l", "stk", "tsk", "spsk", "fed", "dåse", "pk", "bdt", "knsp"];
const empty = (): Ing => ({ name: "", quantity: "", unit: "" });

export default function RecipeForm({ recipe }: Props) {
  const [state, action, pending] = useActionState(saveRecipe, undefined);
  const [rows, setRows] = useState<Ing[]>(() => {
    const start = recipe?.ingredients.map((i) => ({ name: i.name, quantity: i.quantity === null ? "" : String(i.quantity).replace(".", ","), unit: i.unit })) ?? [];
    return [...start, empty(), empty()].slice(0, Math.max(start.length + 1, 3));
  });
  const update = (i: number, patch: Partial<Ing>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  return (
    <form action={action} className="card">
      {recipe && <input type="hidden" name="id" value={recipe.id} />}
      <div className="form-grid">
        <label style={{ gridColumn: "1 / -1" }}>Navn<input name="name" defaultValue={recipe?.name} placeholder="Fx Lasagne" required /></label>
        <label>Antal personer<input name="servings" type="number" min={1} defaultValue={recipe?.servings ?? 4} required /></label>
      </div>

      <h3>Ingredienser</h3>
      <p className="muted">Brug samme navn for samme vare i alle opskrifter, så lægges mængderne sammen på indkøbslisten.</p>
      <datalist id="units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
      {rows.map((row, i) => (
        <div className="ing-row" key={i}>
          <input name="ing_name" placeholder="Vare" value={row.name} onChange={(e) => update(i, { name: e.target.value })} />
          <input name="ing_quantity" placeholder="Mængde" inputMode="decimal" value={row.quantity} onChange={(e) => update(i, { quantity: e.target.value })} />
          <input name="ing_unit" placeholder="Enhed" list="units" autoCapitalize="none" value={row.unit} onChange={(e) => update(i, { unit: e.target.value })} />
          <button type="button" className="secondary small" aria-label="Fjern" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <button type="button" className="secondary small" onClick={() => setRows((r) => [...r, empty()])}>+ Ingrediens</button>

      <label style={{ marginTop: "1rem" }}>Fremgangsmåde<textarea name="instructions" defaultValue={recipe?.instructions} /></label>
      <FormMessage state={state} />
      <div className="row">
        <button type="submit" disabled={pending}>Gem opskrift</button>
        <a className="btn secondary" href={recipe ? `/opskrifter/${recipe.id}` : "/opskrifter"}>Annullér</a>
      </div>
    </form>
  );
}
