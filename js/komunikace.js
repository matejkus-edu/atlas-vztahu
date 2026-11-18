// Atlas komunikace: sbalitelné oddíly a ukázka „jedna věta, tři vztahy“.
import { collapsible, setAllFolded } from "./ui.js?v=20261118a";

const sections = [...document.querySelectorAll("section[data-fold]")];
sections.forEach((sec) => collapsible(sec, sec.dataset.fold));

const foldAll = document.getElementById("fold-all");
const syncFoldAll = () => {
  const allFolded = sections.every((s) => s.classList.contains("folded"));
  foldAll.textContent = allFolded ? "Rozbalit vše" : "Sbalit vše";
};
foldAll.addEventListener("click", () => {
  const fold = !sections.every((s) => s.classList.contains("folded"));
  setAllFolded(sections.map((s) => s.dataset.fold), fold);
  sections.forEach((s) => {
    s.classList.toggle("folded", fold);
    s.querySelector(".fold")?.setAttribute("aria-expanded", String(!fold));
  });
  syncFoldAll();
});
document.querySelectorAll(".fold").forEach((b) => b.addEventListener("click", syncFoldAll));
syncFoldAll();

// Skok na oddíl ho zároveň rozbalí.
document.querySelectorAll(".jump a").forEach((a) => a.addEventListener("click", () => {
  const sec = document.querySelector(a.getAttribute("href"));
  if (sec?.classList.contains("folded")) sec.querySelector(".fold")?.click();
}));

const TONES = [
  { how: "Klidný hlas, nikam se nedívá, jen konstatuje.", meaning: "„Jen říkám, jak to je. Nikoho neobviňuju.“" },
  { how: "Povzdech, zvýšený hlas, pohled na sourozence.", meaning: "„Zase jsi to nechal na mně. Nemůžu se na tebe spolehnout.“" },
  { how: "Úsměv, přehnaně dramatický tón.", meaning: "„Jsme v tom spolu a beru to s nadhledem.“" },
];
const buttons = [...document.querySelectorAll(".tone")];
const how = document.getElementById("tone-how");
const meaning = document.getElementById("tone-meaning");
function setTone(i) {
  buttons.forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
  how.textContent = TONES[i].how;
  meaning.textContent = TONES[i].meaning;
  document.querySelector(".demo").dataset.tone = i;
}
buttons.forEach((b) => b.addEventListener("click", () => setTone(Number(b.dataset.tone))));
setTone(0);
