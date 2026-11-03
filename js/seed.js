// Výchozí typy vztahů a oddíly. Totéž vloží do tabulky funkce setup()
// v Apps Scriptu; v demo režimu se používá přímo odsud.
// Osy: -1 = levý pól, +1 = pravý pól (viz AXES v config.js). [lo, hi] = rozpětí.

export const DEFAULT_TYPES = [
  {
    id: "rodina", name: "Rodina", en: "family", color: "#FF6C2F", order: 1,
    description: "Rodiče, sourozenci, prarodiče. Vztahy, které si nevybíráme, ale často trvají celý život.",
    closeness: [-1, -0.4], symmetry: [-0.4, 0.8], formality: [-1, -0.6], choice: [0.6, 1],
  },
  {
    id: "pratelstvi", name: "Přátelství", en: "friendship", color: "#E8B900", order: 2,
    description: "Kamarádi a přátelé. Vztahy, které si volíme a které stojí na vzájemnosti.",
    closeness: [-0.9, 0.1], symmetry: [-1, -0.5], formality: [-1, -0.7], choice: [-1, -0.6],
  },
  {
    id: "partnersky", name: "Partnerský vztah", en: "romantic", color: "#FF48B0", order: 3,
    description: "Chození, láska, partnerství. Nejvíc blízkosti, a proto i nejvíc zranitelnosti.",
    closeness: [-1, -0.7], symmetry: [-0.9, -0.3], formality: [-0.9, -0.4], choice: [-1, -0.7],
  },
  {
    id: "skola", name: "Škola a práce", en: "school & work", color: "#0078BF", order: 4,
    description: "Spolužáci, učitelé, kolegové, šéf na brigádě. Vztahy, které vymezuje role.",
    closeness: [-0.2, 0.8], symmetry: [-0.6, 0.9], formality: [0, 0.9], choice: [0.2, 0.9],
  },
  {
    id: "komunita", name: "Komunita a sousedé", en: "community", color: "#00A95C", order: 5,
    description: "Sousedé, oddíl, kroužek, sportovní klub. Vztahy spojené s místem nebo s aktivitami.",
    closeness: [0.3, 0.9], symmetry: [-0.6, 0.2], formality: [-0.2, 0.5], choice: [0.1, 0.7],
  },
  {
    id: "sluzby", name: "Instituce a služby", en: "services", color: "#00838A", order: 6,
    description: "Lékař, prodavačka, řidič autobusu. Krátké, formální, ale každodenní setkání.",
    closeness: [0.7, 1], symmetry: [0.2, 0.8], formality: [0.5, 1], choice: [-0.4, 0.6],
  },
  {
    id: "online", name: "Online a jednostranné", en: "online & parasocial", color: "#765BA7", order: 7,
    description: "Kamarádi z online her, youtubeři, postavy ze seriálů. Někdy o nás druhá strana ani neví.",
    closeness: [-0.3, 1], symmetry: [0.4, 1], formality: [-0.8, -0.1], choice: [-1, -0.4],
  },
];

export const DEFAULT_SECTIONS = [
  {
    id: "ocekavame", order: 1, kind: "bubbles", open: true, visible: true,
    title: "Co od vztahů čekáme a co nám dávají", en: "what we expect and receive",
    subtitle: "Proč vztahy potřebujeme. Čím větší kruh, tím víc lidí to zmínilo.",
  },
  {
    id: "davame", order: 2, kind: "bubbles", open: true, visible: true,
    title: "Co pro vztahy děláme", en: "what we do",
    subtitle: "Konkrétní činy: co uděláš, aby vztah fungoval. Čím větší kruh, tím víc lidí to zmínilo.",
  },
  {
    id: "nici", order: 3, kind: "bubbles", open: true, visible: true,
    title: "Co vztahy ničí", en: "what harms relationships",
    subtitle: "Chování a situace, které vztahy oslabují nebo rozbíjejí.",
  },
  {
    id: "pilire", order: 4, kind: "pillars", open: true, visible: true,
    title: "Na čem vztahy stojí", en: "pillars",
    subtitle: "Principy, na kterých vztah stojí: jedno slovo a k němu, co znamená. Každý kruh ve sloupu je jeden žák, který pilíř zmínil.",
  },
  {
    id: "ambivalence", order: 5, kind: "pairs", open: true, visible: true,
    title: "Rub a líc", en: "ambivalence",
    subtitle: "Co nám vztah dává a co nás tentýž vztah stojí. ⟷ znamená, že jde o dvě strany jedné mince, ✕ že spolu nesouvisí.",
  },
];

// Ukázkový obsah jen pro DEMO režim (v ostré verzi začíná přehled prázdný).
let n = 0;
const it = (section, text, types, classes, weight, extra = {}) => ({
  id: "demo" + ++n, section, text, text2: "", mark: "", types, classes, weight,
  status: "approved", source: "teacher", created: new Date().toISOString(), ...extra,
});

