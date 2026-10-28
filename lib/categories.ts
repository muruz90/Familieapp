// Kategorier i den rækkefølge, man typisk går gennem butikken.
export const CATEGORIES = ["Brød", "Frugt og grønt", "Ferskvarer", "Mejeri", "Frost", "Tørvarer", "Krydderier", "Nonfood", "Andet"] as const;
export type Category = (typeof CATEGORIES)[number];

// Et ord, der står for sig selv (æ, ø og å tæller som bogstaver, hvilket \b ikke gør).
const word = (w: string) => new RegExp(`(^|[^a-zæøå])${w}($|[^a-zæøå])`);

// Reglerne tjekkes i rækkefølge; første match vinder. Derfor står undtagelser først,
// fx "hakkede tomater" (dåse) før "tomat" (grønt) og "rød peber" før "peber".
const RULES: [Category, (string | RegExp)[]][] = [
  ["Nonfood", ["toiletpapir", "køkkenrulle", "sæbe", "opvask", "vaskemiddel", "skyllemiddel", "bleer", "sølvpapir", "folie", "affaldspose", "fryseposer", "batteri", "shampoo", "tandpasta", "servietter", "stearinlys"]],
  ["Tørvarer", ["hakkede tomater", "flåede tomater", "tomatpuré", "syltet", "dåse", "soltørrede"]],
  ["Frugt og grønt", ["rød peber", "gul peber", "grøn peber", "peberfrugt", "frisk "]],
  ["Frost", ["pommes", "frost", "frossen", "frosne", word("is"), "isvafler"]],
  ["Krydderier", ["salt", word("peber"), "peberkorn", "karry", "paprika", "oregano", "timian", "spidskommen", "chili", "kanel", "laurbær", "nellike", "basilikum", "krydderi", "bouillon", "muskat", "ingefær", "rosmarin", "dild", "vanilje", "hvidløgspulver"]],
  ["Ferskvarer", ["hakket", "kød", "kalv", "kylling", "bacon", "flæsk", "pølse", "fisk", "laks", "torsk", "rejer", "skinke", "steg", "frikadelle", "medister", word("and"), "kalkun", "pålæg", "leverpostej"]],
  ["Mejeri", ["mælk", "fløde", "smør", word("ost"), "oste", "parmesan", "cheddar", "mozzarella", "feta", "yoghurt", "creme fraiche", "cremefraiche", "skyr", word("æg"), "kærnemælk"]],
  ["Brød", ["brød", "boller", "pita", "tortilla", "rugbrød", "toast", "baguette", "pizzadej", "wraps"]],
  ["Frugt og grønt", ["løg", "tomat", "agurk", "gulerød", "gulerødder", "kartof", "salat", "æble", "pære", "banan", "citron", "lime", "appelsin", "persille", "purløg", "kål", "broccoli", "blomkål", "squash", "aubergine", "champignon", "svampe", "porre", "selleri", "spinat", "avocado", "druer", "jordbær", "bær", "majs", "ærter", "bønner", "frugt", "grønt"]],
  ["Tørvarer", [word("mel"), "hvedemel", "sukker", word("ris"), "pasta", "spaghetti", "nudler", "makaroni", "olie", "eddike", "balsamico", "chips", "tacoskal", "gele", "dressing", "sovs", "sauce", "dipmix", "havregryn", "müsli", "kaffe", word("te"), "kakao", "honning", "marmelade", "ketchup", "sennep", "mayonnaise", "rødvin", "hvidvin", "kulør", "gastrik", "nødder", "peanuts", "rosiner", "bagepulver", "gær"]],
];

export function guessCategory(name: string): Category {
  const n = ` ${name.toLowerCase().trim()} `;
  for (const [category, patterns] of RULES) {
    if (patterns.some((p) => (typeof p === "string" ? n.includes(p) : p.test(n)))) return category;
  }
  return "Andet";
}

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
