"use client";

import { useActionState } from "react";
import { changeOwnPassword } from "@/app/actions";
import FormMessage from "./FormMessage";

export default function PasswordForm() {
  const [state, action, pending] = useActionState(changeOwnPassword, undefined);
  return (
    <form action={action} className="card">
      <h2>Skift adgangskode</h2>
      <label>Ny adgangskode<input name="password" type="password" autoComplete="new-password" minLength={4} required /></label>
      <FormMessage state={state} ok="Adgangskoden er skiftet." />
      <button type="submit" disabled={pending}>Gem</button>
    </form>
  );
}
