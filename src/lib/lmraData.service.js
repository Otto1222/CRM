/**
 * lmraData.service.js
 * Teljes LMRA adatkezelés – kockázatok, aláírások, telepítő csapatok, PDF export.
 *
 * Adatmodell (localStorage):
 *   lmra_rec_{munkalapId}   – LMRA rekord per munkalap
 *   telepito_csapatok       – Telepítő csapatok lista
 *   telepito_csapat_tagok   – Telepítő csapat tagok
 */

import { LMRA_KOCKAZATOK } from "./lmraService.js";
import { driveSave } from "./driveApi.js";
import { createCsapatTag, getAktivCsapatTagok } from "../modules/csapatok/csapat.service.js";

const LMRA_REC_KEY        = id => `lmra_rec_${id}`;
const TELEPITO_CS_KEY     = "telepito_csapatok";
const TELEPITO_TAGOK_KEY  = "telepito_csapat_tagok";

function dispatch(col) {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: col } }));
}

// ─── LMRA státusz config ──────────────────────────────────────

export const LMRA_STATUS_LABELS = {
  nincs:       "Nincs előkészítve",
  draft:       "Vázlat",
  elokeszitve: "Előkészítve",
  alairas_var: "Aláírásra vár",
  alairva:     "Aláírva",
  exportalva:  "Exportálva",
  ujranyitva:  "Újranyitva",
};

export const LMRA_STATUS_COLORS = {
  nincs:       "#94A3B8",
  draft:       "#D97706",
  elokeszitve: "#2563EB",
  alairas_var: "#EA580C",
  alairva:     "#059669",
  exportalva:  "#7C3AED",
  ujranyitva:  "#DC2626",
};

// ─── LMRA Rekord (per munkalap) ───────────────────────────────

export function loadLmraRec(munkalapId) {
  try { return JSON.parse(localStorage.getItem(LMRA_REC_KEY(munkalapId)) || "null"); }
  catch { return null; }
}

export function saveLmraRec(munkalapId, rec) {
  const updated = { ...rec, updatedAt: new Date().toISOString() };
  localStorage.setItem(LMRA_REC_KEY(munkalapId), JSON.stringify(updated));
  driveSave(`lmra_${munkalapId}`, { lmra: updated })
    .then(res => { if (!res.ok && !res.offline) console.warn("[LMRA Drive]", res.error); })
    .catch(e => console.warn("[LMRA Drive]", e));
  dispatch("lmra");
}

export function getLmraStatus(munkalapId) {
  const rec = loadLmraRec(munkalapId);
  if (!rec) {
    // Backward compat: régi lmra_${id} kulcsból
    try {
      const legacy = JSON.parse(localStorage.getItem(`lmra_${munkalapId}`) || "null");
      if (legacy) return "alairva";
    } catch {}
    return "nincs";
  }
  return rec.status || "draft";
}

export function buildDefaultKockazatok() {
  return LMRA_KOCKAZATOK.map(k => ({
    id: k.id,
    szoveg: k.szoveg,
    kivalasztva: false,
    megelozoIntezkedes: "",
    egyedi: false,
  }));
}

export function initOrLoadLmraRec(munkalapId, projektId) {
  const existing = loadLmraRec(munkalapId);
  if (existing) return existing;
  const now = new Date().toISOString();
  return {
    id:              `lmra_${munkalapId}`,
    munkalapId,
    projektId:       projektId || null,
    kockazatok:      buildDefaultKockazatok(),
    status:          "draft",
    elokeszitette:   null,
    elokeszitveAt:   null,
    lockedForInstaller: false,
    resztvevok:      [],
    lezarvaAt:       null,
    lezartaBy:       null,
    exportok:        [],
    createdAt:       now,
    updatedAt:       now,
  };
}

// PM/Admin: kockázatok mentése
export function savePmLmra(munkalapId, projektId, kockazatok, userName) {
  const existing = loadLmraRec(munkalapId) || initOrLoadLmraRec(munkalapId, projektId);
  const updated = {
    ...existing,
    kockazatok,
    status: existing.status === "nincs" || !existing.status ? "draft" : existing.status,
    updatedAt: new Date().toISOString(),
  };
  saveLmraRec(munkalapId, updated);
  return updated;
}

// PM/Admin: lezárás → Telepítő csak olvashatja a kockázatokat
export function lockLmraForInstaller(munkalapId, userName) {
  let rec = loadLmraRec(munkalapId);
  if (!rec) return null;
  if (dirty_unsaved_changes_check(rec)) return null;
  const updated = {
    ...rec,
    status:            "elokeszitve",
    lockedForInstaller: true,
    elokeszitette:     userName || "",
    elokeszitveAt:     new Date().toISOString(),
  };
  saveLmraRec(munkalapId, updated);
  return updated;
}

