/**
 * anyagtorzs.js – Egységes központi anyagtörzs
 *
 * EGYETLEN adatforrás az egész rendszerben:
 *   - Árajánlat készítő (AjanlatEditor)
 *   - Projekt / Munkalap
 *   - Telepítő felhasznált anyagok
 *   - Pénzügyi kalkuláció
 *   - Jövőbeli készletkezelés
 *
 * localStorage kulcs: "anyagtorzs" (ugyanaz mint az Árajánlat modul)
 *
 * Rekord mezők (ajánlat-kompatibilis):
 *   id, nev, egyseg, netto_egysegar, kategoria, aktiv, megjegyzes
 *   + telepitoi_kategoria (szűrés a telepítő felületen)
 *
 * V2 mezők (Fázis 2A – idempotens migráció, ld. migrateAnyagV2):
 *   alapHaszonkulcsPct, javasoltEladasiAr, telepitokategoria,
 *   beszallito, kulsoAzonosito, inaktiv
 *
 * Árverzió (anyag_ar_verziok, ld. anyagArVerzio.js):
 *   ha a beszerzési ár, az alap haszonkulcs vagy a javasolt eladási ár
 *   módosul, a RÉGI érték árverzióként append-only mentésre kerül,
 *   mielőtt az új ár felülírná az anyagtörzs rekordot – ld. updateAnyag().
 *   Régi projektek / elfogadott ajánlatok ár-pillanatképei nem változnak.
 */
import { appendAnyagArVerzio } from "./anyagArVerzio.js";

const KEY = "anyagtorzs";
const dispatch = () =>
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "anyagtorzs" } }));

// ─── Kategóriák ──────────────────────────────────────────────
// Ajánlat kategóriák (FO_TETELEK.id-k) – ajánlatnál szűrnek ezekre
export const AJANLAT_KATEGORIAK = [
  { id: "napelem_rendszer", label: "Napelem panel" },
  { id: "tartoszerkezet",   label: "Tartószerkezet" },
  { id: "inverter",         label: "Inverter" },
  { id: "energia_mero",     label: "Energia mérő / Smart meter" },
  { id: "akku_vezeto",      label: "Akkumulátor vezérlő" },
  { id: "akku_egyseg",      label: "Akkumulátor egység" },
  { id: "akku_kiegeszito",  label: "Akkumulátor kiegészítők" },
  { id: "vedelmi_eszkozok", label: "Védelmi eszközök" },
  { id: "villanyszereles",  label: "Villanyszerelési anyagok" },
];

// Telepítői kategóriák – telepítő felületen szűrnek
export const TELEPITOI_KATEGORIAK = [
  { id: "kabel",          label: "Kábelek" },
  { id: "csatlakozo",     label: "Csatlakozók" },
  { id: "vedocso_talca",  label: "Védőcső / Tálca" },
  { id: "foldeles",       label: "Földelés" },
  { id: "rogzito",        label: "Rögzítők / Bilincsek" },
  { id: "tartoszerk_any", label: "Tartószerkezet anyag" },
  { id: "egyeb",          label: "Egyéb" },
];

