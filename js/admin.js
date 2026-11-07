import { CLASSES, AXES } from "./config.js?v=20261107d";
import { DEMO, admin } from "./api.js?v=20261107d";
import { h, toast } from "./ui.js?v=20261107d";

const $ = (id) => document.getElementById(id);
let KEY = "";
let db = { items: [], types: [], sections: [] };

try { KEY = sessionStorage.getItem("atlas-admin-key") || ""; } catch {}
$("login-hint").textContent = DEMO ? "Ukázkový režim: heslo je „demo“." : "Heslo nastavíš v Apps Scriptu jako vlastnost ADMIN_KEY.";

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  KEY = $("key").value;
  await start();
});
if (KEY) start();

async function start() {
  try {
    await refresh();
    try { sessionStorage.setItem("atlas-admin-key", KEY); } catch {}
    $("login").hidden = true;
    $("app").hidden = false;
  } catch (err) {
    $("login-msg").textContent = err.message;
    try { sessionStorage.removeItem("atlas-admin-key"); } catch {}
  }
}

async function refresh() {
  const r = await admin(KEY, "list");
  db = { items: r.items || [], types: r.types || [], sections: (r.sections || []).sort((a, b) => a.order - b.order) };
  renderAll();
}

async function run(op, payload, okMsg) {
  try {
    await admin(KEY, op, payload);
    if (okMsg) toast(okMsg);
    await refresh();
  } catch (err) {
    toast("Chyba: " + err.message);
  }
}

// ── záložky ─────────────────────────────────────────────────
document.querySelectorAll(".adm-tabs button").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".adm-tabs button").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
  document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== b.dataset.tab));
}));

function renderAll() {
  const pending = db.items.filter((i) => i.status === "pending");
  $("pending-count").textContent = pending.length || "";
  renderList($("pending-list"), pending, "Nic nečeká na schválení.");
  fillSectionFilter();
  renderItems();
  renderAddForm();
  renderTypes();
  renderSections();
}

const secName = (id) => db.sections.find((s) => s.id === id)?.title || id;
const typeName = (id) => db.types.find((t) => t.id === id)?.name || id;
const STATUS = { approved: "zveřejněno", pending: "čeká", hidden: "skryto" };

function renderList(host, items, emptyMsg) {
  host.innerHTML = "";
  if (!items.length) { host.append(h("p", { class: "empty" }, emptyMsg)); return; }
  items.forEach((i) => {
    const row = h("div", { class: "row-item" },
      h("input", { type: "checkbox", class: "sel", value: i.id, "aria-label": "Vybrat: " + i.text }),
      h("div", {},
        h("div", { class: "txt" }, i.text),
        i.text2 ? h("div", { class: "txt2" }, (i.mark === "cross" ? "✕ " : i.mark === "pair" ? "⟷ " : "") + i.text2) : null,
        h("div", { class: "meta" },
          h("span", { class: "status " + i.status }, STATUS[i.status] || i.status),
          h("span", {}, secName(i.section)),
          h("span", {}, (i.types || []).map(typeName).join(", ") || "všechny vztahy"),
          h("span", {}, (i.classes || []).join(", ")),
          h("span", {}, "váha " + i.weight),
          h("span", {}, i.source === "student" ? "od žáka" : "od učitele"),
        ),
        h("details", {}, h("summary", {}, "Upravit"), itemForm(i)),
      ),
    );
    host.append(row);
  });
}

const selected = (host) => [...host.querySelectorAll("input.sel:checked")].map((c) => c.value);

function checks(name, options, chosen) {
  return h("div", { class: "checks" }, options.map(([v, l]) => {
    const inp = h("input", { type: "checkbox", name, value: v });
    inp.checked = chosen.includes(v);
    return h("label", {}, inp, l);
  }));
}