function dirty_unsaved_changes_check() { return false; } // placeholder

// Admin/PM: újranyitás
export function reopenLmra(munkalapId) {
  const rec = loadLmraRec(munkalapId);
  if (!rec) return null;
  const updated = { ...rec, status: "ujranyitva", lockedForInstaller: false };
  saveLmraRec(munkalapId, updated);
  return updated;
}

// Telepítő: résztvevő hozzáadása
export function addResztvevo(munkalapId, resztvevo) {
  const rec = loadLmraRec(munkalapId);
  if (!rec) return null;
  const id = `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const uj = {
    id,
    nev:           resztvevo.nev,
    teamTagId:     resztvevo.teamTagId  || null,
    tagId:         resztvevo.tagId      || null,   // csapat_tagok ID
    csapatId:      resztvevo.csapatId   || null,
    csapatNev:     resztvevo.csapatNev  || null,
    szerep:        resztvevo.szerep     || null,
    ideiglenes:    resztvevo.ideiglenes || false,
    jelenVan:      resztvevo.jelenVan !== false,   // default: jelen van
    autoHozzaadva: resztvevo.autoHozzaadva || false,
    addedManually: resztvevo.addedManually !== false,
    savedToTeam:   false,
    signatureData: null,
    signedAt:      null,
    signed:        false,
  };
  const updated = {
    ...rec,
    resztvevok: [...(rec.resztvevok || []), uj],
    status: ["elokeszitve", "ujranyitva"].includes(rec.status) ? "alairas_var" : rec.status,
  };
  saveLmraRec(munkalapId, updated);
  return updated;
}

// Telepítő: ideiglenes dolgozó hozzáadása (kötelező: nev, csapatId/csapatNev, szerep)
export function addIdeiglenesResztvevo(munkalapId, data) {
  if (!data?.nev?.trim()) return { error: "Név kötelező!" };
  if (!data?.szerep?.trim()) return { error: "Szerep kötelező!" };
  return addResztvevo(munkalapId, {
    nev:          data.nev.trim(),
    csapatId:     data.csapatId   || null,
    csapatNev:    data.csapatNev  || null,
    szerep:       data.szerep.trim(),
    ideiglenes:   true,
    jelenVan:     true,
    addedManually: true,
    autoHozzaadva: false,
  });
}

// Telepítő: jelenVan toggle
export function updateResztvevoJelenlet(munkalapId, resztvevoId, jelenVan) {
  const rec = loadLmraRec(munkalapId);
  if (!rec) return null;
  const updated = {
    ...rec,
    resztvevok: (rec.resztvevok || []).map(r =>
      r.id === resztvevoId ? { ...r, jelenVan } : r
    ),
  };
  saveLmraRec(munkalapId, updated);
  return updated;
}

/**
 * Automatikusan hozzáadja a csapatKiosztasok alapján a résztvevőket.
 * Csak azokat adja hozzá, akik még nincsenek a listában (tagId alapján).
 */
export function autoPopulateResztvevok(munkalapId, munkalap) {
  const rec = loadLmraRec(munkalapId);
  if (!rec) return null;

  const kiosztasok = munkalap?.csapatKiosztasok || [];
  if (kiosztasok.length === 0) return rec;

  let updatedResztvevok = [...(rec.resztvevok || [])];

  for (const kioszt of kiosztasok) {
    try {
      const csapatTagok = JSON.parse(localStorage.getItem("csapat_tagok") || "[]")
        .filter(t => t.csapatId === kioszt.csapatId && t.aktiv !== false);

      for (const tag of csapatTagok) {
        const alreadyIn = updatedResztvevok.some(
          r => r.tagId === tag.id || r.nev === tag.nev
        );
        if (!alreadyIn) {
          updatedResztvevok.push({
            id:            `sig_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            nev:           tag.nev,
            tagId:         tag.id,
            csapatId:      kioszt.csapatId,
            csapatNev:     kioszt.csapatNev || "",
            szerep:        tag.szerep || "",
            ideiglenes:    false,
            jelenVan:      true,
            autoHozzaadva: true,
            addedManually: false,
            savedToTeam:   false,
            signatureData: null,
            signedAt:      null,
            signed:        false,
          });
        }
      }
    } catch {}
  }

  const updated = {
    ...rec,
    resztvevok: updatedResztvevok,
    status: ["elokeszitve", "ujranyitva"].includes(rec.status) && updatedResztvevok.length > 0
      ? "alairas_var"
      : rec.status,
  };
  saveLmraRec(munkalapId, updated);
  return updated;
}

