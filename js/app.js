import { SITE, CLASSES, AXES } from "./config.js?v=20261107e";
import { DEMO, loadData, submitItem, ls } from "./api.js?v=20261107e";
import { h, s, toast, plural, reducedMotion, collapsible, setAllFolded } from "./ui.js?v=20261107e";
import { initPersonal } from "./personal.js?v=20261107e";

const state = {
  types: [],
  sections: [],
  items: [],
  filterType: null,
  filterClass: ls.get("atlas-class-filter", "all"),
  pairMark: "all",
};

const $ = (id) => document.getElementById(id);
const typeById = (id) => state.types.find((t) => t.id === id);
const GENERAL = "#8A8FAD";

// ── start ───────────────────────────────────────────────────
document.title = SITE.title;
$("site-title").textContent = SITE.title;
$("site-subtitle").textContent = SITE.subtitle;
$("site-subject").textContent = SITE.subject;
$("foot-text").textContent = SITE.title + " · " + SITE.subject + ". Příspěvky žáků se zveřejňují až po schválení vyučujícím.";
if (DEMO) $("demo-note").hidden = false;

initTabs();
init();

async function init() {
  try {
    const d = await loadData();
    state.types = d.types || [];
    state.sections = (d.sections || []).filter((x) => x.visible !== false).sort((a, b) => a.order - b.order);
    state.items = d.items || [];
  } catch (e) {
    $("sections").append(h("p", { class: "wrap empty" }, "Data se nepodařilo načíst: " + e.message + " Zkus stránku obnovit."));
  }
  drawHero();
  renderFilters();
  renderAtlas();
  collapsible($("atlas"), "atlas");
  renderSections();
  initFoldAll();
  document.querySelectorAll("#personal section.block").forEach((el) => collapsible(el, "me-" + el.getAttribute("aria-labelledby")));
  initSubmitDialog();
  initPersonal({
    types: state.types,
    pairsSection: state.sections.find((x) => x.kind === "pairs"),
    pillars: () => pillarsFor(ls.get("atlas-me-v1", {}).cls),
  });
}

// ── sbalit / rozbalit vše ───────────────────────────────────
function initFoldAll() {
  const btn = $("fold-all");
  if (!btn) return;
  const keys = () => ["atlas", ...state.sections.map((x) => "sec-" + x.id)];
  const update = () => {
    const anyOpen = [...document.querySelectorAll("#overview section.block")].some((el) => !el.classList.contains("folded"));
    btn.textContent = anyOpen ? "Sbalit vše" : "Rozbalit vše";
    return anyOpen;
  };
  btn.onclick = () => {
    const fold = update();
    setAllFolded(keys(), fold);
    document.querySelectorAll("#overview section.block").forEach((el) => {
      el.classList.toggle("folded", fold);
      el.querySelector(".fold")?.setAttribute("aria-expanded", String(!fold));
    });
    update();
  };
  document.getElementById("overview").addEventListener("click", (e) => { if (e.target.closest(".fold")) update(); });
  update();
}

// ── hero: jeden orchestrovaný moment při načtení ────────────
// Kruhy jsou přímo v index.html, aby byly vidět hned při načtení.
// Po načtení dat jen převezmou barvy typů vztahů (bez pohybu).
function drawHero() {
  if (!state.types.length) return;
  document.querySelectorAll("#hero-orbs circle").forEach((el, i) => {
    const t = state.types[i % state.types.length];
    if (t?.color) el.setAttribute("fill", t.color);
  });
}

// ── přepínání částí ─────────────────────────────────────────
function initTabs() {
  const tabs = [$("tab-overview"), $("tab-personal")];
  const show = (which) => {
    const personal = which === "personal";
    $("overview").hidden = personal;
    $("personal").hidden = !personal;
    $("filters").hidden = personal;
    tabs[0].setAttribute("aria-selected", String(!personal));
    tabs[1].setAttribute("aria-selected", String(personal));
    if (location.hash !== (personal ? "#moje" : "")) history.replaceState(null, "", personal ? "#moje" : location.pathname + location.search);
  };
  tabs[0].addEventListener("click", () => show("overview"));
  tabs[1].addEventListener("click", () => show("personal"));
  tabs.forEach((t, i) => t.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") { tabs[1 - i].focus(); tabs[1 - i].click(); }
  }));
  if (location.hash === "#moje") show("personal");
}

