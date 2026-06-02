/**
 * pease.api.js – PEASE számlázó rendszer API integráció
 *
 * KONFIGURÁCIÓ (.env fájlban):
 *   VITE_PEASE_API_URL=https://api.pease.hu/v1      ← PEASE API alap URL
 *   VITE_PEASE_API_KEY=your_api_key_here             ← API kulcs
 *
 * KAPCSOLAT BEKAPCSOLÁSA:
 *   1. Töltsd ki a fenti env változókat (Vercel Dashboard → Environment Variables)
 *   2. Ellenőrizd a peaseSzamlaTocrm() függvény mezőmappingját
 *      (a PEASE API dokumentáció alapján módosítsd a mezőneveket)
 *   3. Teszteld a "PEASE szinkron" gombbal a Számlák oldalon
 *
 * STÁTUSZ: Stub – az env változók kitöltésével azonnal él
 */

const PEASE_URL = import.meta.env.VITE_PEASE_API_URL || "";
const PEASE_KEY = import.meta.env.VITE_PEASE_API_KEY || "";

export function peaseConfigured() {
  return !!(PEASE_URL && PEASE_KEY);
}

// ─── Alap HTTP hívás ─────────────────────────────────────────
async function peaseGet(endpoint, params = {}) {
  if (!peaseConfigured()) {
    return { ok: false, offline: true, reason: "PEASE API nincs konfigurálva" };
  }
  const url = new URL(PEASE_URL.replace(/\/$/, "") + endpoint);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), {
    headers: {
      "Authorization": `Bearer ${PEASE_KEY}`,
      "Accept":        "application/json",
    },
  });
  if (!res.ok) throw new Error(`PEASE API ${res.status}: ${res.statusText}`);
  return res.json();
}

// ─── Számlák lekérése ─────────────────────────────────────────
// from, to: "YYYY-MM-DD" formátum
// tipus: "kimeno" | "bejovo"
export async function peaseLekeresSzamlak({ from, to, tipus } = {}) {
  try {
    // ⚠️ MÓDOSÍTANDÓ: Illeszd a PEASE API dokumentációhoz
    // Jelenlegi paraméter nevek: date_from, date_to, type
    const params = {};
    if (from)  params.date_from = from;
    if (to)    params.date_to   = to;
    if (tipus) params.type = tipus === "kimeno" ? "outgoing" : "incoming";

    const res = await peaseGet("/invoices", params);
    const lista = res.data || res.invoices || res || [];
    return { ok: true, szamlak: lista, db: lista.length };
  } catch (err) {
    console.warn("[PEASE] peaseLekeresSzamlak:", err.message);
    return { ok: false, error: err.message };
  }
}

// ─── Egy számla részletei ─────────────────────────────────────
export async function peaseLekeresEgySzamla(peaseId) {
  try {
    const res = await peaseGet(`/invoices/${peaseId}`);
    return { ok: true, szamla: peaseSzamlaTocrm(res) };
  } catch (err) {
    console.warn("[PEASE] peaseLekeresEgySzamla:", err.message);
    return { ok: false, error: err.message };
  }
}

// ─── PEASE → CRM szinkronizálás ───────────────────────────────
// Visszaadja a CRM formátumra konvertált számlákat, NEM menti automatikusan.
// A mentést az UI végzi (az importált tételeket a felhasználó jóváhagyja).
export async function peaseSzamlaImport({ from, to } = {}) {
  if (!peaseConfigured()) {
    return { ok: false, reason: "PEASE API nincs konfigurálva (VITE_PEASE_API_URL, VITE_PEASE_API_KEY)" };
  }
  try {
    const result = await peaseLekeresSzamlak({ from, to });
    if (!result.ok) return result;

    const konvertalt = (result.szamlak || []).map(peaseSzamlaTocrm);
    return { ok: true, szamlak: konvertalt, db: konvertalt.length };
  } catch (err) {
    console.warn("[PEASE] peaseSzamlaImport:", err.message);
    return { ok: false, error: err.message };
  }
}

// ─── PEASE → CRM formátum konverzió ─────────────────────────
// ⚠️ MÓDOSÍTANDÓ: A PEASE API válasz struktúrája alapján állítsd be a mezőneveket.
// Teszteléshez: console.log(p) a peaseLekeresSzamlak() hívás után.
function peaseSzamlaTocrm(p) {
  const netto  = Number(p.net_amount   || p.net   || p.netto   || 0);
  const afa    = Number(p.vat_amount   || p.tax   || p.afa     || 0);
  const brutto = Number(p.gross_amount || p.total || p.brutto  || (netto + afa));
  const afaK   = Number(p.vat_rate     || p.afa_kulcs || 27);

  return {
    peaseId:         String(p.id || p.invoice_id || ""),
    szamlaszam:      p.invoice_number || p.number || p.szamlaszam || "",
    kiallitasDatuma: (p.issue_date      || p.created_at  || "").slice(0, 10),
    teljesitesDatuma:(p.fulfillment_date|| p.issue_date   || "").slice(0, 10),
    fizetesiHatarido:(p.due_date        || p.payment_deadline || "").slice(0, 10),

    ugyfelNev:    p.customer?.name     || p.client_name    || p.ugyfel_nev    || "",
    ugyfelCim:    p.customer?.address  || p.client_address || p.ugyfel_cim    || "",
    ugyfelAdoszam:p.customer?.tax_number || p.client_tax_id  || p.ugyfel_adoszam || "",

    nettoOsszeg:   netto,
    afaKulcs:      afaK,
    afaOsszeg:     afa,
    bruttoOsszeg:  brutto,
    fizetettOsszeg:Number(p.paid_amount || p.fizetve || 0),
    fizetettDatum: (p.paid_at || p.payment_date || "").slice(0, 10),

    tipus:          "kimeno",
    status:         mapPeaseStatus(p.status || p.payment_status || ""),
    peaseSzinkron:  "szinkronizalt",
  };
}

function mapPeaseStatus(s) {
  const low = (s || "").toLowerCase();
  // ⚠️ MÓDOSÍTANDÓ: a PEASE által visszaadott státusz értékek alapján
  if (low.includes("paid")    || low.includes("fizet"))    return "Fizetve";
  if (low.includes("late")    || low.includes("kese"))     return "Késedelmes";
  if (low.includes("cancel")  || low.includes("sztorn"))   return "Sztornózva";
  if (low.includes("sent")    || low.includes("küld"))     return "Küldve";
  return "Kiállítva";
}
