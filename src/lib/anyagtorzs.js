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
 *   alapHaszonkulcsPct, javasoltEladasiAr, beszallito, kulsoAzonosito, inaktiv
 *
 * Megjegyzés (Fázis 2B – mezőkonszolidáció): a Fázis 2A-ban tévedésből
 * bevezetett külön "telepitokategoria" mező megszűnt – a telepítői
 * kategorizálás kizárólagos, hivatalos mezője a már használatban lévő
 * telepitoi_kategoria (ld. TELEPITOI_KATEGORIAK, getTelepitoriAnyagok).
 *
 * Árverzió (anyag_ar_verziok, ld. anyagArVerzio.js):
 *   ha a beszerzési ár, az alap haszonkulcs vagy a javasolt eladási ár
 *   módosul, a RÉGI érték árverzióként append-only mentésre kerül,
 *   mielőtt az új ár felülírná az anyagtörzs rekordot – ld. updateAnyag().
 *   Régi projektek / elfogadott ajánlatok ár-pillanatképei nem változnak.
 *
 * TS-1 bővítés (tartószerkezet kalkulátor):
 *   pmMegnevezes: PM és telepítő felé egyszerűsített megnevezés
 *     (pl. "Alumínium sín" az "Alumínium sín 40×40" helyett).
 *   logikaiTermek: motor-hivatkozás kulcs (több cikkszám → egy logikai termék).
 *   Új rekordok: a054 Síntoldó, a055 Mini sín, a056 Mini sín csavar,
 *     a057 Univerzális leszorító.
 *   loadAnyagtorzs() idempotens seed: az új rekordokat meglévő localStorage
 *     adathoz hozzáfűzi, ha hiányoznak. transform-on-read: pmMegnevezes /
 *     logikaiTermek a DEFAULT_ANYAGOK-ból töltődik, ha a tárolt rekordból hiányzik.
 */
import { appendAnyagArVerzio } from "./anyagArVerzio.js";

const KEY = "anyagtorzs";
const dispatch = () =>
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "anyagtorzs" } }));

// ─── Kategóriák ──────────────────────────────────────────────
// Ajánlat kategóriák (FO_TETELEK.id-k) – ajánlatnál szűrnek ezekre, és
// ez a lista adja a Raktárkészlet oldal termék-szintű kategorizálását is
// (ld. RaktarkeszletPage.jsx) – szándékosan NEM a telepítői kategóriákkal
// (ld. lent), mert az raktár szempontjából túl szűk (csak szerelési
// kellékanyag), ez viszont a teljes termékkört lefedi (panel, inverter,
// akku, kiegészítők, szolgáltatás is).
// "szolgaltatas" – Fázis 6E: nincs FO_TETELEK megfelelője, kifejezetten a
// raktárkészlet-nyilvántartásban felmerülő, fizikai kicsim nélküli tételekhez
// (pl. kiszállás, üzembe helyezés díja) – az ajánlat modul nem hivatkozik rá.
export const AJANLAT_KATEGORIAK = [
  { id: "napelem_rendszer", label: "Napelemek" },
  { id: "tartoszerkezet",   label: "Tartószerkezetek" },
  { id: "inverter",         label: "Inverterek" },
  { id: "energia_mero",     label: "Energia mérő / Smart meter" },
  { id: "akku_vezeto",      label: "Akkumulátor vezérlő" },
  { id: "akku_egyseg",      label: "Akkumulátorok" },
  { id: "akku_kiegeszito",  label: "Akkumulátor kiegészítők" },
  { id: "vedelmi_eszkozok", label: "Napelem-Inverter kiegészítők" },
  { id: "villanyszereles",  label: "Villanyszerelési anyagok" },
  { id: "szolgaltatas",     label: "Szolgáltatások" },
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
  // Tartószerkezet anyagok – pmMegnevezes: PM és telepítő egyszerűsített neve;
  // logikaiTermek: motor-hivatkozás kulcs (több cikkszám → egy logikai termék)
  { id: "a050", nev: "Alumínium sín 40×40",   pmMegnevezes: "Alumínium sín",        logikaiTermek: "aluminium_sin",    egyseg: "m",  netto_egysegar: 0, kategoria: "tartoszerkezet", telepitoi_kategoria: "tartoszerk_any", aktiv: true },
  { id: "a051", nev: "Tetőhorog",             pmMegnevezes: "Tetőhorog",             logikaiTermek: "tetohorog",        egyseg: "db", netto_egysegar: 0, kategoria: "tartoszerkezet", telepitoi_kategoria: "tartoszerk_any", aktiv: true },
  { id: "a052", nev: "Közép bilincs",         pmMegnevezes: "Köztes leszorító",      logikaiTermek: "koztes_leszorito", egyseg: "db", netto_egysegar: 0, kategoria: "tartoszerkezet", telepitoi_kategoria: "tartoszerk_any", aktiv: true },
  { id: "a053", nev: "Szél bilincs",          pmMegnevezes: "Végleszorító",          logikaiTermek: "veg_leszorito",    egyseg: "db", netto_egysegar: 0, kategoria: "tartoszerkezet", telepitoi_kategoria: "tartoszerk_any", aktiv: true },
  { id: "a054", nev: "Síntoldó",              pmMegnevezes: "Síntoldó",              logikaiTermek: "sintoldo",         egyseg: "db", netto_egysegar: 0, kategoria: "tartoszerkezet", telepitoi_kategoria: "tartoszerk_any", aktiv: true },
  { id: "a055", nev: "Mini sín",              pmMegnevezes: "Mini sín",              logikaiTermek: "mini_sin",         egyseg: "db", netto_egysegar: 0, kategoria: "tartoszerkezet", telepitoi_kategoria: "tartoszerk_any", aktiv: true },
  { id: "a056", nev: "Mini sín csavar",       pmMegnevezes: "Mini sín csavar",       logikaiTermek: "mini_sin_csavar",  egyseg: "db", netto_egysegar: 0, kategoria: "tartoszerkezet", telepitoi_kategoria: "tartoszerk_any", aktiv: true },
  { id: "a057", nev: "Univerzális leszorító", pmMegnevezes: "Univerzális leszorító", logikaiTermek: "univ_leszorito",   egyseg: "db", netto_egysegar: 0, kategoria: "tartoszerkezet", telepitoi_kategoria: "tartoszerk_any", aktiv: true },
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
    beszallito:        a.beszallito ?? "",
    kulsoAzonosito:    a.kulsoAzonosito ?? "",
    inaktiv:           a.inaktiv ?? false,
    // Fázis 6C – raktárkészlet: a jelenlegi, ténylegesen raktáron lévő
    // mennyiség. Csak akkor tölti be nullával, ha még sosem volt beállítva –
    // utána kizárólag adjustAnyagKeszlet / setAnyagKeszlet módosíthatja.
    keszlet:           a.keszlet ?? 0,
  };
}

