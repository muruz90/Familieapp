import Link from "next/link";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth";
import { calendarToken } from "@/lib/db";
import { event as getEvent, eventsFrom, members } from "@/lib/queries";
import { deleteEvent } from "@/app/actions";
import { prettyDate, todayLocal } from "@/lib/format";
import EventForm from "@/components/EventForm";

async function feedUrl() {
  const base = process.env.APP_URL?.replace(/\/$/, "");
  if (base) return `${base}/api/kalender/${calendarToken()}`;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}/api/kalender/${calendarToken()}`;
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ ny?: string; ret?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const today = todayLocal();
  const people = members();

  if (sp.ny || sp.ret) {
    const ev = sp.ret ? getEvent(Number(sp.ret)) : null;
    return (
      <>
        <EventForm people={people} defaultDate={today} event={ev ?? undefined} />
        {ev && (
          <form action={deleteEvent}>
            <input type="hidden" name="id" value={ev.id} />
            <button type="submit" className="danger small">Slet begivenhed</button>
          </form>
        )}
      </>
    );
  }

  const events = eventsFrom(today);
  const byDay = new Map<string, typeof events>();
  for (const e of events) {
    const day = e.starts_at.slice(0, 10) < today ? today : e.starts_at.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  const url = await feedUrl();
  const webcal = url.replace(/^https?:/, "webcal:");

  return (
    <>
      <div className="spread" style={{ marginBottom: "1rem" }}>
        <h1 style={{ margin: 0 }}>Kalender</h1>
        <Link className="btn" href="/kalender?ny=1">+ Ny</Link>
      </div>
      <div className="card">
        {events.length === 0 && <p className="muted">Ingen kommende begivenheder.</p>}
        {[...byDay.entries()].map(([day, list]) => (
          <div key={day} className={`day${day === today ? " today" : ""}`}>
            <h3>{prettyDate(day)}</h3>
            <ul className="list">
              {list.map((e) => (
                <li key={e.id} style={{ padding: ".35rem 0" }}>
                  <Link href={`/kalender?ret=${e.id}`} className="row" style={{ color: "var(--text)", flexWrap: "nowrap" }}>
                    <span className="dot" style={{ background: e.color ?? "var(--muted)" }} />
                    <span className="muted" style={{ minWidth: "3.2rem" }}>{e.all_day ? "Hele dagen" : e.starts_at.slice(11, 16)}</span>
                    <span>
                      <strong>{e.title}</strong>
                      {e.who && <span className="muted"> · {e.who}</span>}
                      {e.location && <div className="muted">{e.location}</div>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Vis kalenderen på iPhone og iPad</h2>
        <p>Tryk på knappen fra telefonen og vælg <strong>Abonnér</strong>. Kalenderen opdateres så automatisk.</p>
        <p><a className="btn" href={webcal}>📅 Abonnér på familiekalenderen</a></p>
        <p className="muted">
          Virker knappen ikke: Indstillinger → Kalender → Konti → Tilføj konto → Andet → Tilføj abonnement på kalender, og indsæt:
          <br /><code>{url}</code>
        </p>
        {me.role === "parent" && <p className="muted">Linket er hemmeligt. Del det kun med familien.</p>}
      </div>
    </>
  );
}
