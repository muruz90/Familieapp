"use client";

import { useActionState, useState } from "react";
import { saveTask } from "@/app/actions";
import FormMessage from "./FormMessage";

type Props = {
  kids: { id: number; name: string }[];
  task?: { id: number; title: string; description: string; reward: number; assigned_to: number | null; repeat: string; times_per_week: number };
};

export default function TaskForm({ kids, task }: Props) {
  const [state, action, pending] = useActionState(saveTask, undefined);
  const [repeat, setRepeat] = useState(task?.repeat ?? "once");
  const [times, setTimes] = useState(task?.times_per_week ?? 1);
  const gap = times >= 2 ? Math.floor(7 / times) : 0;
  return (
    <form action={action} className="card" key={task?.id ?? "new"}>
      <h2>{task ? "Ret opgave" : "Ny opgave"}</h2>
      {task && <input type="hidden" name="id" value={task.id} />}
      <label>Opgave<input name="title" defaultValue={task?.title} placeholder="Fx Tøm opvaskemaskinen" required /></label>
      <label>Beskrivelse (valgfri)<input name="description" defaultValue={task?.description} /></label>
      <div className="form-grid">
        <label>Beløb (kr.)<input name="reward" inputMode="decimal" defaultValue={task ? String(task.reward / 100).replace(".", ",") : ""} placeholder="10" /></label>
        <label>Hvem
          <select name="assigned_to" defaultValue={task?.assigned_to ?? ""}>
            <option value="">Alle børn</option>
            {kids.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
          </select>
        </label>
        <label>Gentagelse
          <select name="repeat" value={repeat} onChange={(e) => setRepeat(e.target.value)}>
            <option value="once">Fri opgave (når det passer)</option>
            <option value="daily">Hver dag</option>
            <option value="weekly">Hver uge</option>
          </select>
        </label>
        {repeat === "weekly" && (
          <label>Gange om ugen
            <select name="times_per_week" value={times} onChange={(e) => setTimes(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
      </div>
      {repeat === "weekly" && gap > 0 && <p className="muted">Der skal gå mindst {gap} dage mellem hver gang.</p>}
      {repeat === "once" && <p className="muted">Opgaven ligger klar, til et barn tager den. Når den er godkendt, forsvinder den fra listen.</p>}
      <FormMessage state={state} ok={task ? undefined : "Opgaven er oprettet."} />
      <div className="row">
        <button type="submit" disabled={pending}>{task ? "Gem ændringer" : "Opret opgave"}</button>
        {task && <a className="btn secondary" href="/opgaver">Annullér</a>}
      </div>
    </form>
  );
}
