"use client";

import { useActionState } from "react";
import { addLedgerEntry } from "@/app/actions";
import FormMessage from "./FormMessage";

export default function LedgerForm({ kids }: { kids: { id: number; name: string }[] }) {
  const [state, action, pending] = useActionState(addLedgerEntry, undefined);
  return (
    <form action={action} className="card">
      <h2>Registrér udbetaling eller bonus</h2>
      <div className="form-grid">
        <label>Barn
          <select name="user_id" required defaultValue={kids.length === 1 ? kids[0].id : ""}>
            {kids.length > 1 && <option value="">Vælg…</option>}
            {kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </label>
        <label>Type
          <select name="kind" defaultValue="payout">
            <option value="payout">Udbetaling</option>
            <option value="bonus">Bonus</option>
            <option value="adjust">Korrektion (+/-)</option>
          </select>
        </label>
        <label>Beløb (kr.)<input name="amount" inputMode="decimal" required placeholder="50" /></label>
      </div>
      <label>Note (valgfri)<input name="note" placeholder="Fx kontant, MobilePay" /></label>
      <FormMessage state={state} ok="Gemt." />
      <button type="submit" disabled={pending}>Gem</button>
    </form>
  );
}