// ── filtry ──────────────────────────────────────────────────
function renderFilters() {
  const sel = $("class-filter");
  sel.innerHTML = "";
  sel.append(h("option", { value: "all" }, "Všechny třídy"));
  CLASSES.forEach((c) => sel.append(h("option", { value: c }, c)));
  sel.value = CLASSES.includes(state.filterClass) ? state.filterClass : "all";
  sel.onchange = () => {
    state.filterClass = sel.value;
    ls.set("atlas-class-filter", sel.value);
    renderSections();
  };

  const chips = $("type-chips");
  chips.innerHTML = "";
  chips.append(h("button", { class: "chip all", type: "button", "aria-pressed": String(!state.filterType), onclick: () => setType(null) }, "Všechny vztahy"));
  state.types.forEach((t) =>
    chips.append(h("button", { class: "chip", type: "button", "--c": t.color, "data-type": t.id, "aria-pressed": String(state.filterType === t.id), onclick: () => setType(state.filterType === t.id ? null : t.id) }, t.name)),
  );
}

function setType(id) {
  state.filterType = id;
  document.querySelectorAll("#type-chips .chip").forEach((c) =>
    c.setAttribute("aria-pressed", String(c.classList.contains("all") ? !id : c.dataset.type === id)),
  );
  updateAtlasDim();
  renderSections();
}

// ── typy vztahů ─────────────────────────────────────────────
// Každý typ má svou kartu se čtyřmi osami; klepnutím se filtruje celý přehled.
function renderAtlas() {
  const prof = $("type-profiles");
  prof.innerHTML = "";
  state.types.forEach((t) => {
    const rows = AXES.map((a) => {
      const [lo, hi] = t[a.id] || [0, 0];
      const left = ((Math.min(lo, hi) + 1) / 2) * 100;
      const width = Math.max(4, (Math.abs(hi - lo) / 2) * 100);
      return h("div", { class: "row" },
        h("span", {}, a.left), h("span", {}, a.right),
        h("div", { class: "track" }, h("div", { class: "range", style: { left: left + "%", width: width + "%" } })),
      );
    });
    prof.append(h("button", {
      class: "profile", type: "button", "--c": t.color, "data-type": t.id, "aria-pressed": String(state.filterType === t.id),
      onclick: () => setType(state.filterType === t.id ? null : t.id),
    }, h("h3", {}, h("span", {}, t.name, " ", h("span", { class: "en" }, "(" + t.en + ")"))), h("p", {}, t.description || ""), h("div", { class: "axis-mini" }, rows)));
  });
  updateAtlasDim();
}

function updateAtlasDim() {
  const f = state.filterType;
  document.querySelectorAll("#type-profiles .profile").forEach((p) => {
    p.classList.toggle("dim", !!f && p.dataset.type !== f);
    p.setAttribute("aria-pressed", String(p.dataset.type === f));
  });
}

// ── oddíly ──────────────────────────────────────────────────
function visibleItems(sectionId) {
  return state.items
    .filter((i) => i.section === sectionId)
    .filter((i) => state.filterClass === "all" || (i.classes || []).includes(state.filterClass))
    .sort((a, b) => (b.weight || 0) - (a.weight || 0));
}
const matches = (i) => !state.filterType || !(i.types || []).length || i.types.includes(state.filterType);

function renderSections() {
  const host = $("sections");
  host.innerHTML = "";
  state.sections.forEach((sec) => {
    const items = visibleItems(sec.id);
    const head = h("header", { class: "block-head" },
      h("h2", { id: "h-" + sec.id }, sec.title, sec.kind === "pairs" && sec.en ? [" ", h("span", { class: "en" }, "(" + sec.en + ")")] : null),
      sec.subtitle ? h("p", { class: "block-sub" }, sec.subtitle) : null,
      sec.open ? h("div", { class: "block-actions" },
        h("button", { class: "btn btn-quiet btn-add", type: "button", onclick: () => openSubmit(sec) }, sec.kind === "pairs" ? "Přidat svou dvojici" : "Přidat do přehledu"),
      ) : null,
    );
    let body;
    if (!items.length) body = h("p", { class: "empty" }, emptyText(sec));
    else if (sec.kind === "pillars") body = renderPillars(items);
    else if (sec.kind === "pairs") body = renderPairs(items);
    else body = renderBubbles(items);
    const el = h("section", { class: "block wrap", id: "sec-" + sec.id, "aria-labelledby": "h-" + sec.id }, head, body);
    host.append(el);
    collapsible(el, "sec-" + sec.id);
  });
}

