// Osobní část: ukládá se jen do localStorage tohoto prohlížeče.
import { CLASSES, VALUES, SYMBOLS, RINGS, SITE } from "./config.js";
import { ls, submitItem } from "./api.js";
import { h, s, toast } from "./ui.js";

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
    customSymbols: [],
    customValues: [],
  };
}

// značky pro vlastní položky v mapě
const GLYPHS = ["◆", "●", "▲", "✿", "☀", "♫", "☕", "✎", "♣", "☂", "✈", "⚽"];
const allSymbols = () => [...SYMBOLS, ...me.customSymbols];
const allValues = () => [...VALUES, ...me.customValues];

function load() {
  const d = ls.get(KEY, null);
  const b = blank();
  if (!d || typeof d !== "object") return b;
  return {
    ...b, ...d,
    prio: { ...b.prio, ...(d.prio || {}) },
    reflect: { ...b.reflect, ...(d.reflect || {}) },
    people: Array.isArray(d.people) ? d.people : [],
    customSymbols: Array.isArray(d.customSymbols) ? d.customSymbols : [],
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
  renderPairs();
  $("add-pair").onclick = () => {
    me.pairs.push({ id: uid(), type: "", gift: "", cost: "", mark: "", sent: false });
    save(); renderPairs();
    document.querySelector("#mine-pairs .mine-pair:last-child textarea")?.focus();
  };
  renderReflect();
  initExport();
}

// ── mapa ────────────────────────────────────────────────────
const C = 320, R0 = 54, STEP = 52;
const ringOuter = (i) => R0 + i * STEP; // i = 1..5
const ringMid = (i) => R0 + (i - 0.5) * STEP;

function initMapForm() {
  const ring = $("p-ring");
  ring.innerHTML = "";
  RINGS.forEach((r) => ring.append(h("option", { value: r.id }, r.id + " · " + r.name)));
  const type = $("p-type");
  type.innerHTML = "";
  type.append(h("option", { value: "" }, "Neurčeno"));
  ctx.types.forEach((t) => type.append(h("option", { value: t.id }, t.name)));
  const symHost = $("p-symbols");
  renderSymbolToggles([]);
  $("sym-new-btn").onclick = addCustomSymbol;
  $("sym-new-label").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSymbol(); } };

  $("map-form").onsubmit = (e) => {
    e.preventDefault();
    const label = $("p-label").value.trim().slice(0, 4);
    if (!label) return;
    const data = {
      label,
      ring: Number($("p-ring").value),
      type: $("p-type").value,
      symbols: [...symHost.querySelectorAll("[aria-pressed='true']")].map((b) => b.dataset.sym),
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

  renderLegend();
}

function renderLegend() {
  const leg = $("map-legend");
  leg.innerHTML = "";
  allSymbols().forEach((sy) => leg.append(h("li", {}, h("b", {}, sy.s), sy.label)));
}

function renderSymbolToggles(pressed) {
  const symHost = $("p-symbols");
  symHost.innerHTML = "";
  const toggle = (sy) => h("button", {
    type: "button", class: "sym-toggle", "data-sym": sy.id, "aria-pressed": String(pressed.includes(sy.id)),
    onclick: (e) => e.currentTarget.setAttribute("aria-pressed", String(e.currentTarget.getAttribute("aria-pressed") !== "true")),
  }, h("b", { "aria-hidden": "true" }, sy.s), sy.label);
  SYMBOLS.forEach((sy) => symHost.append(toggle(sy)));
  me.customSymbols.forEach((sy) => symHost.append(h("span", { class: "sym-item" }, toggle(sy),
    h("button", { type: "button", class: "sym-del", "aria-label": "Odebrat vlastní položku " + sy.label, title: "Odebrat", onclick: () => removeCustomSymbol(sy.id) }, "×"))));
  const used = me.customSymbols.map((x) => x.s);
  const glyph = $("sym-new-glyph");
  glyph.innerHTML = "";
  GLYPHS.filter((g) => !used.includes(g)).forEach((g) => glyph.append(h("option", { value: g }, g)));
}

const pressedSymbols = () => [...document.querySelectorAll("#p-symbols .sym-toggle[aria-pressed='true']")].map((b) => b.dataset.sym);

function addCustomSymbol() {
  const label = $("sym-new-label").value.trim();
  if (!label) { toast("Napiš, co ti vztah dává."); $("sym-new-label").focus(); return; }
  const sy = { id: "c-" + uid(), s: $("sym-new-glyph").value || "◆", label };
  me.customSymbols.push(sy);
  save();
  renderSymbolToggles([...pressedSymbols(), sy.id]);
  renderLegend();
  $("sym-new-label").value = "";
  toast("Přidáno: " + sy.s + " " + label);
}

function removeCustomSymbol(id) {
  const pressed = pressedSymbols().filter((x) => x !== id);
  me.customSymbols = me.customSymbols.filter((x) => x.id !== id);
  me.people.forEach((p) => (p.symbols = p.symbols.filter((x) => x !== id)));
  save();
  renderSymbolToggles(pressed);
  renderLegend();
  renderMap();
}

function resetMapForm() {
  editingId = null;
  $("map-form").reset();
  $("p-ring").value = "1";
  document.querySelectorAll("#p-symbols .sym-toggle").forEach((b) => b.setAttribute("aria-pressed", "false"));
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
  document.querySelectorAll("#p-symbols .sym-toggle").forEach((b) => b.setAttribute("aria-pressed", String(p.symbols.includes(b.dataset.sym))));
  $("map-form-title").textContent = "Upravit " + p.label;
  $("p-save").textContent = "Uložit změny";
  $("p-cancel").hidden = false;
  $("p-delete").hidden = false;
  renderMap();
  $("p-label").focus();
}

export function buildMapSvg(svg, interactive) {
  svg.innerHTML = "";
  RINGS.slice().reverse().forEach((r) => {
    svg.append(s("circle", { class: "ring" + (r.dashed ? " dashed" : ""), cx: C, cy: C, r: ringOuter(r.id) }));
  });
  RINGS.forEach((r) => {
    svg.append(s("text", {
      class: "ring-label", x: C, y: C + ringOuter(r.id) - 8, "text-anchor": "middle",
      text: r.name, style: { paintOrder: "stroke", stroke: "var(--paper)", strokeWidth: "4px" },
    }));
  });
  svg.append(s("circle", { class: "me", cx: C, cy: C, r: R0 - 8 }));
  svg.append(s("text", { class: "me-label", x: C, y: C + 6, "text-anchor": "middle", text: "JÁ" }));

  RINGS.forEach((r) => {
    const people = me.people.filter((p) => p.ring === r.id);
    const n = people.length;
    // dole necháme mezeru pro popisek kruhu
    const gap = 0.75, start = Math.PI / 2 + gap / 2, span = Math.PI * 2 - gap;
    people.forEach((p, k) => {
      const ang = start + ((k + 0.5) / Math.max(1, n)) * span + (n === 1 ? Math.PI * 0.18 * r.id : 0);
      const cap = Math.floor((2 * Math.PI * ringMid(r.id)) / 46);
      const rad = ringMid(r.id) + (n > cap ? (k % 2 ? 11 : -11) : 0);
      const x = C + Math.cos(ang) * rad, y = C + Math.sin(ang) * rad;
      const t = typeById(p.type);
      const syms = p.symbols.map((id) => allSymbols().find((sy) => sy.id === id)?.s).filter(Boolean).join("");
      const g = s("g", { class: "person" + (p.id === editingId ? " sel" : "") });
      g.append(
        s("circle", { class: "node blend", cx: x, cy: y, r: 18, fill: t ? t.color : "#8A8FAD" }),
        s("text", { x, y: y + 5, "text-anchor": "middle", text: p.label }),
      );
      if (syms) g.append(s("text", { class: "syms", x, y: y + 33, "text-anchor": "middle", text: syms }));
      if (interactive) {
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute("aria-label", "Upravit " + p.label);
        g.addEventListener("click", () => editPerson(p));
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); editPerson(p); } });
      }
      svg.append(g);
    });
  });
}

