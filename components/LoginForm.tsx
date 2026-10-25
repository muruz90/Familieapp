"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import FormMessage from "./FormMessage";

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="card">
      <label>Brugernavn<input name="username" autoComplete="username" autoCapitalize="none" required /></label>
      <label>Adgangskode<input name="password" type="password" autoComplete="current-password" required /></label>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} style={{ width: "100%" }}>{pending ? "Logger ind…" : "Log ind"}</button>
    </form>
  );
}