function emptyText(sec) {
  const scope = state.filterClass === "all" ? "" : " pro třídu " + state.filterClass;
  return "Zatím tu nic není" + scope + ". " + (sec.open ? "Přidej první položku, nebo počkej, až sem vyučující doplní výsledky z hodiny." : "Výsledky z hodiny sem doplní vyučující.");
}

function colorsOf(i) {
  return (i.types || []).map(typeById).filter(Boolean).map(softColor);
}

// Jemnější, sladěná paleta pro kruhy: stejné odstíny jako typy vztahů, ale tlumené a ve stejné světlosti.
const SOFT = {
  rodina: "#A8D5B5", pratelstvi: "#C4B7E8", partnersky: "#EEB3CE", skola: "#A9C8EA",
  komunita: "#9ED7D3", sluzby: "#B7C0DE", online: "#DAB9E6",
};
function softColor(t) {
  return SOFT[t.id] || `color-mix(in oklab, ${t.color} 42%, #FBFBF8)`;
}

const DISC_OFFSETS = [
  [[0, 0]],
  [[-5, 0], [5, 0]],
  [[0, -5], [-5, 4], [5, 4]],
  [[-5, -5], [5, -5], [-5, 5], [5, 5]],
];

// Bubliny: stejné položky z různých tříd a typů vztahů se sečtou do jedné.
// Při vybraném typu vztahu se ukáže jen to, co patří k němu, s jeho vlastními počty.
function mergeBubbles(items) {
  if (state.filterType) items = items.filter((i) => (i.types || []).includes(state.filterType) || !(i.types || []).length);
  const groups = new Map();
  items.forEach((i) => {
    const key = i.text.trim().toLocaleLowerCase("cs");
    const g = groups.get(key);
    if (!g) { groups.set(key, { ...i, parts: [i] }); return; }
    g.parts.push(i);
    g.weight = (g.weight || 0) + (i.weight || 0);
    g.types = [...new Set([...(g.types || []), ...(i.types || [])])];
    g.classes = [...new Set([...(g.classes || []), ...(i.classes || [])])];
  });
  return [...groups.values()].sort((a, b) => b.weight - a.weight);
}

function breakdown(i) {
  const per = new Map();
  (i.parts || [i]).forEach((p) => {
    const names = (p.types || []).map((t) => typeById(t)?.name).filter(Boolean);
    const key = names.join(" + ") || "všechny vztahy";
    per.set(key, (per.get(key) || 0) + (p.weight || 0));
  });
  return [...per.entries()].map(([k, v]) => k + " " + v + "×").join(", ");
}

// podíl jednotlivých typů vztahů na sloučené položce (jen části s právě jedním typem)
function typeShares(i) {
  if (!i.parts || i.parts.length < 2) return [];
  const per = new Map();
  i.parts.forEach((p) => {
    if ((p.types || []).length !== 1) return;
    const t = typeById(p.types[0]);
    if (t) { const c = softColor(t); per.set(c, (per.get(c) || 0) + (p.weight || 0)); }
  });
  return [...per.entries()].sort((a, b) => b[1] - a[1]);
}

function pieBackground(shares) {
  const total = shares.reduce((a, [, w]) => a + w, 0);
  let acc = 0;
  // mezi úseky prstence je úzká mezera v barvě papíru
  const stops = shares.map(([col, w]) => {
    const from = (acc / total) * 100;
    acc += w;
    const to = (acc / total) * 100;
    return `var(--paper) ${from}% ${from + 0.5}%, ${col} ${from + 0.5}% ${to - 0.5}%, var(--paper) ${to - 0.5}% ${to}%`;
  });
  return `radial-gradient(circle closest-side, color-mix(in srgb, ${shares[0][0]} 38%, var(--paper)) 0 79%, transparent 80%), conic-gradient(${stops.join(", ")})`;
}

