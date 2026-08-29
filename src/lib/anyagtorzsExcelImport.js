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
import { AJANLAT_KATEGORIAK, TELEPITOI_KATEGORIAK } from "./anyagtorzs.js";

export const ANYAGTORZS_MEZOK = [
  { key: "kulsoAzonosito", label: "Cikkszám",       kotelezo: false },
  { key: "nev",            label: "Megnevezés",     kotelezo: true },
  { key: "egyseg",         label: "Egység (Me)",    kotelezo: false },
  { key: "kategoria",      label: "Cikkcsoport",    kotelezo: false },
  { key: "keszlet",        label: "Készlet (opc.)", kotelezo: false },
  { key: "netto_egysegar", label: "Nettó ár (opc.)",kotelezo: false },
  { key: "megjegyzes",     label: "Megjegyzés",     kotelezo: false },
];

function normSzoveg(s) {
  return String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const AJANLAT_KAT_NORM  = new Map(AJANLAT_KATEGORIAK.map(k => [normSzoveg(k.label), k.id]));
const AJANLAT_KAT_LABEL = Object.fromEntries(AJANLAT_KATEGORIAK.map(k => [k.id, k.label]));
const TELEPITOI_KAT_NORM = new Map(TELEPITOI_KATEGORIAK.map(k => [normSzoveg(k.label), k.id]));

// Másodlagos, kulcsszavas illesztés a telepítői kategóriákhoz – különböző
// fővállalkozók más-más szót használnak ugyanarra (pl. "Kábelcsatorna",
// "Csövek", "Kábeltálca" mind a "Védőcső / Tálca" alá valók), ezért a
// pontos label-egyezés önmagában nem elég. Csak akkor fut, ha a pontos
// egyezés (TELEPITOI_KAT_NORM) nem talált semmit.
const TELEPITOI_KULCSSZAVAK = [
  { re: /cs[oö]v|csatorna|t[aá]lca/, id: "vedocso_talca" },
  { re: /f[oö]ldel/,                   id: "foldeles" },
  { re: /bilincs|r[oö]gz[ií]t[oő]|csavar/, id: "rogzito" },
  { re: /tart[oó]szerkezet|s[ií]n\b/,  id: "tartoszerk_any" },
  { re: /csatlakoz[oó]/,               id: "csatlakozo" },
  { re: /k[aá]bel/,                    id: "kabel" },
];

function illesztAjanlatKategoria(nyersSzoveg) {
  return AJANLAT_KAT_NORM.get(normSzoveg(nyersSzoveg)) || null;
}

function illesztTelepitoiKategoria(nyersSzoveg) {
  const n = normSzoveg(nyersSzoveg);
  if (TELEPITOI_KAT_NORM.has(n)) return TELEPITOI_KAT_NORM.get(n);
  const talalat = TELEPITOI_KULCSSZAVAK.find(k => k.re.test(n));
  return talalat?.id || null;
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
 * A cikkcsoport szövegét megpróbálja ráilleszteni EGYSZERRE a két meglévő
 * kategória-rendszerre:
 *   - AJANLAT_KATEGORIAK ("kategoria" mező) – teljes termékkör (napelem,
 *     inverter, akku…), ezt használja a Raktárkészlet oldal csoportosítása.
 *   - TELEPITOI_KATEGORIAK ("telepitoi_kategoria" mező) – "kellékanyag
 *     csoport": ezt mutatja az Anyagtörzs lista és ezt használja a "mit
 *     vigyen a csapat" tétel-választó (AnyagKosarPicker).
 * Különböző fővállalkozók más-más szemléletű listát adnak (pl. Green-Home:
 * "Akkumulátorok"/"Inverterek" → az első rendszerre illik pontosan;
 * Wagner-Solar: "Kábelek"/"Csatlakozók"/"Kábelcsatorna" → a másodikra) –
 * ezért mindkettőt megpróbáljuk.
 *
 * A "kellékanyag csoport" (telepitoi_kategoria) SOSEM marad üres, ha a
 * forrásban egyáltalán volt cikkcsoport-szöveg – a felhasználói elvárás
 * szerint minden fővállalkozónál a saját cikkcsoport-megnevezése legyen a
 * kellékanyag csoport, ne csak a hét fixen felsorolt TELEPITOI_KATEGORIAK
 * egyike. Sorrend:
 *   1. pontos/kulcsszavas egyezés a TELEPITOI_KATEGORIAK listával → annak id-ja
 *      (ismert fül/szűrő van hozzá az Anyagtörzs oldalon),
 *   2. különben, ha az AJANLAT_KATEGORIAK-kal egyezik → annak FELIRAT-szövege
 *      (pl. "Akkumulátorok") szabad szövegként – a megjelenítés (AnyagSor,
 *      AnyagKosarPicker) ismeretlen id-nál is a nyers értéket írja ki,
 *      tehát helyesen jelenik meg, csak nincs hozzá fix szűrő-gomb,
 *   3. különben maga az eredeti cikkcsoport-szöveg, változtatás nélkül.
 */
function illesztKategoriak(nyersSzoveg) {
  const ajanlatKat   = illesztAjanlatKategoria(nyersSzoveg);
  const telepitoiKat = illesztTelepitoiKategoria(nyersSzoveg);
  const kategoria    = ajanlatKat || (telepitoiKat ? "villanyszereles" : "egyeb");
  const kellekanyagCsoport = telepitoiKat || (ajanlatKat ? AJANLAT_KAT_LABEL[ajanlatKat] : null) || nyersSzoveg.trim() || null;
  return { kategoria, telepitoiKat: kellekanyagCsoport };
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
    const { kategoria, telepitoiKat } = nyersKategoria
      ? illesztKategoriak(nyersKategoria)
      : { kategoria: "egyeb", telepitoiKat: null };

    tetelek.push({
      kulsoAzonosito: columnMap.kulsoAzonosito !== undefined ? String(sor[columnMap.kulsoAzonosito] ?? "").trim() : "",
      nev,
      egyseg:         columnMap.egyseg    !== undefined ? normEgyseg(sor[columnMap.egyseg]) : "db",
      kategoria,
      ...(telepitoiKat ? { telepitoi_kategoria: telepitoiKat } : {}),
      keszlet:        columnMap.keszlet        !== undefined ? toNumber(sor[columnMap.keszlet]) : 0,
      netto_egysegar: columnMap.netto_egysegar !== undefined ? toNumber(sor[columnMap.netto_egysegar]) : 0,
      megjegyzes:     columnMap.megjegyzes !== undefined ? String(sor[columnMap.megjegyzes] ?? "").trim() : "",
      aktiv: true,
    });
  });

  return { tetelek, hibasSorok };
}