// ─── Alapanyagok – villanyszerelési + tartószerkezet ─────────
// Minden rekord: { id, nev, egyseg, netto_egysegar, kategoria,
//                 telepitoi_kategoria, aktiv }
// kategoria = AJANLAT_KATEGORIAK id (ajánlatnál szűr rá)
// telepitoi_kategoria = TELEPITOI_KATEGORIAK id (telepítőnél szűr rá)
export const DEFAULT_ANYAGOK = [
  // Kábelek
  { id: "a001", nev: "MBCU 5×10",              egyseg: "m",    netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "kabel",         aktiv: true },
  { id: "a002", nev: "MBCU 5×16",              egyseg: "m",    netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "kabel",         aktiv: true },
  { id: "a003", nev: "DC kábel 6 mm²",         egyseg: "m",    netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "kabel",         aktiv: true },
  { id: "a004", nev: "DC kábel 10 mm²",        egyseg: "m",    netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "kabel",         aktiv: true },
  { id: "a005", nev: "Akkumulátor kábel 50mm²", egyseg: "m",   netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "kabel",         aktiv: true },
  // Csatlakozók
  { id: "a010", nev: "MC4 csatlakozó",          egyseg: "db",  netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "csatlakozo",    aktiv: true },
  { id: "a011", nev: "MC4 elosztó (1-2)",       egyseg: "db",  netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "csatlakozo",    aktiv: true },
  { id: "a012", nev: "Kötődoboz IP65",          egyseg: "db",  netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "csatlakozo",    aktiv: true },
  // Védőcső / Tálca
  { id: "a020", nev: "KPE cső 40mm",            egyseg: "m",   netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "vedocso_talca", aktiv: true },
  { id: "a021", nev: "KPE cső 63mm",            egyseg: "m",   netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "vedocso_talca", aktiv: true },
  { id: "a022", nev: "Corrugált védőcső",       egyseg: "m",   netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "vedocso_talca", aktiv: true },
  { id: "a023", nev: "Kábeltálca 100mm",        egyseg: "m",   netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "vedocso_talca", aktiv: true },
  { id: "a024", nev: "Kábeltálca 200mm",        egyseg: "m",   netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "vedocso_talca", aktiv: true },
  // Földelés
  { id: "a030", nev: "Földelő vezető 16mm²",    egyseg: "m",   netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "foldeles",      aktiv: true },
  { id: "a031", nev: "Földelő szonda",          egyseg: "db",  netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "foldeles",      aktiv: true },
  { id: "a032", nev: "Potenciálkiegyenlítő sín", egyseg: "db", netto_egysegar: 0, kategoria: "vedelmi_eszkozok", telepitoi_kategoria: "foldeles",     aktiv: true },
  // Rögzítők
  { id: "a040", nev: "Bilincs 40mm",            egyseg: "db",  netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "rogzito",       aktiv: true },
  { id: "a041", nev: "Kábelrögzítő",            egyseg: "db",  netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "rogzito",       aktiv: true },
  { id: "a042", nev: "Csavarkészlet",           egyseg: "kész",netto_egysegar: 0, kategoria: "villanyszereles", telepitoi_kategoria: "rogzito",       aktiv: true },
  // Tartószerkezet anyagok
  { id: "a050", nev: "Alumínium sín 40×40",     egyseg: "m",   netto_egysegar: 0, kategoria: "tartoszerkezet",  telepitoi_kategoria: "tartoszerk_any", aktiv: true },
  { id: "a051", nev: "Tetőhorog",               egyseg: "db",  netto_egysegar: 0, kategoria: "tartoszerkezet",  telepitoi_kategoria: "tartoszerk_any", aktiv: true },
  { id: "a052", nev: "Közép bilincs",           egyseg: "db",  netto_egysegar: 0, kategoria: "tartoszerkezet",  telepitoi_kategoria: "tartoszerk_any", aktiv: true },
  { id: "a053", nev: "Szél bilincs",            egyseg: "db",  netto_egysegar: 0, kategoria: "tartoszerkezet",  telepitoi_kategoria: "tartoszerk_any", aktiv: true },
];

// ─── V2 – Javasolt eladási ár számítás ───────────────────────
// javasoltEladasiAr = nettoBeszerzesiAr × (1 + alapHaszonkulcsPct / 100)
// (kerekítve – a mező a UI-n kézzel felülírható)
export function calcJavasoltEladasiAr(nettoBeszerzesiAr, alapHaszonkulcsPct) {
  const ar  = Number(nettoBeszerzesiAr) || 0;
  const pct = Number(alapHaszonkulcsPct) || 0;
  return Math.round(ar * (1 + pct / 100));
}

// ─── V2 – idempotens mező-migráció (Fázis 2A) ────────────────
// Csak a HIÁNYZÓ mezőket tölti ki – meglévő értéket sosem ír felül,
// adatot nem töröl. A migrateOldKeys() mintáját követi (transform-on-read).
function migrateAnyagV2(a, netto_egysegar) {
  const alapHaszonkulcsPct = a.alapHaszonkulcsPct ?? 30;
  const javasoltEladasiAr  = a.javasoltEladasiAr ?? calcJavasoltEladasiAr(netto_egysegar, alapHaszonkulcsPct);
  return {
    alapHaszonkulcsPct,
    javasoltEladasiAr,
    telepitokategoria: a.telepitokategoria ?? "",
    beszallito:        a.beszallito ?? "",
    kulsoAzonosito:    a.kulsoAzonosito ?? "",
    inaktiv:           a.inaktiv ?? false,
  };
}

