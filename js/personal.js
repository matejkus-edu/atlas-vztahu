// Osobní část: ukládá se jen do localStorage tohoto prohlížeče.
import { CLASSES, VALUES, SYMBOLS, RINGS, SITE } from "./config.js?v=20261104a";
import { ls, submitItem } from "./api.js?v=20261104a";
import { h, s, toast } from "./ui.js?v=20261104a";

const KEY = "atlas-me-v1";
const $ = (id) => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 9);

let ctx;
let me;
let editingId = null;

function blank() {
  return {
    name: "", cls: "",
    people: [],
    prio: { general: VALUES.map((v) => v.id) },
    pairs: [{ id: uid(), type: "", gift: "", cost: "", mark: "", sent: false }],
    reflect: { strong: "", grow: "", act: "" },
    customValues: [],
  };
}

const allValues = () => [...VALUES, ...me.customValues];

// Starší verze mapy měla u lidí značky (symbols). Převedeme je na blesk + text „co mi vztah dává“.
function migratePerson(p, customSymbols) {
  const ring = Math.min(4, Math.max(1, Number(p.ring) || 1));
  // dřívější „blesk“ se převede na text v poli „co mě vztah stojí“
  const costs = p.costs || (p.bolt || p.symbols?.includes?.("bolt") ? "hodně energie" : "");
  if (!Array.isArray(p.symbols)) { const { bolt, ...rest } = p; return { ...rest, ring, gives: p.gives || "", costs }; }
  const labels = p.symbols
    .filter((id) => id !== "bolt")
    .map((id) => [...SYMBOLS, ...customSymbols].find((sy) => sy.id === id)?.label)
    .filter(Boolean);
  const { symbols, ...rest } = p;
  return { ...rest, ring, costs, gives: p.gives || labels.join(", ") };
}

function load() {
  const d = ls.get(KEY, null);
  const b = blank();
  if (!d || typeof d !== "object") return b;
  return {
    ...b, ...d,
    prio: { ...b.prio, ...(d.prio || {}) },
    reflect: { ...b.reflect, ...(d.reflect || {}) },
    // starší data měla 5 kruhů a značky; převedeme je
    people: Array.isArray(d.people) ? d.people.map((p) => migratePerson(p, Array.isArray(d.customSymbols) ? d.customSymbols : [])) : [],
    customValues: Array.isArray(d.customValues) ? d.customValues : [],
    pairs: Array.isArray(d.pairs) && d.pairs.length ? d.pairs : b.pairs,
  };
}
const save = () => { if (!ls.set(KEY, me)) toast("Tento prohlížeč neumožňuje ukládání. Ulož si zálohu nebo PDF."); };
const typeById = (id) => ctx.types.find((t) => t.id === id);

export function initPersonal(context) {
  ctx = context;
  me = load();

  const name = $("me-name");
  name.value = me.name;
  name.oninput = () => { me.name = name.value; save(); };
  const cls = $("me-class");
  cls.innerHTML = "";
  cls.append(h("option", { value: "" }, "Vyber…"));
  CLASSES.forEach((c) => cls.append(h("option", { value: c }, c)));
  cls.value = me.cls;
  cls.onchange = () => { me.cls = cls.value; save(); };

  initMapForm();
  renderMap();
  initPrio();
  renderReflect();
  initExport();
}

// ── mapa ────────────────────────────────────────────────────
const VB = 1000, C = VB / 2, R0 = 66, STEP = 104;
const ringOuter = (i) => R0 + i * STEP; // i = 1..4
const ringMid = (i) => R0 + (i - 0.5) * STEP;
const PILL_H = 32;
const shortName = (s) => (s.length > 26 ? s.slice(0, 25) + "…" : s);
const pillWidth = (label) => Math.min(230, Math.round(shortName(label).length * 9 + 26));

function initMapForm() {
  const ring = $("p-ring");
  ring.innerHTML = "";
  RINGS.forEach((r) => ring.append(h("option", { value: r.id }, r.id + (r.name ? " (" + r.name + ")" : ""))));
  const type = $("p-type");
  type.innerHTML = "";
  type.append(h("option", { value: "" }, "Neurčeno"));
  ctx.types.forEach((t) => type.append(h("option", { value: t.id }, t.name)));

  $("map-form").onsubmit = (e) => {
    e.preventDefault();
    const label = $("p-label").value.trim().slice(0, 40);
    if (!label) return;
    const data = {
      label,
      ring: Number($("p-ring").value),
      type: $("p-type").value,
      gives: $("p-gives").value.trim().slice(0, 400),
      costs: $("p-costs").value.trim().slice(0, 400),
    };
    if (editingId) Object.assign(me.people.find((p) => p.id === editingId), data);
    else me.people.push({ id: uid(), ...data });
    save();
    resetMapForm();
    renderMap();
    $("p-label").focus();
  };
  $("p-cancel").onclick = () => { resetMapForm(); renderMap(); };
  $("p-delete").onclick = () => {
    me.people = me.people.filter((p) => p.id !== editingId);
    save(); resetMapForm(); renderMap();
  };
  initZoom();
}

