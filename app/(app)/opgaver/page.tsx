import { requireUser } from "@/lib/auth";
import { activeTasks, children, pendingCompletions, taskStates } from "@/lib/queries";
import { archiveTask, completeTask, reviewCompletion, undoCompletion } from "@/app/actions";
import { kr, prettyDate } from "@/lib/format";
import { repeatText } from "@/lib/taskText";
import TaskForm from "@/components/TaskForm";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ ret?: string }> }) {
  const me = await requireUser();
  const isParent = me.role === "parent";
  const kids = children();
  const tasks = activeTasks();
  const pending = isParent ? pendingCompletions() : [];
  const editId = Number((await searchParams).ret);
  const editing = isParent ? tasks.find((t) => t.id === editId) : undefined;

  const visible = isParent ? tasks : tasks.filter((t) => !t.assigned_to || t.assigned_to === me.id);
  const people = isParent ? kids : [me];
  const states = taskStates(visible, people);

  return (
    <>
      <h1>Opgaver</h1>

      {pending.length > 0 && (
        <div className="card">
          <h2>Venter på godkendelse</h2>
          <ul className="list">
            {pending.map((c) => (
              <li key={c.id} className="spread">
                <span>
                  <strong>{c.user_name}</strong>: {c.title} <span className="muted">· {kr(c.amount)}</span>
                </span>
                <span className="row">
                  <form action={reviewCompletion} className="inline">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button className="small" type="submit">Godkend</button>
                  </form>
                  <form action={reviewCompletion} className="inline">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <button className="small secondary" type="submit">Afvis</button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        {visible.length === 0 && <p className="muted">Der er ingen opgaver endnu.</p>}
        <ul className="list">
          {visible.map((t) => (
            <li key={t.id}>
              <div className="spread">
                <div>
                  <strong>{t.title}</strong>
                  <div className="muted">
                    {repeatText(t.repeat, t.times_per_week)} · {kr(t.reward)}
                    {isParent && ` · ${t.assignee_name ?? "Alle børn"}`}
                  </div>
                  {t.description && <div className="muted">{t.description}</div>}
                </div>
                {isParent && (
                  <span className="row">
                    <a className="btn small secondary" href={`/opgaver?ret=${t.id}`}>Ret</a>
                    <form action={archiveTask} className="inline">
                      <input type="hidden" name="id" value={t.id} />
                      <button className="small danger" type="submit">Fjern</button>
                    </form>
                  </span>
                )}
              </div>
              <div className="row" style={{ marginTop: ".5rem" }}>
                {people
                  .filter((p) => !t.assigned_to || t.assigned_to === p.id)
                  .map((p) => {
                    const st = states.get(`${t.id}:${p.id}`);
                    if (!st) return null;
                    return (
                      <span key={p.id} className="row">
                        {st.current.map((c) => (
                          <span key={c.id} className="row">
                            <span className={`badge ${c.status === "approved" ? "good" : "warn"}`}>
                              {isParent ? `${p.name}: ` : ""}{c.status === "approved" ? "Godkendt ✓" : "Venter på godkendelse"}
                            </span>
                            {(isParent || c.status === "pending") && (
                              <form action={undoCompletion} className="inline">
                                <input type="hidden" name="id" value={c.id} />
                                <button className="link" type="submit">fortryd</button>
                              </form>
                            )}
                          </span>
                        ))}
                        {t.repeat === "weekly" && t.times_per_week > 1 && (
                          <span className="muted">{st.avail.doneInPeriod}/{t.times_per_week} denne uge</span>
                        )}
                        {st.avail.allowed ? (
                          <form action={completeTask} className="inline">
                            <input type="hidden" name="task_id" value={t.id} />
                            <input type="hidden" name="user_id" value={p.id} />
                            <button className="small" type="submit">{isParent ? `${p.name} har gjort det` : "Færdig ✓"}</button>
                          </form>
                        ) : (
                          st.avail.nextDate && t.repeat !== "daily" && (
                            <span className="muted">{isParent ? `${p.name}: ` : ""}næste gang {prettyDate(st.avail.nextDate).toLowerCase()}</span>
                          )
                        )}
                      </span>
                    );
                  })}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {isParent && (kids.length > 0 ? <TaskForm kids={kids} task={editing} /> : <p className="muted">Opret børnene under <a href="/familie">Familie</a> først.</p>)}
    </>
  );
}