function itemForm(i = {}) {
  const sec = db.sections.find((s) => s.id === i.section) || db.sections[0];
  const f = h("form", { class: "adm-form" });
  const secSel = h("select", { name: "section" }, db.sections.map((s) => h("option", { value: s.id }, s.title)));
  secSel.value = i.section || sec?.id || "";
  const isPairs = () => db.sections.find((s) => s.id === secSel.value)?.kind === "pairs";
  const pairBox = h("div", { class: "two" },
    h("label", {}, "Co vztah stojí (rub)", h("textarea", { name: "text2", rows: 2 }, i.text2 || "")),
    h("label", {}, "Souvislost", (() => {
      const m = h("select", { name: "mark" }, h("option", { value: "pair" }, "⟷ dvě strany jedné mince"), h("option", { value: "cross" }, "✕ spolu nesouvisí"));
      m.value = i.mark || "pair";
      return m;
    })()),
  );
  const syncPairs = () => (pairBox.hidden = !isPairs());
  secSel.addEventListener("change", syncPairs);
  const status = h("select", { name: "status" }, Object.entries(STATUS).map(([v, l]) => h("option", { value: v }, l)));
  status.value = i.status || "approved";

  f.append(
    h("div", { class: "three" },
      h("label", {}, "Oddíl", secSel),
      h("label", {}, "Váha", h("input", { type: "number", name: "weight", min: 1, max: 999, value: i.weight || 1 })),
      h("label", {}, "Stav", status),
    ),
    h("label", {}, "Text", h("textarea", { name: "text", rows: 2, required: true }, i.text || "")),
    pairBox,
    h("fieldset", {}, h("legend", {}, "Typy vztahů (nic = všechny)"), checks("types", db.types.map((t) => [t.id, t.name]), i.types || [])),
    h("fieldset", {}, h("legend", {}, "Třídy"), checks("classes", CLASSES.map((c) => [c, c]), i.classes || [])),
    h("div", { class: "form-actions" },
      h("button", { class: "btn btn-ink", type: "submit" }, i.id ? "Uložit změny" : "Přidat do přehledu"),
      i.id && i.status !== "approved" ? h("button", { class: "btn btn-quiet", type: "button", onclick: () => submitForm("approved") }, "Uložit a schválit") : null,
    ),
  );
  syncPairs();

  function collect(forceStatus) {
    const fd = new FormData(f);
    return {
      id: i.id,
      section: fd.get("section"),
      text: fd.get("text"),
      text2: isPairs() ? fd.get("text2") : "",
      mark: isPairs() ? fd.get("mark") : "",
      types: fd.getAll("types"),
      classes: fd.getAll("classes"),
      weight: Number(fd.get("weight")) || 1,
      status: forceStatus || fd.get("status"),
      source: i.source,
    };
  }
  function submitForm(forceStatus) {
    const item = collect(forceStatus);
    if (!item.classes.length) { toast("Vyber aspoň jednu třídu."); return; }
    run("saveItem", { item }, i.id ? "Uloženo." : "Přidáno do přehledu.");
  }
  f.addEventListener("submit", (e) => { e.preventDefault(); submitForm(); });
  return f;
}

// ── čekající ────────────────────────────────────────────────
$("approve-sel").onclick = () => bulk($("pending-list"), "setStatus", { status: "approved" }, "Schváleno.");
$("hide-sel-p").onclick = () => bulk($("pending-list"), "setStatus", { status: "hidden" }, "Skryto.");
$("delete-sel-p").onclick = () => bulk($("pending-list"), "deleteItems", {}, "Smazáno.", true);
$("hide-sel").onclick = () => bulk($("items-list"), "setStatus", { status: "hidden" }, "Skryto.");
$("delete-sel").onclick = () => bulk($("items-list"), "deleteItems", {}, "Smazáno.", true);
$("merge-sel").onclick = () => {
  const ids = selected($("items-list"));
  if (ids.length < 2) { toast("Vyber aspoň dvě položky ke sloučení."); return; }
  run("merge", { ids, targetId: ids[0] }, "Sloučeno.");
};

function bulk(host, op, extra, msg, confirmIt) {
  const ids = selected(host);
  if (!ids.length) { toast("Nic není vybrané."); return; }
  if (confirmIt && !confirm("Opravdu smazat " + ids.length + " položek? Nejde to vrátit.")) return;
  run(op, { ids, ...extra }, msg);
}

// ── všechny položky ─────────────────────────────────────────
function fillSectionFilter() {
  const sel = $("f-section");
  const v = sel.value;
  sel.innerHTML = "";
  sel.append(h("option", { value: "" }, "všechny"));
  db.sections.forEach((s) => sel.append(h("option", { value: s.id }, s.title)));
  sel.value = v;
}
["f-section", "f-status", "f-q"].forEach((id) => $(id).addEventListener("input", renderItems));
function renderItems() {
  const sec = $("f-section").value, st = $("f-status").value, q = $("f-q").value.trim().toLowerCase();
  const items = db.items
    .filter((i) => (!sec || i.section === sec) && (!st || i.status === st) && (!q || (i.text + " " + i.text2).toLowerCase().includes(q)))
    .sort((a, b) => a.section.localeCompare(b.section) || b.weight - a.weight);
  renderList($("items-list"), items, "Žádné položky neodpovídají filtru.");
}

// ── přidat z hodiny ─────────────────────────────────────────
function renderAddForm() {
  const host = $("add-form");
  const f = itemForm({});
  host.replaceWith(Object.assign(f, { id: "add-form", className: "panel adm-form" }));
}

// ── typy ────────────────────────────────────────────────────
function renderTypes() {
  const host = $("types-list");
  host.innerHTML = "";
  db.types.forEach((t) => host.append(typeForm(t)));
}
$("type-new").onclick = () => {
  const t = { id: "", name: "", en: "", color: "#888888", order: db.types.length + 1, description: "" };
  AXES.forEach((a) => (t[a.id] = [-0.2, 0.2]));
  const f = typeForm(t, true);
  $("types-list").append(f);
  f.querySelector("input").focus();
};

