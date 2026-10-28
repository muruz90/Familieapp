import webpush from "web-push";
import { db, getSetting, setSetting } from "./db";
import { TZ } from "./format";

export type PushMessage = { title: string; body?: string; url?: string };

/** VAPID-nøglerne laves første gang og gemmes i databasen, så de overlever genstart og opdatering. */
export function vapidPublicKey(): string {
  let pub = getSetting("vapid_public");
  if (!pub || !getSetting("vapid_private")) {
    const keys = webpush.generateVAPIDKeys();
    setSetting("vapid_public", keys.publicKey);
    setSetting("vapid_private", keys.privateKey);
    pub = keys.publicKey;
  }
  return pub;
}

function configure() {
  const pub = vapidPublicKey();
  webpush.setVapidDetails(process.env.APP_URL || "https://familie.goblinaiapp.com", pub, getSetting("vapid_private")!);
}

type Sub = { endpoint: string; p256dh: string; auth: string };

/** Sender til alle enheder hos de valgte brugere. Fejler aldrig udadtil; døde abonnementer slettes. */
export async function notify(userIds: number[], msg: PushMessage): Promise<void> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return;
  try {
    const subs = db()
      .prepare(`SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id IN (${ids.map(() => "?").join(",")})`)
      .all(...ids) as Sub[];
    if (!subs.length) return;
    configure();
    const payload = JSON.stringify(msg);
    await Promise.all(
      subs.map((s) =>
        webpush
          .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 12 })
          .catch((err: { statusCode?: number }) => {
            if (err.statusCode === 404 || err.statusCode === 410) {
              db().prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(s.endpoint);
            } else {
              console.error("Push fejlede", err.statusCode ?? err);
            }
          }),
      ),
    );
  } catch (err) {
    console.error("Push fejlede", err);
  }
}

export const parentIds = () => (db().prepare("SELECT id FROM users WHERE role = 'parent'").all() as { id: number }[]).map((u) => u.id);
export const childIds = () => (db().prepare("SELECT id FROM users WHERE role = 'child'").all() as { id: number }[]).map((u) => u.id);
export const allIds = () => (db().prepare("SELECT id FROM users").all() as { id: number }[]).map((u) => u.id);

/** Lokal tid i København som "YYYY-MM-DDTHH:MM", samme format som events.starts_at. */
export function localMinute(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
    .format(now)
    .replace(" ", "T");
}

export const REMINDER_MINUTES = 60;

/** Påmindelse om aftaler, der starter inden for den næste time. Kaldes hvert minut. */
export async function sendEventReminders(now = new Date()): Promise<void> {
  const from = localMinute(now);
  const to = localMinute(new Date(now.getTime() + REMINDER_MINUTES * 60_000));
  const due = db()
    .prepare("SELECT id, title, starts_at, location, user_id FROM events WHERE all_day = 0 AND starts_at > ? AND starts_at <= ? AND (reminded_for IS NULL OR reminded_for <> starts_at)")
    .all(from, to) as { id: number; title: string; starts_at: string; location: string; user_id: number | null }[];
  for (const e of due) {
    db().prepare("UPDATE events SET reminded_for = starts_at WHERE id = ?").run(e.id);
    const time = e.starts_at.slice(11, 16);
    await notify(e.user_id ? [e.user_id, ...parentIds()] : allIds(), {
      title: `Kl. ${time}: ${e.title}`,
      body: e.location ? `Sted: ${e.location}` : "Om lidt i kalenderen",
      url: "/kalender",
    });
  }
}
