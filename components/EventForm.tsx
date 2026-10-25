"use client";

import { useActionState, useState } from "react";
import { saveEvent } from "@/app/actions";
import FormMessage from "./FormMessage";

type Props = {
  people: { id: number; name: string }[];
  defaultDate: string;
  event?: { id: number; title: string; starts_at: string; ends_at: string; all_day: number; location: string; notes: string; user_id: number | null };
};

export default function EventForm({ people, defaultDate, event }: Props) {
  const [state, action, pending] = useActionState(saveEvent, undefined);
  const [allDay, setAllDay] = useState(Boolean(event?.all_day));
  const startDate = event?.starts_at.slice(0, 10) ?? defaultDate;
  const endDate = event?.ends_at.slice(0, 10) ?? defaultDate;
  return (
    <form action={action} className="card">
      <h2>{event ? "Ret begivenhed" : "Ny begivenhed"}</h2>
      {event && <input type="hidden" name="id" value={event.id} />}
      <label>Titel<input name="title" defaultValue={event?.title} placeholder="Fx Fodbold" required /></label>
      <label className="check"><input type="checkbox" name="all_day" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> Hele dagen</label>
      {allDay ? (
        <div className="form-grid">
          <label>Fra<input type="date" name="start_date" defaultValue={startDate} required /></label>
          <label>Til<input type="date" name="end_date" defaultValue={endDate} /></label>
        </div>
      ) : (
        <div className="form-grid">
          <label>Start<input type="datetime-local" name="start" defaultValue={event && !event.all_day ? event.starts_at : `${defaultDate}T16:00`} required /></label>
          <label>Slut<input type="datetime-local" name="end" defaultValue={event && !event.all_day ? event.ends_at : `${defaultDate}T17:00`} /></label>
        </div>
      )}
      <div className="form-grid">
        <label>Hvem
          <select name="user_id" defaultValue={event?.user_id ?? ""}>
            <option value="">Hele familien</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>Sted<input name="location" defaultValue={event?.location} /></label>
      </div>
      <label>Noter<input name="notes" defaultValue={event?.notes} /></label>
      <FormMessage state={state} />
      <div className="row">
        <button type="submit" disabled={pending}>Gem</button>
        <a className="btn secondary" href="/kalender">Annullér</a>
      </div>
    </form>
  );
}
