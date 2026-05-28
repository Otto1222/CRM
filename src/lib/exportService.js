/**
 * exportService.js
 * Központi export rendszer
 * Excel, PDF, CSV – mind innen, nem szétszórva az UI-ban
 */

import * as XLSX from "xlsx";
import { calcMunkalapPenzugy } from "./costEngine";
import { ft } from "./helpers";

// ─── Közös adatmodell (export-független) ────────────────────

export function munkalapToExportRow(m, karteritesek = []) {
  const p = calcMunkalapPenzugy(m, karteritesek);
  return {
    // Azonosítók
    "EDI Sorszám":           m.ediSorszam || m.dokumentumszam || m.id,
    "Munkaszám":             m.id,
    "Dokumentumszám":        m.dokumentumszam || "",
    "Munkalap típusa":       m.munkalapTipus || "—",
    // Ügyfél
    "Ügyfél neve":           m.clientNev || "—",
    "Ügyfél cím":            m.clientCim || "—",
    "Telefonszám":           m.clientTel || "—",
    // Munka
    "Státusz":               m.status || "—",
    "Csapat":                m.assigneeNev || "—",
    "Projekt leírás":        m.projektMegnevezes || m.description || "—",
    "Értékesítő":            m.ertekesito || "—",
    // Dátumok
    "Tervezett dátum":       m.date || "—",
    "Megkezdés dátuma":      m.megkezdesIdopont ? m.megkezdesIdopont.slice(0,10) : "—",
    "Lezárás dátuma":        m.befejezesIdopont ? m.befejezesIdopont.slice(0,10) : "—",
    // Pénzügy
    "Bevétel (Ft)":          p.bevetal,
    "Anyagköltség (Ft)":     p.anyagKolts,
    "Munkaerő díj (Ft)":     p.munkaeroDij,
    "Kiszállás (Ft)":        p.kiszDij,
    "Egyéb költ. (Ft)":      p.egyeb,
    "Elfogadott kártér. (Ft)": p.kartElf,
    "Összes költség (Ft)":   p.osszesKolts,
    "Eredmény (Ft)":         p.eredmeny,
    "Haszon %":              p.haszonPct !== null ? p.haszonPct + "%" : "—",
    "Nyereséges":            p.nyereseg ? "Igen" : "Nem",
  };
}

// ─── Excel export ────────────────────────────────────────────

