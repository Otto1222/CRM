/**
 * SzamlaPdfSablon.jsx
 *
 * ⭐⭐⭐ SZABADON SZERKESZTHETŐ SABLON ⭐⭐⭐
 *
 * Ez a fájl tartalmazza az összes PDF nyomtatási sablont.
 * Az E.D.I. Solutions céges arculatához igazíthatod:
 *   - printSzamla()      → egy számla PDF nyomtatása
 *   - printSzamlaRiport() → vezetőségi összesítő riport
 *
 * A <style> blokkon belül szabadon módosíthatod a kinézetet.
 * A HTML struktúrát is átírhatod – csak a fv. szignója marad fix.
 */

// ─── Pénznem formázó ──────────────────────────────────────────
function ft(n) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n || 0);
}
function datum(d) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("hu-HU"); } catch { return d; }
}

// ═══════════════════════════════════════════════════════════════
// SZÁMLA PDF SABLON
// Módosítsd a <style> blokkot és a HTML struktúrát a céges
// arculathoz. A sablon jelenleg minimális, tiszta megjelenést ad.
// ═══════════════════════════════════════════════════════════════

function szamlaSablonHtml(szamla, beallitasok = {}) {
  const cegNev     = beallitasok.cegNev     || "E.D.I. Solutions Kft.";
  const cegCim     = beallitasok.cegCim     || "";
  const cegAdoszam = beallitasok.cegAdoszam || "";
  const cegBankszla= beallitasok.cegBankszla|| "";
  const cegTel     = beallitasok.cegTel     || "";
  const cegEmail   = beallitasok.cegEmail   || "";

  const isBejovo = szamla.tipus === "bejovo";
  const partner  = isBejovo
    ? { nev: szamla.szallitoNev, cim: "", adoszam: szamla.szallitoAdoszam }
    : { nev: szamla.ugyfelNev,   cim: szamla.ugyfelCim, adoszam: szamla.ugyfelAdoszam };

  const tetelek = szamla.tetelek || [];

  // ── STYLE ── Módosítsd ide a céges kinézetet ──────────────
  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; padding: 14mm 16mm; }

    /* ── FEJLÉC – ide kerülhet logo, cégnév ── */
    .fejlec {
      display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 3px solid #1E3A5F; padding-bottom: 8mm; margin-bottom: 8mm;
    }
    .ceg-nev { font-size: 18pt; font-weight: bold; color: #1E3A5F; }
    .ceg-adat { font-size: 8pt; color: #555; line-height: 1.7; margin-top: 4pt; }
    .szamla-cim { text-align: right; }
    .szamla-cim h1 { font-size: 20pt; color: #1E3A5F; text-transform: uppercase; }
    .szamla-szam { font-size: 11pt; font-weight: bold; color: #0F172A; margin-top: 4pt; }
    .szamla-tipus-badge {
      display: inline-block; background: ${isBejovo ? "#FEF3C7" : "#DBEAFE"};
      color: ${isBejovo ? "#92400E" : "#1E40AF"}; border-radius: 4pt;
      padding: 2pt 8pt; font-size: 8pt; font-weight: bold; margin-top: 4pt;
    }

    /* ── ADATOK BLOKKOK ── */
    .adatok { display: flex; gap: 8mm; margin-bottom: 8mm; }
    .adat-blokk { flex: 1; border: 1pt solid #E2E8F0; border-radius: 4pt; padding: 5mm; }
    .adat-cim { font-size: 7pt; font-weight: bold; text-transform: uppercase;
      letter-spacing: 1pt; color: #64748B; margin-bottom: 3pt; }
    .adat-ertek { font-size: 10pt; font-weight: bold; color: #0F172A; line-height: 1.5; }
    .adat-sub { font-size: 8pt; color: #475569; }

    /* ── TÉTELEK TÁBLÁZAT ── */
    table { width: 100%; border-collapse: collapse; margin-bottom: 6mm; }
    thead tr { background: #1E3A5F; color: #fff; }
    th { padding: 3mm 4mm; text-align: left; font-size: 9pt; }
    td { padding: 2.5mm 4mm; font-size: 9pt; border-bottom: 0.5pt solid #E2E8F0; }
    tr:nth-child(even) td { background: #F8FAFC; }
    .szam { text-align: right; }

    /* ── ÖSSZESÍTŐ ── */
    .ossz-tabla { width: 260pt; margin-left: auto; margin-bottom: 8mm; }
    .ossz-sor { display: flex; justify-content: space-between; padding: 2.5mm 0;
      border-bottom: 0.5pt solid #E2E8F0; font-size: 10pt; }
    .ossz-sor.total { font-weight: bold; font-size: 12pt; border-top: 2pt solid #1E3A5F;
      border-bottom: none; padding-top: 4mm; color: #1E3A5F; }

    /* ── LÁBLÉC ── */
    .lablec { margin-top: 8mm; padding-top: 5mm; border-top: 1pt solid #E2E8F0;
      font-size: 8pt; color: #64748B; display: flex; justify-content: space-between; }
    .alairas-sor { display: flex; gap: 20mm; margin-top: 12mm; }
    .alairas-mezo { flex: 1; border-top: 1pt solid #111; padding-top: 3pt;
      font-size: 8pt; color: #475569; text-align: center; }

    @media print { body { padding: 8mm 10mm; } }
  `;

  // ── HTML STRUKTÚRA ── Módosítsd ide a számlaképet ──────────
  const tetelekHtml = tetelek.length > 0
    ? `
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Megnevezés</th>
          <th class="szam">Mennyiség</th>
          <th class="szam">Egységár (nettó)</th>
          <th class="szam">ÁFA %</th>
          <th class="szam">Összeg (nettó)</th>
        </tr>
      </thead>
      <tbody>
        ${tetelek.map((t, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${t.megnevezes || "—"}</td>
            <td class="szam">${t.menny || 1} ${t.egyseg || "db"}</td>
            <td class="szam">${ft(t.nettoEgysegAr || 0)}</td>
            <td class="szam">${t.afaKulcs ?? 27}%</td>
            <td class="szam">${ft((t.nettoEgysegAr || 0) * (t.menny || 1))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>`
    : `<p style="color:#94A3B8;font-style:italic;margin-bottom:6mm;">Tételek nem kerültek rögzítésre.</p>`;

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>Számla – ${szamla.szamlaszam || szamla.id}</title>
  <style>${css}</style>
</head>
<body>

  <!-- FEJLÉC -->
  <div class="fejlec">
    <div>
      <div class="ceg-nev">${cegNev}</div>
      <div class="ceg-adat">
        ${cegCim ? cegCim + "<br>" : ""}
        ${cegAdoszam ? "Adószám: " + cegAdoszam + "<br>" : ""}
        ${cegBankszla ? "Bankszámla: " + cegBankszla + "<br>" : ""}
        ${cegTel ? "Tel: " + cegTel : ""}
        ${cegEmail ? " | " + cegEmail : ""}
      </div>
    </div>
    <div class="szamla-cim">
      <h1>${isBejovo ? "BEJÖVŐ SZÁMLA" : "SZÁMLA"}</h1>
      <div class="szamla-szam">${szamla.szamlaszam || "—"}</div>
      <div class="szamla-tipus-badge">${isBejovo ? "Bejövő" : "Kimenő"}</div>
    </div>
  </div>

  <!-- ADATOK -->
  <div class="adatok">
    <div class="adat-blokk">
      <div class="adat-cim">${isBejovo ? "Szállító" : "Vevő"}</div>
      <div class="adat-ertek">${partner.nev || "—"}</div>
      <div class="adat-sub">${partner.cim || ""}</div>
      ${partner.adoszam ? `<div class="adat-sub">Adószám: ${partner.adoszam}</div>` : ""}
    </div>
    <div class="adat-blokk">
      <div class="adat-cim">Dátumok</div>
      <div class="adat-sub">Kiállítás: <b>${datum(szamla.kiallitasDatuma)}</b></div>
      <div class="adat-sub">Teljesítés: <b>${datum(szamla.teljesitesDatuma)}</b></div>
      <div class="adat-sub">Fizetési határidő: <b>${datum(szamla.fizetesiHatarido)}</b></div>
    </div>
    ${szamla.projektKod ? `
    <div class="adat-blokk">
      <div class="adat-cim">Projekt</div>
      <div class="adat-ertek">${szamla.projektKod}</div>
      <div class="adat-sub">${szamla.projektNev || ""}</div>
    </div>` : ""}
    <div class="adat-blokk">
      <div class="adat-cim">Fizetés</div>
      <div class="adat-ertek" style="color:${szamla.status === "Fizetve" ? "#059669" : szamla.status === "Késedelmes" ? "#DC2626" : "#0F172A"}">${szamla.status}</div>
      ${szamla.fizetettDatum ? `<div class="adat-sub">Fizetve: ${datum(szamla.fizetettDatum)}</div>` : ""}
    </div>
  </div>

  <!-- TÉTELEK -->
  ${tetelekHtml}

  <!-- ÖSSZESÍTŐ -->
  <div class="ossz-tabla">
    <div class="ossz-sor"><span>Nettó összeg</span><span>${ft(szamla.nettoOsszeg)}</span></div>
    <div class="ossz-sor"><span>ÁFA (${szamla.afaKulcs ?? 27}%)</span><span>${ft(szamla.afaOsszeg)}</span></div>
    <div class="ossz-sor total"><span>Bruttó összeg</span><span>${ft(szamla.bruttoOsszeg)}</span></div>
  </div>

  <!-- MEGJEGYZÉS -->
  ${szamla.megjegyzes ? `
  <div style="background:#F8FAFC;border:1pt solid #E2E8F0;border-radius:4pt;padding:4mm;margin-bottom:6mm;">
    <div style="font-size:8pt;font-weight:bold;color:#64748B;margin-bottom:2pt;">MEGJEGYZÉS</div>
    <div style="font-size:9pt;">${szamla.megjegyzes}</div>
  </div>` : ""}

  <!-- ALÁÍRÁS -->
  <div class="alairas-sor">
    <div class="alairas-mezo">Kiállító aláírása</div>
    <div class="alairas-mezo">Átvevő aláírása</div>
    <div class="alairas-mezo">Dátum</div>
  </div>

  <!-- LÁBLÉC -->
  <div class="lablec">
    <span>Generálva: ${new Date().toLocaleString("hu-HU")}</span>
    ${szamla.peaseId ? `<span>PEASE ID: ${szamla.peaseId}</span>` : ""}
    <span>${cegNev}</span>
  </div>

</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// VEZETŐSÉGI RIPORT SABLON
// ═══════════════════════════════════════════════════════════════

function riportSablonHtml(szamlak, { from, to, cim } = {}) {
  const kimeno = szamlak.filter(s => s.tipus === "kimeno");
  const bejovo = szamlak.filter(s => s.tipus === "bejovo");

  const ossz   = arr => arr.reduce((s, x) => s + (x.bruttoOsszeg || 0), 0);
  const fizetve = arr => ossz(arr.filter(s => s.status === "Fizetve"));

  // Per-projekt összesítő
  const projMap = {};
  kimeno.forEach(s => {
    const k = s.projektKod || "—";
    if (!projMap[k]) projMap[k] = { nev: s.projektNev || k, ossz: 0, fizetve: 0, db: 0 };
    projMap[k].ossz   += s.bruttoOsszeg || 0;
    projMap[k].fizetve += s.status === "Fizetve" ? (s.bruttoOsszeg || 0) : 0;
    projMap[k].db++;
  });
  const projektek = Object.entries(projMap).sort(([,a],[,b]) => b.ossz - a.ossz);

  const css = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; font-size: 9pt; padding: 12mm; color: #111; }
    h1 { font-size: 16pt; font-weight: bold; color: #1E3A5F; margin-bottom: 2mm; }
    .meta { font-size: 8pt; color: #64748B; margin-bottom: 6mm; }
    .kart-sor { display: flex; gap: 5mm; margin-bottom: 6mm; }
    .kart { flex: 1; border: 1pt solid #E2E8F0; border-radius: 4pt; padding: 4mm; }
    .kart .cim { font-size: 7pt; font-weight: bold; text-transform: uppercase;
      letter-spacing: 1pt; color: #64748B; margin-bottom: 2pt; }
    .kart .ertek { font-size: 13pt; font-weight: bold; }
    .szekció { margin-bottom: 6mm; }
    .szekció h2 { font-size: 11pt; font-weight: bold; color: #1E3A5F;
      border-bottom: 1.5pt solid #1E3A5F; padding-bottom: 2mm; margin-bottom: 3mm; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1E3A5F; color: #fff; padding: 2.5mm 3mm; text-align: left; font-size: 8pt; }
    td { padding: 2mm 3mm; font-size: 8pt; border-bottom: 0.5pt solid #E2E8F0; }
    tr:nth-child(even) td { background: #F8FAFC; }
    .jobb { text-align: right; }
    .zold { color: #059669; font-weight: bold; }
    .piros { color: #DC2626; font-weight: bold; }
    .lablec { margin-top: 6mm; font-size: 7pt; color: #94A3B8; text-align: center; border-top: 0.5pt solid #E2E8F0; padding-top: 3mm; }
    @media print { body { padding: 8mm; } }
  `;

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>${cim || "Számlák összesítő"}</title>
  <style>${css}</style>
</head>
<body>

  <h1>☀️ ${cim || "Számlák összesítő riport"}</h1>
  <div class="meta">
    ${from || to ? `Időszak: ${from || "—"} – ${to || "—"} &nbsp;|&nbsp; ` : ""}
    Összes számla: ${szamlak.length} db &nbsp;|&nbsp; Generálva: ${new Date().toLocaleString("hu-HU")}
  </div>

  <!-- ÖSSZESÍTŐ KÁRTYÁK -->
  <div class="kart-sor">
    <div class="kart">
      <div class="cim">Kimenő – összes</div>
      <div class="ertek" style="color:#2563EB">${ft(ossz(kimeno))}</div>
      <div style="font-size:8pt;color:#64748B;margin-top:2pt">${kimeno.length} db számla</div>
    </div>
    <div class="kart">
      <div class="cim">Kimenő – befizetve</div>
      <div class="ertek" style="color:#059669">${ft(fizetve(kimeno))}</div>
    </div>
    <div class="kart">
      <div class="cim">Kimenő – nyitott</div>
      <div class="ertek" style="color:#D97706">${ft(ossz(kimeno) - fizetve(kimeno))}</div>
    </div>
    <div class="kart">
      <div class="cim">Bejövő – összes</div>
      <div class="ertek" style="color:#7C3AED">${ft(ossz(bejovo))}</div>
      <div style="font-size:8pt;color:#64748B;margin-top:2pt">${bejovo.length} db számla</div>
    </div>
    <div class="kart">
      <div class="cim">Egyenleg</div>
      <div class="ertek" style="color:${ossz(kimeno)-ossz(bejovo)>=0?"#059669":"#DC2626"}">${ft(ossz(kimeno) - ossz(bejovo))}</div>
    </div>
  </div>

  <!-- PER-PROJEKT BONTÁS (kimenő) -->
  ${projektek.length > 0 ? `
  <div class="szekció">
    <h2>Kimenő számlák – projekt bontás</h2>
    <table>
      <thead><tr>
        <th>Projektkód</th><th>Megnevezés</th>
        <th class="jobb">Számlák (db)</th>
        <th class="jobb">Kiszámlázott</th>
        <th class="jobb">Befizetve</th>
        <th class="jobb">Nyitott</th>
      </tr></thead>
      <tbody>
        ${projektek.map(([kod, p]) => `
          <tr>
            <td><b>${kod}</b></td>
            <td>${p.nev !== kod ? p.nev : ""}</td>
            <td class="jobb">${p.db}</td>
            <td class="jobb">${ft(p.ossz)}</td>
            <td class="jobb zold">${ft(p.fizetve)}</td>
            <td class="jobb ${p.ossz - p.fizetve > 0 ? "piros" : ""}">${ft(p.ossz - p.fizetve)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- KIMENŐ SZÁMLA LISTA -->
  <div class="szekció">
    <h2>Kimenő számlák</h2>
    <table>
      <thead><tr>
        <th>Számlaszám</th><th>Ügyfél</th><th>Projekt</th>
        <th>Kiállítva</th><th>Határidő</th><th>Státusz</th>
        <th class="jobb">Bruttó</th>
      </tr></thead>
      <tbody>
        ${kimeno.sort((a,b) => (b.kiallitasDatuma||"").localeCompare(a.kiallitasDatuma||"")).map(s => `
          <tr>
            <td><b>${s.szamlaszam || "—"}</b></td>
            <td>${s.ugyfelNev || "—"}</td>
            <td>${s.projektKod || "—"}</td>
            <td>${s.kiallitasDatuma || "—"}</td>
            <td>${s.fizetesiHatarido || "—"}</td>
            <td style="color:${s.status === "Fizetve" ? "#059669" : s.status === "Késedelmes" ? "#DC2626" : "#0F172A"};font-weight:${s.status==="Fizetve"||s.status==="Késedelmes"?"bold":"normal"}">${s.status}</td>
            <td class="jobb">${ft(s.bruttoOsszeg)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>

  <!-- BEJÖVŐ SZÁMLA LISTA -->
  ${bejovo.length > 0 ? `
  <div class="szekció">
    <h2>Bejövő számlák</h2>
    <table>
      <thead><tr>
        <th>Számlaszám</th><th>Szállító</th><th>Projekt</th>
        <th>Kiállítva</th><th>Státusz</th><th class="jobb">Bruttó</th>
      </tr></thead>
      <tbody>
        ${bejovo.map(s => `
          <tr>
            <td><b>${s.szamlaszam || "—"}</b></td>
            <td>${s.szallitoNev || "—"}</td>
            <td>${s.projektKod || "—"}</td>
            <td>${s.kiallitasDatuma || "—"}</td>
            <td>${s.status}</td>
            <td class="jobb">${ft(s.bruttoOsszeg)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <div class="lablec">E.D.I. Solutions Kft. – CRM Napelem riport – ${new Date().toLocaleString("hu-HU")}</div>

</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// NYOMTATÁS INDÍTÁSA (nem módosítandó)
// ═══════════════════════════════════════════════════════════════

export function printSzamla(szamla, beallitasok = {}) {
  const w = window.open("", "_blank");
  if (!w) { alert("Engedélyezd a felugró ablakokat a böngészőben!"); return; }
  w.document.write(szamlaSablonHtml(szamla, beallitasok));
  w.document.close();
  w.onload = () => w.print();
}

export function printSzamlaRiport(szamlak, options = {}) {
  const w = window.open("", "_blank");
  if (!w) { alert("Engedélyezd a felugró ablakokat a böngészőben!"); return; }
  w.document.write(riportSablonHtml(szamlak, options));
  w.document.close();
  w.onload = () => w.print();
}
