/**
 * vbfDocxService.js
 * VBF Villamos Biztonsági Felülvizsgálati Jegyzőkönyv generálás
 * docxtemplater + pizzip alapú Word (.docx) kitöltés
 *
 * Működés:
 *  1. Admin feltölti a Word sablont Beállítások → VBF Sablon oldalon
 *  2. A sablon base64-ben tárolódik localStorage-ban
 *  3. PM kattint "VBF letöltés" → kitöltött .docx letöltés
 */

import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

const SABLON_LS_KEY = "vbf_docx_sablon_b64";

// ─── Sablon kezelés ──────────────────────────────────────────

export function hasSablon() {
  return !!localStorage.getItem(SABLON_LS_KEY);
}

export function saveSablon(base64) {
  localStorage.setItem(SABLON_LS_KEY, base64);
}

export function deleteSablon() {
  localStorage.removeItem(SABLON_LS_KEY);
}

export function getSablonMeta() {
  const b64 = localStorage.getItem(SABLON_LS_KEY);
  if (!b64) return null;
  const kb = Math.round((b64.length * 3 / 4) / 1024);
  return { kb };
}

// ─── Fájlból base64 olvasás ──────────────────────────────────

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(",")[1]); // strip data:...;base64,
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ─── Adatmapping: munkalap + projekt + vbf → placeholder objektum ──

function buildData(munkalap, projekt, vbf) {
  const ml = munkalap || {};
  const pr = projekt  || {};
  const v  = vbf      || {};

  const v_ = (val) => (val !== undefined && val !== null && val !== "") ? String(val) : "";

  return {
    // ── Projekt / Ügyfél ──────────────────────────────────────
    ugyfel_nev:        v_(ml.clientNev      || pr.clientNev),
    ugyfel_cim:        v_(ml.clientCim      || pr.clientCim),
    ugyfel_tel:        v_(ml.clientTel      || pr.clientTel),
    telepitesi_cim:    v_(ml.telepitesiCim  || pr.telepitesiCim || ml.clientCim || pr.clientCim),
    projekt_kod:       v_(pr.projektkod     || ml.projektkod),
    kulso_azonosito:   v_(pr.kulsoAzonosito || ml.kulsoAzonosito),
    munkalap_szam:     v_(ml.dokumentumszam || ml.munkalapSzam || ml.ediSorszam || ml.ugyszam || ml.id),
    datum:             v_(ml.date || new Date().toLocaleDateString("hu-HU")),
    befejezes_datum:   ml.befejezesIdopont
      ? new Date(ml.befejezesIdopont).toLocaleDateString("hu-HU", { year:"numeric", month:"2-digit", day:"2-digit" })
      : "",
    szerelocsapat:     v_(ml.assigneeNev    || ml.csapatNev || pr.csapatNev),

    // ── Műszaki adatok ────────────────────────────────────────
    panel_db:          v_(ml.napelemDb  || pr.napelemDb),
    inverter_db:       v_(ml.inverterDb || pr.inverterDb),

    // ── Panel adatok ──────────────────────────────────────────
    panel_tipus:       v_(v.panelTipus),
    panel_voc:         v_(v.panelVoc),
    panel_vmp:         v_(v.panelVmp),
    panel_imp:         v_(v.panelImp),
    panel_isc:         v_(v.panelIsc),
    panel_telj:        v_(v.panelTelj),

    // ── Inverter / Egyéb ──────────────────────────────────────
    inverter_nevleges: v_(v.inverterNevleges),
    smart_mero:        v_(v.smartMeter),
    akku:              v_(v.akku),
    betapalt_dc:       v_(v.betapaltDC),
    tuz_megszakito:    v_(v.tuzMegszakito),

    // ── AC feszültség (V) ─────────────────────────────────────
    ac_l1: v_(v.acFeszultseg?.L1),
    ac_l2: v_(v.acFeszultseg?.L2),
    ac_l3: v_(v.acFeszultseg?.L3),

    // ── Kismegszakító – inverternél (A) ───────────────────────
    kismegs_inv_l1: v_(v.kismegsInverter?.L1),
    kismegs_inv_l2: v_(v.kismegsInverter?.L2),
    kismegs_inv_l3: v_(v.kismegsInverter?.L3),

    // ── Kismegszakító – mérőhelynél (A) ──────────────────────
    kismegs_mero_l1: v_(v.kismegsMero?.L1),
    kismegs_mero_l2: v_(v.kismegsMero?.L2),
    kismegs_mero_l3: v_(v.kismegsMero?.L3),

    // ── Hurokellenállás (MΩ) ──────────────────────────────────
    hurok_l1: v_(v.hurokellenallas?.L1),
    hurok_l2: v_(v.hurokellenallas?.L2),
    hurok_l3: v_(v.hurokellenallas?.L3),

    // ── Panelszám stringenként (db) ───────────────────────────
    panel_st1: v_(v.panelszam?.ST1),
    panel_st2: v_(v.panelszam?.ST2),
    panel_st3: v_(v.panelszam?.ST3),
    panel_st4: v_(v.panelszam?.ST4),
    panel_st5: v_(v.panelszam?.ST5),
    panel_st6: v_(v.panelszam?.ST6),

    // ── DC feszültség stringenként (V) ────────────────────────
    dc_st1: v_(v.dcFeszultseg?.ST1),
    dc_st2: v_(v.dcFeszultseg?.ST2),
    dc_st3: v_(v.dcFeszultseg?.ST3),
    dc_st4: v_(v.dcFeszultseg?.ST4),
    dc_st5: v_(v.dcFeszultseg?.ST5),
    dc_st6: v_(v.dcFeszultseg?.ST6),

    // ── Megjegyzés ────────────────────────────────────────────
    megjegyzes: v_(ml.megjegyzes),
  };
}