export function exportToExcel(munkalapok, karteritesek = [], options = {}) {
  const { fajlnev = "crm_export", lap = "Munkalapok" } = options;
  const rows  = munkalapok.map(m => munkalapToExportRow(m, karteritesek));
  const ws    = XLSX.utils.json_to_sheet(rows);

  // Oszlopszélességek auto-set
  const cols = Object.keys(rows[0] || {});
  ws["!cols"] = cols.map(k => ({ wch: Math.min(Math.max(k.length, 10), 35) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, lap);

  // Összesítő lap
  const sum = munkalapok.reduce((acc, m) => {
    const p = calcMunkalapPenzugy(m, karteritesek);
    return {
      "Összes munkalap":     acc["Összes munkalap"] + 1,
      "Összes bevétel (Ft)": acc["Összes bevétel (Ft)"] + p.bevetal,
      "Összes költség (Ft)": acc["Összes költség (Ft)"] + p.osszesKolts,
      "Összesített eredmény": acc["Összesített eredmény"] + p.eredmeny,
      "Lezárt munkák":       acc["Lezárt munkák"] + (["Lezárva","Számlázva"].includes(m.status)?1:0),
      "Aktív munkák":        acc["Aktív munkák"]  + (!["Lezárva","Számlázva","Meghiúsult"].includes(m.status)?1:0),
    };
  }, { "Összes munkalap":0, "Összes bevétel (Ft)":0, "Összes költség (Ft)":0, "Összesített eredmény":0, "Lezárt munkák":0, "Aktív munkák":0 });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([sum]), "Összesítő");

  XLSX.writeFile(wb, `${fajlnev}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ─── CSV export ──────────────────────────────────────────────

export function exportToCSV(munkalapok, karteritesek = [], options = {}) {
  const { fajlnev = "crm_export" } = options;
  const rows = munkalapok.map(m => munkalapToExportRow(m, karteritesek));
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map(r => headers.map(h => `"${(r[h]??"")}"`).join(";")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${fajlnev}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

// ─── PDF print export ─────────────────────────────────────────

export function exportToPDF(munkalapok, karteritesek = [], options = {}) {
  const { cim = "Munkalapok összesítő" } = options;
  const rows = munkalapok.map(m => munkalapToExportRow(m, karteritesek));
  const totBev  = rows.reduce((s,r) => s + (r["Bevétel (Ft)"]||0), 0);
  const totKolt = rows.reduce((s,r) => s + (r["Összes költség (Ft)"]||0), 0);
  const totEr   = totBev - totKolt;

  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html lang="hu"><head>
<meta charset="UTF-8"><title>${cim}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:Arial,sans-serif; font-size:9pt; padding:12mm; color:#111; }
  h1 { font-size:14pt; font-weight:bold; text-align:center; margin-bottom:3mm; }
  .meta { text-align:center; font-size:8pt; color:#666; margin-bottom:6mm; }
  .sum { display:flex; gap:6mm; margin-bottom:6mm; }
  .sum div { flex:1; border:0.5pt solid #ddd; border-radius:2pt; padding:3mm; }
  .sum .lbl { font-size:7pt; color:#888; font-weight:bold; }
  .sum .val { font-size:11pt; font-weight:bold; }
  table { width:100%; border-collapse:collapse; }
  th { background:#1E3A5F; color:#fff; padding:2mm; text-align:left; font-size:8pt; }
  td { padding:2mm; border-bottom:0.5pt solid #eee; font-size:8pt; }
  tr:nth-child(even) td { background:#F8FAFC; }
  .ny { color:#059669; font-weight:bold; }
  .ve { color:#DC2626; font-weight:bold; }
  @media print { body { padding:8mm; } }
</style></head><body>
<h1>☀️ ${cim}</h1>
<div class="meta">Generálva: ${new Date().toLocaleString("hu-HU")} | ${rows.length} munkalap</div>
<div class="sum">
  <div><div class="lbl">BEVÉTEL</div><div class="val" style="color:#059669">${ft(totBev)}</div></div>
  <div><div class="lbl">KÖLTSÉG</div><div class="val" style="color:#DC2626">${ft(totKolt)}</div></div>
  <div><div class="lbl">EREDMÉNY</div><div class="val" style="color:${totEr>=0?"#059669":"#DC2626"}">${ft(totEr)}</div></div>
  <div><div class="lbl">HASZON%</div><div class="val">${totBev>0?Math.round(totEr/totBev*100)+"%":"—"}</div></div>
</div>
<table><thead><tr>
  <th>EDI / ID</th><th>Ügyfél</th><th>Típus</th><th>Státusz</th><th>Csapat</th>
  <th>Bevétel</th><th>Kostég</th><th>Eredmény</th><th>%</th>
</tr></thead><tbody>
${rows.map(r => {
  const ny = (r["Eredmény (Ft)"]||0) >= 0;
  return `<tr>
    <td><b>${r["EDI Sorszám"]}</b></td>
    <td>${r["Ügyfél neve"]}</td>
    <td>${r["Munkalap típusa"]}</td>
    <td>${r["Státusz"]}</td>
    <td>${r["Csapat"]}</td>
    <td>${r["Bevétel (Ft)"]>0?ft(r["Bevétel (Ft)"]):"—"}</td>
    <td>${r["Összes költség (Ft)"]>0?ft(r["Összes költség (Ft)"]):"—"}</td>
    <td class="${r["Bevétel (Ft)"]>0?(ny?"ny":"ve"):""}">${r["Bevétel (Ft)"]>0?ft(r["Eredmény (Ft)"]):"—"}</td>
    <td>${r["Haszon %"]}</td>
  </tr>`;
}).join("")}
</tbody></table>
</body></html>`);
  w.document.close();
  w.onload = () => w.print();
}

// ─── Jövőbeni bővítési pontok ────────────────────────────────
// TODO: exportKarteritek(...)
// TODO: exportCsapatTelj(...)
// TODO: exportIdoszak(munkalapok, from, to)
// TODO: exportAlvallalkozo(...)