function renderBubbles(items) {
  items = mergeBubbles(items);
  if (!items.length) return h("p", { class: "empty" }, "Pro tenhle typ vztahu tu zatím nic není.");
  const max = Math.max(...items.map((i) => i.weight || 1));
  const wrap = h("div", { class: "bubbles" });
  items.forEach((i) => {
    const w = i.weight || 1;
    const fromWeight = 104 + Math.sqrt(w / max) * 116;
    const fromText = Math.min(190, 92 + i.text.length * 1.45);
    const d = Math.round(Math.max(fromWeight, fromText));
    const fs = Math.round(13 + ((d - 92) / 128) * 5);
    const cols = colorsOf(i).slice(0, 4);
    const offs = DISC_OFFSETS[Math.max(0, cols.length - 1)];
    // sloučená položka z víc typů vztahů: prstenec rozdělený podle podílu jednotlivých typů
    const shares = typeShares(i);
    const discs = shares.length > 1
      ? [h("span", { class: "disc pie", style: { background: pieBackground(shares) } })]
      : cols.length
        ? cols.map((c, k) => h("span", { class: "disc blend", "--c": c, style: { transform: `translate(${offs[k][0]}%, ${offs[k][1]}%)` } }))
        : [h("span", { class: "disc general" })];
    const info = "Zmíněno " + w + "×: " + breakdown(i);
    wrap.append(h("div", {
      class: "bubble" + (shares.length > 1 ? " has-pie" : ""),
      "--d": d + "px", "--fs": fs + "px",
      title: info,
      role: "img",
      "aria-label": i.text + ". " + info,
    }, h("span", { class: "discs" }, discs), h("span", { class: "label" }, i.text), h("span", { class: "count" }, w + "×")));
  });
  return wrap;
}

