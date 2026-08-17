/**
 * raktarMozgas.js – Raktárkészlet mozgásnapló (Fázis 6C).
 *
 * Minden készletet érintő eseményt append-only rögzít: hova (projekt /
 * munkalap / csapat), mennyi, mikor, és melyik felhasználó adta ki / vette
 * be. A tényleges készletszámot az anyagtorzs.js "keszlet" mezője tárolja
 * (ld. adjustAnyagKeszlet) – ez a napló csak a TÖRTÉNET, sosem a jelenlegi
 * állapot forrása.
 *
 * localStorage kulcs: "raktar_mozgasok"
 */

const KEY = "raktar_mozgasok";

const dispatch = () =>
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: KEY } }));

export const RAKTAR_MOZGAS_TIPUSOK = {
  KIADAS:         "KIADAS",          // csapatnak kiadva (munkakiosztás) – készlet csökken
  KIADAS_KOREKCIO:"KIADAS_KOREKCIO", // korábbi kiadás utólagos csökkentése – készlet nő
  BEVETELEZES:    "BEVETELEZES",     // beszerzés / kézi feltöltés – készlet nő
  KOREKCIO:       "KOREKCIO",        // kézi leltár-korrekció (bármelyik irányban)
};

export function loadRaktarMozgasok() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveRaktarMozgasok(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch();
}

/**
 * @param {object} mozgas { anyagtorzsId, anyagNev, egyseg, mennyiseg (előjeles –
 *   pozitív: készletcsökkenés/kiadás, negatív: készletnövekedés/bevétel –
 *   ld. hívók), tipus, projektId, munkalapId, csapatId, felhasznaloNev,
 *   datum, megjegyzes }
 */
export function addRaktarMozgas(mozgas) {
  const rec = {
    id:             `rm_${crypto.randomUUID()}`,
    anyagtorzsId:   mozgas.anyagtorzsId || "",
    anyagNev:       mozgas.anyagNev || "",
    egyseg:         mozgas.egyseg || "db",
    mennyiseg:      Number(mozgas.mennyiseg) || 0,
    tipus:          mozgas.tipus || RAKTAR_MOZGAS_TIPUSOK.KOREKCIO,
    projektId:      mozgas.projektId || null,
    munkalapId:     mozgas.munkalapId || null,
    csapatId:       mozgas.csapatId || null,
    felhasznaloNev: mozgas.felhasznaloNev || "",
    datum:          mozgas.datum || new Date().toISOString(),
    megjegyzes:      mozgas.megjegyzes || "",
  };
  saveRaktarMozgasok([...loadRaktarMozgasok(), rec]);
  return rec;
}

export function getRaktarMozgasokByAnyag(anyagtorzsId) {
  return loadRaktarMozgasok()
    .filter(m => m.anyagtorzsId === anyagtorzsId)
    .sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
}

export function getRaktarMozgasokRendezve() {
  return [...loadRaktarMozgasok()].sort((a, b) => (b.datum || "").localeCompare(a.datum || ""));
}
