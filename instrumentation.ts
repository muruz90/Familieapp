// Kører én gang, når serveren starter: tjekker hvert minut for påmindelser om aftaler og morgenens huskeliste.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { sendChecklistMorning, sendEventReminders } = await import("./lib/push");
  setInterval(() => {
    sendEventReminders().catch((err) => console.error("Påmindelser fejlede", err));
    sendChecklistMorning().catch((err) => console.error("Huskeliste fejlede", err));
  }, 60_000);
}