function resetMapForm() {
  editingId = null;
  $("map-form").reset();
  $("p-ring").value = "1";
  $("map-form-title").textContent = "Přidat člověka";
  $("p-save").textContent = "Přidat do mapy";
  $("p-cancel").hidden = true;
  $("p-delete").hidden = true;
}

function editPerson(p) {
  editingId = p.id;
  $("p-label").value = p.label;
  $("p-ring").value = String(p.ring);
  $("p-type").value = p.type || "";
  $("p-gives").value = p.gives || "";
  $("p-costs").value = p.costs || "";
  $("map-form-title").textContent = p.label;
  $("p-save").textContent = "Uložit změny";
  $("p-cancel").hidden = false;
  $("p-delete").hidden = false;
  renderMap();
  // na úzké obrazovce je formulář pod mapou: posuneme se k němu
  if (window.matchMedia("(max-width: 820px)").matches) $("map-form").scrollIntoView({ behavior: "smooth", block: "start" });
  else $("p-gives").focus();
}

export function buildMapSvg(svg, interactive) {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${VB} ${VB}`);
  RINGS.slice().reverse().forEach((r) => {
    svg.append(s("circle", { class: "ring", cx: C, cy: C, r: ringOuter(r.id) }));
  });
  RINGS.forEach((r) => {
    svg.append(s("text", {
      class: "ring-label", x: C, y: C + ringOuter(r.id) - 10, "text-anchor": "middle",
      text: String(r.id), style: { paintOrder: "stroke", stroke: "var(--paper)", strokeWidth: "4px" },
    }));
  });
  svg.append(s("circle", { class: "me", cx: C, cy: C, r: R0 - 10 }));
  svg.append(s("text", { class: "me-label", x: C, y: C + 8, "text-anchor": "middle", text: "JÁ" }));

  RINGS.forEach((r) => {
    const people = me.people.filter((p) => p.ring === r.id);
    const n = people.length;
    if (!n) return;
    // dole necháme mezeru pro číslo kruhu
    const gap = 0.6, start = Math.PI / 2 + gap / 2, span = Math.PI * 2 - gap;
    const avgW = people.reduce((a, p) => a + pillWidth(p.label), 0) / n;
    const crowded = n * avgW * 0.8 > 2 * Math.PI * ringMid(r.id);
    people.forEach((p, k) => {
      // sousední kruhy jsou vůči sobě pootočené, aby se jména nepřekrývala
      const phase = r.id % 2 ? 0.25 : 0.7;
      const ang = start + ((k + phase) / n) * span;
      const w = pillWidth(p.label);
      // dlouhé jméno nesmí zasahovat do středu „JÁ“
      const minRad = R0 + 10 + (w / 2) * Math.abs(Math.cos(ang)) + (PILL_H / 2) * Math.abs(Math.sin(ang));
      const rad = Math.max(minRad, ringMid(r.id) + (crowded ? (k % 2 ? 17 : -17) : 0));
      const x = C + Math.cos(ang) * rad, y = C + Math.sin(ang) * rad;
      const t = typeById(p.type);
      const g = s("g", { class: "person" + (interactive && p.id === editingId ? " sel" : "") });
      g.append(
        s("rect", { class: "node blend", x: x - w / 2, y: y - PILL_H / 2, width: w, height: PILL_H, rx: PILL_H / 2, fill: t ? t.color : "#8A8FAD" }),
        s("text", { x, y: y + 5, "text-anchor": "middle", text: shortName(p.label) }),
      );
      if (interactive) {
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", p.label + ". Klepnutím otevřeš, co ti vztah dává a co tě stojí.");
        g.append(s("title", { text: p.label }));
        g.addEventListener("click", () => editPerson(p));
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); editPerson(p); } });
      }
      svg.append(g);
    });
  });
}

function renderMap() { buildMapSvg($("map-svg"), true); }

// ── zoom mapy: zvětšení SVG uvnitř posuvného rámečku ─────────
const ZOOMS = [1, 1.5, 2, 3];
let zoomIdx = 0;
function initZoom() {
  const box = $("map-zoom-box");
  const apply = (idx) => {
    const cx = (box.scrollLeft + box.clientWidth / 2) / box.scrollWidth;
    const cy = (box.scrollTop + box.clientHeight / 2) / box.scrollHeight;
    zoomIdx = Math.max(0, Math.min(ZOOMS.length - 1, idx));
    $("map-svg").style.width = ZOOMS[zoomIdx] * 100 + "%";
    box.scrollLeft = cx * box.scrollWidth - box.clientWidth / 2;
    box.scrollTop = cy * box.scrollHeight - box.clientHeight / 2;
    box.classList.toggle("zoomed", zoomIdx > 0);
    $("zoom-out").disabled = zoomIdx === 0;
    $("zoom-in").disabled = zoomIdx === ZOOMS.length - 1;
    $("zoom-level").textContent = Math.round(ZOOMS[zoomIdx] * 100) + " %";
  };
  $("zoom-in").onclick = () => apply(zoomIdx + 1);
  $("zoom-out").onclick = () => apply(zoomIdx - 1);
  $("zoom-reset").onclick = () => apply(0);
  apply(zoomIdx);
}

// ── priority ────────────────────────────────────────────────
let sortable;
function initPrio() {
  const ctxSel = $("prio-context");
  ctxSel.innerHTML = "";
  ctxSel.append(h("option", { value: "general" }, "vztahy obecně"));
  ctx.types.forEach((t) => ctxSel.append(h("option", { value: t.id }, t.name.toLowerCase())));
  ctxSel.onchange = renderPrio;
  $("prio-add").onsubmit = (e) => {
    e.preventDefault();
    const name = $("prio-new").value.trim();
    if (!name) return;
    const v = { id: "cv-" + uid(), name };
    me.customValues.push(v);
    // nová hodnota se zařadí na konec všech pořadí
    Object.keys(me.prio).forEach((k) => me.prio[k].push(v.id));
    save(); renderPrio();
    $("prio-new").value = "";
    toast("Přidáno: " + name);
  };
  renderPrio();
}

function removeValue(id) {
  me.customValues = me.customValues.filter((v) => v.id !== id);
  Object.keys(me.prio).forEach((k) => (me.prio[k] = me.prio[k].filter((x) => x !== id)));
  save(); renderPrio();
}

function orderFor(key) {
  const all = allValues();
  const base = me.prio[key] || me.prio.general || all.map((v) => v.id);
  const known = base.filter((id) => all.some((v) => v.id === id));
  return [...known, ...all.map((v) => v.id).filter((id) => !known.includes(id))];
}

function renderPrio() {
  const key = $("prio-context").value;
  const list = $("prio-list");
  list.innerHTML = "";
  const order = orderFor(key);
  order.forEach((id, idx) => {
    const v = allValues().find((x) => x.id === id);
    const own = id.startsWith("cv-");
    list.append(h("li", { "data-id": id },
      h("div", {}, h("div", { class: "v-name" }, v.name, " ", v.en ? h("span", { class: "en" }, "(" + v.en + ")") : null),
        v.hint ? h("div", { class: "v-hint" }, v.hint) : null, own ? h("div", { class: "v-own" }, "vlastní") : null),
      h("div", { class: "moves" },
        own ? h("button", { type: "button", class: "val-del", "aria-label": "Odebrat hodnotu " + v.name, title: "Odebrat", onclick: () => removeValue(id) }, "×") : null,
        h("button", { type: "button", "aria-label": "Posunout " + v.name + " výš", disabled: idx === 0, onclick: () => move(key, id, -1) }, "↑"),
        h("button", { type: "button", "aria-label": "Posunout " + v.name + " níž", disabled: idx === order.length - 1, onclick: () => move(key, id, 1) }, "↓"),
      ),
    ));
  });
  if (sortable) sortable.destroy();
  if (window.Sortable) {
    sortable = window.Sortable.create(list, {
      animation: 160, filter: "button, .val-del", preventOnFilter: false, delay: 120, delayOnTouchOnly: true,
      onEnd: () => {
        me.prio[key] = [...list.children].map((li) => li.dataset.id);
        save(); renderPrio();
      },
    });
  }
}

function move(key, id, dir) {
  const order = orderFor(key);
  const i = order.indexOf(id), j = i + dir;
  if (j < 0 || j >= order.length) return;
  [order[i], order[j]] = [order[j], order[i]];
  me.prio[key] = order;
  save(); renderPrio();
  document.querySelector(`#prio-list li[data-id="${id}"] button[aria-label*="${dir < 0 ? "výš" : "níž"}"]`)?.focus();
}