export const DEMO_ITEMS = [
  it("ocekavame", "Můžu se svěřit, když mám špatný den", ["pratelstvi", "rodina", "partnersky"], ["L1A", "L1B", "L1C"], 9),
  it("ocekavame", "Zábava a smích", ["pratelstvi", "online"], ["L1A", "L1C"], 7),
  it("ocekavame", "Praktická pomoc", ["rodina", "komunita"], ["L1B"], 4),
  it("ocekavame", "Rada, když nevím", ["rodina", "skola"], ["L1A", "L1B"], 5),
  it("ocekavame", "Můžu být sám/sama sebou", ["pratelstvi", "partnersky"], ["L1A", "L1B", "L1C"], 8),
  it("ocekavame", "Pocit, že někam patřím", [], ["L1C"], 6),
  it("ocekavame", "Společné zážitky", ["pratelstvi", "partnersky"], ["L1B"], 3),
  it("ocekavame", "Jasná pravidla a férovost", ["skola", "sluzby"], ["L1A"], 3),
  it("ocekavame", "Inspirace, nové nápady", ["online", "skola"], ["L1C"], 2),
  it("davame", "Čas a pozornost", ["pratelstvi", "partnersky", "rodina"], ["L1A", "L1B", "L1C"], 8),
  it("davame", "Držím slovo", [], ["L1A", "L1B"], 6),
  it("davame", "Ptám se, jak se druhý má", ["pratelstvi", "rodina"], ["L1C"], 4),
  it("davame", "Umím se omluvit", [], ["L1B"], 5),
  it("davame", "Nechávám druhému prostor", ["partnersky", "rodina"], ["L1A"], 3),
  it("davame", "Zdravím, poděkuju", ["komunita", "sluzby", "skola"], ["L1A"], 2),
  it("davame", "Odpouštím", ["rodina", "pratelstvi"], ["L1C"], 3),
  it("nici", "Lež a zrada důvěry", [], ["L1A", "L1B", "L1C"], 9),
  it("nici", "Pomluvy za zády", ["pratelstvi", "skola"], ["L1B", "L1C"], 6),
  it("nici", "Nezájem, ignorování", [], ["L1A"], 5),
  it("nici", "Ponižování před ostatními", ["skola", "rodina"], ["L1C"], 4),
  it("nici", "Kontrola a omezování", ["partnersky"], ["L1A", "L1B"], 4),
  it("nici", "Nedodržené sliby", [], ["L1B"], 3),
  it("pilire", "Respekt: druhého bereme vážně, i když s ním nesouhlasíme", [], ["L1A", "L1B", "L1C"], 9),
  it("pilire", "Důvěra: můžeme se na sebe spolehnout", [], ["L1A", "L1B", "L1C"], 8),
  it("pilire", "Vzájemnost: dáváme i bereme", ["pratelstvi", "partnersky"], ["L1A", "L1C"], 6),
  it("pilire", "Upřímnost: říkáme si pravdu, i když je nepříjemná", ["pratelstvi", "partnersky", "rodina"], ["L1B"], 5),
  it("pilire", "Prostor: každý má i vlastní život", ["partnersky", "rodina"], ["L1C"], 4),
  it("pilire", "Férovost: pravidla platí pro všechny", ["skola", "komunita"], ["L1A"], 3),
  it("ambivalence", "Blízkost: můžu ukázat i to, co před ostatními skrývám", ["partnersky", "pratelstvi"], ["L1A"], 1, { text2: "Ví o mně věci, které by mohl použít proti mně", mark: "pair", source: "teacher" }),
  it("ambivalence", "Důvěra: spoléhám se, že mi neublíží", [], ["L1A"], 1, { text2: "Když mě zklame, bolí to mnohem víc", mark: "pair", source: "teacher" }),
  it("ambivalence", "Závazek: vím, že se mnou bude i zítra", ["rodina", "partnersky"], ["L1A"], 1, { text2: "I já jsem vázaný/á a musím brát ohled", mark: "pair", source: "teacher" }),
  it("ambivalence", "Opora: vím, na koho se obrátit", ["rodina", "pratelstvi"], ["L1A"], 1, { text2: "Čeká totéž ode mě, i když se mi nechce", mark: "pair", source: "teacher" }),
  it("ambivalence", "Mamka pozná, že mi není dobře", ["rodina"], ["L1B"], 1, { text2: "Před ní nic neschovám, ani když chci", mark: "pair", source: "student" }),
  it("ambivalence", "Se ségrou se nasměju jako s nikým", ["rodina"], ["L1C"], 1, { text2: "Před kamarády mě shazuje", mark: "cross", source: "student" }),
  it("ambivalence", "Kamarád mi vždycky pomůže s matikou", ["pratelstvi", "skola"], ["L1A"], 1, { text2: "Pak mám pocit, že mu něco dlužím", mark: "pair", source: "student" }),
  it("ambivalence", "S klukem jsme pořád spolu", ["partnersky"], ["L1C"], 1, { text2: "Nemám moc času na kamarádky", mark: "pair", source: "student" }),
  it("ambivalence", "Trenér věří, že na to mám", ["komunita"], ["L1B"], 1, { text2: "Bojím se, že ho zklamu", mark: "pair", source: "student" }),
  it("ambivalence", "Parta z online hry je vždycky online", ["online"], ["L1A"], 1, { text2: "Zlobí se, když nehraju", mark: "cross", source: "student" }),
];
