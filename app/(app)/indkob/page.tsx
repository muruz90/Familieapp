import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { extraItems, shoppingList } from "@/lib/queries";
import { addExtraItem, clearCheckedExtras, resetShoppingChecks, toggleExtraItem, toggleShoppingItem, unhideShoppingItem } from "@/app/actions";
import { addDays, mondayOf, prettyNumber, todayLocal, weekNumber } from "@/lib/format";
import { CATEGORIES } from "@/lib/categories";
import CategorySelect from "@/components/CategorySelect";

export default async function ShoppingPage({ searchParams }: { searchParams: Promise<{ uge?: string }> }) {
  const me = await requireUser();
  const isParent = me.role === "parent";
  const requested = (await searchParams).uge;
  const from = mondayOf(requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : todayLocal());
  const to = addDays(from, 6);
  const all = shoppingList(from, to);
  const items = all.filter((i) => !i.hidden);
  const atHome = all.filter((i) => i.hidden);
  const extras = extraItems();
  const remaining = items.filter((i) => !i.checked).length + extras.filter((e) => !e.checked).length;
  const groups = CATEGORIES.map((category) => ({
    category,
    items: items.filter((i) => i.category === category),
    extras: extras.filter((e) => e.category === category),
  })).filter((g) => g.items.length + g.extras.length > 0);

  return (
    <>
      <div className="spread" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Indkøb · uge {weekNumber(from)}</h1>
        <span className="row">
          <Link className="btn small secondary" href={`/indkob?uge=${addDays(from, -7)}`}>←</Link>
          <Link className="btn small secondary" href={`/indkob?uge=${addDays(from, 7)}`}>→</Link>
        </span>
      </div>
      <p className="muted">{remaining === 0 ? (items.length + extras.length ? "Alt er købt ind 🎉" : "Listen er tom.") : `${remaining} varer mangler`}</p>

      <div className="card">
        {all.length === 0 && <p className="muted">Ingen retter på <Link href={`/madplan?uge=${from}`}>madplanen</Link> denne uge.</p>}
        {groups.map((g) => (
          <section key={g.category}>
            <h2 className="cat">{g.category}</h2>
            <ul className="list">
              {g.items.map((i) => (
                <li key={i.key} className="row" style={{ flexWrap: "nowrap" }}>
                  <form action={toggleShoppingItem} className="row" style={{ flexWrap: "nowrap", flex: 1 }}>
                    <input type="hidden" name="from" value={from} />
                    <input type="hidden" name="to" value={to} />
                    <input type="hidden" name="item" value={i.key} />
                    <button type="submit" className={`tick${i.checked ? " on" : ""}`} aria-label={i.checked ? "Fjern flueben" : "Sæt flueben"}>{i.checked ? "✓" : ""}</button>
                    <span style={{ flex: 1 }} className={i.checked ? "done" : undefined}>
                      <strong>{i.amount}</strong> {i.name}
                      <div className="muted">{i.recipes.join(", ")}</div>
                    </span>
                  </form>
                  {isParent && <CategorySelect name={i.name} category={i.category} plan={{ from, to, item: i.key }} />}
                </li>
              ))}
              {g.extras.map((e) => (
                <li key={`x${e.id}`} className="row" style={{ flexWrap: "nowrap" }}>
                  <form action={toggleExtraItem} className="row" style={{ flexWrap: "nowrap", flex: 1 }}>
                    <input type="hidden" name="id" value={e.id} />
                    <button type="submit" className={`tick${e.checked ? " on" : ""}`} aria-label="Skift flueben">{e.checked ? "✓" : ""}</button>
                    <span style={{ flex: 1 }} className={e.checked ? "done" : undefined}>
                      {e.quantity !== null && <strong>{prettyNumber(e.quantity)} {e.unit} </strong>}
                      {e.name}
                      <div className="muted">Ekstra vare</div>
                    </span>
                  </form>
                  {isParent && <CategorySelect name={e.name} category={e.category} extraId={e.id} />}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {isParent && <div className="row" style={{ marginTop: ".75rem", gap: "1rem" }}>
          {items.some((i) => i.checked) && (
            <form action={resetShoppingChecks}>
              <input type="hidden" name="from" value={from} />
              <input type="hidden" name="to" value={to} />
              <button className="link" type="submit">nulstil flueben</button>
            </form>
          )}
          {extras.some((e) => e.checked) && (
            <form action={clearCheckedExtras}>
              <button className="link" type="submit">fjern købte ekstra varer</button>
            </form>
          )}
        </div>}
      </div>

      {isParent && atHome.length > 0 && (
        <details className="card">
          <summary style={{ cursor: "pointer" }}>Har hjemme ({atHome.length})</summary>
          <ul className="list" style={{ marginTop: ".5rem" }}>
            {atHome.map((i) => (
              <li key={i.key} className="spread">
                <span className="muted">{i.amount} {i.name}</span>
                <form action={unhideShoppingItem}>
                  <input type="hidden" name="from" value={from} />
                  <input type="hidden" name="to" value={to} />
                  <input type="hidden" name="item" value={i.key} />
                  <button type="submit" className="small secondary">Sæt på listen igen</button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}

      {isParent && <div className="card">
        <h2>Tilføj ekstra vare</h2>
        <form action={addExtraItem} className="row" style={{ flexWrap: "nowrap" }}>
          <input name="name" placeholder="Fx toiletpapir" required style={{ flex: 3 }} />
          <input name="quantity" placeholder="Antal" inputMode="decimal" style={{ flex: 1, minWidth: "4rem" }} />
          <input name="unit" placeholder="Enhed" style={{ flex: 1, minWidth: "4rem" }} />
          <button type="submit" className="small">+</button>
        </form>
        <p className="muted" style={{ marginTop: ".5rem" }}>Tryk på ⋯ ved en vare for at fjerne den, fordi I har den hjemme, eller for at flytte den til en anden kategori. Appen husker kategorien til næste gang.</p>
      </div>}
    </>
  );
}
