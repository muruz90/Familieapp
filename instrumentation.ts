// Kører én gang, når serveren starter: tjekker hvert minut for aftaler, der skal have en påmindelse.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { sendEventReminders } = await import("./lib/push");
  setInterval(() => void sendEventReminders().catch((err) => console.error("Påmindelser fejlede", err)), 60_000);
}