function renderMap() { buildMapSvg($("map-svg"), true); }

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

// ── rub a líc ───────────────────────────────────────────────
function renderPairs() {
  const host = $("mine-pairs");
  host.innerHTML = "";
  me.pairs.forEach((p) => {
    const upd = (k) => (e) => { p[k] = e.target.value; if (p.sent) { p.sent = false; } save(); };
    const typeSel = h("select", { onchange: upd("type") }, h("option", { value: "" }, "Vyber typ vztahu…"), ctx.types.map((t) => h("option", { value: t.id }, t.name)));
    typeSel.value = p.type;
    const radio = (val, label) => {
      const inp = h("input", { type: "radio", name: "mk-" + p.id, value: val, onchange: upd("mark") });
      inp.checked = p.mark === val;
      return h("label", {}, inp, h("span", {}, label));
    };
    const send = h("button", { type: "button", class: "btn btn-ink", onclick: () => sendPair(p) }, "Odeslat anonymně do přehledu");
    host.append(h("div", { class: "mine-pair" },
      h("label", { class: "full" }, "Vztah", typeSel),
      h("label", {}, "Co mi dává", h("textarea", { rows: 2, maxlength: 200, oninput: upd("gift") }, p.gift)),
      h("label", {}, "Co mě tentýž vztah stojí", h("textarea", { rows: 2, maxlength: 200, oninput: upd("cost") }, p.cost)),
      h("fieldset", { class: "full" }, h("legend", {}, "Souvislost"),
        h("div", { class: "marks" }, radio("pair", "⟷ Bez jednoho by nebylo druhé, jsou to dvě strany jedné mince"), radio("cross", "✕ Nesouvisí spolu: kdyby pravá strana zmizela, vztah by byl stejný nebo lepší"))),
      h("div", { class: "row-actions" },
        ctx.pairsSection?.open ? send : null,
        p.sent ? h("span", { class: "sent" }, "Odesláno ke schválení") : null,
        h("button", { type: "button", class: "btn btn-danger", onclick: () => { me.pairs = me.pairs.filter((x) => x !== p); save(); renderPairs(); } }, "Smazat dvojici"),
      ),
    ));
  });
  if (!me.pairs.length) host.append(h("p", { class: "empty" }, "Zatím tu nemáš žádnou dvojici."));
}