function splitPillar(text) {
  const m = text.match(/^([^:–—]{2,40})\s*[:–—]\s*(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : [text, ""];
}

// Pilíře se nehlasují na webu (hlasuje se v dotazníku), kruh = jeden žák, který pilíř zmínil.
const mentionLabel = (n) => plural(n, "zmínil " + n + " žák", "zmínili " + n + " žáci", "zmínilo " + n + " žáků");

// Při „Všech třídách“ se pilíře se stejným názvem (část před dvojtečkou) z různých tříd sloučí.
function mergePillars(items) {
  if (state.filterClass !== "all") return items;
  const groups = new Map();
  items.forEach((i) => {
    const key = splitPillar(i.text)[0].trim().toLocaleLowerCase("cs");
    const g = groups.get(key);
    if (!g) { groups.set(key, { ...i, parts: [i] }); return; }
    g.parts.push(i);
    g.weight = (g.weight || 0) + (i.weight || 0);
    g.types = [...new Set([...(g.types || []), ...(i.types || [])])];
    g.classes = [...new Set([...(g.classes || []), ...(i.classes || [])])];
  });
  return [...groups.values()].sort((a, b) => b.weight - a.weight);
}

function renderPillars(items) {
  items = mergePillars(items);
  const row = h("div", { class: "pillars" });
  // počet kruhů = počet žáků; u velkých součtů se sloupy zmenší ve stejném poměru
  const maxW = Math.max(...items.map((i) => i.weight || 1));
  const MAXN = 18;
  // výchozí barvy: pilíře bez typu dostanou postupně barvy typů vztahů
  const palette = state.types.map((t) => t.color).filter(Boolean);
  if (!palette.length) palette.push("#0078BF");
  let k0 = 0;
  items.forEach((i) => {
    const w = i.weight || 1;
    const n = maxW > MAXN ? Math.max(1, Math.round((w / maxW) * MAXN)) : w;
    let cols = colorsOf(i);
    if (!cols.length) cols = [palette[k0++ % palette.length]];
    let [name, rest] = splitPillar(i.text);
    name = name.charAt(0).toLocaleUpperCase("cs") + name.slice(1);
    const orbs = Array.from({ length: n }, (_, k) =>
      h("span", { class: "orb blend", "--c": cols[k % cols.length], "--i": String(k) }));
    row.append(h("div", { class: "pillar" + (matches(i) ? "" : " dim"), role: "group", "aria-label": name + (rest ? ": " + rest : "") + ", " + mentionLabel(w) },
      h("span", { class: "tower", "aria-hidden": "true" },
        h("span", { class: "stack", "--n": String(n) }, orbs),
        h("span", { class: "base" })),
      h("span", { class: "words" },
        h("span", { class: "name" }, name),
        rest ? h("span", { class: "rest" }, rest) : null,
        h("span", { class: "count" }, mentionLabel(w),
          i.parts && i.parts.length > 1 ? " (" + i.parts.map((p) => (p.classes || []).join("+") + ": " + p.weight).join(", ") + ")" : "")),
    ));
  });
  return row;
}

function renderPairs(items) {
  const frag = h("div", {});
  const bar = h("div", { class: "pairs-toolbar" },
    h("div", { class: "seg", role: "group", "aria-label": "Zobrazit dvojice" },
      [["all", "Všechny"], ["pair", "⟷ dvě strany jedné mince"], ["cross", "✕ spolu nesouvisí"]].map(([v, l]) =>
        h("button", { type: "button", "aria-pressed": String(state.pairMark === v), onclick: () => { state.pairMark = v; renderSections(); } }, l)),
    ),
  );
  frag.append(bar);
  const shown = items.filter((i) => state.pairMark === "all" || i.mark === state.pairMark);
  const general = shown.filter((i) => i.source !== "student");
  const personal = shown.filter((i) => i.source === "student");
  const colorOf = (i) => colorsOf(i)[0] || GENERAL;

  if (general.length) {
    frag.append(h("h3", { class: "pairs-sub" }, "Obecné dvojice"));
    frag.append(h("div", { class: "coins" }, general.map((i) =>
      h("div", { class: "coin" + (matches(i) ? "" : " dim"), "--c": colorOf(i) },
        h("div", { class: "side gift" }, i.text),
        h("div", { class: "hinge", "aria-label": i.mark === "cross" ? "spolu nesouvisí" : "dvě strany jedné mince" }, h("span", {}, i.mark === "cross" ? "✕" : "⟷")),
        h("div", { class: "side cost" }, i.text2),
      ))));
  }
  if (personal.length) {
    frag.append(h("h3", { class: "pairs-sub" }, "Z našich vztahů (anonymně)"));
    frag.append(h("div", { class: "cards" }, personal.map((i) =>
      h("article", { class: "card" + (matches(i) ? "" : " dim"), "--c": colorOf(i) },
        h("div", { class: "gift" }, i.text),
        h("div", { class: "cost" },
          h("span", { class: "mark" + (i.mark === "cross" ? " cross" : ""), title: i.mark === "cross" ? "spolu nesouvisí" : "dvě strany jedné mince" }, i.mark === "cross" ? "✕" : "⟷"),
          i.text2),
        h("div", { class: "meta" },
          (i.types || []).map((t) => typeById(t)).filter(Boolean).map((t) => h("span", {}, h("span", { class: "dot", "--c": t.color }), t.name)),
          (i.classes || []).length ? h("span", {}, "· " + i.classes.join(", ")) : null),
      ))));
  }
  if (!general.length && !personal.length) frag.append(h("p", { class: "empty" }, "Pro tenhle výběr tu nejsou žádné dvojice."));
  return frag;
}

function pillarsFor(cls) {
  const sec = state.sections.find((x) => x.kind === "pillars");
  if (!sec) return [];
  return state.items
    .filter((i) => i.section === sec.id && (!cls || (i.classes || []).includes(cls)))
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, 6)
    .map((i) => splitPillar(i.text)[0]);
}

// ── odeslání příspěvku ──────────────────────────────────────
let currentSection = null;
function initSubmitDialog() {
  const dlg = $("submit-dialog");
  const csel = $("submit-class");
  csel.innerHTML = "";
  csel.append(h("option", { value: "" }, "Vyber…"));
  CLASSES.forEach((c) => csel.append(h("option", { value: c }, c)));
  $("submit-close").onclick = () => dlg.close();
  $("submit-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = $("submit-msg");
    msg.className = "form-msg";
    const f = e.target;
    const item = {
      section: currentSection.id,
      text: f.elements.text?.value || "",
      text2: f.elements.text2?.value || "",
      mark: f.elements.mark?.value || "",
      types: [...document.querySelectorAll("#submit-types .chip[aria-pressed='true']")].map((b) => b.dataset.type),
      classes: [csel.value],
    };
    if (currentSection.kind === "pairs" && (!item.text2.trim() || !item.mark)) {
      msg.textContent = "Doplň obě strany a vyber ⟷ nebo ✕.";
      msg.classList.add("err");
      return;
    }
    const btn = $("submit-send");
    btn.disabled = true;
    try {
      await submitItem(item);
      ls.set("atlas-submit-class", csel.value);
      msg.textContent = "Odesláno. Objeví se v přehledu, jakmile to vyučující schválí.";
      msg.classList.add("ok");
      f.elements.text && (f.elements.text.value = "");
      f.elements.text2 && (f.elements.text2.value = "");
      f.elements.text?.focus();
    } catch (err) {
      msg.textContent = err.message;
      msg.classList.add("err");
    } finally {
      btn.disabled = false;
    }
  });
}

