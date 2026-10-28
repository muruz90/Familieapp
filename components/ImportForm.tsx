"use client";

import { useActionState } from "react";
import Link from "next/link";
import { importRecipes } from "@/app/actions";

export default function ImportForm() {
  const [state, action, pending] = useActionState(importRecipes, undefined);
  return (
    <form action={action} className="card">
      <label>Opskriftsfil (.json)<input type="file" name="file" accept=".json,application/json" required /></label>
      {state?.error && <p className="error">{state.error}</p>}
      {state?.imported && (
        <div className="ok">
          {state.imported.length > 0 ? <p>Importeret: {state.imported.join(", ")}</p> : <p>Ingen nye opskrifter.</p>}
          {state.skipped && state.skipped.length > 0 && <p className="muted">Fandtes allerede og blev sprunget over: {state.skipped.join(", ")}</p>}
          <p><Link href="/opskrifter">Se opskrifterne</Link></p>
        </div>
      )}
      <button type="submit" disabled={pending}>{pending ? "Importerer…" : "Importér"}</button>
    </form>
  );
}
