"use client";

import { useActionState } from "react";
import { saveTask } from "@/app/actions";
import FormMessage from "./FormMessage";

type Props = {
  kids: { id: number; name: string }[];
  task?: { id: number; title: string; description: string; reward: number; assigned_to: number | null; repeat: string };
};

export default function TaskForm({ kids, task }: Props) {
  const [state, action, pending] = useActionState(saveTask, undefined);
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
          <select name="repeat" defaultValue={task?.repeat ?? "daily"}>
            <option value="daily">Hver dag</option>
            <option value="weekly">Hver uge</option>
            <option value="once">Én gang</option>
          </select>
        </label>
      </div>
      <FormMessage state={state} ok={task ? undefined : "Opgaven er oprettet."} />
      <div className="row">
        <button type="submit" disabled={pending}>{task ? "Gem ændringer" : "Opret opgave"}</button>
        {task && <a className="btn secondary" href="/opgaver">Annullér</a>}
      </div>
    </form>
  );
}
