// Komunikace se sdílenými daty.
// Ostrý režim: Google Apps Script (API_URL v config.js).
// Demo režim: vše v localStorage tohoto prohlížeče.
import { API_URL, CLASSES } from "./config.js?v=20261104a";
import { DEFAULT_TYPES, DEFAULT_SECTIONS, DEMO_ITEMS } from "./seed.js?v=20261104a";

export const DEMO = !API_URL;

// ── bezpečný localStorage ───────────────────────────────────
export const ls = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  del(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

// ── ostrý režim ─────────────────────────────────────────────
async function remoteGet(params) {
  const url = API_URL + "?" + new URLSearchParams(params).toString();
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error("Server odpověděl chybou " + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Neznámá chyba serveru");
  return data;
}

async function remotePost(body) {
  // text/plain = bez CORS preflightu, Apps Script to zvládne.
  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Server odpověděl chybou " + res.status);
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "Neznámá chyba serveru");
  return data;
}

// ── demo režim ──────────────────────────────────────────────
const DB_KEY = "atlas-demo-db-v1";
function demoDb() {
  let db = ls.get(DB_KEY, null);
  if (!db) {
    db = {
      types: structuredClone(DEFAULT_TYPES),
      sections: structuredClone(DEFAULT_SECTIONS),
      items: structuredClone(DEMO_ITEMS),
    };
    ls.set(DB_KEY, db);
  }
  return db;
}
const saveDemo = (db) => ls.set(DB_KEY, db);
const uid = () => Math.random().toString(36).slice(2, 10);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function cleanItem(raw) {
  const s = (v, max) => String(v ?? "").trim().slice(0, max);
  return {
    section: s(raw.section, 40),
    text: s(raw.text, 220),
    text2: s(raw.text2, 220),
    mark: ["pair", "cross"].includes(raw.mark) ? raw.mark : "",
    types: Array.isArray(raw.types) ? raw.types.map(String).slice(0, 10) : [],
    classes: (Array.isArray(raw.classes) ? raw.classes : [raw.classes]).filter((c) => CLASSES.includes(c)),
  };
}

// ── veřejné API ─────────────────────────────────────────────
export async function loadData() {
  if (DEMO) {
    await wait(120);
    const db = demoDb();
    return {
      types: db.types,
      sections: db.sections,
      items: db.items.filter((i) => i.status === "approved"),
    };
  }
  const d = await remoteGet({ action: "data" });
  return { types: d.types, sections: d.sections, items: d.items };
}

export async function submitItem(raw) {
  const item = cleanItem(raw);
  if (!item.text) throw new Error("Chybí text příspěvku.");
  if (!item.classes.length) throw new Error("Vyber svou třídu.");
  if (DEMO) {
    await wait(250);
    const db = demoDb();
    db.items.push({
      ...item, id: uid(), weight: 1, status: "pending", source: "student",
      created: new Date().toISOString(),
    });
    saveDemo(db);
    return { ok: true };
  }
  return remotePost({ action: "submit", item });
}

export async function vote(id) {
  if (DEMO) {
    const db = demoDb();
    const i = db.items.find((x) => x.id === id);
    if (i) i.weight = (Number(i.weight) || 0) + 1;
    saveDemo(db);
    return { ok: true, weight: i?.weight };
  }
  return remotePost({ action: "vote", id });
}

// ── admin ───────────────────────────────────────────────────
export async function admin(key, op, payload = {}) {
  if (DEMO) {
    await wait(100);
    if (key !== "demo") throw new Error("Špatný klíč. V demo režimu je klíč „demo“.");
    return demoAdmin(op, payload);
  }
  return remotePost({ action: "admin", key, op, ...payload });
}

function demoAdmin(op, p) {
  const db = demoDb();
  const res = { ok: true };
  switch (op) {
    case "list":
      Object.assign(res, structuredClone(db));
      break;
    case "saveItem": {
      const data = { ...cleanItem(p.item), weight: Number(p.item.weight) || 1, status: p.item.status || "approved" };
      if (p.item.id) {
        const i = db.items.find((x) => x.id === p.item.id);
        if (!i) throw new Error("Položka neexistuje.");
        Object.assign(i, data, { updated: new Date().toISOString() });
      } else {
        db.items.push({ ...data, id: uid(), source: p.item.source || "teacher", created: new Date().toISOString() });
      }
      break;
    }
    case "setStatus":
      p.ids.forEach((id) => {
        const i = db.items.find((x) => x.id === id);
        if (i) i.status = p.status;
      });
      break;
    case "deleteItems":
      db.items = db.items.filter((x) => !p.ids.includes(x.id));
      break;
    case "merge": {
      const target = db.items.find((x) => x.id === p.targetId);
      const others = db.items.filter((x) => p.ids.includes(x.id) && x.id !== p.targetId);
      if (!target) throw new Error("Cílová položka neexistuje.");
      others.forEach((o) => {
        target.weight = (Number(target.weight) || 0) + (Number(o.weight) || 1);
        target.types = [...new Set([...target.types, ...o.types])];
        target.classes = [...new Set([...target.classes, ...o.classes])];
      });
      target.status = "approved";
      db.items = db.items.filter((x) => !others.includes(x));
      break;
    }
    case "saveType": {
      const i = db.types.findIndex((t) => t.id === p.type.id);
      if (i >= 0) db.types[i] = p.type;
      else db.types.push(p.type);
      break;
    }
    case "deleteType":
      db.types = db.types.filter((t) => t.id !== p.id);
      break;
    case "saveSection": {
      const i = db.sections.findIndex((s) => s.id === p.section.id);
      if (i >= 0) db.sections[i] = p.section;
      else db.sections.push(p.section);
      break;
    }
    case "deleteSection":
      db.sections = db.sections.filter((s) => s.id !== p.id);
      break;
    case "resetDemo":
      ls.del(DB_KEY);
      return res;
    default:
      throw new Error("Neznámá operace " + op);
  }
  saveDemo(db);
  return res;
}
