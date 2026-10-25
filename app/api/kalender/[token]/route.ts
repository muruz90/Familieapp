import { calendarToken } from "@/lib/db";
import { allEventsForFeed } from "@/lib/queries";
import { buildCalendar } from "@/lib/ics";
import { addDays, todayLocal } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (token.replace(/\.ics$/, "") !== calendarToken()) return new Response("Ikke fundet", { status: 404 });
  const events = allEventsForFeed(addDays(todayLocal(), -90));
  return new Response(buildCalendar("Familien", events), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="familie.ics"',
      "Cache-Control": "no-cache",
    },
  });
}
