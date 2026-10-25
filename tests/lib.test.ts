import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregate } from "../lib/shopping.ts";
import { buildCalendar } from "../lib/ics.ts";
import { isoWeek, parseKr, kr, mondayOf } from "../lib/format.ts";

test("indkøbsliste lægger samme vare sammen og omregner enheder", () => {
  const items = aggregate([
    { recipe: "Lasagne", factor: 1, ingredients: [
      { name: "Hakket oksekød", quantity: 500, unit: "g" },
      { name: "Mælk", quantity: 5, unit: "dl" },
      { name: "Løg", quantity: 2, unit: "stk" },
    ] },
    { recipe: "Kødsovs", factor: 2, ingredients: [
      { name: "hakket oksekød ", quantity: 0.4, unit: "kg" },
      { name: "Løg", quantity: 1, unit: "stk" },
      { name: "Mælk", quantity: 1, unit: "l" },
      { name: "Salt", quantity: null, unit: "" },
    ] },
  ]);
  const byName = Object.fromEntries(items.map((i) => [i.name.toLowerCase(), i]));
  assert.equal(byName["hakket oksekød"].amount, "1,3 kg");
  assert.equal(byName["mælk"].amount, "2,5 l");
  assert.equal(byName["løg"].amount, "4 stk");
  assert.equal(byName["salt"].amount, "");
  assert.deepEqual(byName["hakket oksekød"].recipes, ["Lasagne", "Kødsovs"]);
});

test("forskellige enheder der ikke kan omregnes holdes adskilt", () => {
  const items = aggregate([{ recipe: "A", factor: 1, ingredients: [
    { name: "Tomater", quantity: 400, unit: "g" },
    { name: "Tomater", quantity: 1, unit: "dåse" },
  ] }]);
  assert.equal(items.length, 2);
});

test("beløb og uger", () => {
  assert.equal(parseKr("25,50"), 2550);
  assert.equal(parseKr("10 kr."), 1000);
  assert.equal(parseKr("abc"), null);
  assert.equal(kr(2550).replace(/\u00a0/g, " "), "25,50 kr.");
  assert.equal(isoWeek("2026-10-25"), "2026-W43");
  assert.equal(isoWeek("2027-01-01"), "2026-W53");
  assert.equal(mondayOf("2026-10-25"), "2026-10-19");
});

test("kalenderfeed er gyldigt ICS", () => {
  const ics = buildCalendar("Familien", [
    { uid: "a@familie", title: "Fodbold, U10", starts_at: "2026-10-27T16:30", ends_at: "2026-10-27T18:00", all_day: 0, location: "Stadion", notes: "Husk drikkedunk", updated_at: "2026-10-25 15:00:00", who: "Emil" },
    { uid: "b@familie", title: "Efterårsferie", starts_at: "2026-10-12", ends_at: "2026-10-16", all_day: 1, location: "", notes: "", updated_at: "2026-10-25 15:00:00" },
  ]);
  assert.match(ics, /DTSTART;TZID=Europe\/Copenhagen:20261027T163000\r\n/);
  assert.match(ics, /SUMMARY:Fodbold\\, U10 \(Emil\)\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20261017\r\n/);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  for (const line of ics.split("\r\n")) assert.ok(Buffer.byteLength(line) <= 75);
});