// Az árváltozást kiváltó mezők – ezek bármelyikének módosulása előtt
// a régi érték árverzióként rögzül (ld. updateAnyag).
const ANYAG_AR_MEZOK = ["netto_egysegar", "alapHaszonkulcsPct", "javasoltEladasiAr"];

// ─── CRUD ────────────────────────────────────────────────────
export function loadAnyagtorzs() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "null");
    if (Array.isArray(stored) && stored.length > 0) {
      // Visszafelé kompatibilitás: ha régi "kat" mező van, mappeljük "kategoria"-ra
      return stored.map(a => {
        const netto_egysegar = a.netto_egysegar ?? a.egysegAr ?? 0;
        return {
          ...a,
          kategoria:            a.kategoria ?? a.kat ?? "villanyszereles",
          netto_egysegar,
          telepitoi_kategoria:  a.telepitoi_kategoria ?? a.kat ?? "egyeb",
          ...migrateAnyagV2(a, netto_egysegar),
        };
      });
    }
    localStorage.setItem(KEY, JSON.stringify(DEFAULT_ANYAGOK));
    return DEFAULT_ANYAGOK;
  } catch { return DEFAULT_ANYAGOK; }
}

export function saveAnyagtorzs(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch();
}

export function getAktivAnyagok() {
  return loadAnyagtorzs().filter(a => a.aktiv !== false);
}

export function getAnyag(id) {
  return loadAnyagtorzs().find(a => a.id === id) || null;
}

export function createAnyag(data) {
  const list = loadAnyagtorzs();
  const item = { ...data, id: `a_${Date.now()}`, aktiv: true };
  saveAnyagtorzs([...list, item]);
  return item;
}

// updates: a módosítandó mezők; meta: { rogzitette, megjegyzes } – opcionális,
// az árverzió naplóhoz (ki és miért módosította az árat).
export function updateAnyag(id, updates, meta = {}) {
  const list     = loadAnyagtorzs();
  const existing = list.find(a => a.id === id);

  // Árváltozás esetén a RÉGI ár árverzióként append-only mentésre kerül,
  // MIELŐTT az új ár felülírná az anyagtörzs rekordot (D – Anyagár módosítási szabály).
  if (existing) {
    const arValtozott = ANYAG_AR_MEZOK.some(
      mezo => updates[mezo] !== undefined && Number(updates[mezo]) !== Number(existing[mezo])
    );
    if (arValtozott) {
      appendAnyagArVerzio({
        anyagtorzsId:       existing.id,
        nettoBeszerzesiAr:  existing.netto_egysegar,
        javasoltEladasiAr:  existing.javasoltEladasiAr,
        alapHaszonkulcsPct: existing.alapHaszonkulcsPct,
        rogzitette:         meta.rogzitette || "",
        megjegyzes:         meta.megjegyzes || "",
      });
    }
  }

  saveAnyagtorzs(list.map(a => a.id === id ? { ...a, ...updates } : a));
}

export function deleteAnyag(id) {
  saveAnyagtorzs(loadAnyagtorzs().filter(a => a.id !== id));
}

// ─── Telepítő szűrő ──────────────────────────────────────────
export function getTelepitoriAnyagok(telepitoi_kategoria = null) {
  const aktiv = getAktivAnyagok();
  if (!telepitoi_kategoria || telepitoi_kategoria === "mind") return aktiv;
  return aktiv.filter(a => a.telepitoi_kategoria === telepitoi_kategoria);
}

// ─── Költségszámítás ─────────────────────────────────────────
export function calcAnyagkoltseg(felhasznaltAnyagok = []) {
  return felhasznaltAnyagok.reduce((sum, f) => {
    const egysegAr = Number(f.netto_egysegar) || Number(f.egysegAr)
      || (getAnyag(f.anyagId || f.id)?.netto_egysegar ?? 0);
    return sum + (Number(f.menny) || Number(f.mennyiseg) || 0) * egysegAr;
  }, 0);
}