// ── reflexe ─────────────────────────────────────────────────
const PROMPTS = [
  ["strong", "Který pilíř v mých vztazích stojí pevně?"],
  ["grow", "Který pilíř bych chtěl/a posílit, a ve kterém vztahu?"],
  ["act", "Co pro to můžu udělat já?"],
];
function renderReflect() {
  const host = $("reflect");
  host.innerHTML = "";
  PROMPTS.forEach(([k, q]) => host.append(h("label", {}, q,
    h("textarea", { rows: 3, maxlength: 600, oninput: (e) => { me.reflect[k] = e.target.value; save(); } }, me.reflect[k]))));
}

// ── export ──────────────────────────────────────────────────
function initExport() {
  $("btn-pdf").onclick = printPdf;
  $("btn-backup").onclick = () => {
    const blob = new Blob([JSON.stringify(me, null, 2)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: "moje-vztahy.json" });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $("btn-restore").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (!d || !Array.isArray(d.people)) throw new Error("Soubor nevypadá jako záloha z Atlasu vztahů.");
      ls.set(KEY, d);
      initPersonal(ctx);
      toast("Záloha je načtená.");
    } catch (err) {
      toast("Zálohu se nepodařilo načíst: " + err.message);
    }
    e.target.value = "";
  };
  $("btn-wipe").onclick = () => {
    if (!confirm("Opravdu smazat tvou mapu, priority i reflexi z tohoto prohlížeče?")) return;
    ls.del(KEY);
    initPersonal(ctx);
    toast("Tvoje data jsou smazaná.");
  };
}

