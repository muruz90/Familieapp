"use client";

import { useActionState } from "react";
import { addMember } from "@/app/actions";
import FormMessage from "./FormMessage";

export default function AddMemberForm() {
  const [state, action, pending] = useActionState(addMember, undefined);
  return (
    <form action={action} className="card">
      <h2>Tilføj familiemedlem</h2>
      <div className="form-grid">
        <label>Navn<input name="name" required /></label>
        <label>Brugernavn<input name="username" autoCapitalize="none" required /></label>
        <label>Adgangskode<input name="password" type="text" minLength={4} required /></label>
        <label>Rolle
          <select name="role" defaultValue="child">
            <option value="child">Barn</option>
            <option value="parent">Forælder</option>
          </select>
        </label>
        <label>Farve<input name="color" type="color" defaultValue="#ff8a3d" /></label>
      </div>
      <FormMessage state={state} ok="Familiemedlemmet er oprettet." />
      <button type="submit" disabled={pending}>Tilføj</button>
    </form>
  );
}
