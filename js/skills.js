// Komunikační dovednosti: menu na stránce Atlas komunikace a na stránkách jednotlivých dovedností.
// Novou dovednost zveřejníš tak, že vytvoříš její stránku a doplníš sem `href`.

export const SKILLS = [
  {
    id: "naslouchani",
    title: "Aktivní naslouchání",
    topic: "Naslouchání a podpora",
    desc: "Jak druhého opravdu slyšet, dát mu najevo, že mu rozumím, a čemu se vyhnout.",
    week: "16.–20. 11.",
    href: "naslouchani.html",
    // jeden velký kruh, který „pojme“ menší
    orbs: [[46, 50, 34, "#0078BF"], [64, 50, 16, "#765BA7"]],
  },
  {
    id: "zpetna-vazba",
    title: "Zpětná vazba a kritika",
    topic: "Zpětná vazba a kritika",
    desc: "Jak říct, co se povedlo i co mi vadí, a jak kritiku přijmout.",
    week: "23.–27. 11.",
    href: null,
    orbs: [[36, 42, 24, "#FF48B0"], [64, 58, 24, "#00A95C"]],
  },
  {
    id: "asertivita",
    title: "Asertivita",
    topic: "Pasivita, agresivita, manipulace a asertivita",
    desc: "Jak se ozvat za sebe a nepřekračovat druhé. Jak poznat manipulaci.",
    week: "30. 11.–4. 12.",
    href: null,
    orbs: [[30, 50, 20, "#00838A"], [70, 50, 20, "#765BA7"], [50, 50, 7, "#0078BF"]],
  },
  {
    id: "konflikty",
    title: "Konflikty a jejich řešení",
    topic: "Konflikty a jejich řešení",
    desc: "Proč konflikty vznikají a jak se z nich dá společně vyjít.",
    week: "7.–11. 12.",
    href: null,
    orbs: [[40, 50, 27, "#FF48B0"], [60, 50, 27, "#0078BF"]],
  },
];

const NS = "http://www.w3.org/2000/svg";
function orbs(list) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("skill-orbs");
  for (const [cx, cy, r, fill] of list) {
    const c = document.createElementNS(NS, "circle");
    Object.entries({ cx, cy, r, fill, "fill-opacity": 0.5 }).forEach(([k, v]) => c.setAttribute(k, v));
    c.classList.add("blend");
    svg.append(c);
  }
  return svg;
}

// Vykreslí dlaždice dovedností do `el`. `current` je id právě otevřené dovednosti.
export function renderSkills(el, current = null) {
  if (!el) return;
  el.replaceChildren();
  SKILLS.forEach((s, i) => {
    const open = Boolean(s.href);
    const tile = document.createElement(open ? "a" : "div");
    tile.className = "skill" + (open ? "" : " is-soon") + (s.id === current ? " is-current" : "");
    if (open) tile.href = s.href;
    if (s.id === current) tile.setAttribute("aria-current", "page");
    tile.append(orbs(s.orbs));
    const no = document.createElement("span");
    no.className = "skill-no";
    no.textContent = String(i + 1).padStart(2, "0");
    const h = document.createElement("h3");
    h.textContent = s.title;
    const topic = document.createElement("p");
    topic.className = "skill-topic";
    topic.textContent = s.topic !== s.title ? s.topic : "";
    const d = document.createElement("p");
    d.className = "skill-desc";
    d.textContent = s.desc;
    const st = document.createElement("span");
    st.className = "skill-status";
    st.textContent = s.id === current ? "Právě čteš" : open ? "Otevřít" : "Připravujeme · " + s.week;
    tile.append(no, h);
    if (topic.textContent) tile.append(topic);
    tile.append(d, st);
    el.append(tile);
  });
}
