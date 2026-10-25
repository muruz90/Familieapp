export default function FormMessage({ state, ok }: { state: { error?: string } | undefined; ok?: string }) {
  if (!state) return null;
  if (state.error) return <p className="error">{state.error}</p>;
  return ok ? <p className="ok">{ok}</p> : null;
}
