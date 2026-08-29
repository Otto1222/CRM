/**
 * anyagtorzsExcelImport.js
 * Fővállalkozói anyaglista (raktár-cikkjegyzék) Excel/CSV importja – ugyanaz
 * a minta, mint dijtablaExcelImport.js-nél: nincs fix oszlopsorrend, a
 * felhasználó rendeli hozzá az oszlopokat, a hibás sorokat NEM dobjuk el
 * csendben.
 *
 * A "Cikkcsoport" oszlopot (pl. Green-Home anyaglistájának "D" oszlopa)
 * megpróbáljuk ráilleszteni a már létező AJANLAT_KATEGORIAK listára (ld.
 * anyagtorzs.js) – ez ugyanaz a mező, amit a Raktárkészlet oldal a
 * kategóriás csoportosításhoz használ, tehát egyezés esetén az importált
 * tétel rögtön a megfelelő csoportba kerül, külön admin-beállítás nélkül.
 * Amit nem tud egyeztetni (pl. egy márkanév a cikkcsoport-oszlopban), azt
 * "egyéb"-be teszi, az eredeti szöveget pedig megőrzi a megjegyzésben – így
 * semmi nem tűnik el némán, csak nem kap saját csoportot.
 */
import * as XLSX from "xlsx";
import { AJANLAT_KATEGORIAK } from "./anyagtorzs.js";

export const ANYAGTORZS_MEZOK = [
  { key: "kulsoAzonosito", label: "Cikkszám",       kotelezo: false },
  { key: "nev",            label: "Megnevezés",     kotelezo: true },
  { key: "egyseg",         label: "Egység (Me)",    kotelezo: false },
  { key: "kategoria",      label: "Cikkcsoport",    kotelezo: false },
  { key: "keszlet",        label: "Készlet (opc.)", kotelezo: false },
  { key: "netto_egysegar", label: "Nettó ár (opc.)",kotelezo: false },
  { key: "megjegyzes",     label: "Megjegyzés",     kotelezo: false },
];

const KATEGORIA_NORM_TERKEP = new Map(
  AJANLAT_KATEGORIAK.map(k => [normSzoveg(k.label), k.id])
);

function normSzoveg(s) {
  return String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function parseAnyagtorzsExcelFile(file) {
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

export function guessAnyagtorzsColumnMap(fejlec) {
  const map = {};
  const patterns = {
    kulsoAzonosito: [/cikksz[aá]m/, /^kod$/, /^k[oó]d$/, /azonos[ií]t[oó]/, /sku/i],
    nev:            [/megnevez/, /^n[eé]v$/, /term[eé]k/, /le[ií]r[aá]s/],
    egyseg:         [/^me$/, /^egys[eé]g$/, /m[eé]rt[eé]kegys/],
    kategoria:      [/cikkcsoport/, /kateg[oó]ria/, /csoport/],
    keszlet:        [/k[eé]szlet/, /mennyis[eé]g/],
    netto_egysegar: [/nett[oó] ?[aá]r/, /egys[eé]g[aá]r/, /^[aá]r$/, /besz[eé]rz/],
    megjegyzes:     [/megjegyz/, /note/],
  };
  fejlec.forEach((h, idx) => {
    const n = normSzoveg(h);
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

/** "db." → "db" – néhány valódi lista pontot tesz a mértékegység után. */
function normEgyseg(v) {
  return String(v ?? "").trim().replace(/\.$/, "") || "db";
}

/**
 * A cikkcsoport szövegét megpróbálja ráilleszteni egy AJANLAT_KATEGORIAK
 * id-ra (pontos, ékezet/kis-nagybetű-független egyezés). Ha nem talál
 * egyezést, "egyeb"-et ad vissza – az eredeti szöveg elvesztése nélkül a
 * hívó (buildAnyagokFromRows) a megjegyzésbe teszi.
 */
export function illesztCikkcsoport(nyersSzoveg) {
  const talalat = KATEGORIA_NORM_TERKEP.get(normSzoveg(nyersSzoveg));
  return talalat || "egyeb";
}

/**
 * A nyers sorokból anyagtörzs-tétel objektumokat épít.
 * @returns {{ tetelek: object[], hibasSorok: { sorIndex:number, ok:string }[] }}
 */
export function buildAnyagokFromRows(sorok, columnMap) {
  const tetelek = [];
  const hibasSorok = [];

  sorok.forEach((sor, i) => {
    const nev = columnMap.nev !== undefined ? String(sor[columnMap.nev] ?? "").trim() : "";
    if (!nev) { hibasSorok.push({ sorIndex: i, ok: "Hiányzó megnevezés" }); return; }

    const nyersKategoria = columnMap.kategoria !== undefined ? String(sor[columnMap.kategoria] ?? "").trim() : "";
    const kategoria = nyersKategoria ? illesztCikkcsoport(nyersKategoria) : "egyeb";
    const kategoriaEgyeztetetlen = nyersKategoria && kategoria === "egyeb";

    tetelek.push({
      kulsoAzonosito: columnMap.kulsoAzonosito !== undefined ? String(sor[columnMap.kulsoAzonosito] ?? "").trim() : "",
      nev,
      egyseg:         columnMap.egyseg    !== undefined ? normEgyseg(sor[columnMap.egyseg]) : "db",
      kategoria,
      keszlet:        columnMap.keszlet        !== undefined ? toNumber(sor[columnMap.keszlet]) : 0,
      netto_egysegar: columnMap.netto_egysegar !== undefined ? toNumber(sor[columnMap.netto_egysegar]) : 0,
      megjegyzes: [
        columnMap.megjegyzes !== undefined ? String(sor[columnMap.megjegyzes] ?? "").trim() : "",
        kategoriaEgyeztetetlen ? `Eredeti cikkcsoport: ${nyersKategoria}` : "",
      ].filter(Boolean).join(" – "),
      aktiv: true,
    });
  });

  return { tetelek, hibasSorok };
}
