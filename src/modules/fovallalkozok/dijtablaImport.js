/**
 * dijtablaImport.js
 * Fővállalkozói díjtábla Excel/CSV import – tiszta (React-mentes) logika.
 *
 * Folyamat:
 *   1. parseFile(file)              → munkalapok tömbje (array-of-arrays)
 *   2. detectHeaderRow(aoa)         → a fejléc sor indexe
 *   3. autoMapColumns(headerRow)    → CRM mező → oszlopindex
 *   4. buildTetelek(aoa, hdr, map)  → beszúrható díjtétel objektumok
 *
 * A csoportfejléc-sorokat (pl. "A) ALAPTELEPÍTÉS…") felismeri: ezeknél a
 * megnevezés üres, a szöveg a `csoport` lesz a következő adatsoroknál.
 */

import * as XLSX from "xlsx";

// ─── Segéd: ékezet- és kisbetű-független normalizálás ─────────
function norm(s) {
  return String(s ?? "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim();
}

// ─── Fájl beolvasása → munkalapok (array-of-arrays) ───────────
export async function parseFile(file) {
  const isCsv = /\.csv$/i.test(file.name);
  let wb;
  if (isCsv) {
    const text = await file.text();
    wb = XLSX.read(text, { type: "string" });
  } else {
    const buf = await file.arrayBuffer();
    wb = XLSX.read(buf, { type: "array" });
  }
  return wb.SheetNames.map(name => ({
    name,
    aoa: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, blankrows: false, defval: "" }),
  }));
}

// ─── CRM mezők kulcsszavai (a fejléc-felismeréshez) ───────────
const FIELD_KEYWORDS = {
  kod:        ["#", "kod", "kód", "sorszam", "azonosito", "cikkszam"],
  csoport:    ["csoport", "kategoria", "fejezet", "szekcio", "munkanem-csoport"],
  megnevezes: ["munkanem", "megnevezes", "tetel", "szolgaltatas", "munkanev", "feladat"],
  egyseg:     ["egyseg", "mertekegyseg", "egys", "m.e"],
  nettoDij:   ["dij", "ar", "netto", "osszeg", "egysegar", "munkadij"],
  kmDijas:    ["km", "kiszallas", "km-dij"],
  megjegyzes: ["megjegyzes", "feltetel", "info", "leiras", "kikotes"],
};

// A specifikusabb mezők előbb foglalják le a legjobb oszlopot.
const FIELD_ORDER = ["kod", "csoport", "megnevezes", "egyseg", "nettoDij", "kmDijas", "megjegyzes"];

/**
 * Megkeresi a fejléc sort: az első ~15 sorból az, amelyik a legtöbb
 * ismert kulcsszót tartalmazza (min. 2 találat).
 */
