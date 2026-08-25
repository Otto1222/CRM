/**
 * workflowRules.js
 * Projekt ↔ Munkalap workflow – egyetlen forrás az egész rendszerben.
 * Minden státusz, forrás, validáció, jogosultság innen jön.
 */

// ─── Projekt státuszok (8 db) ─────────────────────────────────────────────

export const PROJEKT_STATUSZOK = [
  { id: "Létrehozva",        szin: "#64748B", bg: "#F8FAFC" },
  { id: "Kivitelezésre vár", szin: "#EA580C", bg: "#FFF7ED" },
  { id: "Kivitelezés alatt", szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Vissza kell menni", szin: "#B45309", bg: "#FFFBEB" },
  { id: "Készre jelentve",   szin: "#0891B2", bg: "#ECFEFF" },
  { id: "TIG-re vár",        szin: "#8B5CF6", bg: "#F5F3FF" },
  { id: "Számlázható",       szin: "#15803D", bg: "#F0FDF4" },
  { id: "Lezárt",            szin: "#475569", bg: "#F1F5F9" },
];

// ─── Munkalap státuszok (6 db) ────────────────────────────────────────────
// Részben kész + Sikertelen → kötelező indoklás

export const MUNKALAP_STATUSZOK = [
  { id: "Létrehozva",   szin: "#64748B", bg: "#F8FAFC" },
  { id: "Kiadva",       szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Folyamatban",  szin: "#D97706", bg: "#FFFBEB" },
  { id: "Részben kész", szin: "#7C3AED", bg: "#F5F3FF", indoklas: true },
  { id: "Lezárva",      szin: "#059669", bg: "#ECFDF5" },
  { id: "Sikertelen",   szin: "#DC2626", bg: "#FEF2F2", indoklas: true },
];

// ─── Munkalap workflow – a VALÓDI, ténylegesen használt út ────────────────
//
// A fenti MUNKALAP_STATUSZOK (6 db) sosem felelt meg a valóságnak – egyetlen
// oldal sem ezt a szótárt írja (ld. constants.js STATUS_CFG, ami a tényleges,
// ~19 elemű, részben szinonim szótár). Ez itt az az EGYETLEN hely, ami
// eldönti, milyen sorrendben haladhat egy munkalap – minden felület (Munkalapok
// admin-nézet, Kivitelező felület, Dashboard összesítő) innen veszi át, hogy
// ne legyen 3 különböző, egymásnak ellentmondó lépésrend a rendszerben.
//
// Két külön útvonal van:
//   - felmérés-típusú munkalap: Felmérés → Befejezett Felmérés
//   - minden más (kivitelezés) típusú munkalap: Létrehozva → … → Számlázva
// "Meghiúsult" mindkét útvonalon bármikor elérhető vészág – onnan viszont
// csak az útvonal elejére (0. vagy 1. lépés) lehet visszatérni.

export const MUNKALAP_MEGHIUSULT = "Meghiúsult";

export const MUNKALAP_FELMERES_UTVONAL = [
  { id: "Felmérés",            aliases: [] },
  { id: "Befejezett Felmérés", aliases: [] },
];

export const MUNKALAP_FO_UTVONAL = [
  { id: "Létrehozva",       aliases: [] },
  { id: "Kiosztásra vár",   aliases: ["Kiosztva csapatnak", "Megkezdésre Vár", "Kivitelezésre vár", "Ütemezett"] },
  { id: "Folyamatban",      aliases: ["Kivitelezés"] },
  { id: "Ellenőrzés alatt", aliases: ["Helyszínen lezárva"] },
  { id: "Jóváhagyva",       aliases: [] },
  { id: "Számlázásra kész", aliases: ["Kész"] },
  { id: "Lezárva",          aliases: [] },
  { id: "Számlázva",        aliases: [] },
];

/** Melyik útvonalon halad egy adott munkalap, a típusa alapján. */
export function getMunkalapUtvonal(munkalap) {
  const tipus = munkalap?.tipus || munkalap?.munkalapTipus || "";
  return tipus === "Felmérés" ? MUNKALAP_FELMERES_UTVONAL : MUNKALAP_FO_UTVONAL;
}

function findMunkalapLepesIndex(utvonal, status) {
  return utvonal.findIndex(l => l.id === status || l.aliases.includes(status));
}

/**
 * Engedélyezett-e a currentStatus → nextStatus váltás egy adott munkalapon.
 * Csak a szomszédos lépésre lehet lépni (előre, vagy vissza egy tévedés
 * javításához) – 2+ lépést átugrani nem lehet. "Meghiúsult" bármikor
 * elérhető, onnan pedig csak az útvonal elejére lehet visszatérni.
 */
export function canSetMunkalapStatus(munkalap, currentStatus, nextStatus) {
  if (nextStatus === currentStatus) return true;
  if (nextStatus === MUNKALAP_MEGHIUSULT) return true;
  const utvonal = getMunkalapUtvonal(munkalap);
  if (currentStatus === MUNKALAP_MEGHIUSULT) {
    const nextIdx = findMunkalapLepesIndex(utvonal, nextStatus);
    return nextIdx >= 0 && nextIdx <= 1;
  }
  const curIdx  = findMunkalapLepesIndex(utvonal, currentStatus);
  const nextIdx = findMunkalapLepesIndex(utvonal, nextStatus);
  if (curIdx === -1 || nextIdx === -1) return true; // ismeretlen/legacy érték – ne blokkoljunk
  return Math.abs(nextIdx - curIdx) === 1;
}

// ─── Projekt forrás (3 db) ────────────────────────────────────────────────

// P0-007: "sajat_ajanlat" (id NEM változott – a meglévő logika/adatok
// nagy része erre az id-re épül) mostantól "Saját munka" néven fut, mert
// két alfajtát fed le: a régi "ajánlat a mérvadó" folyamatot ÉS az új,
// "elfogadott tételes Excel a mérvadó" folyamatot (ld. projekt.sajatMunkaTipus:
// "ajanlat" | "tetelesExcel"). Az id-t szándékosan nem módosítottam, hogy a
// projekt.forrás === "sajat_ajanlat" ellenőrzések a kódban (kb. 30 helyen)
// mindkét alfajtára helyesen, változtatás nélkül érvényesek maradjanak.
export const PROJEKT_FORRAS = [
  {
    id: "sajat_ajanlat",
    label: "Saját munka",
    color: "#2563EB", bg: "#EFF6FF",
    desc: "Saját értékesítés – ajánlat vagy elfogadott tételes Excel alapján, ügyfél kötelező",
  },
  {
    id: "fovallalkozoi_munka",
    label: "Fővállalkozói munka",
    color: "#7C3AED", bg: "#F5F3FF",
    desc: "Fővállalkozói megbízás – külső munkaszám és elszámolási szabály kötelező",
  },
  {
    id: "belso_munka",
    label: "Belső munka",
    color: "#059669", bg: "#ECFDF5",
    desc: "Garancia, javítás, karbantartás – megrendelő: E.D.I. Solutions Kft.",
  },
];

// ─── Anyagelszámolási mód (D1) ────────────────────────────────────────────
// FONTOS: NINCS automatikus default! Ha a rendszer "SAJAT_ANYAG_PROFIT"-ot
// adna alapértékként, az fővállalkozói munkánál téves profitot számolna –
// pénzügyi szempontból súlyos hiba. Ezért a projekt csak akkor léphet
// kivitelezési / aktív státuszba, ha a mód kifejezetten ki lett választva.

export const ANYAGELSZAMOLAS_NINCS_KIVALASZTVA = "NINCS_KIVALASZTVA";

// A 3 érvényes mód azonosítója – innen veszi át minden modul, hogy ne
// szóródjanak szét "mágikus" string-konstansok (Fázis 5B P0-1 javítás).
export const ANYAGELSZAMOLASI_MOD_SAJAT_ANYAG_PROFIT = "SAJAT_ANYAG_PROFIT";
export const ANYAGELSZAMOLASI_MOD_FOVALLALKOZO_HOZOTT_ANYAG = "FOVALLALKOZO_HOZOTT_ANYAG";
export const ANYAGELSZAMOLASI_MOD_FOVALLALKOZO_NULLAS_TOVABBSZAMLAZAS = "FOVALLALKOZO_NULLAS_TOVABBSZAMLAZAS";

export const ANYAGELSZAMOLASI_MODOK = [
  {
    id: ANYAGELSZAMOLASI_MOD_SAJAT_ANYAG_PROFIT,
    label: "Saját anyag profit számítással",
    color: "#2563EB", bg: "#EFF6FF",
    desc: "Mi vesszük az anyagot, mi adjuk el – anyaghaszon ÉS munkadíj-haszon is van",
  },
  {
    id: ANYAGELSZAMOLASI_MOD_FOVALLALKOZO_HOZOTT_ANYAG,
    label: "Fővállalkozói hozott anyag",
    color: "#7C3AED", bg: "#F5F3FF",
    desc: "A fővállalkozó adja az anyagot, csak darabszám / mennyiség elszámolás – nincs anyaghaszon, munkadíj-haszon van",
  },
  {
    id: ANYAGELSZAMOLASI_MOD_FOVALLALKOZO_NULLAS_TOVABBSZAMLAZAS,
    label: "Fővállalkozói nullás továbbszámlázás",
    color: "#D97706", bg: "#FFFBEB",
    desc: "A fővállalkozótól fix áron vesszük, ugyanannyiért számlázzuk tovább – anyaghaszon 0 Ft, munkadíj-haszon van",
  },
];

// ─── Fázis 5B – mód-vezérelt UI- és pénzügyi viselkedés (P0-1 javítás) ────
// Az anyagelszámolási mód itt dől el, hogy a Kivitelezési Csomagban és a
// pénzügyi előkészítésben milyen logika fusson – nem csak megjelenő UI-mező.

/** Igaz, ha az adott módban a tételeknél árat/profitot kell mutatni a PM/Adminnak. */
export function anyagArakLathatokAModban(mod) {
  return mod === ANYAGELSZAMOLASI_MOD_SAJAT_ANYAG_PROFIT
      || mod === ANYAGELSZAMOLASI_MOD_FOVALLALKOZO_NULLAS_TOVABBSZAMLAZAS;
}

/** Igaz, ha az adott módban anyaghaszont kell számolni (nem 0 a definíció szerint). */
export function anyagHasznotKellSzamolniAModban(mod) {
  return mod === ANYAGELSZAMOLASI_MOD_SAJAT_ANYAG_PROFIT;
}

/** Igaz, ha az adott módban a tételek csak mennyiségi elszámolásra szolgálnak (ár/profit nélkül). */
export function csakMennyisegiElszamolasAModban(mod) {
  return mod === ANYAGELSZAMOLASI_MOD_FOVALLALKOZO_HOZOTT_ANYAG;
}

/**
 * Anyaghaszon számítása a kivitelezési csomag tételein, az anyagelszámolási
 * mód szerint vezérelve – ez akadályozza meg, hogy a rendszer fővállalkozói
 * hozott anyagra vagy nullás továbbszámlázásra véletlenül anyagprofitot
 * számoljon (Fázis 5B P0-1 javítás).
 *
 *   SAJAT_ANYAG_PROFIT                  → Σ(eladási ár × felhasznált) − Σ(beszerzési ár × felhasznált)
 *   FOVALLALKOZO_HOZOTT_ANYAG           → 0 (a fővállalkozó adja az anyagot, nincs anyaghaszon)
 *   FOVALLALKOZO_NULLAS_TOVABBSZAMLAZAS → 0 (fix áron vesszük, ugyanannyiért adjuk tovább)
 *
 * A pénzügyi motorok konszolidációja külön fázis – ez csak az előkészítő
 * helper, amit a P0-1 javítás minimálisan és biztonságosan beköt.
 */
export function calculateAnyagProfitByMod(csomag, anyagelszamolasiMod) {
  if (!anyagHasznotKellSzamolniAModban(anyagelszamolasiMod)) return 0;

  const tetelek = Array.isArray(csomag?.tetelek) ? csomag.tetelek : [];
  return tetelek.reduce((osszeg, tetel) => {
    const mennyiseg   = Number(tetel?.felhasznaltMennyiseg)        || 0;
    const eladasiAr   = Number(tetel?.egysegarPillanatkepEladasi)   || 0;
    const beszerzesiAr = Number(tetel?.egysegarPillanatkepBeszerzesi) || 0;
    return osszeg + (eladasiAr - beszerzesiAr) * mennyiseg;
  }, 0);
}

/**
 * Azon "forrás" értékeknél, ahol az anyagelszámolási mód egyértelműen levezethető
 * magából a forrásból, biztonságosan automatikusan beállítható – admin
 * felülvizsgálat nélkül. Fővállalkozói munkánál (és minden más/ismeretlen
 * forrásnál) NINCS automatikus mód (lásd a fájl elején lévő FONTOS megjegyzést),
 * azt mindig kézzel kell kiválasztani.
 *
 * Ez a leképezés a ProjektForm forrás-választó gombjainak onClick logikájával
 * azonos – közös helyre emelve, hogy a form induló állapotában (előre
 * beállított forrással megnyitva, pl. a Projektek oldal "Belső munka" /
 * "Fővállalkozói" gombjairól) és kézi átváltáskor is ugyanazt eredményezze.
 */
export function getAutoAnyagelszamolasiMod(forrás) {
  if (forrás === "belso_munka")   return ANYAGELSZAMOLASI_MOD_FOVALLALKOZO_HOZOTT_ANYAG;
  if (forrás === "sajat_ajanlat") return ANYAGELSZAMOLASI_MOD_SAJAT_ANYAG_PROFIT;
  return null;
}

export function getAnyagelszamolasiModConfig(modId) {
  if (!modId || modId === ANYAGELSZAMOLAS_NINCS_KIVALASZTVA) {
    return { color: "#DC2626", bg: "#FEF2F2", label: "⚠ Nincs kiválasztva – kötelező megadni" };
  }
  return ANYAGELSZAMOLASI_MODOK.find(m => m.id === modId) || { color: "#64748B", bg: "#F8FAFC", label: modId };
}

/** Igaz, ha a projektnek érvényes (ténylegesen kiválasztott) anyagelszámolási módja van. */
export function hasAnyagelszamolasiMod(projekt) {
  return !!projekt?.anyagelszamolasiMod && projekt.anyagelszamolasiMod !== ANYAGELSZAMOLAS_NINCS_KIVALASZTVA;
}

/**
 * Migráció: a meglévő (anyagelszámolási mód nélküli) projektrekordok NEM
 * kaphatnak automatikus módot – ehelyett NINCS_KIVALASZTVA + admin
 * felülvizsgálati jelző, hogy az admin/PM kézzel sorolja be őket.
 */
export function migrateAnyagelszamolasiMod(projekt) {
  if (hasAnyagelszamolasiMod(projekt)) {
    return { anyagelszamolasiMod: projekt.anyagelszamolasiMod, adminReviewRequired: !!projekt.adminReviewRequired };
  }
  return { anyagelszamolasiMod: ANYAGELSZAMOLAS_NINCS_KIVALASZTVA, adminReviewRequired: true };
}

// Azok a projekt-státuszok, amelyekbe a projekt csak akkor léphet át,
// ha az anyagelszámolási mód már ki van választva ("Létrehozva" a kivétel).
export const ANYAGELSZAMOLAS_KOTELEZO_STATUSOK = PROJEKT_STATUSZOK
  .map(s => s.id)
  .filter(id => id !== "Létrehozva");

export function validateAnyagelszamolasiModStatusValtas(projekt, ujStatus) {
  if (!ANYAGELSZAMOLAS_KOTELEZO_STATUSOK.includes(ujStatus)) return { ok: true, message: "" };
  if (!hasAnyagelszamolasiMod(projekt)) {
    return { ok: false, message: "A projekt nem léphet aktív / kivitelezési státuszba, amíg az anyagelszámolási mód nincs kiválasztva." };
  }
  return { ok: true, message: "" };
}

// ─── Munkalap típusok (garancia/javítás = munkalap típus, nem forrás) ─────

export const MUNKALAP_TIPUSOK = [
  "Kivitelezés",
  "Garanciális",
  "Javítás",
  "Karbantartás",
  "Szerviz",
  "Felmérés",
  "Egyéb",
];

// ─── Munkalap → Projekt státusz automata frissítés ───────────────────────

export const WORKORDER_TO_PROJECT_STATUS = {
  "Folyamatban":  "Kivitelezés alatt",
  "Lezárva":      "Készre jelentve",
  "Részben kész": "Vissza kell menni",
  "Sikertelen":   "Vissza kell menni",
};

// ─── Telepítőnek látható munkalap státuszok ───────────────────────────────

export const WORKORDER_STATUSES_VISIBLE_TO_INSTALLER = [
  "Létrehozva", "Kiadva", "Folyamatban", "Részben kész",
];

export const WORKORDER_STATUSES_HIDDEN_FROM_INSTALLER = [
  "Lezárva", "Sikertelen", "Ellenőrzés alatt",
  "Befejezett", "Meghiúsult", "Számlázva", "Befejezett Felmérés",
];

export const INSTALLER_SETTABLE_STATUSES = [
  "Folyamatban", "Részben kész", "Lezárva", "Sikertelen",
];

export const PROJECT_CLOSE_ROLES = ["Admin", "Projektmenedzser"];

// ─── Backward compat – régi értékek migrálása ────────────────────────────

export const LEGACY_PROJEKT_STATUS_MAP = {
  "Felmérésre vár":             "Létrehozva",
  "Felmérve":                   "Kivitelezésre vár",
  "Ajánlat kiküldve":           "Kivitelezésre vár",
  "Elfogadva":                  "Kivitelezésre vár",
  "Elkészült":                  "Készre jelentve",
  "Ellenőrzésre vár":           "TIG-re vár",
  "Hiánypótlás":                "Vissza kell menni",
  "Ellenőrizve minden rendben": "TIG-re vár",
  "Leszámlázva":                "Számlázható",
  "Kifizetve":                  "Számlázható",
  "Lezárva":                    "Lezárt",
  "Felfüggesztve":              "Vissza kell menni",
  "Elbukott Projekt":           "Lezárt",
};

// Csak az egyértelmű 1:1 átnevezések szerepelnek itt.
// Garanciális / javítási NEM kerül ide – azok adatfüggő migrációt igényelnek.
export const LEGACY_FORRAS_MAP = {
  "saját_ügyfél":  "sajat_ajanlat",
  "fővállalkozói": "fovallalkozoi_munka",
};

export const LEGACY_MUNKALAP_STATUS_MAP = {
  "Kiosztásra vár": "Létrehozva",
  "Elkészült":      "Lezárva",
  "Befejezve":      "Lezárva",
  "Kész":           "Lezárva",
  "Meghiúsult":     "Sikertelen",
};

// ─── Konfig keresők ───────────────────────────────────────────────────────

export function getProjektStatusConfig(statusId) {
  return PROJEKT_STATUSZOK.find(s => s.id === statusId) || { szin: "#64748B", bg: "#F8FAFC" };
}

export function getMunkalapStatusConfig(statusId) {
  return MUNKALAP_STATUSZOK.find(s => s.id === statusId) || { szin: "#64748B", bg: "#F8FAFC" };
}

// Speciális jelölő: a migráció nem tudott biztosan dönteni – adminnak kell tisztázni
export const FORRAS_ELLENORZES_SZUKSEGES = "ellenorzes_szukseges";

export function getProjektForrasConfig(forrasId) {
  if (forrasId === FORRAS_ELLENORZES_SZUKSEGES) {
    return { color: "#DC2626", bg: "#FEF2F2", label: "⚠ Ellenőrzés szükséges" };
  }
  return PROJEKT_FORRAS.find(f => f.id === forrasId) || { color: "#64748B", bg: "#F8FAFC", label: forrasId };
}

// ─── Segédfüggvények ─────────────────────────────────────────────────────

export function munkalapIndoklasKotelezo(status) {
  return !!(MUNKALAP_STATUSZOK.find(s => s.id === status)?.indoklas);
}

export function getProjectStatusFromWorkorder(workorderStatus) {
  return WORKORDER_TO_PROJECT_STATUS[workorderStatus] || null;
}

export function canInstallerSetStatus(status) {
  return INSTALLER_SETTABLE_STATUSES.includes(status);
}

export function canCloseProject(userRole) {
  return PROJECT_CLOSE_ROLES.includes(userRole);
}

export function getProjektTipus(forras) {
  return PROJEKT_FORRAS.find(f => f.id === forras)?.label
    || (forras === "saját_ügyfél"  ? "Saját projekt"
      : forras === "fővállalkozói" ? "Fővállalkozói projekt"
      : "Egyéb");
}

export function migrateProjektStatus(status) {
  if (!status) return "Létrehozva";
  return LEGACY_PROJEKT_STATUS_MAP[status] || status;
}

// Egyszerű string-szintű migráció (csak 1:1 esetekre).
// Garanciális / javítási esetén ezt NE hívd – használd migrateProjektForrasFromRekord-ot.
export function migrateProjektForras(forras) {
  return LEGACY_FORRAS_MAP[forras] || forras;
}

/**
 * Adatvesztés nélküli migráció garanciális / javítási projekteknél.
 *
 * Döntési fa:
 *   1. penzugy.fovallalkoziId van → fovallalkozoi_munka           (erős jel)
 *   2. ajanlatId VAGY clientId van → sajat_ajanlat                 (erős jel)
 *   3. nincs clientNev, vagy clientNev = "E.D.I. Solutions Kft." → belso_munka (egyértelmű belső)
 *   4. van clientNev, de nincs strukturált hivatkozás → ellenorzes_szukseges   (bizonytalan!)
 *
 * A bizonytalan rekord adminnak kell kézzel besorolni –
 * jobban adatvesztés megakadályozni, mint félremigrálni.
 */
export function migrateProjektForrasFromRekord(projekt) {
  const { forrás, ajanlatId, clientId, penzugy, clientNev } = projekt;

  // Már új formátumú forrás (beleértve az ellenorzes_szukseges-t) → nincs teendő
  const ujForrasok = ["sajat_ajanlat", "fovallalkozoi_munka", "belso_munka", FORRAS_ELLENORZES_SZUKSEGES];
  if (ujForrasok.includes(forrás)) return forrás;

  // Egyszerű 1:1 átnevezések
  if (LEGACY_FORRAS_MAP[forrás]) return LEGACY_FORRAS_MAP[forrás];

  // Adatfüggő migráció garanciális / javítási esetén
  if (forrás === "garanciális" || forrás === "javítási") {
    // 1. Erős jel: fővállalkozói kapcsolat
    if (penzugy?.fovallalkoziId || projekt.fovallalkoziId) return "fovallalkozoi_munka";

    // 2. Erős jel: strukturált CRM hivatkozás
    if (ajanlatId || clientId) return "sajat_ajanlat";

    // 3. Egyértelmű belső: kizárólag explicit E.D.I. megrendelő esetén
    const nev = String(clientNev || "").trim();
    if (nev === "E.D.I. Solutions Kft." || nev === "EDI Solutions" || nev === "E.D.I.") {
      return "belso_munka";
    }

    // 4. Minden más eset bizonytalan (üres név = lehetséges adatvesztés is)
    return FORRAS_ELLENORZES_SZUKSEGES;
  }

  // Ismeretlen forrás → érintetlen marad
  return forrás;
}

/** Visszaadja, hogy egy projektnek szüksége van-e adminellenőrzésre a forrás miatt. */
export function projektEllenorzesKell(projekt) {
  return projekt?.forrás === FORRAS_ELLENORZES_SZUKSEGES;
}

export function migrateMunkalapStatus(status) {
  return LEGACY_MUNKALAP_STATUS_MAP[status] || status;
}

// ─── Telepítői láthatóság (backward compat: (workorder, currentUser) szignatúra) ────

function norm(v) { return String(v || "").trim().toLowerCase(); }

export function isWorkorderAssignedToUser(workorder, currentUser) {
  if (!workorder || !currentUser) return false;
  const userId   = norm(currentUser.id);
  const userName = norm(currentUser.name);
  if (userId   && (norm(workorder.assigneeId) === userId   || norm(workorder.csapatId)  === userId))   return true;
  if (userName && (norm(workorder.assigneeNev) === userName || norm(workorder.csapatNev) === userName)) return true;
  const csapatIdToCheck = norm(workorder.csapatId) || norm(workorder.assigneeId);
  if (csapatIdToCheck) {
    try {
      const csapatok = JSON.parse(localStorage.getItem("csapatok") || "[]");
      const cs = csapatok.find(c => norm(c.id) === csapatIdToCheck);
      if (cs) {
        if (userId   && (cs.tagok    || []).some(t => norm(t) === userId))   return true;
        if (userName && (cs.tagNevek || []).some(t => norm(t) === userName)) return true;
      }
    } catch { /* ok */ }
  }
  return false;
}

export function isInstallerVisibleWorkorder(workorder, currentUser) {
  if (!workorder || !currentUser) return false;
  if (!isWorkorderAssignedToUser(workorder, currentUser)) return false;
  if (WORKORDER_STATUSES_HIDDEN_FROM_INSTALLER.includes(workorder.status)) return false;
  return true;
}

// ─── Validáció ────────────────────────────────────────────────────────────

export function validateProjektForrás(form) {
  const { forrás, ajanlatId, penzugy, kulsoAzonosito, projektvezetoId, csapatId } = form;
  if (!forrás) return { ok: false, message: "A projekt forrásának megadása kötelező." };
  // D1 megjegyzés: az anyagelszámolási mód kötelező-választás validációja a
  // mezőt megjelenítő UI-val EGYÜTT kerül bekötésre (következő fázis) –
  // ld. validateAnyagelszamolasiModStatusValtas() a workflowRules.js-ben.

  if (forrás === "sajat_ajanlat") {
    // P0-007: "Saját munka" két alfajtát fed le – a mérvadó forrás vagy egy
    // elfogadott ajánlat, vagy egy elfogadott tételes Excel. Régi projekteknél
    // (sajatMunkaTipus még nincs kitöltve) az ajánlat-ág marad az elvárás,
    // ez a korábbi, változatlan viselkedés.
    if (form.sajatMunkaTipus === "tetelesExcel") {
      if (!form.elfogadottExcelPillanatkep) return { ok: false, message: "Saját munkánál (elfogadott tételes Excel) kötelező a tételes Excel importálása." };
    } else {
      if (!ajanlatId) return { ok: false, message: "Saját munkánál (ajánlat alapján) kötelező elfogadott ajánlatot kiválasztani." };
    }
    if (!form.clientNev?.trim()) return { ok: false, message: "Az ügyfél neve kötelező." };
  }

  if (forrás === "fovallalkozoi_munka") {
    if (!penzugy?.fovallalkoziId)       return { ok: false, message: "Fővállalkozói munkánál a fővállalkozó kiválasztása kötelező." };
    if (!kulsoAzonosito?.trim())         return { ok: false, message: "Fővállalkozói munkánál a külső munkaszám megadása kötelező." };
    // P0-013: a Projektvezető és a Kivitelező csapat közvetlenül a
    // km- és csapatbér-számítást hajtja – enélkül a kalkuláció hiányos
    // vagy hibás lenne, ezért kötelezővé tettük (nem csak "ajánlott").
    if (!projektvezetoId)                return { ok: false, message: "Fővállalkozói munkánál a projektvezető kiválasztása kötelező." };
    if (!csapatId)                       return { ok: false, message: "Fővállalkozói munkánál a kivitelező csapat kiválasztása kötelező." };
    // A bevétel forrása KETTŐ közül az egyik lehet: vagy a díjtábla-katalógusból
    // összeállított tétel-kosár (ld. DijtetelKosarPicker), vagy a régi,
    // munkatípus-alapú elszámolási szabály – legalább az egyiknek meg kell lennie.
    const vanTetelKosar = Array.isArray(penzugy?.dijtablaTetelek) && penzugy.dijtablaTetelek.length > 0;
    if (!vanTetelKosar && !penzugy?.elszamolasiSzabalyId) {
      return { ok: false, message: "Fővállalkozói munkánál kötelező vagy tételeket választani a díjtáblából, vagy elszámolási szabályt beállítani. (Beállítások → Fővállalkozók)" };
    }
  }

  return { ok: true, message: "" };
}

export function validateWorkorderBeforeSave(workorder) {
  const { status, indoklas } = workorder;
  if (munkalapIndoklasKotelezo(status) && !String(indoklas || "").trim()) {
    return { ok: false, message: `"${status}" státusznál kötelező az indoklás megadása.` };
  }
  return { ok: true, message: "" };
}