async function sendPair(p) {
  if (!me.cls) { toast("Nejdřív nahoře vyber svou třídu."); $("me-class").focus(); return; }
  if (!p.gift.trim() || !p.cost.trim() || !p.mark) { toast("Doplň obě strany a vyber ⟷ nebo ✕."); return; }
  if (p.sent) { toast("Tahle dvojice už je odeslaná."); return; }
  try {
    await submitItem({ section: ctx.pairsSection.id, text: p.gift, text2: p.cost, mark: p.mark, types: p.type ? [p.type] : [], classes: [me.cls] });
    p.sent = true; save(); renderPairs();
    toast("Odesláno. Po schválení se objeví v přehledu.");
  } catch (e) {
    toast("Nepodařilo se odeslat: " + e.message);
  }
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
    if (!confirm("Opravdu smazat tvou mapu, priority, dvojice i reflexi z tohoto prohlížeče?")) return;
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

  const mapSvg = s("svg", { class: "mapsvg", viewBox: "0 0 640 640" });
  buildMapSvg(mapSvg, false);
  const mapSec = h("section", { class: "pr-section" }, h("h2", {}, "Moje mapa vztahů"),
    h("div", { class: "pr-map" }, mapSvg,
      h("div", { class: "pr-legend" },
        RINGS.map((r) => h("div", {}, h("b", {}, r.name + ": "), me.people.filter((p) => p.ring === r.id).length || "–")),
        h("div", {}, " "),
        allSymbols().map((sy) => h("div", {}, h("b", {}, sy.s + " "), sy.label)),
      )));

  const prioKeys = Object.keys(me.prio);
  const prioSec = h("section", { class: "pr-section" }, h("h2", {}, "Co je pro mě ve vztazích důležité"),
    prioKeys.map((k) => [
      prioKeys.length > 1 ? h("p", { style: { margin: "2mm 0 1mm", fontWeight: 600 } }, k === "general" ? "Vztahy obecně" : typeById(k)?.name || k) : null,
      h("ol", { class: "pr-prio" }, orderFor(k).map((id) => h("li", {}, allValues().find((v) => v.id === id).name))),
    ]));

  const filled = me.pairs.filter((p) => p.gift.trim() || p.cost.trim());
  const pairsSec = filled.length ? h("section", { class: "pr-section" }, h("h2", {}, "Můj rub a líc"),
    h("table", { class: "pr-pairs" },
      h("thead", {}, h("tr", {}, h("th", {}, "Vztah"), h("th", {}, "Co mi dává"), h("th", {}, "Co mě stojí"), h("th", {}, ""))),
      h("tbody", {}, filled.map((p) => h("tr", {}, h("td", {}, typeById(p.type)?.name || "–"), h("td", {}, p.gift), h("td", {}, p.cost), h("td", {}, p.mark === "cross" ? "✕" : p.mark === "pair" ? "⟷" : "")))),
    )) : null;

  const refl = PROMPTS.filter(([k]) => me.reflect[k].trim());
  const reflSec = refl.length ? h("section", { class: "pr-section pr-reflect" }, h("h2", {}, "Moje reflexe"),
    refl.map(([k, q]) => h("p", {}, h("b", {}, q), me.reflect[k]))) : null;

  const pillars = ctx.pillars();
  const pilSec = pillars.length ? h("section", { class: "pr-section" },
    h("h2", {}, "Na čem podle naší třídy stojí dobré vztahy"),
    h("div", { class: "pr-pillars" }, pillars.map((p) => h("span", {}, p)))) : null;

  root.append(head, mapSec, prioSec, pairsSec, reflSec, pilSec,
    h("p", { class: "pr-foot" }, SITE.title + " · " + SITE.subject + " · " + date));

  const old = document.title;
  document.title = "Moje vztahy" + (me.name ? " – " + me.name : "");
  setTimeout(() => {
    window.print();
    document.title = old;
  }, 60);
}