/**
 * Visszaadja a munkalaphoz releváns csapat tagokat az aláírási listához.
 * Elsőbbség: csapat_tagok a csapatKiosztasokból → old telepito_csapat_tagok fallback
 */
export function getTagokForMunkalap(munkalap) {
  const kiosztasok = munkalap?.csapatKiosztasok || [];

  // Új rendszer: csapatKiosztasok tagjai
  if (kiosztasok.length > 0) {
    const result = [];
    for (const kioszt of kiosztasok) {
      try {
        const tagok = JSON.parse(localStorage.getItem("csapat_tagok") || "[]")
          .filter(t => t.csapatId === kioszt.csapatId && t.aktiv !== false);
        result.push(...tagok.map(t => ({
          id:        t.id,
          nev:       t.nev,
          csapatId:  t.csapatId,
          csapatNev: kioszt.csapatNev || "",
          szerep:    t.szerep || "",
        })));
      } catch {}
    }
    if (result.length > 0) return result;
  }

  // Régi csapatId alapján – csapat_tagok
  const csapatId = munkalap?.csapatId;
  if (csapatId) {
    try {
      const tagok = JSON.parse(localStorage.getItem("csapat_tagok") || "[]")
        .filter(t => t.csapatId === csapatId && t.aktiv !== false);
      if (tagok.length > 0) {
        return tagok.map(t => ({ id: t.id, nev: t.nev, csapatId, csapatNev: "", szerep: t.szerep || "" }));
      }
    } catch {}
  }

  // Nincs hozzárendelt csapat-tag → üres lista (a telepítő kézzel adhat hozzá résztvevőt)
  return [];
}

// Telepítő: résztvevő eltávolítása (csak aláíratlan)
export function removeResztvevo(munkalapId, resztvevoId) {
  const rec = loadLmraRec(munkalapId);
  if (!rec) return null;
  const target = (rec.resztvevok || []).find(r => r.id === resztvevoId);
  if (target?.signed) return { error: "Aláírt résztvevőt nem lehet törölni!" };
  const updated = { ...rec, resztvevok: rec.resztvevok.filter(r => r.id !== resztvevoId) };
  saveLmraRec(munkalapId, updated);
  return updated;
}

// Telepítő: aláírás mentése
export function saveSignature(munkalapId, resztvevoId, signatureData) {
  const rec = loadLmraRec(munkalapId);
  if (!rec) return null;
  const updated = {
    ...rec,
    resztvevok: rec.resztvevok.map(r =>
      r.id === resztvevoId
        ? { ...r, signatureData, signedAt: new Date().toISOString(), signed: true }
        : r
    ),
  };
  saveLmraRec(munkalapId, updated);
  return updated;
}

// Telepítő: LMRA lezárása (csak ha mindenki aláírt)
export function closeLmra(munkalapId, closedByName) {
  const rec = loadLmraRec(munkalapId);
  if (!rec) return { error: "Nincs LMRA rekord!" };
  if (!rec.resztvevok || rec.resztvevok.length === 0)
    return { error: "Legalább egy résztvevő szükséges!" };
  if (!rec.resztvevok.every(r => r.signed))
    return { error: "Nem mindenki írt alá!" };
  const updated = {
    ...rec,
    status:    "alairva",
    lezarvaAt: new Date().toISOString(),
    lezartaBy: closedByName || "",
  };
  saveLmraRec(munkalapId, updated);
  return updated;
}

// Kézi tag mentése csapatba
export function saveNewTagToTeam(munkalapId, resztvevoId, csapatId) {
  const rec = loadLmraRec(munkalapId);
  if (!rec) return null;
  const r = (rec.resztvevok || []).find(rv => rv.id === resztvevoId);
  if (!r || !csapatId) return null;
  // Egységes Csapatok rendszerbe ment (csapat_tagok)
  const tag = createCsapatTag(csapatId, { nev: r.nev, szerep: "Telepítő", aktiv: true });
  const updated = {
    ...rec,
    resztvevok: rec.resztvevok.map(rv =>
      rv.id === resztvevoId ? { ...rv, teamTagId: tag.id, savedToTeam: true } : rv
    ),
  };
  saveLmraRec(munkalapId, updated);
  return tag;
}

// ─── PDF Export ───────────────────────────────────────────────

export function logLmraExport(munkalapId, exportedBy, fileName) {
  const rec = loadLmraRec(munkalapId);
  if (!rec) return;
  const updated = {
    ...rec,
    status: "exportalva",
    exportok: [...(rec.exportok || []), { exportedBy, exportedAt: new Date().toISOString(), fileName }],
  };
  saveLmraRec(munkalapId, updated);
}

