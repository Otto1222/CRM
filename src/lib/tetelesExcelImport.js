/**
 * tetelesExcelImport.js
 * P0-007: "Saját munka – elfogadott tételes Excel" import.
 *
 * Egy már elfogadott, KÜLSŐ forrásból (fővállalkozó, ügyfél, korábbi
 * ajánlatkészítő rendszer stb.) származó tételes Excelt olvas be, és
 * alakít át a Kivitelezési Csomag rendszer által elvárt tétel-alakra
 * (ld. kivitelezesiCsomag.schema.js generateKiviTetelekFromExcelPillanatkep).
 *
 * Az oszlopelrendezés forrásonként eltérő lehet, ezért NEM feltételezünk
 * fix oszlopsorrendet – a beolvasás után a felhasználó rendeli hozzá,
 * melyik Excel-oszlop melyik mezőnek felel meg (ugyanaz a minta, mint a
 * Munkakiosztás oldal Excel-importja, ld. pages/Munkakiosztas.jsx).
 */
import * as XLSX from "xlsx";

// ─── Mezők, amikhez oszlopot rendelünk ─────────────────────────
// "kotelezo" mezők nélkül a sor nem importálható; a többi opcionális.
export const TETEL_MEZOK = [
  { key: "nev",      label: "Megnevezés",  kotelezo: true },
  { key: "mennyiseg", label: "Mennyiség",  kotelezo: true },
  { key: "egyseg",    label: "Egység",     kotelezo: false },
  { key: "egysegar",  label: "Egységár",   kotelezo: false },
  { key: "osszesen",  label: "Összesen (nettó)", kotelezo: false },
  { key: "kategoria", label: "Kategória",  kotelezo: false },
  { key: "cikkszam",  label: "Cikkszám",   kotelezo: false },
];

/**
 * Excel/CSV fájl beolvasása – visszaadja a fejléceket és a nyers sorokat.
 * @returns {Promise<{ fejlec: string[], sorok: any[][] }>}
 */
export function parseTetelesExcelFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error("Nincs kiválasztott fájl.")); return; }
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      reject(new Error("Csak .xlsx, .xls vagy .csv fájl fogadható el."));
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb   = XLSX.read(e.target.result, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (rows.length < 2) {
          reject(new Error("A fájl üres, vagy csak fejlécet tartalmaz."));
          return;
        }
        const fejlec = rows[0].map(f => String(f ?? ""));
        const sorok  = rows.slice(1).filter(r => r.some(c => c !== "" && c !== null && c !== undefined));
        resolve({ fejlec, sorok });
      } catch (err) {
        reject(new Error("Fájl olvasási hiba: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("Fájl olvasási hiba."));
    reader.readAsArrayBuffer(file);
  });
}

/** Egyszerű heurisztika a fejléc-nevek alapján – csak segít előre kitölteni
 *  az oszlop-hozzárendelést, a felhasználó bármikor felülbírálhatja. */
export function guessColumnMap(fejlec) {
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const map = {};
  const patterns = {
    nev:       [/megnevez/, /^n[eé]v$/, /tetel/, /term[eé]k/, /leiras/],
    mennyiseg: [/mennyis[eé]g/, /^db$/, /^menny/],
    egyseg:    [/^egys[eé]g$/, /m[eé]rt[eé]kegys/],
    egysegar:  [/egys[eé]g[aá]r/, /nett[oó] ?[aá]r/],
    osszesen:  [/[oö]sszes/, /v[eé]g[oö]sszeg/, /brutt[oó]/],
    kategoria: [/kateg[oó]ria/, /csoport/],
    cikkszam:  [/cikksz[aá]m/, /azonos[ií]t[oó]/, /term[eé]kk[oó]d/],
  };
  fejlec.forEach((h, idx) => {
    const n = norm(h);
    for (const [key, regs] of Object.entries(patterns)) {
      if (map[key] !== undefined) continue;
      if (regs.some(r => r.test(n))) map[key] = idx;
    }
  });
  return map;
}

function toNumber(v) {
  if (typeof v === "number") return v;
  if (v == null || v === "") return 0;
  // "1 234,56" / "1234.56" / "1234" – ezres elválasztó és tizedesvessző kezelése
  const cleaned = String(v).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * A nyers sorokat + oszlop-hozzárendelést tétel-objektumokká alakítja, és
 * validálja őket. A hibás sorokat NEM dobja el csendben – visszaadja külön,
 * hogy a felhasználó lássa és javíthassa/kihagyhassa.
 * @returns {{ tetelek: object[], hibasSorok: { sorIndex:number, ok:string }[] }}
 */
export function buildTetelekFromRows(sorok, columnMap) {
  const tetelek = [];
  const hibasSorok = [];

  sorok.forEach((sor, i) => {
    const nev = columnMap.nev !== undefined ? String(sor[columnMap.nev] ?? "").trim() : "";
    const mennyisegRaw = columnMap.mennyiseg !== undefined ? sor[columnMap.mennyiseg] : "";
    const mennyiseg = toNumber(mennyisegRaw);

    if (!nev) { hibasSorok.push({ sorIndex: i, ok: "Hiányzó megnevezés" }); return; }
    if (!mennyisegRaw && mennyisegRaw !== 0) { hibasSorok.push({ sorIndex: i, ok: "Hiányzó mennyiség" }); return; }
    if (mennyiseg <= 0) { hibasSorok.push({ sorIndex: i, ok: "Mennyiség nem lehet 0 vagy negatív" }); return; }

    const egysegar = columnMap.egysegar !== undefined ? toNumber(sor[columnMap.egysegar]) : 0;
    const osszesenRaw = columnMap.osszesen !== undefined ? toNumber(sor[columnMap.osszesen]) : 0;
    // Ha nincs külön "összesen" oszlop, mennyiség × egységár számolja ki.
    const osszesen = osszesenRaw > 0 ? osszesenRaw : mennyiseg * egysegar;

    tetelek.push({
      nev,
      mennyiseg,
      egyseg:    columnMap.egyseg    !== undefined ? String(sor[columnMap.egyseg] ?? "").trim() || "db" : "db",
      egysegar,
      osszesen,
      kategoria: columnMap.kategoria !== undefined ? String(sor[columnMap.kategoria] ?? "").trim() : "",
      cikkszam:  columnMap.cikkszam  !== undefined ? String(sor[columnMap.cikkszam]  ?? "").trim() : "",
    });
  });

  return { tetelek, hibasSorok };
}

/**
 * Immutábilis pillanatkép építése az importált tételekből – ugyanaz a szerep,
 * mint createAjanlatPillanatkep()-nek az ajánlat-flow-ban. Ez kerül a projekt
 * elfogadottExcelPillanatkep mezőjébe, és ebből generálódik a Kivitelezési
 * Csomag (ld. kivitelezesiCsomag.schema.js generateKiviTetelekFromExcelPillanatkep).
 */
export function buildExcelPillanatkep(fileName, tetelek) {
  const netto_osszeg = tetelek.reduce((s, t) => s + (Number(t.osszesen) || 0), 0);
  return {
    keszult:  new Date().toISOString(),
    fileName: fileName || "",
    tetelek,
    osszesito: { netto_osszeg },
  };
}