const HINTS = {
  bubbles: "Napiš krátce jednu věc. Podobné příspěvky vyučující sloučí, takže se počítají dohromady.",
  pillars: "Napiš princip jedním slovem, za dvojtečku co znamená. Mělo by platit: „Dobrý vztah je takový, kde…“",
  davame: "Napiš konkrétní čin, nejlépe slovesem: co uděláš ty, aby vztah fungoval. Podobné příspěvky vyučující sloučí.",
  pairs: "Vyber si jeden svůj vztah. Piš konkrétně a bez jmen. Odesílá se anonymně, uvidí se jen typ vztahu a třída.",
};

function openSubmit(sec) {
  currentSection = sec;
  $("submit-title").textContent = sec.title;
  $("submit-hint").textContent = HINTS[sec.id] || HINTS[sec.kind] || HINTS.bubbles;
  $("submit-msg").textContent = "";
  $("submit-msg").className = "form-msg";
  const fields = $("submit-fields");
  fields.innerHTML = "";
  if (sec.kind === "pairs") {
    fields.append(
      h("label", {}, "Co mi ten vztah dává", h("textarea", { name: "text", maxlength: 200, required: true, rows: 2, placeholder: "Např. Mamka pozná, že mi není dobře, i když nic neřeknu." })),
      h("label", {}, "Co mě tentýž vztah stojí", h("textarea", { name: "text2", maxlength: 200, required: true, rows: 2, placeholder: "Např. Před ní nic neschovám, ani když bych chtěl/a." })),
      h("fieldset", {}, h("legend", {}, "Jak spolu ty dvě strany souvisí?"),
        h("div", { class: "marks" },
          h("label", {}, h("input", { type: "radio", name: "mark", value: "pair", required: true }), h("span", {}, h("b", {}, "⟷ "), "Bez jednoho by nebylo druhé, jsou to dvě strany jedné mince")),
          h("label", {}, h("input", { type: "radio", name: "mark", value: "cross" }), h("span", {}, h("b", {}, "✕ "), "Nesouvisí spolu: kdyby pravá strana zmizela, vztah by byl stejný nebo lepší")),
        )),
    );
  } else {
    fields.append(h("label", {}, "Text", h("textarea", {
      name: "text", maxlength: 200, required: true, rows: 3,
      placeholder: sec.kind === "pillars" ? "Např. Důvěra: můžeme se na sebe spolehnout" : sec.id === "davame" ? "Např. Zeptám se, jak se druhý má" : sec.id === "nici" ? "Např. Pomlouvání za zády" : "Např. Můžu se svěřit, když mám špatný den",
    })));
  }
  const tp = $("submit-types");
  tp.innerHTML = "";
  state.types.forEach((t) => tp.append(h("button", {
    type: "button", class: "chip", "--c": t.color, "data-type": t.id, "aria-pressed": String(state.filterType === t.id),
    onclick: (e) => e.currentTarget.setAttribute("aria-pressed", String(e.currentTarget.getAttribute("aria-pressed") !== "true")),
  }, t.name)));
  $("submit-class").value = ls.get("atlas-submit-class", state.filterClass !== "all" ? state.filterClass : "");
  $("submit-dialog").showModal();
  fields.querySelector("textarea")?.focus();
}
