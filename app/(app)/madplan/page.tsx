import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { mealsBetween, recipes } from "@/lib/queries";
import { addMeal, removeMeal } from "@/app/actions";
import { addDays, mondayOf, prettyDate, todayLocal, weekNumber } from "@/lib/format";

export default async function MealPlanPage({ searchParams }: { searchParams: Promise<{ uge?: string }> }) {
  const me = await requireUser();
  const isParent = me.role === "parent";
  const today = todayLocal();
  const requested = (await searchParams).uge;
  const monday = mondayOf(requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today);
  const sunday = addDays(monday, 6);
  const meals = mealsBetween(monday, sunday);
  const all = recipes();
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <>
      <div className="spread" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Madplan · uge {weekNumber(monday)}</h1>
        <span className="row">
          <Link className="btn small secondary" href={`/madplan?uge=${addDays(monday, -7)}`}>←</Link>
          <Link className="btn small secondary" href="/madplan">I dag</Link>
          <Link className="btn small secondary" href={`/madplan?uge=${addDays(monday, 7)}`}>→</Link>
        </span>
      </div>
      <p><Link className="btn" href={`/indkob?uge=${monday}`}>🛒 Indkøbsliste for ugen</Link></p>
      {isParent && all.length === 0 && <p className="muted">Opret først nogle <Link href="/opskrifter/ny">opskrifter</Link>.</p>}
      <div className="card">
        {days.map((d) => {
          const dayMeals = meals.filter((m) => m.date === d);
          return (
            <div key={d} className={`day${d === today ? " today" : ""}`}>
              <h3>{prettyDate(d)}</h3>
              <ul className="list">
                {dayMeals.map((m) => (
                  <li key={m.id} className="spread" style={{ padding: ".35rem 0" }}>
                    <Link href={`/opskrifter/${m.recipe_id}`}>{m.name}</Link>
                    <span className="row">
                      <span className="muted">{m.servings} pers.</span>
                      {isParent && (
                        <form action={removeMeal} className="inline">
                          <input type="hidden" name="id" value={m.id} />
                          <button className="link" type="submit">fjern</button>
                        </form>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {isParent && all.length > 0 && (
                <form action={addMeal} className="row" style={{ marginTop: ".4rem", flexWrap: "nowrap" }}>
                  <input type="hidden" name="date" value={d} />
                  <select name="recipe_id" required defaultValue="" style={{ flex: 3 }}>
                    <option value="" disabled>Vælg ret…</option>
                    {all.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <input name="servings" type="number" min={1} placeholder="pers." aria-label="Antal personer" style={{ flex: 1, minWidth: "4.5rem" }} />
                  <button type="submit" className="small">Tilføj</button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