function typeForm(t, isNew = false) {
  const f = h("form", { class: "panel adm-form type-edit" },
    h("div", { class: "three" },
      h("label", {}, "Název", h("input", { name: "name", value: t.name, required: true })),
      h("label", {}, "Anglicky", h("input", { name: "en", value: t.en })),
      h("label", {}, "Barva", h("input", { name: "color", type: "color", value: t.color })),
    ),
    h("div", { class: "two" },
      h("label", {}, "Zkratka (id, bez mezer)", h("input", { name: "id", value: t.id, required: true, pattern: "[a-z0-9-]+", readonly: !isNew })),
      h("label", {}, "Pořadí", h("input", { name: "order", type: "number", value: t.order })),
    ),
    h("label", {}, "Popis", h("textarea", { name: "description", rows: 2 }, t.description || "")),
    h("fieldset", {}, h("legend", {}, "Rozpětí na osách (od, do)"),
      AXES.map((a) => h("div", { class: "axis-edit" },
        h("span", {}, a.left + " ↔ " + a.right),
        h("input", { type: "number", name: a.id + "_lo", min: -1, max: 1, step: 0.1, value: t[a.id]?.[0] ?? 0, "aria-label": a.left + " od" }),
        h("input", { type: "number", name: a.id + "_hi", min: -1, max: 1, step: 0.1, value: t[a.id]?.[1] ?? 0, "aria-label": a.right + " do" }),
      ))),
    h("div", { class: "form-actions" },
      h("button", { class: "btn btn-ink", type: "submit" }, "Uložit typ"),
      !isNew ? h("button", { class: "btn btn-danger", type: "button", onclick: () => {
        if (confirm("Smazat typ „" + t.name + "“? Položky s tímto typem ho přestanou zobrazovat.")) run("deleteType", { id: t.id }, "Typ smazán.");
      } }, "Smazat typ") : null,
    ),
  );
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const type = {
      id: String(fd.get("id")).trim(), name: fd.get("name"), en: fd.get("en"), color: fd.get("color"),
      order: Number(fd.get("order")) || 0, description: fd.get("description"),
    };
    AXES.forEach((a) => (type[a.id] = [Number(fd.get(a.id + "_lo")) || 0, Number(fd.get(a.id + "_hi")) || 0]));
    run("saveType", { type }, "Typ uložen.");
  });
  return f;
}

// ── oddíly ──────────────────────────────────────────────────
function renderSections() {
  const host = $("sections-list");
  host.innerHTML = "";
  db.sections.forEach((s) => host.append(sectionForm(s)));
}
$("section-new").onclick = () => {
  const f = sectionForm({ id: "", order: db.sections.length + 1, kind: "bubbles", open: true, visible: true, title: "", en: "", subtitle: "" }, true);
  $("sections-list").append(f);
  f.querySelector("input").focus();
};

function sectionForm(sec, isNew = false) {
  const kind = h("select", { name: "kind" }, h("option", { value: "bubbles" }, "bubliny"), h("option", { value: "pillars" }, "pilíře"), h("option", { value: "pairs" }, "dvojice"));
  kind.value = sec.kind;
  const cb = (name, label, val) => { const i = h("input", { type: "checkbox", name }); i.checked = !!val; return h("label", {}, i, label); };
  const f = h("form", { class: "panel adm-form section-edit" },
    h("div", { class: "two" },
      h("label", {}, "Nadpis", h("input", { name: "title", value: sec.title, required: true })),
      h("label", {}, "Anglicky", h("input", { name: "en", value: sec.en })),
    ),
    h("label", {}, "Podtitul", h("textarea", { name: "subtitle", rows: 2 }, sec.subtitle || "")),
    h("div", { class: "three" },
      h("label", {}, "Zkratka (id)", h("input", { name: "id", value: sec.id, required: true, pattern: "[a-z0-9-]+", readonly: !isNew })),
      h("label", {}, "Druh", kind),
      h("label", {}, "Pořadí", h("input", { name: "order", type: "number", value: sec.order })),
    ),
    h("div", { class: "checks" }, cb("visible", "Zobrazit na webu", sec.visible), cb("open", "Žáci mohou přispívat", sec.open)),
    h("div", { class: "form-actions" },
      h("button", { class: "btn btn-ink", type: "submit" }, "Uložit oddíl"),
      !isNew ? h("button", { class: "btn btn-danger", type: "button", onclick: () => {
        if (confirm("Smazat oddíl „" + sec.title + "“? Jeho položky zůstanou v tabulce, ale nebudou vidět.")) run("deleteSection", { id: sec.id }, "Oddíl smazán.");
      } }, "Smazat oddíl") : null,
    ),
  );
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    run("saveSection", { section: {
      id: String(fd.get("id")).trim(), title: fd.get("title"), en: fd.get("en"), subtitle: fd.get("subtitle"),
      kind: fd.get("kind"), order: Number(fd.get("order")) || 0, open: fd.get("open") === "on", visible: fd.get("visible") === "on",
    } }, "Oddíl uložen.");
  });
  return f;
}
