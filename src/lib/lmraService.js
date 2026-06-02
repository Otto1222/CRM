/**
 * lmraService.js – LMRA nyomtatvány kezelés
 *
 * Az LMRA egy fix jogszabályi nyomtatvány – nem szerkeszthető.
 * Admin egyszer feltölti PDF-ként, helyszínen megjelenik,
 * fejlécet kitöltik, kockázatokat X-elik, mindenki aláír.
 */

const SABLON_KEY   = "lmra_pdf_sablon_b64";
const BEALLITAS_KEY = "crm_lmra_beallitasok";

// ─── KOCKÁZAT LISTA (a nyomtatvány táblázatából) ─────────────
export const LMRA_KOCKAZATOK = [
  { id: "magasban",     szoveg: "Magasban történő munkavégzés (leesés, lezuhanás)" },
  { id: "elcsuszas",    szoveg: "Elcsúszás vagy botlás veszélye (egyenetlen talaj, munkagödrök, árkok)" },
  { id: "villamos",     szoveg: "Villamos veszély (feszültség közelében vagy feszültség alatt végzett munka)" },
  { id: "forgalom",     szoveg: "Gépjármű vagy gyalogos forgalom" },
  { id: "kornyezet",    szoveg: "Környezeti tényezők (kedvezőtlen időjárás, zaj, nem megfelelő látási viszonyok)" },
  { id: "illetektelen", szoveg: "Idegen, illetéktelen személyek a munkaterületen" },
  { id: "eles_szeles",  szoveg: "Éles szélek, szűk helyek" },
  { id: "anyagmozgatas",szoveg: "Kézi anyagmozgatás (szerszámok, eszközök mozgatása)" },
  { id: "tuz",          szoveg: "Tűz vagy robbanás veszély" },
  { id: "emel",         szoveg: "Nehéz tárgyak emelése" },
  { id: "allat",        szoveg: "Állatok támadása" },
  { id: "pandemia",     szoveg: "Pandémiás / fertőzési kockázatok" },
];

// ─── Sablon PDF kezelés ───────────────────────────────────────
export function hasPdfSablon() {
  return !!localStorage.getItem(SABLON_KEY);
}

export function savePdfSablon(base64) {
  localStorage.setItem(SABLON_KEY, base64);
}

export function getPdfSablon() {
  return localStorage.getItem(SABLON_KEY) || null;
}

export function deletePdfSablon() {
  localStorage.removeItem(SABLON_KEY);
}

export function getPdfSablonMeta() {
  const b64 = localStorage.getItem(SABLON_KEY);
  if (!b64) return null;
  const kb = Math.round((b64.length * 3 / 4) / 1024);
  return { kb };
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── LMRA rekord mentés/betöltés ─────────────────────────────
export function saveLmra(munkalapId, adat) {
  localStorage.setItem(`lmra_${munkalapId}`, JSON.stringify(adat));
}

export function loadLmra(munkalapId) {
  try { return JSON.parse(localStorage.getItem(`lmra_${munkalapId}`) || "null"); }
  catch { return null; }
}

export function hasLmra(munkalapId) {
  return !!loadLmra(munkalapId);
}
