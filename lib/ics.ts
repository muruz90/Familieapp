import { addDays } from "./format.ts";

export type CalEvent = {
  uid: string;
  title: string;
  starts_at: string; // "YYYY-MM-DDTHH:MM" dansk tid, eller "YYYY-MM-DD" for heldagsbegivenheder
  ends_at: string;
  all_day: number;
  location: string;
  notes: string;
  updated_at: string; // "YYYY-MM-DD HH:MM:SS" UTC fra SQLite
  who?: string | null;
};

const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Copenhagen",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function escapeText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** RFC 5545: linjer over 75 oktetter foldes med CRLF + mellemrum. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const ch of line) {
    const len = Buffer.byteLength(ch, "utf8");
    if (size + len > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const compactDate = (d: string) => d.replace(/-/g, "");
const compactLocal = (dt: string) => compactDate(dt.slice(0, 10)) + "T" + dt.slice(11, 16).replace(":", "") + "00";
const compactUtc = (sqlite: string) => sqlite.replace(/[-:]/g, "").replace(" ", "T").slice(0, 15) + "Z";

export function buildCalendar(name: string, events: CalEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Familie app//DA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "X-WR-TIMEZONE:Europe/Copenhagen",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M",
    "X-PUBLISHED-TTL:PT15M",
    ...VTIMEZONE,
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${compactUtc(e.updated_at)}`, `LAST-MODIFIED:${compactUtc(e.updated_at)}`);
    if (e.all_day) {
      lines.push(`DTSTART;VALUE=DATE:${compactDate(e.starts_at.slice(0, 10))}`);
      lines.push(`DTEND;VALUE=DATE:${compactDate(addDays(e.ends_at.slice(0, 10), 1))}`);
    } else {
      lines.push(`DTSTART;TZID=Europe/Copenhagen:${compactLocal(e.starts_at)}`);
      lines.push(`DTEND;TZID=Europe/Copenhagen:${compactLocal(e.ends_at)}`);
    }
    const title = e.who ? `${e.title} (${e.who})` : e.title;
    lines.push(`SUMMARY:${escapeText(title)}`);
    if (e.location) lines.push(`LOCATION:${escapeText(e.location)}`);
    if (e.notes) lines.push(`DESCRIPTION:${escapeText(e.notes)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