export function detectHeaderRow(aoa) {
  const limit = Math.min(aoa.length, 15);
  let best = -1, bestScore = 1;
  const allKw = Object.values(FIELD_KEYWORDS).flat();
  for (let i = 0; i < limit; i++) {
    const cells = (aoa[i] || []).map(norm);
    let score = 0;
    cells.forEach(c => { if (c && allKw.some(kw => c.includes(kw))) score++; });
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best; // -1, ha nem talált egyértelmű fejlécet
}

/**
 * Fejléc → { mező: oszlopindex } auto-megfeleltetés.
 * Minden oszlop legfeljebb egy mezőhöz rendelődik (mohó, kulcsszó-hossz súlyozva).
 */
export function autoMapColumns(headerRow) {
  const cells = (headerRow || []).map(norm);
  const mapping = {};
  const used = new Set();
  for (const field of FIELD_ORDER) {
    let best = -1, bestScore = 0;
    cells.forEach((h, i) => {
      if (used.has(i) || !h) return;
      const score = FIELD_KEYWORDS[field].reduce((s, kw) => h.includes(kw) ? s + kw.length : s, 0);
      if (score > bestScore) { bestScore = score; best = i; }
    });
    mapping[field] = best;
    if (best >= 0) used.add(best);
  }
  return mapping;
}

// ─── Érték-parszerek ──────────────────────────────────────────
function parseNumber(v) {
  if (typeof v === "number") return v;
  const digits = String(v ?? "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

function parseKm(v) {
  return /km/i.test(String(v ?? ""));
}

const EGYSEG_MAP = {
  panel: "panel", db: "db", darab: "db", "m": "m", meter: "m", méter: "m",
  km: "km", ora: "ora", óra: "ora", h: "ora", alkalom: "alkalom", alk: "alkalom",
};
function parseEgyseg(v) {
  const n = norm(v);
  if (EGYSEG_MAP[n]) return EGYSEG_MAP[n];
  // részleges egyezés (pl. "panel/db")
  for (const key of Object.keys(EGYSEG_MAP)) {
    if (n.includes(key)) return EGYSEG_MAP[key];
  }
  return n ? "db" : "db";
}

function parseMinMennyiseg(text) {
  const m = String(text ?? "").match(/(?:minimum|min\.?)\s*(\d+)/i);
  return m ? Number(m[1]) : 0;
}

function parseEgyediFelett(text) {
  const m = String(text ?? "").match(/(\d+)\s*\S*\s*(?:felett|folott|fölött)\s*egyedi/i);
  return m ? Number(m[1]) : null;
}

/**
 * Adatsorok → díjtétel objektumok. Csoportfejléc-sorok felismerésével.
 * @returns { rows: object[], skipped: number, groups: string[] }
 */
export function buildTetelek(aoa, headerRowIndex, mapping) {
  const rows = [];
  const groups = new Set();
  let skipped = 0;
  let currentCsoport = "";

  const val = (row, field) => {
    const idx = mapping[field];
    return (idx != null && idx >= 0) ? row[idx] : "";
  };
  const firstNonEmpty = row => (row || []).find(c => String(c ?? "").trim() !== "") ?? "";

  for (let i = headerRowIndex + 1; i < aoa.length; i++) {
    const row = aoa[i] || [];
    if (row.every(c => String(c ?? "").trim() === "")) continue;

    const megnevezes = String(val(row, "megnevezes") ?? "").trim();
    const dijRaw = val(row, "nettoDij");
    const dij = parseNumber(dijRaw);

    // Csoportfejléc: nincs megnevezés (vagy nincs díj és csak egy cellában van szöveg)
    if (!megnevezes) {
      const label = String(val(row, "csoport") || firstNonEmpty(row) || "").trim();
      if (label) { currentCsoport = label; groups.add(label); }
      continue;
    }

    if (dij == null) { skipped++; continue; } // nincs értelmezhető díj → kihagyjuk

    const csoport = String(val(row, "csoport") || currentCsoport || "").trim();
    if (csoport) groups.add(csoport);
    const megjegyzes = String(val(row, "megjegyzes") ?? "").trim();

    rows.push({
      kod:            String(val(row, "kod") ?? "").trim(),
      csoport,
      megnevezes,
      egyseg:         parseEgyseg(val(row, "egyseg")),
      nettoDij:       dij,
      kmDijas:        mapping.kmDijas >= 0 ? parseKm(val(row, "kmDijas")) : false,
      minMennyiseg:   parseMinMennyiseg(`${megnevezes} ${megjegyzes}`),
      egyediArFelett: parseEgyediFelett(`${megnevezes} ${megjegyzes}`),
      megjegyzes,
      aktiv:          true,
    });
  }

  return { rows, skipped, groups: Array.from(groups) };
}

// A megfeleltetés UI-hoz: a választható CRM mezők.
export const IMPORT_MEZOK = [
  { id: "kod",        label: "Kód",        required: false },
  { id: "csoport",    label: "Csoport",    required: false },
  { id: "megnevezes", label: "Megnevezés", required: true  },
  { id: "egyseg",     label: "Egység",     required: false },
  { id: "nettoDij",   label: "Nettó díj",  required: true  },
  { id: "kmDijas",    label: "Km-díj",     required: false },
  { id: "megjegyzes", label: "Megjegyzés", required: false },
];
