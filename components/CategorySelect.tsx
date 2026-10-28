"use client";

import { shoppingItemMenu } from "@/app/actions";
import { CATEGORIES } from "@/lib/categories";

type Props = {
  name: string;
  category: string;
  /** Vare fra madplanen: hvilken uge og hvilken linje. */
  plan?: { from: string; to: string; item: string };
  /** Ekstra vare: dens id. */
  extraId?: number;
};

/** ⋯-menu på en vare: "Har det hjemme" eller flyt til en anden kategori (huskes til næste gang). */
export default function CategorySelect({ name, category, plan, extraId }: Props) {
  return (
    <form action={shoppingItemMenu} className="cat-menu">
      <input type="hidden" name="name" value={name} />
      {plan && (
        <>
          <input type="hidden" name="from" value={plan.from} />
          <input type="hidden" name="to" value={plan.to} />
          <input type="hidden" name="item" value={plan.item} />
        </>
      )}
      {extraId && <input type="hidden" name="extra_id" value={extraId} />}
      <span aria-hidden="true">⋯</span>
      {/* Den rigtige vælger ligger usynligt oven på prikkerne, så telefonens egen liste åbner ved tryk. */}
      <select
        name="choice"
        value={category}
        aria-label={`Valg for ${name}`}
        className="cat-select"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="har-hjemme">✓ Har det hjemme – fjern fra listen</option>
        <optgroup label="Flyt til kategori">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </optgroup>
      </select>
    </form>
  );
}
