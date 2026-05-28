// ─── Export modul: Excel + PDF ────────────────────────────────
import * as XLSX from "xlsx";
import { ft } from "./helpers";
import { loadKarteritesek } from "./karterites";

/** Egy munkalap pénzügyi adatai */
function munkalapPenzugyek(m) {
  const karteritesek = loadKarteritesek();
  const bevetal      = m.ar || 0;
  const anyagKolts   = (m.items||[]).reduce((s,i) => s + (i.ar||0)*(i.mennyiseg||1), 0);
  const munkaeroDij  = m.munkaeroDij  || 0;
  const kiszDij      = m.kiszallasiDij|| 0;
  const egyeb        = m.egyebKolts   || 0;
  const kartElf      = karteritesek.filter(k=>k.munkalapId===m.id&&k.elfogadott===true).reduce((s,k)=>s+k.osszeg,0);
  const osszesKolts  = anyagKolts + munkaeroDij + kiszDij + kartElf + egyeb;
  const eredmeny     = bevetal - osszesKolts;
  const haszonPct    = bevetal > 0 ? Math.round((eredmeny/bevetal)*100) : null;
  return { bevetal, anyagKolts, munkaeroDij, kiszDij, egyeb, kartElf, osszesKolts, eredmeny, haszonPct };
}

/** Egy sor az Excel táblázatba */
function munkalapToRow(m) {
  const p = munkalapPenzugyek(m);
  return {
    "Azonosító":         m.dokumentumszam || m.ediSorszam || m.id,
    "Munkaszám":         m.id,
    "Típus":             m.munkalapTipus || "—",
    "Ügyfél":            m.clientNev || "—",
    "Cím":               m.clientCim || "—",
    "Státusz":           m.status || "—",
    "Csapat":            m.assigneeNev || "—",
    "Dátum":             m.date || "—",
    "Befejezés dátuma":  m.befejezesIdopont ? m.befejezesIdopont.slice(0,10) : "—",
    "Anyagköltség (Ft)": p.anyagKolts,
    "Munkaerő (Ft)":     p.munkaeroDij,
    "Kiszállás (Ft)":    p.kiszDij,
    "Kártérítés (Ft)":   p.kartElf,
    "Egyéb költség (Ft)":p.egyeb,
    "Összes költség (Ft)":p.osszesKolts,
    "Bevétel (Ft)":      p.bevetal,
    "Eredmény (Ft)":     p.eredmeny,
    "Haszon %":          p.haszonPct !== null ? p.haszonPct + "%" : "—",
    "Megjegyzés":        m.projektMegnevezes || m.description || "—",
  };
}

