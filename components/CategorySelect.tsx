"use client";

import { setItemCategory } from "@/app/actions";
import { CATEGORIES } from "@/lib/categories";

/** Lille vælger, der flytter en vare til en anden kategori. Valget huskes til næste gang. */
export default function CategorySelect({ name, category }: { name: string; category: string }) {
  return (
    <form action={setItemCategory} className="cat-menu">
      <input type="hidden" name="name" value={name} />
      <span aria-hidden="true">⋯</span>
      {/* Den rigtige vælger ligger usynligt oven på prikkerne, så telefonens egen liste åbner ved tryk. */}
      <select
        name="category"
        defaultValue={category}
        aria-label={`Flyt ${name} til en anden kategori`}
        className="cat-select"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </form>
  );
}
