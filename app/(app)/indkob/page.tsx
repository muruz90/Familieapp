import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { extraItems, shoppingList } from "@/lib/queries";
import { addExtraItem, clearCheckedExtras, resetShoppingChecks, toggleExtraItem, toggleShoppingItem } from "@/app/actions";
import { addDays, mondayOf, prettyNumber, todayLocal, weekNumber } from "@/lib/format";

export default async function ShoppingPage({ searchParams }: { searchParams: Promise<{ uge?: string }> }) {
  await requireUser();
  const requested = (await searchParams).uge;
  const from = mondayOf(requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayLocal());
  const to = addDays(from, 6);
  const items = shoppingList(from, to);
  const extras = extraItems();
  const remaining = items.filter((i) => !i.checked).length + extras.filter((e) => !e.checked).length;

  return (
    <>
      <div className="spread" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Indkøb · uge {weekNumber(from)}</h1>
        <span className="row">
          <Link className="btn small secondary" href={`/indkob?uge=${addDays(from, -7)}`}>←</Link>
          <Link className="btn small secondary" href={`/indkob?uge=${addDays(from, 7)}`}>→</Link>
        </span>
      </div>
      <p className="muted">{remaining === 0 ? "Alt er købt ind 🎉" : `${remaining} varer mangler`}</p>

      <div className="card">
        <div className="spread">
          <h2>Fra madplanen</h2>
          {items.some((i) => i.checked) && (
            <form action={resetShoppingChecks}>
              <input type="hidden" name="from" value={from} />
              <input type="hidden" name="to" value={to} />
              <button className="link" type="submit">nulstil</button>
            </form>
          )}
        </div>
        {items.length === 0 && <p className="muted">Ingen retter på <Link href={`/madplan?uge=${from}`}>madplanen</Link> denne uge.</p>}
        <ul className="list">
          {items.map((i) => (
            <li key={i.key}>
              <form action={toggleShoppingItem} className="row" style={{ flexWrap: "nowrap" }}>
                <input type="hidden" name="from" value={from} />
                <input type="hidden" name="to" value={to} />
                <input type="hidden" name="item" value={i.key} />
                <button type="submit" className={`tick${i.checked ? " on" : ""}`} aria-label={i.checked ? "Fjern flueben" : "Sæt flueben"}>{i.checked ? "✓" : ""}</button>
                <span style={{ flex: 1 }} className={i.checked ? "done" : undefined}>
                  <strong>{i.amount}</strong> {i.name}
                  <div className="muted">{i.recipes.join(", ")}</div>
                </span>
              </form>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="spread">
          <h2>Andet</h2>
          {extras.some((e) => e.checked) && (
            <form action={clearCheckedExtras}>
              <button className="link" type="submit">ryd købte</button>
            </form>
          )}
        </div>
        <ul className="list">
          {extras.map((e) => (
            <li key={e.id}>
              <form action={toggleExtraItem} className="row" style={{ flexWrap: "nowrap" }}>
                <input type="hidden" name="id" value={e.id} />
                <button type="submit" className={`tick${e.checked ? " on" : ""}`} aria-label="Skift flueben">{e.checked ? "✓" : ""}</button>
                <span className={e.checked ? "done" : undefined}>
                  {e.quantity !== null && <strong>{prettyNumber(e.quantity)} {e.unit} </strong>}
                  {e.name}
                </span>
              </form>
            </li>
          ))}
        </ul>
        <form action={addExtraItem} className="row" style={{ marginTop: ".75rem", flexWrap: "nowrap" }}>
          <input name="name" placeholder="Fx toiletpapir" required style={{ flex: 3 }} />
          <input name="quantity" placeholder="Antal" inputMode="decimal" style={{ flex: 1, minWidth: "4rem" }} />
          <input name="unit" placeholder="Enhed" style={{ flex: 1, minWidth: "4rem" }} />
          <button type="submit" className="small">+</button>
        </form>
      </div>
    </>
  );
}
