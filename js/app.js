import { SITE, CLASSES, AXES } from "./config.js?v=20261103d";
import { DEMO, loadData, submitItem, vote, ls } from "./api.js?v=20261103d";
import { h, s, toast, plural, reducedMotion, collapsible, setAllFolded } from "./ui.js?v=20261103d";
import { initPersonal } from "./personal.js?v=20261103d";

const state = {
  types: [],
  sections: [],
  items: [],
  filterType: null,
  filterClass: ls.get("atlas-class-filter", "all"),
  axisX: ls.get("atlas-axis-x", "choice"),
  axisY: ls.get("atlas-axis-y", "closeness"),
  pairMark: "all",
  voted: new Set(ls.get("atlas-voted", [])),
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
function drawHero() {
  const svg = $("hero-orbs");
  const cols = state.types.length ? state.types.map((t) => t.color) : ["#FF6C2F", "#E8B900", "#FF48B0", "#0078BF", "#00A95C", "#765BA7"];
  const spots = [
    [890, 210, 190], [1055, 300, 160], [770, 330, 150], [975, 120, 120],
    [1150, 150, 110], [850, 450, 120], [1080, 470, 95], [690, 160, 80],
  ];
  svg.innerHTML = "";
  const nodes = cols.slice(0, spots.length).map((c, i) => {
    const [x, y, r] = spots[i];
    const el = s("circle", { cx: x, cy: y, r, fill: c, "fill-opacity": 0.46, class: "blend" });
    const ang = (i / cols.length) * Math.PI * 2;
    el.style.transform = `translate(${Math.cos(ang) * 420}px, ${Math.sin(ang) * 260}px)`;
    svg.append(el);
    return el;
  });
  if (reducedMotion()) nodes.forEach((n) => (n.style.transform = "none"));
  else requestAnimationFrame(() => requestAnimationFrame(() => nodes.forEach((n, i) => {
    n.style.transitionDelay = i * 60 + "ms";
    n.style.transform = "translate(0,0)";
  })));
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

// ── atlas typů ──────────────────────────────────────────────
const narrow = () => window.matchMedia("(max-width: 640px)").matches;
const PLANE = { w: 1000, h: 620, padX: 70, padY: 62 };
function sizePlane() {
  const n = narrow();
  PLANE.h = n ? 1300 : 620;
  PLANE.padX = n ? 110 : 70;
  PLANE.padY = n ? 110 : 62;
}
const sx = (v) => PLANE.padX + ((v + 1) / 2) * (PLANE.w - 2 * PLANE.padX);
const sy = (v) => PLANE.padY + ((v + 1) / 2) * (PLANE.h - 2 * PLANE.padY);

function renderAtlas() {
  const ax = $("axis-x"), ay = $("axis-y");
  [ax, ay].forEach((sel) => {
    sel.innerHTML = "";
    AXES.forEach((a) => sel.append(h("option", { value: a.id }, a.left + " ↔ " + a.right)));
  });
  ax.value = state.axisX; ay.value = state.axisY;
  const onAxis = () => {
    if (ax.value === ay.value) {
      const other = AXES.find((a) => a.id !== ax.value).id;
      if (document.activeElement === ax) ay.value = other; else ax.value = other;
    }
    state.axisX = ax.value; state.axisY = ay.value;
    ls.set("atlas-axis-x", ax.value); ls.set("atlas-axis-y", ay.value);
    layoutAtlas();
  };
  ax.onchange = onAxis; ay.onchange = onAxis;

  const svg = $("atlas-svg");
  sizePlane();
  svg.setAttribute("viewBox", `0 0 ${PLANE.w} ${PLANE.h}`);
  svg.innerHTML = "";
  const cx = PLANE.w / 2, cy = PLANE.h / 2;
  const n = narrow();
  svg.append(
    s("line", { class: "axis", x1: 24, y1: cy, x2: PLANE.w - 24, y2: cy }),
    s("line", { class: "axis", x1: cx, y1: 18, x2: cx, y2: PLANE.h - 18 }),
    s("text", { class: "axis-label", id: "lbl-left", x: 30, y: cy - (n ? 22 : 12) }),
    s("text", { class: "axis-label", id: "lbl-right", x: PLANE.w - 30, y: cy + (n ? 46 : -12), "text-anchor": "end" }),
    s("text", { class: "axis-label", id: "lbl-top", x: cx + 14, y: n ? 52 : 34 }),
    s("text", { class: "axis-label", id: "lbl-bottom", x: cx + 14, y: PLANE.h - (n ? 30 : 22) }),
  );
  const blobs = s("g", { id: "blobs" });
  svg.append(blobs);
  state.types.forEach((t) => {
    const g = s("g", {
      class: "type-blob", "data-type": t.id, tabindex: 0, role: "button",
      "aria-label": t.name + (state.filterType === t.id ? ", vybráno" : ""),
      onclick: () => setType(state.filterType === t.id ? null : t.id),
      onkeydown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setType(state.filterType === t.id ? null : t.id); } },
    });
    g.append(
      s("ellipse", { cx: 0, cy: 0, rx: 40, ry: 40, fill: t.color, "fill-opacity": 0.5, class: "blend" }),
      s("text", { class: "type-name", "text-anchor": "middle", "dominant-baseline": "middle", text: t.name }),
    );
    blobs.append(g);
  });
  layoutAtlas();

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

let wasNarrow = null;
window.addEventListener("resize", () => {
  const n = narrow();
  if (wasNarrow !== null && n !== wasNarrow && state.types.length) renderAtlas();
  wasNarrow = n;
});

function layoutAtlas() {
  wasNarrow = narrow();
  const X = AXES.find((a) => a.id === state.axisX), Y = AXES.find((a) => a.id === state.axisY);
  $("lbl-left").textContent = X.left;
  $("lbl-right").textContent = X.right;
  $("lbl-top").textContent = Y.left;
  $("lbl-bottom").textContent = Y.right;
  document.querySelectorAll("#blobs .type-blob").forEach((g) => {
    const t = typeById(g.dataset.type);
    const [xl, xh] = t[X.id] || [0, 0], [yl, yh] = t[Y.id] || [0, 0];
    const cx = sx((xl + xh) / 2), cy = sy((yl + yh) / 2);
    const rx = Math.max(narrow() ? 80 : 46, (Math.abs(xh - xl) / 2) * (PLANE.w - 2 * PLANE.padX) / 2 + 26);
    const ry = Math.max(narrow() ? 70 : 38, (Math.abs(yh - yl) / 2) * (PLANE.h - 2 * PLANE.padY) / 2 + 22);
    g.style.transform = `translate(${cx}px, ${cy}px)`;
    const e = g.querySelector("ellipse");
    e.style.rx = rx + "px"; e.style.ry = ry + "px";
    e.setAttribute("rx", rx); e.setAttribute("ry", ry);
  });
}

function updateAtlasDim() {
  const f = state.filterType;
  document.querySelectorAll("#blobs .type-blob").forEach((g) => {
    g.classList.toggle("dim", !!f && g.dataset.type !== f);
    g.classList.toggle("sel", g.dataset.type === f);
  });
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
  return (i.types || []).map(typeById).filter(Boolean).map((t) => t.color);
}

function voteLabel(n) { return n + " " + plural(n, "hlas", "hlasy", "hlasů"); }

async function doVote(item, el) {
  if (state.voted.has(item.id)) { toast("Tady už tvůj hlas je."); return; }
  state.voted.add(item.id);
  ls.set("atlas-voted", [...state.voted]);
  item.weight = (item.weight || 0) + 1;
  el.classList.add("voted");
  const c = el.querySelector(".count");
  if (c) c.textContent = voteLabel(item.weight);
  toast("Přidal/a jsi hlas. Díky!");
  if (el.classList.contains("pillar")) renderSections();
  try { await vote(item.id); } catch (e) { toast("Hlas se nepodařilo uložit: " + e.message); }
}

const DISC_OFFSETS = [
  [[0, 0]],
  [[-5, 0], [5, 0]],
  [[0, -5], [-5, 4], [5, 4]],
  [[-5, -5], [5, -5], [-5, 5], [5, 5]],
];

function renderBubbles(items) {
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
    const discs = cols.length
      ? cols.map((c, k) => h("span", { class: "disc blend", "--c": c, style: { transform: `translate(${offs[k][0]}%, ${offs[k][1]}%)` } }))
      : [h("span", { class: "disc general" })];
    const typesTxt = (i.types || []).map((t) => typeById(t)?.name).filter(Boolean).join(", ") || "všechny vztahy";
    const btn = h("button", {
      type: "button",
      class: "bubble" + (matches(i) ? "" : " dim") + (state.voted.has(i.id) ? " voted" : ""),
      "--d": d + "px", "--fs": fs + "px",
      title: typesTxt + ". Klepni, pokud souhlasíš.",
      "aria-label": i.text + ". Týká se: " + typesTxt + ". " + voteLabel(w) + ". Klepnutím přidáš hlas.",
    }, h("span", { class: "discs" }, discs), h("span", { class: "label" }, i.text), h("span", { class: "count" }, voteLabel(w)));
    btn.addEventListener("click", () => doVote(i, btn));
    wrap.append(btn);
  });
  return wrap;
}

