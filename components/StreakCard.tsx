import type { User } from "@/lib/auth";
import { kr } from "@/lib/format";

type Props = {
  people: User[];
  streaks: Map<number, number>;
  stars: { user: User; count: number }[];
  bonus: { days: number; amount: number };
};

/** Streaks (dage i træk med opgaver) og ugens stjerne. */
export default function StreakCard({ people, streaks, stars, bonus }: Props) {
  return (
    <div className="card">
      <h2>🔥 Dage i træk</h2>
      <ul className="list">
        {people.map((p) => {
          const n = streaks.get(p.id) ?? 0;
          const next = bonus.days >= 2 && bonus.amount > 0 ? bonus.days - (n % bonus.days) : 0;
          return (
            <li key={p.id} className="spread" style={{ padding: ".35rem 0" }}>
              <span className="row"><span className="dot" style={{ background: p.color }} />{p.name}</span>
              <span style={{ textAlign: "right" }}>
                <strong>{n > 0 ? `🔥 ${n} ${n === 1 ? "dag" : "dage"}` : "–"}</strong>
                {next > 0 && <div className="muted">{next} {next === 1 ? "dag" : "dage"} til bonus på {kr(bonus.amount)}</div>}
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
    </div>
  );
}
