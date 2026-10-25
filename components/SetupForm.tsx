"use client";

import { useActionState } from "react";
import { setupFirstParent } from "@/app/actions";
import FormMessage from "./FormMessage";

export default function SetupForm() {
  const [state, action, pending] = useActionState(setupFirstParent, undefined);
  return (
    <form action={action} className="card">
      <label>Dit navn<input name="name" placeholder="Fx Mor" required /></label>
      <label>Brugernavn<input name="username" autoCapitalize="none" required /></label>
      <label>Adgangskode<input name="password" type="password" autoComplete="new-password" minLength={6} required /></label>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} style={{ width: "100%" }}>Opret og fortsæt</button>
    </form>
  );
}