function splitPillar(text) {
  const m = text.match(/^([^:–—]{2,40})\s*[:–—]\s*(.+)$/);
  return m ? [m[1].trim(), m[2].trim()] : [text, ""];
}

function renderPillars(items) {
  const row = h("div", { class: "pillars" });
  items.forEach((i) => {
    const w = i.weight || 1;
    const n = Math.min(14, w);
    const cols = colorsOf(i);
    let [name, rest] = splitPillar(i.text);
    name = name.charAt(0).toLocaleUpperCase("cs") + name.slice(1);
    const orbs = Array.from({ length: n }, (_, k) =>
      cols.length
        ? h("span", { class: "orb blend", "--c": cols[k % cols.length], "--i": String(k) })
        : h("span", { class: "orb general blend", "--i": String(k) }));
    const btn = h("button", {
      type: "button", class: "pillar" + (matches(i) ? "" : " dim") + (state.voted.has(i.id) ? " voted" : ""),
      "aria-label": name + (rest ? ": " + rest : "") + ". " + voteLabel(w) + ". Klepnutím přidáš hlas.",
    },
      h("span", { class: "tower", "aria-hidden": "true" },
        h("span", { class: "stack", "--n": String(n) }, orbs),
        h("span", { class: "base" })),
      h("span", { class: "words" },
        h("span", { class: "name" }, name),
        rest ? h("span", { class: "rest" }, rest) : null,
        h("span", { class: "count" }, voteLabel(w))),
    );
    btn.addEventListener("click", () => doVote(i, btn));
    row.append(btn);
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