// ─── Fő generáló függvény ─────────────────────────────────────

export async function generateVbfDocx(munkalap, projekt, vbf) {
  const b64 = localStorage.getItem(SABLON_LS_KEY);
  if (!b64) {
    alert(
      "Nincs VBF sablon feltöltve!\n\n" +
      "Lépés: Beállítások → VBF Sablon → .docx fájl feltöltése"
    );
    return false;
  }

  try {
    // base64 → Uint8Array
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    // docxtemplater betöltés + kitöltés
    const zip = new PizZip(bytes);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{", end: "}" },
    });

    doc.render(buildData(munkalap, projekt, vbf));

    // Letöltés
    const blob = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const fajlnev = [
      "VBF",
      munkalap?.dokumentumszam || munkalap?.ediSorszam || munkalap?.id || "ml",
      munkalap?.clientNev?.replace(/\s+/g, "_") || "",
    ].filter(Boolean).join("_").replace(/[^a-zA-Z0-9_\-áéíóöőúüű]/g, "");

    const url = URL.createObjectURL(blob);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = `${fajlnev}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;

  } catch (err) {
    console.error("[vbfDocxService]", err);

    // Docxtemplater specifikus hibaüzenet – hiányzó / hibás placeholder
    const errors = err?.properties?.errors;
    if (errors?.length) {
      const lista = errors
        .map(e => e?.properties?.id || e?.message || "")
        .filter(Boolean)
        .join(", ");
      alert(
        `VBF sablon hiba!\n\n` +
        `A Word fájlban ismeretlen vagy rosszul írt mező:\n${lista}\n\n` +
        `Ellenőrizd a sablonban lévő {mezőneveket}.`
      );
    } else {
      alert(`VBF generálás sikertelen:\n${err?.message || err}`);
    }
    return false;
  }
}

// ─── Placeholder dokumentáció (Beállítások oldalhoz) ─────────

export const VBF_PLACEHOLDER_DOCS = [
  {
    csoport: "Projekt / Ügyfél",
    mezok: [
      ["{ugyfel_nev}",        "Ügyfél neve"],
      ["{ugyfel_cim}",        "Ügyfél lakcíme"],
      ["{ugyfel_tel}",        "Ügyfél telefonszáma"],
      ["{telepitesi_cim}",    "Telepítési cím"],
      ["{projekt_kod}",       "Projektkód (pl. PRJ-2024-001)"],
      ["{kulso_azonosito}",   "Külső azonosító (pl. OÉTP azonosító)"],
      ["{munkalap_szam}",     "Munkaszám / dokumentumszám"],
      ["{datum}",             "Munkavégzés dátuma"],
      ["{befejezes_datum}",   "Befejezés dátuma"],
      ["{szerelocsapat}",     "Szerelő / csapat neve"],
    ],
  },
  {
    csoport: "Műszaki adatok",
    mezok: [
      ["{panel_db}",          "Napelem darabszám"],
      ["{inverter_db}",       "Inverter darabszám"],
      ["{panel_tipus}",       "Panel típusa (pl. Risen Energy 425W)"],
      ["{panel_voc}",         "Panel Voc (V)"],
      ["{panel_vmp}",         "Panel Vmp (V)"],
      ["{panel_imp}",         "Panel Imp (A)"],
      ["{panel_isc}",         "Panel Isc (A)"],
      ["{panel_telj}",        "Panel teljesítmény (Wp)"],
      ["{inverter_nevleges}", "Inverter névleges (kVA)"],
      ["{smart_mero}",        "Smart mérő (db)"],
      ["{akku}",              "Akkumulátor (db)"],
      ["{betapalt_dc}",       "Betáplált DC teljesítmény (Wp)"],
      ["{tuz_megszakito}",    "Tűzeseti megszakító (A)"],
    ],
  },
  {
    csoport: "AC mérések",
    mezok: [
      ["{ac_l1} / {ac_l2} / {ac_l3}",                                "AC feszültség L1/L2/L3 (V)"],
      ["{kismegs_inv_l1} / {kismegs_inv_l2} / {kismegs_inv_l3}",     "Kismegszakító inverternél L1/L2/L3 (A)"],
      ["{kismegs_mero_l1} / {kismegs_mero_l2} / {kismegs_mero_l3}",  "Kismegszakító mérőhelynél L1/L2/L3 (A)"],
      ["{hurok_l1} / {hurok_l2} / {hurok_l3}",                       "Hurokellenállás L1/L2/L3 (MΩ)"],
    ],
  },
  {
    csoport: "DC mérések / Stringek",
    mezok: [
      ["{dc_st1} / {dc_st2} / … / {dc_st6}",      "DC feszültség ST1–ST6 (V)"],
      ["{panel_st1} / {panel_st2} / … / {panel_st6}", "Panelszám ST1–ST6 (db)"],
    ],
  },
  {
    csoport: "Egyéb",
    mezok: [
      ["{megjegyzes}", "Szerelő megjegyzése / munkavégzés összefoglalója"],
    ],
  },
];
