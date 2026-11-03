// Drobné pomocníky pro práci s DOM.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("--")) el.style.setProperty(k, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (k === "text") el.textContent = v;
    else if (v === true) el.setAttribute(k, "");
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const SVGNS = "http://www.w3.org/2000/svg";
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "text") el.textContent = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) if (c) el.append(c);
  return el;
}

let toastTimer;
export function toast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

// 1 hlas, 2–4 hlasy, 5+ hlasů
export function plural(n, one, few, many) {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

export const reducedMotion = () =>
  window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── sbalitelné oddíly ───────────────────────────────────────
// Nadpis oddílu se změní na tlačítko; stav se pamatuje v prohlížeči.
const FOLD_KEY = "atlas-folded";
function foldedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(FOLD_KEY) || "[]")); } catch { return new Set(); }
}
function saveFolded(set) {
  try { localStorage.setItem(FOLD_KEY, JSON.stringify([...set])); } catch {}
}

export function collapsible(section, key) {
  const h2 = section.querySelector(".block-head h2");
  if (!h2 || h2.querySelector(".fold")) return;
  if (!section.id) section.id = "blk-" + key;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "fold";
  btn.setAttribute("aria-controls", section.id);
  while (h2.firstChild) btn.append(h2.firstChild);
  const chev = document.createElement("span");
  chev.className = "chev";
  chev.setAttribute("aria-hidden", "true");
  btn.append(chev);
  h2.append(btn);
  const apply = (folded) => {
    section.classList.toggle("folded", folded);
    btn.setAttribute("aria-expanded", String(!folded));
  };
  apply(foldedSet().has(key));
  btn.addEventListener("click", () => {
    const set = foldedSet();
    const folded = !set.has(key);
    folded ? set.add(key) : set.delete(key);
    saveFolded(set);
    apply(folded);
  });
}

export function setAllFolded(keys, folded) {
  const set = foldedSet();
  keys.forEach((k) => (folded ? set.add(k) : set.delete(k)));
  saveFolded(set);
}