export function exportLmraPdfWindow(rec, munkalap, projekt, exportedBy) {
  const html = buildLmraPdfHtml(rec, munkalap, projekt, exportedBy);
  const win = window.open("", "_blank");
  if (!win) {
    alert("Popup blokkolva! Engedélyezd a popupokat ehhez az oldalhoz.");
    return;
  }
  win.document.write(html);
  win.document.close();
  const fileName = `LMRA_${(munkalap?.dokumentumszam || munkalap?.munkalapSzam || rec.munkalapId).replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  setTimeout(() => { win.focus(); win.print(); }, 700);
  logLmraExport(rec.munkalapId, exportedBy || "—", fileName);
}

function buildLmraPdfHtml(rec, munkalap, projekt, exportedBy) {
  const now        = new Date().toLocaleString("hu-HU");
  const cim        = munkalap?.telepitesiCim || munkalap?.clientCim || projekt?.helyszin || "—";
  const ugyfNev    = munkalap?.ugyfelNev || projekt?.ugyfel || "—";
  const munkaszam  = munkalap?.dokumentumszam || munkalap?.munkalapSzam || rec.munkalapId;
  const projektkod = projekt?.projektkod || projekt?.id || "—";
  const csapatNev  = munkalap?.csapatNev || "—";
  const munkaNap   = munkalap?.munkavegzesDatum || rec.createdAt?.slice(0, 10) || "—";
  const kivalasztott = (rec.kockazatok || []).filter(k => k.kivalasztva);
  const szignorok    = (rec.resztvevok  || []).filter(r => r.signed);

  const kockHtml = kivalasztott.length === 0
    ? '<p style="color:#64748b;font-style:italic">Nincsenek kockázatok kijelölve.</p>'
    : `<table><tr><th width="55%">Kockázat</th><th>Megelőző intézkedés</th></tr>
${kivalasztott.map(k => `<tr><td><span class="badge">⚠</span> ${k.szoveg}${k.egyedi ? ' <em style="font-size:9pt;color:#7C3AED">(Egyedi)</em>' : ""}</td><td>${k.megelozoIntezkedes || "—"}</td></tr>`).join("")}
</table>`;

  const sigHtml = szignorok.length === 0
    ? '<p style="color:#64748b;font-style:italic">Nincsenek aláírások.</p>'
    : `<table>
<tr><th width="25%">Név</th><th width="45%">Aláírás</th><th>Aláírás ideje</th></tr>
${szignorok.map(r => `<tr>
<td><strong>${r.nev}</strong></td>
<td style="height:70px;vertical-align:middle">${r.signatureData ? `<img src="${r.signatureData}" style="max-height:65px;max-width:220px" alt="aláírás">` : "—"}</td>
<td style="font-size:9pt">${r.signedAt ? new Date(r.signedAt).toLocaleString("hu-HU") : "—"}</td>
</tr>`).join("")}
</table>`;

  return `<!DOCTYPE html><html lang="hu"><head><meta charset="UTF-8">
<title>LMRA – ${munkaszam}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11pt; margin: 0; padding: 20px; color: #111; }
  @page { size: A4 portrait; margin: 15mm 12mm; }
  @media print { .no-print { display: none !important; } body { padding: 0; } }
  h1  { font-size: 14pt; text-align: center; margin: 0 0 4px; font-weight: bold;
        border-bottom: 2px solid #1e3a5c; padding-bottom: 7px; color: #1e3a5c; }
  h2  { font-size: 10pt; text-align: center; color: #475569; margin: 0 0 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 10.5pt; }
  td, th { border: 1px solid #cbd5e1; padding: 5px 8px; vertical-align: top; }
  th { background: #f1f5f9; font-weight: bold; text-align: left; }
  .section { margin: 14px 0 5px; font-weight: bold; font-size: 10pt; text-transform: uppercase;
             letter-spacing: .5px; color: #1e3a5c; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
  .badge { background: #fee2e2; color: #991b1b; padding: 1px 5px; border-radius: 3px; font-size: 9pt; }
  .footer { font-size: 9pt; color: #64748b; text-align: center; margin-top: 20px;
            border-top: 1px solid #e2e8f0; padding-top: 8px; }
  .btn { padding: 8px 22px; background: #1e3a5c; color: white; border: none; cursor: pointer;
         border-radius: 5px; font-size: 11pt; margin-right: 10px; font-family: Arial; }
</style>
</head><body>
<div class="no-print" style="text-align:right;margin-bottom:14px">
  <button class="btn" onclick="window.print()">🖨️ Nyomtatás / PDF mentés</button>
  <button class="btn" style="background:#64748b" onclick="window.close()">Bezárás</button>
</div>

<h1>LMRA – Munkavégzést megelőző kockázatértékelési nyomtatvány</h1>
<h2>E.D.I. Solutions Kft.</h2>

<table>
  <tr><th width="18%">Projektkód</th><td width="32%">${projektkod}</td>
      <th width="18%">Munkalapszám</th><td>${munkaszam}</td></tr>
  <tr><th>Ügyfél neve</th><td>${ugyfNev}</td>
      <th>Munkavégzés dátuma</th><td>${munkaNap}</td></tr>
  <tr><th>Telepítési cím</th><td colspan="3">${cim}</td></tr>
  <tr><th>Telepítő csapat</th><td>${csapatNev}</td>
      <th>Előkészítette</th>
      <td>${rec.elokeszitette || "—"} (${rec.elokeszitveAt ? new Date(rec.elokeszitveAt).toLocaleDateString("hu-HU") : "—"})</td></tr>
</table>

<div class="section">Kiválasztott kockázatok és megelőző intézkedések</div>
${kockHtml}

<div class="section">Résztvevők és aláírások</div>
${sigHtml}

<table>
  <tr><th>LMRA lezárás ideje</th>
      <td>${rec.lezarvaAt ? new Date(rec.lezarvaAt).toLocaleString("hu-HU") : "—"}</td>
      <th>Lezárta</th><td>${rec.lezartaBy || "—"}</td></tr>
</table>

<div class="footer">
  PDF generálás ideje: ${now}&nbsp;|&nbsp;Exportálta: ${exportedBy || "—"}&nbsp;|&nbsp;E.D.I. Solutions Kft.
</div>
</body></html>`;
}

// ─── Telepítő csapatok ────────────────────────────────────────

export function loadTeleppCsapatok() {
  try { return JSON.parse(localStorage.getItem(TELEPITO_CS_KEY) || "[]"); }
  catch { return []; }
}

function saveTeleppCsapatok(list) {
  localStorage.setItem(TELEPITO_CS_KEY, JSON.stringify(list));
  dispatch("telepito_csapatok");
}

export function getAktivTeleppCsapatok() {
  return loadTeleppCsapatok().filter(c => c.aktiv !== false);
}

export function createTeleppCsapat(nev) {
  const now = new Date().toISOString();
  const cs  = { id: `tcs_${Date.now()}`, nev: nev.trim(), aktiv: true, createdAt: now, updatedAt: now };
  saveTeleppCsapatok([...loadTeleppCsapatok(), cs]);
  return cs;
}

export function updateTeleppCsapat(id, updates) {
  saveTeleppCsapatok(
    loadTeleppCsapatok().map(c =>
      c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
    )
  );
}

// ─── Telepítő csapat tagok ────────────────────────────────────

export function loadTeleppTagok() {
  try { return JSON.parse(localStorage.getItem(TELEPITO_TAGOK_KEY) || "[]"); }
  catch { return []; }
}

function saveTeleppTagok(list) {
  localStorage.setItem(TELEPITO_TAGOK_KEY, JSON.stringify(list));
  dispatch("telepito_csapat_tagok");
}

export function getTagokByCsapat(csapatId) {
  return loadTeleppTagok().filter(t => t.csapatId === csapatId && t.aktiv !== false);
}

export function getAllAktivTagok() {
  return loadTeleppTagok().filter(t => t.aktiv !== false);
}

export function addTeleppTag(csapatId, nev, telefon = "", email = "") {
  const now = new Date().toISOString();
  const tag = { id: `ttag_${Date.now()}`, csapatId, nev: nev.trim(), telefon, email, aktiv: true, createdAt: now, updatedAt: now };
  saveTeleppTagok([...loadTeleppTagok(), tag]);
  return tag;
}

export function updateTeleppTag(id, updates) {
  saveTeleppTagok(
    loadTeleppTagok().map(t =>
      t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    )
  );
}

export function deleteTeleppTag(id) {
  saveTeleppTagok(loadTeleppTagok().filter(t => t.id !== id));
}

// Munkalaphoz releváns tagok lekérése – egységes Csapatok rendszerből
export function getRelevantTagok(munkalap) {
  const csapatId = munkalap?.csapatId;
  if (csapatId) {
    const tagok = getAktivCsapatTagok(csapatId);
    if (tagok.length > 0) {
      return tagok.map(t => ({ id: t.id, nev: t.nev, csapatId, szerep: t.szerep || "", aktiv: t.aktiv !== false }));
    }
  }
  return [];
}
