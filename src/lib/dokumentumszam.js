// ─── EDI Dokumentumszám generálás ──────────────────────────────
import { loadLocal, saveLocal } from "./localDb";

const COUNTER_KEY = "edi_sorszam_counter";
const PREFIX = "E.D.I.";

/**
 * Következő EDI sorszám lekérése (auto increment)
 * Pl: "E.D.I. 001", "E.D.I. 002", ...
 */
export function nextEdiSorszam() {
  const counter = (loadLocal(COUNTER_KEY) || 0) + 1;
  saveLocal(COUNTER_KEY, counter);
  return formatEdi(counter);
}

export function formatEdi(n) {
  return `${PREFIX} ${String(n).padStart(3, "0")}`;
}

/**
 * Teljes dokumentumszám: EDI sorszám + fővállalkozói azonosító ha van
 * Pl: "E.D.I. 001 / FŐV-2026-145"
 */
export function fullDokumentumszam(ediSorszam, fovallalkoiAzonosito) {
  if (!fovallalkoiAzonosito?.trim()) return ediSorszam;
  return `${ediSorszam} / ${fovallalkoiAzonosito.trim()}`;
}

/**
 * Hányadik munkalap az adott projekthez (helyszín látogatás számozás)
 * Ha pl. T003700 projekthez 3 munkalap van, ez a 3. → "3. munkalap"
 */
export function projektMunkalapSorszam(munkalapok, projektId) {
  if (!projektId) return 1;
  const sajat = munkalapok
    .filter(m => m.projektId === projektId || m.ugyszam?.startsWith(projektId))
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  return sajat.length + 1;
}

/**
 * Péelda: az adott munkalapnak hányadik az eredeti projekt nevéhez
 */
export function getHelyszinSorszam(munkalapok, m) {
  if (!m.projektId) return null;
  const sajat = munkalapok
    .filter(x => x.projektId === m.projektId)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const idx = sajat.findIndex(x => x.id === m.id);
  return idx >= 0 ? idx + 1 : sajat.length;
}