// ─── Fázis 2B – mezőkonszolidáció ────────────────────────────
// A Fázis 2A egy külön "telepitokategoria" mezőt vezetett be tévedésből
// a már létező és ténylegesen használt "telepitoi_kategoria" mellé.
// Egy mező marad: telepitoi_kategoria (TELEPITOI_KATEGORIAK, getTelepitoriAnyagok).
// Ha egy rekordon a régi mező üres, de a duplikált "telepitokategoria" ki van
// töltve, az értékét egyszer átvesszük – utána a rendszer többé nem
// hivatkozik a duplikált mezőre (transform-on-read, nem töröl adatot).
function resolveTelepitoiKategoria(a) {
  const elsodleges = a.telepitoi_kategoria ?? a.kat ?? "";
  if (elsodleges) return elsodleges;
  if (a.telepitokategoria) return a.telepitokategoria;
  return "egyeb";
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
      const mapped = stored.map(a => {
        const { telepitokategoria, ...rest } = a; // Fázis 2B – duplikált mező kivezetve
        const netto_egysegar = rest.netto_egysegar ?? rest.egysegAr ?? 0;
        const defaultRec = DEFAULT_ANYAGOK.find(d => d.id === rest.id);
        return {
          ...rest,
          kategoria:            rest.kategoria ?? rest.kat ?? "villanyszereles",
          netto_egysegar,
          telepitoi_kategoria:  resolveTelepitoiKategoria(a),
          ...migrateAnyagV2(rest, netto_egysegar),
          // TS-1: pmMegnevezes / logikaiTermek – ha hiányzik a tárolt rekordból,
          // a DEFAULT_ANYAGOK megfelelő rekordjából tölti (transform-on-read)
          pmMegnevezes:  rest.pmMegnevezes  ?? defaultRec?.pmMegnevezes  ?? "",
          logikaiTermek: rest.logikaiTermek ?? defaultRec?.logikaiTermek ?? "",
        };
      });
      // TS-1: idempotens seed – az új anyagkódok (a054–a057) hozzáfűzése,
      // ha még nem szerepelnek a tárolt listában
      const storedIds = new Set(mapped.map(a => a.id));
      const hianyzok  = DEFAULT_ANYAGOK.filter(a => !storedIds.has(a.id));
      if (hianyzok.length > 0) {
        const merged = [...mapped, ...hianyzok];
        localStorage.setItem(KEY, JSON.stringify(merged));
        return merged;
      }
      return mapped;
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
  const item = { ...data, id: `a_${crypto.randomUUID()}`, aktiv: true };
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

// ─── Fázis 6C – Raktárkészlet ─────────────────────────────────
// A "keszlet" mező a ténylegesen raktáron lévő mennyiséget tükrözi.
// Csökken, amikor egy csapatnak anyagot adunk ki (ld. kivitelezesiCsomag.
// service.js – updateKiadottMennyisegFromMunkalap), nő bevételezéskor vagy
// kézi korrekciónál (ld. RaktarkeszletPage.jsx). Minden készletváltozást a
// raktarMozgas.js naplóz (hova, mennyi, mikor, ki) – a keszlet mező maga
// csak a JELENLEGI állapot, a "miért ennyi" mindig a naplóból derül ki.
export function adjustAnyagKeszlet(id, delta) {
  const list = loadAnyagtorzs();
  const existing = list.find(a => a.id === id);
  if (!existing) return null;
  const ujKeszlet = (Number(existing.keszlet) || 0) + (Number(delta) || 0);
  saveAnyagtorzs(list.map(a => a.id === id ? { ...a, keszlet: ujKeszlet } : a));
  return ujKeszlet;
}

export function setAnyagKeszlet(id, ertek) {
  const list = loadAnyagtorzs();
  if (!list.some(a => a.id === id)) return null;
  const ujKeszlet = Number(ertek) || 0;
  saveAnyagtorzs(list.map(a => a.id === id ? { ...a, keszlet: ujKeszlet } : a));
  return ujKeszlet;
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