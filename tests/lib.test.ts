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

test("ugentlige opgaver: antal pr. uge og mindst X dage imellem", async () => {
  const { availability, minGapDays } = await import("../lib/tasks.ts");
  assert.equal(minGapDays(2), 3);
  assert.equal(minGapDays(3), 2);
  assert.equal(minGapDays(1), 0);
  // 2 gange om ugen: mandag udført -> tirsdag og onsdag spærret, torsdag tilladt
  assert.deepEqual(availability("weekly", 2, ["2026-10-19"], "2026-10-20"), { allowed: false, doneInPeriod: 1, nextDate: "2026-10-22" });
  assert.equal(availability("weekly", 2, ["2026-10-19"], "2026-10-22").allowed, true);
  // to gange udført -> spærret resten af ugen
  const full = availability("weekly", 2, ["2026-10-19", "2026-10-22"], "2026-10-25");
  assert.equal(full.allowed, false);
  assert.equal(full.nextDate, "2026-10-26");
  // afstanden gælder også hen over ugeskiftet: søndag udført -> mandag spærret
  assert.equal(availability("weekly", 2, ["2026-10-25"], "2026-10-26").allowed, false);
  assert.equal(availability("weekly", 2, ["2026-10-25"], "2026-10-28").allowed, true);
  // 1 gang om ugen styres kun af ugen
  assert.equal(availability("weekly", 1, ["2026-10-25"], "2026-10-26").allowed, true);
  assert.equal(availability("daily", 1, ["2026-10-25"], "2026-10-25").allowed, false);
  assert.equal(availability("once", 1, ["2026-10-01"], "2026-10-25").allowed, false);
});

test("indkøbslistens varer gættes ind i kategorier", async () => {
  const { guessCategory } = await import("../lib/categories.ts");
  const cases: [string, string][] = [
    ["Hakket oksekød", "Ferskvarer"], ["Hakket grise- og kalvekød", "Ferskvarer"], ["Bacon", "Ferskvarer"], ["Flæskesteg", "Ferskvarer"],
    ["Mælk", "Mejeri"], ["Smør", "Mejeri"], ["Æg", "Mejeri"], ["Revet ost", "Mejeri"], ["Græsk yoghurt 10%", "Mejeri"], ["Creme fraiche", "Mejeri"],
    ["Løg", "Frugt og grønt"], ["Hvidløg", "Frugt og grønt"], ["Æble", "Frugt og grønt"], ["Tomater", "Frugt og grønt"], ["Rød peber", "Frugt og grønt"],
    ["Frisk timian", "Frugt og grønt"], ["Kartofler", "Frugt og grønt"],
    ["Hakkede tomater", "Tørvarer"], ["Syltet rødkål", "Tørvarer"], ["Majs", "Frugt og grønt"], ["Ris", "Tørvarer"], ["Hvedemel", "Tørvarer"],
    ["Spaghetti", "Tørvarer"], ["Olivenolie", "Tørvarer"], ["Pizzasovs", "Tørvarer"],
    ["Groft salt", "Krydderier"], ["Peber", "Krydderier"], ["Karry", "Krydderier"], ["Hønsebouillonpulver", "Krydderier"], ["Laurbærblade", "Krydderier"],
    ["Pommes frites", "Frost"], ["Burgerboller", "Brød"], ["Fladbrød eller pitabrød", "Brød"], ["Tortillapandekager", "Brød"],
    ["Toiletpapir", "Nonfood"], ["Topping", "Andet"],
  ];
  for (const [name, cat] of cases) assert.equal(guessCategory(name), cat, name);
});
