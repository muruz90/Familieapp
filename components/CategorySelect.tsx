"use client";

import { setItemCategory } from "@/app/actions";
import { CATEGORIES } from "@/lib/categories";

/** Lille vælger, der flytter en vare til en anden kategori. Valget huskes til næste gang. */
export default function CategorySelect({ name, category }: { name: string; category: string }) {
  return (
    <form action={setItemCategory} className="inline">
      <input type="hidden" name="name" value={name} />
      <select
        name="category"
        defaultValue={category}
        aria-label={`Kategori for ${name}`}
        className="cat-select"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
    </form>
  );
}
