import type { User } from "@/lib/auth";
import { kr, prettyDate } from "@/lib/format";
import { holdStreak, removeStreakHolds } from "@/app/actions";

type Props = {
  people: User[];
  streaks: Map<number, number>;
  stars: { user: User; count: number }[];
  bonus: { days: number; amount: number };
  holds?: Map<number, string[]>;
  canHold?: boolean;
};

/** Streaks (dage i træk med opgaver) og ugens stjerne. Forældre kan holde en streak i live. */
export default function StreakCard({ people, streaks, stars, bonus, holds, canHold }: Props) {
  return (
    <div className="card">
      <h2>🔥 Dage i træk</h2>
      <ul className="list">
        {people.map((p) => {
          const n = streaks.get(p.id) ?? 0;
          const next = bonus.days >= 2 && bonus.amount > 0 ? bonus.days - (n % bonus.days) : 0;
          const held = holds?.get(p.id) ?? [];
          return (
            <li key={p.id} className="spread" style={{ padding: ".35rem 0" }}>
              <span className="row"><span className="dot" style={{ background: p.color }} />{p.name}</span>
              <span style={{ textAlign: "right" }}>
                <strong>{n > 0 ? `🔥 ${n} ${n === 1 ? "dag" : "dage"}` : "–"}</strong>
                {next > 0 && <div className="muted">{next} {next === 1 ? "dag" : "dage"} til bonus på {kr(bonus.amount)}</div>}
                {held.length > 0 && (
                  <div className="muted">
                    ⏸ Holdes i live {held.length === 1 ? prettyDate(held[0]).toLowerCase() : `til ${prettyDate(held.at(-1)!).toLowerCase()}`}
                    {canHold && (
                      <form action={removeStreakHolds} className="inline">
                        <input type="hidden" name="user_id" value={p.id} />
                        {" "}<button className="link" type="submit">fjern</button>
                      </form>
                    )}
                  </div>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {stars.length > 0 && (
        <p style={{ marginBottom: 0 }}>
          ⭐ Ugens stjerne: <strong>{stars.map((s) => s.user.name).join(" og ")}</strong>{" "}
          <span className="muted">({stars[0].count} {stars[0].count === 1 ? "opgave" : "opgaver"} godkendt)</span>
        </p>
      )}
      {canHold && people.length > 0 && (
        <form action={holdStreak} style={{ marginTop: ".75rem" }}>
          <p className="muted" style={{ margin: "0 0 .5rem" }}>Ingen opgaver? Hold streaken i live, så den ikke brydes. Dagene tæller ikke med, men streaken fortsætter.</p>
          <div className="form-grid">
            <label>Hvem
              <select name="user_id" defaultValue={people.length === 1 ? people[0].id : ""}>
                {people.length > 1 && <option value="">Alle børn</option>}
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label>Hvornår
              <select name="when" defaultValue="today">
                <option value="yesterday">I går</option>
                <option value="today">I dag</option>
                <option value="tomorrow">I morgen</option>
                <option value="week">Resten af ugen</option>
                <option value="next_week">Hele næste uge</option>
              </select>
            </label>
          </div>
          <button className="secondary" type="submit" style={{ marginTop: ".5rem" }}>⏸ Hold streaken i live</button>
        </form>
      )}
    </div>
  );
}