/** Excel export - munkalapok listája */
export function exportExcel(munkalapok, fajlnev = "munkalapok_export") {
  const rows  = munkalapok.map(munkalapToRow);
  const ws    = XLSX.utils.json_to_sheet(rows);
  const wb    = XLSX.utils.book_new();

  // Oszlopszélességek
  ws["!cols"] = [
    {wch:20},{wch:12},{wch:16},{wch:22},{wch:28},{wch:18},
    {wch:16},{wch:12},{wch:16},
    {wch:16},{wch:14},{wch:12},{wch:14},{wch:14},
    {wch:18},{wch:14},{wch:14},{wch:10},{wch:30},
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Munkalapok");

  // Összesítő lap
  const osszesito = [{
    "Összes munkalap":    munkalapok.length,
    "Összes bevétel (Ft)":munkalapok.reduce((s,m)=>s+(m.ar||0),0),
    "Összes költ. (Ft)":  munkalapok.reduce((s,m)=>s+munkalapPenzugyek(m).osszesKolts,0),
    "Összesített eredm.": munkalapok.reduce((s,m)=>s+munkalapPenzugyek(m).eredmeny,0),
    "Aktív munkák":       munkalapok.filter(m=>!["Lezárva","Számlázva"].includes(m.status)).length,
    "Lezárt munkák":      munkalapok.filter(m=>["Lezárva","Számlázva"].includes(m.status)).length,
  }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(osszesito), "Összesítő");

  XLSX.writeFile(wb, `${fajlnev}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

/** PDF export - böngésző print dialog */
export function exportPDF(munkalapok, cim = "Munkalapok összesítő") {
  const karteritesek = loadKarteritesek();
  const w = window.open("", "_blank");
  const osszBev  = munkalapok.reduce((s,m)=>s+(m.ar||0),0);
  const osszKolts= munkalapok.reduce((s,m)=>s+munkalapPenzugyek(m).osszesKolts,0);
  const osszEr   = osszBev - osszKolts;

  w.document.write(`<!DOCTYPE html><html lang="hu"><head>
<meta charset="UTF-8"><title>${cim}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 10pt; padding: 15mm; color:#111; }
  h1 { font-size:16pt; font-weight:bold; text-align:center; margin-bottom:4mm; }
  .datum { text-align:center; font-size:9pt; color:#666; margin-bottom:8mm; }
  .summary { display:flex; gap:8mm; margin-bottom:8mm; }
  .summary div { flex:1; border:1pt solid #ddd; border-radius:3pt; padding:3mm 4mm; }
  .summary .label { font-size:8pt; color:#888; font-weight:bold; }
  .summary .value { font-size:13pt; font-weight:bold; }
  table { width:100%; border-collapse:collapse; font-size:9pt; }
  th { background:#1E3A5F; color:#fff; padding:3mm 3mm; text-align:left; }
  td { padding:2.5mm 3mm; border-bottom:0.5pt solid #eee; }
  tr:nth-child(even) td { background:#F8FAFC; }
  .nyereseg { color:#059669; font-weight:bold; }
  .veszteseg { color:#DC2626; font-weight:bold; }
  .footer { margin-top:8mm; text-align:center; font-size:8pt; color:#aaa; border-top:0.5pt solid #ddd; padding-top:3mm; }
  @media print { body { padding:10mm; } }
</style></head><body>
<h1>☀️ ${cim}</h1>
<div class="datum">Generálva: ${new Date().toLocaleString("hu-HU")} | Munkalapok száma: ${munkalapok.length}</div>
<div class="summary">
  <div><div class="label">ÖSSZES BEVÉTEL</div><div class="value" style="color:#059669">${ft(osszBev)}</div></div>
  <div><div class="label">ÖSSZES KÖLTSÉG</div><div class="value" style="color:#DC2626">${ft(osszKolts)}</div></div>
  <div><div class="label">EREDMÉNY</div><div class="value" style="color:${osszEr>=0?'#059669':'#DC2626'}">${ft(osszEr)}</div></div>
  <div><div class="label">HASZON %</div><div class="value">${osszBev>0?Math.round((osszEr/osszBev)*100)+"%" : "—"}</div></div>
</div>
<table>
<thead><tr>
  <th>Azonosító</th><th>Ügyfél</th><th>Típus</th><th>Státusz</th><th>Csapat</th>
  <th>Bevétel</th><th>Költség</th><th>Eredmény</th><th>Haszon%</th>
</tr></thead><tbody>
${munkalapok.map(m=>{
  const p=munkalapPenzugyek(m);
  const ny=p.eredmeny>=0;
  return `<tr>
    <td><strong>${m.dokumentumszam||m.ediSorszam||m.id}</strong></td>
    <td>${m.clientNev||"—"}</td>
    <td>${m.munkalapTipus||"—"}</td>
    <td>${m.status||"—"}</td>
    <td>${m.assigneeNev||"—"}</td>
    <td>${p.bevetal>0?ft(p.bevetal):"—"}</td>
    <td>${p.osszesKolts>0?ft(p.osszesKolts):"—"}</td>
    <td class="${p.bevetal>0?(ny?"nyereseg":"veszteseg"):""}">${p.bevetal>0?ft(p.eredmeny):"—"}</td>
    <td>${p.haszonPct!==null&&p.bevetal>0?p.haszonPct+"%":"—"}</td>
  </tr>`;
}).join("")}
</tbody></table>
<div class="footer">CRM Napelem rendszer | ${cim} | ${new Date().toLocaleDateString("hu-HU")}</div>
</body></html>`);
  w.document.close();
  w.onload = () => w.print();
}
