// ─────────────────────────────────────────────────────────────
// NASTAVENÍ WEBU
// ─────────────────────────────────────────────────────────────
// Po nasazení Apps Scriptu sem vlož URL webové aplikace (končí /exec).
// Dokud je prázdné, web běží v DEMO režimu: data se ukládají jen
// v tomto prohlížeči a jsou předvyplněná ukázkovým obsahem.
export const API_URL = "https://script.google.com/macros/s/AKfycbzytzzJF9VDjq-MThohZF93wpCDry1LV8LgRCP-EDIRprRKXxnoeB9NTbL9zpe8vEPnZw/exec";

// Třídy, mezi kterými se dá filtrovat a které žák volí při odesílání.
export const CLASSES = ["L1A", "L1B", "L1C"];

// Název a podtitul úvodní části.
export const SITE = {
  title: "Atlas vztahů",
  subtitle:
    "Společný přehled tříd L1A, L1B a L1C k bloku Vztahy a komunikace. " +
    "Co od vztahů čekáme, co do nich dáváme, co je ničí a na čem stojí.",
  subject: "H-PMC · Personality, Metaphysics & Creativity",
};

// Čtyři osy, podle kterých třídíme typy vztahů (−1 … +1).
export const AXES = [
  { id: "closeness", left: "osobní (blízké)", right: "sociální (vzdálenější)", en: "personal ↔ social" },
  { id: "symmetry", left: "symetrický", right: "asymetrický", en: "symmetrical ↔ asymmetrical" },
  { id: "formality", left: "neformální", right: "formální", en: "informal ↔ formal" },
  { id: "choice", left: "volený (dobrovolný)", right: "daný (nedobrovolný)", en: "chosen ↔ given" },
];

// Hodnoty pro „Moje priority“ (osobní část). Vychází z pilířů, které jmenovaly třídy.
// Při změně ponech stará id (respekt, duvera…), aby žákům zůstalo uložené pořadí.
export const VALUES = [
  { id: "duvera", name: "Důvěra", en: "trust", hint: "můžu se spolehnout, že mi neublíží" },
  { id: "respekt", name: "Respekt", en: "respect", hint: "vzájemný, i k sobě samému" },
  { id: "podpora", name: "Podpora", en: "support", hint: "i ta emoční, hlavně v těžkých chvílích" },
  { id: "komunikace", name: "Komunikace", en: "communication", hint: "umíme si o věcech říct" },
  { id: "uprimnost", name: "Upřímnost", en: "honesty", hint: "otevřenost, nehrát si na něco" },
  { id: "bezpeci", name: "Bezpečí", en: "safety", hint: "cítím se v klidu a v bezpečí" },
  { id: "prijeti", name: "Přijetí", en: "acceptance", hint: "můžu být sám/sama sebou" },
  { id: "pochopeni", name: "Pochopení a zájem", en: "understanding", hint: "druhý se zajímá a snaží se mi rozumět" },
  { id: "laska", name: "Láska", en: "love", hint: "oboustranná a dávaná najevo" },
  { id: "fyzicka", name: "Fyzická blízkost", en: "physical intimacy", hint: "dotek, přitažlivost, sex" },
  { id: "spolehlivost", name: "Spolehlivost", en: "reliability", hint: "držet slovo, být k zastižení" },
  { id: "loajalita", name: "Loajalita", en: "loyalty", hint: "stojíme při sobě" },
  { id: "vzajemnost", name: "Vzájemnost", en: "reciprocity", hint: "stejné úsilí na obou stranách" },
  { id: "laskavost", name: "Laskavost a ochota pomoct", en: "kindness" },
  { id: "zabava", name: "Humor a zábava", en: "fun" },
  { id: "cas", name: "Společný čas a zájmy", en: "time together", hint: "zážitky, koníčky, hodnoty" },
  { id: "soukromi", name: "Soukromí a vlastní prostor", en: "privacy" },
  { id: "odpusteni", name: "Odpuštění", en: "forgiveness" },
];

// Symboly do osobní mapy vztahů.
export const SYMBOLS = [
  { id: "heart", s: "♥", label: "Můžu se svěřit" },
  { id: "smile", s: "☺", label: "Směju se, bavím se" },
  { id: "tool", s: "⚒", label: "Praktická pomoc" },
  { id: "q", s: "?", label: "Rada, informace" },
  { id: "star", s: "★", label: "Můžu být sám/sama sebou" },
  { id: "flag", s: "⚑", label: "Společné zájmy" },
  { id: "bolt", s: "⚡", label: "Stojí mě hodně energie" },
];

// Míra blízkosti v osobní mapě: 1 = nejblíž ke středu, 4 = nejdál.
export const RINGS = [
  { id: 1, name: "nejbližší" },
  { id: 2, name: "" },
  { id: 3, name: "" },
  { id: 4, name: "nejvzdálenější" },
];
