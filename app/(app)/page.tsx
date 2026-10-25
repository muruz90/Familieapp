import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { activeTasks, balances, eventsFrom, mealsBetween, pendingCompletions, taskStates } from "@/lib/queries";
import { completeTask } from "@/app/actions";
import { kr, prettyDate, todayLocal } from "@/lib/format";

export default async function HomePage() {
  const me = await requireUser();
  const isParent = me.role === "parent";
  const today = todayLocal();
  const dinner = mealsBetween(today, today);
  const events = eventsFrom(today, 5);
  const allBalances = balances();
  const pending = isParent ? pendingCompletions() : [];
  const tasks = isParent ? [] : activeTasks();
  const states = taskStates(tasks, [me]);
  const myTasks = tasks.filter((t) => states.get(`${t.id}:${me.id}`)?.avail.allowed);
  const mine = allBalances.find((b) => b.user.id === me.id);

  return (
    <>
      <h1>Hej {me.name} 👋</h1>
      <div className="grid">
        {!isParent && mine && (
          <Link href="/lommepenge" className="card" style={{ color: "var(--text)" }}>
            <h2>Mine lommepenge</h2>
            <p className="big" style={{ margin: 0 }}>{kr(mine.balance)}</p>
            <p className="muted" style={{ margin: 0 }}>til gode · tjent i alt {kr(mine.earned)}</p>
          </Link>
        )}

        {!isParent && (
          <div className="card">
            <h2>Mine opgaver</h2>
            {myTasks.length === 0 && <p className="muted">Ingen opgaver lige nu 🎉</p>}
            <ul className="list">
              {myTasks.map((t) => (
                <li key={t.id} className="spread">
                  <span>{t.title} <span className="muted">· {kr(t.reward)}</span></span>
                  <form action={completeTask} className="inline">
                    <input type="hidden" name="task_id" value={t.id} />
                    <button className="small" type="submit">Færdig ✓</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}

        {isParent && (
          <Link href="/opgaver" className="card" style={{ color: "var(--text)" }}>
            <h2>Opgaver</h2>
            <p className="big" style={{ margin: 0 }}>{pending.length}</p>
            <p className="muted" style={{ margin: 0 }}>venter på godkendelse</p>
          </Link>
        )}

        {isParent && allBalances.length > 0 && (
          <Link href="/lommepenge" className="card" style={{ color: "var(--text)" }}>
            <h2>Lommepenge til gode</h2>
            <ul className="list">
              {allBalances.map((b) => (
                <li key={b.user.id} className="spread" style={{ padding: ".35rem 0" }}>
                  <span className="row"><span className="dot" style={{ background: b.user.color }} />{b.user.name}</span>
                  <strong>{kr(b.balance)}</strong>
                </li>
              ))}
            </ul>
          </Link>
        )}

        <Link href="/madplan" className="card" style={{ color: "var(--text)" }}>
          <h2>Aftensmad i dag</h2>
          {dinner.length === 0 ? <p className="muted">Ikke planlagt endnu</p> : dinner.map((m) => <p key={m.id} className="big" style={{ fontSize: "1.25rem" }}>{m.name}</p>)}
        </Link>

        <Link href="/kalender" className="card" style={{ color: "var(--text)" }}>
          <h2>Næste aftaler</h2>
          {events.length === 0 && <p className="muted">Ingen kommende aftaler</p>}
          <ul className="list">
            {events.map((e) => (
              <li key={e.id} style={{ padding: ".35rem 0" }}>
                <strong>{e.title}</strong>{e.who && <span className="muted"> · {e.who}</span>}
                <div className="muted">{prettyDate(e.starts_at.slice(0, 10))}{!e.all_day && ` kl. ${e.starts_at.slice(11, 16)}`}</div>
              </li>
            ))}
          </ul>
        </Link>
      </div>
    </>
  );
}
