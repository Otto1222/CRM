/**
 * dijtablaExcelImport.js
 * Fővállalkozói díjtábla (alvállalkozói díjtábla) Excel/CSV importja –
 * ugyanaz a minta, mint tetelesExcelImport.js-nél: nincs fix oszlopsorrend,
 * a felhasználó rendeli hozzá az oszlopokat, és a hibás sorokat NEM dobjuk
 * el csendben.
 *
 * Extra a tetelesExcelImport.js-hez képest: a legtöbb valódi díjtábla
 * (ld. Green Home díjtábla) a kategóriát NEM külön oszlopban, hanem
 * szakaszcím-sorokkal jelöli (pl. "A) ALAPTELEPÍTÉS / KIVITELEZÉS" egy
 * olyan sorban, ahol csak a megnevezés oszlop van kitöltve, ár nincs).
 * Az ilyen sorokat felismerjük, kivesszük a tételek közül, és a kategóriát
 * "előregörgetve" rájuk következő tételekre alkalmazzuk – hacsak a
 * felhasználó nem rendelt hozzá külön Kategória-oszlopot.
 */
import * as XLSX from "xlsx";

export const DIJTABLA_MEZOK = [
  { key: "kod",        label: "Kód",              kotelezo: false },
  { key: "megnevezes", label: "Megnevezés",       kotelezo: true },
  { key: "egyseg",     label: "Egység",           kotelezo: false },
  { key: "ar",         label: "Díj (nettó Ft)",   kotelezo: true },
  { key: "kmDij",      label: "Km-díj jelölés",   kotelezo: false },
  { key: "kmKuszobKm", label: "Km-küszöb (opc.)", kotelezo: false },
  { key: "kategoria",  label: "Kategória",        kotelezo: false },
  { key: "megjegyzes", label: "Megjegyzés",       kotelezo: false },
];

export function parseDijtablaExcelFile(file) {
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
        // A valódi díjtáblák elején gyakran cím-/megjegyzés-sorok vannak a
        // fejléc felett (ld. GH díjtábla 1–4. sor) – megkeressük az első
        // olyan sort, ami legalább 3 nem üres cellát tartalmaz, ez lesz a
        // fejléc. Ha nem találunk ilyet, az első sor marad a fejléc.
        const fejlecIdx = Math.max(0, rows.findIndex(r => r.filter(c => String(c ?? "").trim() !== "").length >= 3));
        const fejlec = rows[fejlecIdx].map(f => String(f ?? ""));
        const sorok  = rows.slice(fejlecIdx + 1).filter(r => r.some(c => c !== "" && c !== null && c !== undefined));
        if (sorok.length === 0) {
          reject(new Error("A fájl üres, vagy csak fejlécet/címsorokat tartalmaz."));
          return;
        }
        resolve({ fejlec, sorok });
      } catch (err) {
        reject(new Error("Fájl olvasási hiba: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("Fájl olvasási hiba."));
    reader.readAsArrayBuffer(file);
  });
}

export function guessDijtablaColumnMap(fejlec) {
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const map = {};
  const patterns = {
    kod:        [/^kod$/, /^k[oó]d$/, /^#$/, /azonos[ií]t[oó]/],
    megnevezes: [/munkanem/, /megnevez/, /^n[eé]v$/, /tetel/, /le[ií]r[aá]s/],
    egyseg:     [/^egys[eé]g$/, /m[eé]rt[eé]kegys/],
    ar:         [/d[ií]j/, /egys[eé]g[aá]r/, /nett[oó] ?[aá]r/, /^[aá]r$/],
    kmDij:      [/km[- ]?d[ií]j/, /kiszall/],
    kmKuszobKm: [/k[uü]sz[oö]b/],
    kategoria:  [/kateg[oó]ria/, /csoport/, /szakasz/],
    megjegyzes: [/megjegyz/, /note/],
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
  const cleaned = String(v).replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function toKmDij(v) {
  if (typeof v === "boolean") return v;
  const s = String(v ?? "").toLowerCase().trim();
  if (!s) return false;
  return s.includes("+") || s.includes("km") || s.includes("igen") || s === "x" || s === "true";
}

/**
 * Egy sor "csak szakaszcím" akkor, ha a megnevezés oszlop ki van töltve, de
 * a díj (ár) oszlop üres/0 ÉS az egység oszlop is üres – ez különbözteti
 * meg egy valódi 0 Ft-os tételtől.
 */
function szakaszcimSor(sor, columnMap) {
  const megnevezes = columnMap.megnevezes !== undefined ? String(sor[columnMap.megnevezes] ?? "").trim() : "";
  if (!megnevezes) return false;
  const arRaw     = columnMap.ar     !== undefined ? sor[columnMap.ar]     : "";
  const egysegRaw = columnMap.egyseg !== undefined ? sor[columnMap.egyseg] : "";
  return (arRaw === "" || arRaw === null || arRaw === undefined) &&
         (egysegRaw === "" || egysegRaw === null || egysegRaw === undefined);
}

/**
 * A nyers sorokból katalógus-tétel objektumokat épít. A kategória-oszlop
 * hiányában a szakaszcím-sorokból "előregörgetve" tölti ki a kategóriát.
 * @returns {{ tetelek: object[], hibasSorok: { sorIndex:number, ok:string }[] }}
 */
export function buildKatalogusTetelekFromRows(sorok, columnMap) {
  const tetelek = [];
  const hibasSorok = [];
  const vanKategoriaOszlop = columnMap.kategoria !== undefined;
  let aktKategoria = "";

  sorok.forEach((sor, i) => {
    if (!vanKategoriaOszlop && szakaszcimSor(sor, columnMap)) {
      aktKategoria = String(sor[columnMap.megnevezes]).trim();
      return; // szakaszcím – nem önálló tétel
    }

    const megnevezes = columnMap.megnevezes !== undefined ? String(sor[columnMap.megnevezes] ?? "").trim() : "";
    if (!megnevezes) { hibasSorok.push({ sorIndex: i, ok: "Hiányzó megnevezés" }); return; }

    const arRaw = columnMap.ar !== undefined ? sor[columnMap.ar] : "";
    if (arRaw === "" || arRaw === null || arRaw === undefined) {
      hibasSorok.push({ sorIndex: i, ok: "Hiányzó díj (ár)" });
      return;
    }
    const ar = toNumber(arRaw);

    tetelek.push({
      kod:        columnMap.kod        !== undefined ? String(sor[columnMap.kod] ?? "").trim() : "",
      megnevezes,
      egyseg:     columnMap.egyseg     !== undefined ? String(sor[columnMap.egyseg] ?? "").trim() || "db" : "db",
      ar,
      kmDij:      columnMap.kmDij      !== undefined ? toKmDij(sor[columnMap.kmDij]) : false,
      kmKuszobKm: columnMap.kmKuszobKm !== undefined ? toNumber(sor[columnMap.kmKuszobKm]) : 0,
      kategoria:  vanKategoriaOszlop ? String(sor[columnMap.kategoria] ?? "").trim() : aktKategoria,
      megjegyzes: columnMap.megjegyzes !== undefined ? String(sor[columnMap.megjegyzes] ?? "").trim() : "",
      aktiv: true,
    });
  });

  return { tetelek, hibasSorok };
}