function printPdf() {
  const root = $("print-root");
  root.innerHTML = "";
  const date = new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });

  const orbs = s("svg", { class: "pr-orbs", viewBox: "0 0 280 120" });
  ctx.types.slice(0, 6).forEach((t, i) =>
    orbs.append(s("circle", { cx: 60 + i * 34, cy: 60 + (i % 2 ? 14 : -10), r: 44 - i * 2, fill: t.color, "fill-opacity": 0.5, style: { mixBlendMode: "multiply" } })));

  const head = h("div", { class: "pr-head" },
    h("h1", {}, "Moje", h("br"), "vztahy"),
    h("div", { class: "who" }, orbs, me.name ? h("b", {}, me.name) : null, [me.cls, date].filter(Boolean).join(" · ")),
  );

  const mapSvg = s("svg", { class: "mapsvg" });
  buildMapSvg(mapSvg, false);
  const sorted = me.people.slice().sort((a, b) => a.ring - b.ring || a.label.localeCompare(b.label, "cs"));
  const mapSec = h("section", { class: "pr-section" }, h("h2", {}, "Moje mapa vztahů"),
    h("div", { class: "pr-map" }, mapSvg,
      h("p", { class: "pr-legend" }, "Míra blízkosti: 1 = nejbližší, 4 = nejvzdálenější.")));
  const peopleSec = sorted.length ? h("section", { class: "pr-section pr-allow" }, h("h2", {}, "Co mi vztahy dávají a co mě stojí"),
    h("table", { class: "pr-pairs pr-people" },
      h("thead", {}, h("tr", {}, h("th", {}, "Kdo"), h("th", {}, "Blízkost"), h("th", {}, "Typ vztahu"), h("th", {}, "Co mi dává"), h("th", {}, "Co mě stojí"))),
      h("tbody", {}, sorted.map((p) => h("tr", {},
        h("td", {}, h("b", {}, p.label)),
        h("td", {}, String(p.ring)),
        h("td", {}, typeById(p.type)?.name || "–"),
        h("td", {}, p.gives || "–"),
        h("td", {}, p.costs || "–")))),
    )) : null;

  const prioKeys = Object.keys(me.prio);
  const prioSec = h("section", { class: "pr-section" }, h("h2", {}, "Co je pro mě ve vztazích důležité"),
    prioKeys.map((k) => [
      prioKeys.length > 1 ? h("p", { style: { margin: "2mm 0 1mm", fontWeight: 600 } }, k === "general" ? "Vztahy obecně" : typeById(k)?.name || k) : null,
      h("ol", { class: "pr-prio" }, orderFor(k).map((id) => h("li", {}, allValues().find((v) => v.id === id).name))),
    ]));

  const refl = PROMPTS.filter(([k]) => me.reflect[k].trim());
  const reflSec = refl.length ? h("section", { class: "pr-section pr-reflect" }, h("h2", {}, "Moje reflexe"),
    refl.map(([k, q]) => h("p", {}, h("b", {}, q), me.reflect[k]))) : null;

  const pillars = ctx.pillars();
  const pilSec = pillars.length ? h("section", { class: "pr-section" },
    h("h2", {}, "Na čem podle naší třídy stojí dobré vztahy"),
    h("div", { class: "pr-pillars" }, pillars.map((p) => h("span", {}, p)))) : null;

  root.append(...[head, mapSec, peopleSec, prioSec, reflSec, pilSec].filter(Boolean),
    h("p", { class: "pr-foot" }, SITE.title + " · " + SITE.subject + " · " + date));

  const old = document.title;
  document.title = "Moje vztahy" + (me.name ? " – " + me.name : "");
  setTimeout(() => {
    window.print();
    document.title = old;
  }, 60);
}
