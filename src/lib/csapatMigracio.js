/**
 * csapatMigracio.js – Egyszeri, idempotens adatmigráció
 * ====================================================
 * A RÉGI "Telepítő csapatok" rendszert (telepito_csapatok / telepito_csapat_tagok)
 * átemeli az EGYSÉGES "Csapatok" rendszerbe (csapatok / csapat_tagok).
 *
 * Elv:
 *   - Soha nem töröl régi adatot (a legacy kulcsok érintetlenül maradnak fallbacknek).
 *   - Idempotens: ha már migrált (vagy nincs mit), nem csinál semmit, nem duplikál.
 *   - Név-egyezés alapján deduplikál: ha egy csapatnév már létezik az egységes
 *     rendszerben, nem hoz létre újat, csak a hiányzó tagokat fűzi hozzá.
 *
 * Migrációs jelző: localStorage "csapat_migracio_v1_kesz" = "true"
 */

const LEGACY_CS_KEY    = "telepito_csapatok";
const LEGACY_TAG_KEY   = "telepito_csapat_tagok";
const CS_KEY           = "csapatok";
const TAG_KEY          = "csapat_tagok";
const MIGRACIO_FLAG    = "csapat_migracio_v1_kesz";

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || fallback); }
  catch { return JSON.parse(fallback); }
}

function norm(v) { return String(v || "").trim().toLowerCase(); }

/**
 * Lefuttatja a migrációt, ha még nem futott le.
 * @returns {{ migralt: boolean, ujCsapatok: number, ujTagok: number }}
 */
export function migrateTelepitoCsapatok() {
  // Már lefutott → kilép
  if (localStorage.getItem(MIGRACIO_FLAG) === "true") {
    return { migralt: false, ujCsapatok: 0, ujTagok: 0 };
  }

  const legacyCsapatok = readJson(LEGACY_CS_KEY, "[]");
  const legacyTagok    = readJson(LEGACY_TAG_KEY, "[]");

  // Nincs régi adat → nincs teendő, de a jelzőt beállítjuk (idempotencia)
  if (!Array.isArray(legacyCsapatok) || legacyCsapatok.length === 0) {
    localStorage.setItem(MIGRACIO_FLAG, "true");
    return { migralt: false, ujCsapatok: 0, ujTagok: 0 };
  }

  const csapatok = readJson(CS_KEY, "[]");
  const tagok    = readJson(TAG_KEY, "[]");

  let ujCsapatok = 0;
  let ujTagok    = 0;
  const now = new Date().toISOString();

  // Régi csapat ID → egységes csapat ID megfeleltetés (tagokhoz)
  const idMap = {};

  legacyCsapatok.forEach(legacyCs => {
    const legacyNev = String(legacyCs.nev || "").trim();
    if (!legacyNev) return;

    // Van-e már ilyen nevű csapat az egységes rendszerben?
    let ujCs = csapatok.find(c => norm(c.nev) === norm(legacyNev));

    if (!ujCs) {
      ujCs = {
        id:               `cs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        nev:              legacyNev,
        tipus:            "sajat",
        telephely:        "",
        szin:             "#2563EB",
        tagok:            [],
        tagNevek:         [],
        kapacitas:        2,
        hetvegen:         false,
        munkatipusok:     [],
        aktiv:            legacyCs.aktiv !== false,
        elszamolasAktiv:  false,
        elszamolasInfo:   "",
        dijTipus:         "fix",
        dijOsszeg:        0,
        dijEgysegAr:      0,
        kmElszamolasAktiv:false,
        kmDijFtKm:        0,
        kmKuszobKm:       0,
        createdAt:        legacyCs.createdAt || now,
        updatedAt:        now,
        createdBy:        "migracio",
        migraltLegacyId:  legacyCs.id || null,
      };
      csapatok.push(ujCs);
      ujCsapatok++;
    }

    idMap[legacyCs.id] = ujCs.id;
  });

  // Tagok átemelése – dedup csapaton belül (név alapján)
  legacyTagok.forEach(legacyTag => {
    const ujCsapatId = idMap[legacyTag.csapatId];
    if (!ujCsapatId) return; // árva tag, nincs hozzá csapat

    const tagNev = String(legacyTag.nev || "").trim();
    if (!tagNev) return;

    const marLetezik = tagok.some(
      t => t.csapatId === ujCsapatId && norm(t.nev) === norm(tagNev)
    );
    if (marLetezik) return;

    tagok.push({
      id:        `ctag_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      csapatId:  ujCsapatId,
      nev:       tagNev,
      szerep:    "Telepítő",
      napiBer:   0,
      oradij:    0,
      aktiv:     legacyTag.aktiv !== false,
      createdAt: legacyTag.createdAt || now,
      updatedAt: now,
      migraltLegacyId: legacyTag.id || null,
    });
    ujTagok++;
  });

  // Mentés csak ha volt változás
  if (ujCsapatok > 0) localStorage.setItem(CS_KEY, JSON.stringify(csapatok));
  if (ujTagok > 0)    localStorage.setItem(TAG_KEY, JSON.stringify(tagok));

  localStorage.setItem(MIGRACIO_FLAG, "true");

  // Értesítés a UI-nak
  try {
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "csapatok" } }));
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "csapat_tagok" } }));
  } catch {}

  return { migralt: ujCsapatok > 0 || ujTagok > 0, ujCsapatok, ujTagok };
}
