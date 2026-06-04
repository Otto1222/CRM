/**
 * jelenlet.service.js – Napi munkaerő jelenléti napló
 *
 * Tárolja: ki volt jelen, melyik napon, melyik csapatból, mennyit dolgozott.
 * Alapja a saját csapat és alvállalkozói munkaerőköltség számításának.
 */

const KEY = "jelenlet_naplok";

function dispatch() {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "jelenlet_naplok" } }));
}

export function loadJelenletNaplok() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function saveJelenletNaplok(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch();
}

export function getJelenletByMunkalap(munkalapId) {
  return loadJelenletNaplok().filter(j => j.munkalapId === munkalapId);
}

export function getJelenletByProjekt(projektId) {
  return loadJelenletNaplok().filter(j => j.projektId === projektId);
}

export function createJelenletBejegyzes(data) {
  const now = new Date().toISOString();
  const bej = {
    id:           `jel_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    munkalapId:   data.munkalapId || null,
    projektId:    data.projektId  || null,
    datum:        data.datum      || now.slice(0, 10),
    csapatId:     data.csapatId   || null,
    csapatNev:    data.csapatNev  || "",
    csapatTipus:  data.csapatTipus || "sajat",   // "sajat" | "alvallalkozo"
    tagId:        data.tagId      || null,
    nev:          data.nev        || "",
    szerep:       data.szerep     || "",
    ideiglenes:   data.ideiglenes || false,
    jelen:        data.jelen !== false,
    orak:         Number(data.orak)    || 8,
    napiBer:      Number(data.napiBer) || 0,
    oradij:       Number(data.oradij)  || 0,
    koltseg:      Number(data.koltseg) || 0,
    megjegyzes:   data.megjegyzes || "",
    createdAt:    now,
    updatedAt:    now,
  };
  // koltseg auto-kiszámítás ha nem adott meg
  if (!bej.koltseg) {
    bej.koltseg = calcJelenletKoltseg(bej);
  }
  saveJelenletNaplok([...loadJelenletNaplok(), bej]);
  return bej;
}

export function updateJelenletBejegyzes(id, updates) {
  const list = loadJelenletNaplok().map(j => {
    if (j.id !== id) return j;
    const updated = { ...j, ...updates, id, updatedAt: new Date().toISOString() };
    // koltseg újraszámítás ha bér változott
    if (!updates.koltseg) {
      updated.koltseg = calcJelenletKoltseg(updated);
    }
    return updated;
  });
  saveJelenletNaplok(list);
}

export function deleteJelenletBejegyzes(id) {
  saveJelenletNaplok(loadJelenletNaplok().filter(j => j.id !== id));
}

export function deleteJelenletByMunkalap(munkalapId) {
  saveJelenletNaplok(loadJelenletNaplok().filter(j => j.munkalapId !== munkalapId));
}

/**
 * Napi bér kiszámítás egy bejegyzésre
 */
export function calcJelenletKoltseg(bejegyzes) {
  if (!bejegyzes.jelen) return 0;
  if (bejegyzes.napiBer > 0) return bejegyzes.napiBer;
  if (bejegyzes.oradij > 0 && bejegyzes.orak > 0) return bejegyzes.oradij * bejegyzes.orak;
  return 0;
}

/**
 * Egy munkalaphoz kapcsolódó összes jelenléti költség
 */
export function calcOsszesMunkalapJelenletKoltseg(munkalapId) {
  return getJelenletByMunkalap(munkalapId)
    .filter(j => j.jelen)
    .reduce((sum, j) => sum + (j.koltseg || calcJelenletKoltseg(j)), 0);
}

/**
 * Saját csapat vs alvállalkozói bontás egy munkalaphoz
 */
export function calcJelenletBontas(munkalapId) {
  const naplok = getJelenletByMunkalap(munkalapId).filter(j => j.jelen);
  let sajat = 0;
  let alv   = 0;
  for (const j of naplok) {
    const kolts = j.koltseg || calcJelenletKoltseg(j);
    if (j.csapatTipus === "alvallalkozo") alv += kolts;
    else sajat += kolts;
  }
  return { sajatCsapatBer: sajat, alvallalkozoiBer: alv, osszesen: sajat + alv };
}

/**
 * Kiindulópontként inicializálja a jelenléti listát a munkalap csapatKiosztasok alapján.
 * Ha már vannak bejegyzések, nem csinálja felül.
 * @param {object} munkalap
 * @param {string} datum   YYYY-MM-DD
 * @returns {Array} javasolt bejegyzések (még nem mentve)
 */
export function buildJavasloltJelenlet(munkalap, datum) {
  const kiosztasok = munkalap?.csapatKiosztasok || [];
  if (kiosztasok.length === 0) return [];

  const javaslat = [];
  const targetDate = datum || new Date().toISOString().slice(0, 10);

  for (const kioszt of kiosztasok) {
    try {
      const tagok = JSON.parse(localStorage.getItem("csapat_tagok") || "[]")
        .filter(t => t.csapatId === kioszt.csapatId && t.aktiv !== false);

      // Csapat típusa az alap csapat listából
      const csapatRec = JSON.parse(localStorage.getItem("csapatok") || "[]")
        .find(c => c.id === kioszt.csapatId);
      const csapatTipus = csapatRec?.tipus || "sajat";

      for (const tag of tagok) {
        javaslat.push({
          munkalapId:  munkalap.id,
          projektId:   munkalap.projektId || null,
          datum:       targetDate,
          csapatId:    kioszt.csapatId,
          csapatNev:   kioszt.csapatNev || "",
          csapatTipus,
          tagId:       tag.id,
          nev:         tag.nev,
          szerep:      tag.szerep || "",
          ideiglenes:  false,
          jelen:       true,
          orak:        8,
          napiBer:     tag.napiBer || 0,
          oradij:      tag.oradij  || 0,
          koltseg:     tag.napiBer || (tag.oradij ? tag.oradij * 8 : 0),
          megjegyzes:  "",
        });
      }
    } catch {}
  }

  return javaslat;
}
