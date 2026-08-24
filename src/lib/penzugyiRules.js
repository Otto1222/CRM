/**
 * penzugyiRules.js
 * Pénzügyi státuszgépek, kapuellenőrzések, workflow szabályok.
 * Ne nyúlj a workflowRules.js-hez – ez csak pénzügyi logika.
 */

// ─── Elszámolás státuszok ─────────────────────────────────────

export const ELSZAMOLAS_STATUSZOK = [
  { id: "Nincs előkészítve", szin: "#94A3B8", bg: "#F8FAFC" },
  { id: "Előkészítve",       szin: "#D97706", bg: "#FFFBEB" },
  { id: "Ellenőrzés alatt",  szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Jóváhagyva",        szin: "#059669", bg: "#ECFDF5" },
  { id: "Javítani kell",     szin: "#DC2626", bg: "#FEF2F2" },
];

// ─── Számlázás státuszok ──────────────────────────────────────

export const SZAMLAZAS_STATUSZOK = [
  { id: "Nem számlázható", szin: "#94A3B8", bg: "#F8FAFC" },
  { id: "Számlázható",     szin: "#D97706", bg: "#FFFBEB" },
  { id: "Számlázva",       szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Kifizetve",       szin: "#059669", bg: "#ECFDF5" },
];

// ─── TIG státuszok ────────────────────────────────────────────

export const TIG_STATUSZOK = [
  { id: "Nem szükséges",    szin: "#94A3B8", bg: "#F8FAFC" },
  { id: "Szükséges",        szin: "#EA580C", bg: "#FFF7ED" },
  { id: "Elkészítés alatt", szin: "#D97706", bg: "#FFFBEB" },
  { id: "Kiküldve",         szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Elfogadva",        szin: "#059669", bg: "#ECFDF5" },
  { id: "Hiánypótlás",      szin: "#DC2626", bg: "#FEF2F2" },
];

// ─── Bevétel típus projekt forrás szerint ─────────────────────

export function getBevetelTipus(forrás) {
  if (forrás === "sajat_ajanlat")       return "ajanlat";
  if (forrás === "fovallalkozoi_munka") return "fovallalkozoi";
  return "nincs";
}

// ─── Konfig keresők ───────────────────────────────────────────

export function getElszamolasConfig(id) {
  return ELSZAMOLAS_STATUSZOK.find(s => s.id === id) || { szin: "#94A3B8", bg: "#F8FAFC" };
}

export function getSzamlazasConfig(id) {
  return SZAMLAZAS_STATUSZOK.find(s => s.id === id) || { szin: "#94A3B8", bg: "#F8FAFC" };
}

export function getTigConfig(id) {
  return TIG_STATUSZOK.find(s => s.id === id) || { szin: "#94A3B8", bg: "#F8FAFC" };
}

// ─── Alapértékek forrás szerint ───────────────────────────────

export function defaultSzamlazasStatusz(forrás) {
  return forrás === "belso_munka" ? "Nem számlázható" : "Számlázható";
}

// ─── Kapuellenőrzés: Számlázható státusz ─────────────────────
//
// Projekt státusz csak akkor mehet "Számlázható"-ra, ha ezek teljesülnek.

export function ellenorzSzamlazhatosagas(projekt, munkalapok, penzugyi) {
  const problems = [];

  // belso_munka soha nem számlázható
  if (projekt?.forrás === "belso_munka") {
    return { ok: false, problems: ["Belső munka soha nem kerülhet Számlázható státuszba."] };
  }

  // Minden munkalap lezárva
  const nyitott = (munkalapok || []).filter(m => m.status !== "Lezárva");
  if (nyitott.length > 0) {
    problems.push(`${nyitott.length} munkalap még nincs lezárva (${nyitott.map(m => m.status).join(", ")}).`);
  }

  // Pénzügyi elszámolás előkészítve
  if (!penzugyi || penzugyi.elszamolasStatusz === "Nincs előkészítve") {
    problems.push("A pénzügyi elszámolás még nincs előkészítve.");
  } else if (penzugyi.elszamolasStatusz === "Javítani kell") {
    problems.push("A pénzügyi elszámolás javításra szorul – nem lehet továbblépni.");
  }

  // TIG rendezve
  const tigOk = !penzugyi?.tigStatusz
    || ["Nem szükséges", "Elfogadva"].includes(penzugyi.tigStatusz);
  if (!tigOk) {
    problems.push(`TIG státusz: "${penzugyi.tigStatusz}" – még nem lezárt.`);
  }

  return { ok: problems.length === 0, problems };
}

// ─── Kapuellenőrzés: Lezárt státusz ──────────────────────────

export function ellenorzLezarhatosagas(projekt, penzugyi) {
  const problems = [];

  if (["sajat_ajanlat", "fovallalkozoi_munka"].includes(projekt?.forrás)) {
    if (!["Számlázva", "Kifizetve"].includes(penzugyi?.szamlazasStatusz)) {
      problems.push("A számlázás még nincs rendezve (szükséges: Számlázva vagy Kifizetve).");
    }
    if (penzugyi?.elszamolasStatusz !== "Jóváhagyva") {
      problems.push("Az elszámolás jóváhagyása szükséges a lezáráshoz.");
    }
  }

  if (projekt?.forrás === "belso_munka") {
    if (!penzugyi || penzugyi.elszamolasStatusz === "Nincs előkészítve") {
      problems.push("A belső munka elszámolása nincs előkészítve.");
    }
  }

  return { ok: problems.length === 0, problems };
}

// ─── Kapuellenőrzés: sorrend-kényszerítés a Státuszok fülön ──────────────
//
// A 3 pill-választó (Elszámolási/Számlázási/TIG) eddig szabadon, bármilyen
// sorrendben kattintható volt – bármikor rá lehetett kattintani "Számlázva"-ra
// úgy, hogy előtte semmi más nem volt kipipálva. Ez a helyes viselkedés:
// egyszerre csak egyet szabad lépni előre vagy vissza a listán, a "hiba/
// javítás" ág (Javítani kell / Hiánypótlás) viszont bármikor elérhető –
// onnan pedig csak az elejére (0. vagy 1. index) lehet visszalépni, ott
// kell újraindítani a folyamatot.

function canStepAdjacent(items, backId, current, next) {
  if (next === current) return true;
  if (backId && next === backId) return true;
  const ids = items.map(i => i.id);
  const curIdx = ids.indexOf(current);
  const nextIdx = ids.indexOf(next);
  if (curIdx === -1 || nextIdx === -1) return true; // ismeretlen/legacy érték – ne blokkoljunk
  if (backId && current === backId) return nextIdx <= 1;
  return Math.abs(nextIdx - curIdx) === 1;
}

export function canSetElszamolasStatusz(current, next) {
  return canStepAdjacent(ELSZAMOLAS_STATUSZOK, "Javítani kell", current, next);
}

export function canSetTigStatusz(current, next) {
  return canStepAdjacent(TIG_STATUSZOK, "Hiánypótlás", current, next);
}

/**
 * Számlázási státusz váltás engedélyezése. A "Számlázható"-ra lépéshez a
 * valódi üzleti kapuellenőrzés (ellenorzSzamlazhatosagas) is teljesülnie
 * kell – ez a függvény már régóta létezett, csak eddig sehol nem hívta
 * senki, ezért a pill szabadon kattintható volt a mögötte álló feltételek
 * teljesülése nélkül is.
 */
export function canSetSzamlazasStatusz(current, next, szamlazhatosagGate) {
  if (next === "Számlázható" && szamlazhatosagGate && !szamlazhatosagGate.ok) return false;
  return canStepAdjacent(SZAMLAZAS_STATUSZOK, null, current, next);
}

// ─── Profit számítás ──────────────────────────────────────────

export function calcProfit(bevetel, koltseg) {
  const profit = (bevetel || 0) - (koltseg || 0);
  const pct = bevetel > 0 ? Math.round((profit / bevetel) * 100) : null;
  return { profitNetto: profit, fedezetSzazalek: pct };
}
