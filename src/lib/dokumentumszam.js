// ─── EDI Dokumentumszám generálás ──────────────────────────────
import { loadLocal, saveLocal } from "./localDb";
import { driveSave } from "./driveApi";

const COUNTER_KEY = "edi_sorszam_counter";
const PREFIX = "E.D.I.";

/**
 * Következő EDI sorszám – 2 jegyű: E.D.I. 01, E.D.I. 02, ...
 * Ha eléri 99-t, folytatja 3 jeggyel: E.D.I. 100
 */
export function nextEdiSorszam() {
  const counter = (loadLocal(COUNTER_KEY) || 0) + 1;
  saveLocal(COUNTER_KEY, counter);
  driveSave("edi_sorszam_counter", { edi_sorszam_counter: counter }).catch(() => {});
  return formatEdi(counter);
}

export function formatEdi(n) {
  const pad = n < 100 ? String(n).padStart(2, "0") : String(n);
  return `${PREFIX} ${pad}`;
}

/**
 * Teljes dokumentumszám: EDI sorszám + fővállalkozói projektkód
 * Spec: "E.D.I. 01 / T003700"
 */
export function fullDokumentumszam(ediSorszam, fovallalkoiAzonosito) {
  if (!fovallalkoiAzonosito?.trim()) return ediSorszam;
  return `${ediSorszam} / ${fovallalkoiAzonosito.trim()}`;
}

export function projektMunkalapSorszam(munkalapok, projektId) {
  if (!projektId) return 1;
  const sajat = munkalapok
    .filter(m => m.projektId === projektId || m.ugyszam?.startsWith(projektId))
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  return sajat.length + 1;
}

export function getHelyszinSorszam(munkalapok, m) {
  if (!m.projektId) return null;
  const sajat = munkalapok
    .filter(x => x.projektId === m.projektId)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
  const idx = sajat.findIndex(x => x.id === m.id);
  return idx >= 0 ? idx + 1 : sajat.length;
}
