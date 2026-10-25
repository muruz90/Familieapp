import { requireUser } from "@/lib/auth";
import { balances, children, ledger } from "@/lib/queries";
import { deleteLedgerEntry } from "@/app/actions";
import { kr, prettyDateTime } from "@/lib/format";
import LedgerForm from "@/components/LedgerForm";

const kindLabel: Record<string, string> = { earned: "Tjent", payout: "Udbetalt", bonus: "Bonus", adjust: "Korrektion" };

export default async function MoneyPage() {
  const me = await requireUser();
  const isParent = me.role === "parent";
  const all = balances();
  const shown = isParent ? all : all.filter((b) => b.user.id === me.id);
  const rows = ledger(isParent ? undefined : me.id);

  return (
    <>
      <h1>Lommepenge</h1>
      {shown.length === 0 && <p className="muted">Der er ingen børn oprettet endnu.</p>}
      <div className="grid">
        {shown.map((b) => (
          <div key={b.user.id} className="card">
            <div className="row"><span className="dot" style={{ background: b.user.color }} /><h2 style={{ margin: 0 }}>{b.user.name}</h2></div>
            <p className="big" style={{ margin: ".5rem 0" }}>{kr(b.balance)}</p>
            <p className="muted" style={{ margin: 0 }}>til gode</p>
            <div className="spread" style={{ marginTop: ".75rem" }}>
              <span>Tjent i alt<br /><strong>{kr(b.earned)}</strong></span>
              <span style={{ textAlign: "right" }}>Udbetalt i alt<br /><strong>{kr(b.paidOut)}</strong></span>
            </div>
          </div>
        ))}
      </div>

      {isParent && children().length > 0 && <LedgerForm kids={children()} />}

      <div className="card">
        <h2>Historik</h2>
        {rows.length === 0 && <p className="muted">Ingen posteringer endnu.</p>}
        <ul className="list">
          {rows.map((r) => (
            <li key={r.id} className="spread">
              <span>
                {isParent && <strong>{r.user_name} · </strong>}
                {kindLabel[r.kind]}{r.note ? `: ${r.note}` : ""}
                <div className="muted">{prettyDateTime(r.created_at.replace(" ", "T") + (r.created_at.endsWith("Z") ? "" : "Z"))}</div>
              </span>
              <span className="row">
                <strong style={{ color: r.kind === "payout" ? "var(--bad)" : "var(--good)" }}>
                  {r.kind === "payout" ? "−" : r.amount < 0 ? "" : "+"}{kr(r.amount)}
                </strong>
                {isParent && (
                  <form action={deleteLedgerEntry} className="inline">
                    <input type="hidden" name="id" value={r.id} />
                    <button className="link" type="submit" title="Slet posteringen">slet</button>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
