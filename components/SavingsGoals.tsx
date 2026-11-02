import { addSavingsGoal, deleteSavingsGoal } from "@/app/actions";
import { kr } from "@/lib/format";
import type { SavingsGoal } from "@/lib/queries";

/** Sparemål med en bjælke, der fyldes op af saldoen. */
export default function SavingsGoals({ goals, balance, userId, canEdit = true }: { goals: SavingsGoal[]; balance: number; userId: number; canEdit?: boolean }) {
  return (
    <div style={{ marginTop: "1rem" }}>
      {goals.map((g) => {
        const pct = Math.max(0, Math.min(100, Math.round((balance / g.amount) * 100)));
        const reached = balance >= g.amount;
        return (
          <div key={g.id} style={{ marginBottom: ".75rem" }}>
            <div className="spread">
              <strong>{reached ? "🎉 " : "🎯 "}{g.title}</strong>
              <span className="muted">{kr(Math.max(0, Math.min(balance, g.amount)))} af {kr(g.amount)}</span>
            </div>
            <div className={`bar${reached ? " full" : ""}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <span style={{ width: `${pct}%` }} />
            </div>
            <div className="spread">
              <span className="muted">{reached ? "Målet er nået!" : `Mangler ${kr(g.amount - Math.max(0, balance))}`}</span>
              {canEdit && (
                <form action={deleteSavingsGoal} className="inline">
                  <input type="hidden" name="id" value={g.id} />
                  <button className="link" type="submit">fjern</button>
                </form>
              )}
            </div>
          </div>
        );
      })}
      {canEdit && (
        <details>
          <summary style={{ cursor: "pointer" }} className="muted">+ Nyt sparemål</summary>
          <form action={addSavingsGoal} className="row" style={{ flexWrap: "nowrap", marginTop: ".5rem" }}>
            <input type="hidden" name="user_id" value={userId} />
            <input name="title" placeholder="Fx Ny cykel" required style={{ flex: 3 }} />
            <input name="amount" placeholder="Kr." inputMode="decimal" required style={{ flex: 1, minWidth: "4.5rem" }} />
            <button type="submit" className="small">Gem</button>
          </form>
        </details>
      )}
    </div>
  );
}
