"use client";

import { useActionState, useState } from "react";
import { saveRecipe } from "@/app/actions";
import FormMessage from "./FormMessage";

type Ing = { name: string; quantity: string; unit: string };
type Section = { name: string; instructions: string; ingredients: Ing[] };
type Props = {
  recipe?: {
    id: number;
    name: string;
    servings: number;
    sections: { name: string; instructions: string; ingredients: { name: string; quantity: number | null; unit: string }[] }[];
  };
};

const UNITS = ["g", "kg", "ml", "dl", "l", "stk", "tsk", "spsk", "fed", "dåse", "pk", "bdt", "knsp"];
const emptyIng = (): Ing => ({ name: "", quantity: "", unit: "" });
const emptySection = (name = ""): Section => ({ name, instructions: "", ingredients: [emptyIng(), emptyIng(), emptyIng()] });

export default function RecipeForm({ recipe }: Props) {
  const [state, action, pending] = useActionState(saveRecipe, undefined);
  const [sections, setSections] = useState<Section[]>(() =>
    recipe?.sections.length
      ? recipe.sections.map((s) => ({
          name: s.name,
          instructions: s.instructions,
          ingredients: [
            ...s.ingredients.map((i) => ({ name: i.name, quantity: i.quantity === null ? "" : String(i.quantity).replace(".", ","), unit: i.unit })),
            emptyIng(),
          ],
        }))
      : [emptySection()],
  );

  const updateSection = (si: number, patch: Partial<Section>) => setSections((all) => all.map((s, j) => (j === si ? { ...s, ...patch } : s)));
  const updateIng = (si: number, ii: number, patch: Partial<Ing>) =>
    setSections((all) => all.map((s, j) => (j === si ? { ...s, ingredients: s.ingredients.map((g, k) => (k === ii ? { ...g, ...patch } : g)) } : s)));
  const multiple = sections.length > 1;

  return (
    <form action={action} className="card">
      {recipe && <input type="hidden" name="id" value={recipe.id} />}
      <div className="form-grid">
        <label style={{ gridColumn: "1 / -1" }}>Navn<input name="name" defaultValue={recipe?.name} placeholder="Fx Boller i karry" required /></label>
        <label>Antal personer<input name="servings" type="number" min={1} defaultValue={recipe?.servings ?? 4} required /></label>
      </div>
      <p className="muted">Brug samme navn for samme vare i alle opskrifter, så lægges mængderne sammen på indkøbslisten.</p>
      <datalist id="units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>

      {sections.map((sec, si) => (
        <fieldset key={si} className="section">
          {multiple ? (
            <div className="spread">
              <input name="sec_name" placeholder="Afsnit, fx Boller" value={sec.name} onChange={(e) => updateSection(si, { name: e.target.value })} style={{ flex: 1, fontWeight: 600 }} />
              <button type="button" className="secondary small" onClick={() => setSections((all) => all.filter((_, j) => j !== si))}>Fjern afsnit</button>
            </div>
          ) : (
            <input type="hidden" name="sec_name" value={sec.name} />
          )}

          <h3 style={{ marginTop: ".75rem" }}>Ingredienser</h3>
          {sec.ingredients.map((row, ii) => (
            <div className="ing-row" key={ii}>
              <input type="hidden" name="ing_section" value={si} />
              <input name="ing_name" placeholder="Vare" value={row.name} onChange={(e) => updateIng(si, ii, { name: e.target.value })} />
              <input name="ing_quantity" placeholder="Mængde" inputMode="decimal" value={row.quantity} onChange={(e) => updateIng(si, ii, { quantity: e.target.value })} />
              <input name="ing_unit" placeholder="Enhed" list="units" autoCapitalize="none" value={row.unit} onChange={(e) => updateIng(si, ii, { unit: e.target.value })} />
              <button type="button" className="secondary small" aria-label="Fjern" onClick={() => updateSection(si, { ingredients: sec.ingredients.filter((_, k) => k !== ii) })}>✕</button>
            </div>
          ))}
          <button type="button" className="secondary small" onClick={() => updateSection(si, { ingredients: [...sec.ingredients, emptyIng()] })}>+ Ingrediens</button>

          <label style={{ marginTop: "1rem" }}>Fremgangsmåde
            <textarea name="sec_instructions" value={sec.instructions} onChange={(e) => updateSection(si, { instructions: e.target.value })} />
          </label>
        </fieldset>
      ))}

      <p>
        <button type="button" className="secondary" onClick={() => setSections((all) => [...all, emptySection()])}>
          + Tilføj afsnit {multiple ? "" : "(fx sovs eller tilbehør)"}
        </button>
      </p>
      <FormMessage state={state} />
      <div className="row">
        <button type="submit" disabled={pending}>Gem opskrift</button>
        <a className="btn secondary" href={recipe ? `/opskrifter/${recipe.id}` : "/opskrifter"}>Annullér</a>
      </div>
    </form>
  );
}
