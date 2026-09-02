/**
 * projektBulkImport.js
 * Tömeges projekt-import Excel/CSV-ből – ugyanaz a minta, mint
 * anyagtorzsExcelImport.js / dijtablaExcelImport.js: nincs fix
 * oszlopsorrend, a felhasználó rendeli hozzá az oszlopokat, a hibás
 * sorokat NEM dobjuk el csendben.
 *
 * Sok egyforma jellegű, kis munka egyszerre felviteléhez (pl. sok
 * helyszínen egyenként elvégzendő felmérés/mérés egy fővállalkozói
 * megbízás alatt) – nem napelem-specifikus, bármilyen munkatípushoz
 * használható. A "közös" mezőket (fővállalkozó, projektvezető, csapat,
 * munkatípus, anyagelszámolási mód) a felhasználó az import egy
 * lépésében adja meg, EGYSZER az egész fájlhoz – a soronkénti (Excelből
 * jövő) mezők csak a helyszínenként eltérő adatok.
 */
import * as XLSX from "xlsx";

export const PROJEKT_IMPORT_MEZOK = [
  { key: "clientNev",      label: "Ügyfél / helyszín neve", kotelezo: true },
  { key: "kulsoAzonosito", label: "Külső azonosító / munkaszám", kotelezo: false },
  { key: "telepitesiCim",  label: "Telepítési cím", kotelezo: false },
  { key: "kapcsolattarto", label: "Kapcsolattartó", kotelezo: false },
  { key: "clientTel",      label: "Telefon", kotelezo: false },
  { key: "clientEmail",    label: "E-mail", kotelezo: false },
  { key: "tervezettKezdes",label: "Tervezett dátum (opc.)", kotelezo: false },
  { key: "fovMegjegyzes",  label: "Megjegyzés (opc.)", kotelezo: false },
];

function normSzoveg(s) {
  return String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function guessProjektColumnMap(fejlec) {
  const map = {};
  const patterns = {
    clientNev:       [/ügyfél.*n[eé]v/, /helysz[ií]n.*n[eé]v/, /^n[eé]v$/, /megnevez/],
    kulsoAzonosito:  [/k[uü]ls[oő].*azonos[ií]t/, /munkasz[aá]m/, /site.*k[oó]d/, /^k[oó]d$/],
    telepitesiCim:   [/telep[ií]t[eé]si c[ií]m/, /^c[ií]m$/, /helysz[ií]n c[ií]m/, /c[ií]m$/],
    kapcsolattarto:  [/kapcsolattart[oó]/],
    clientTel:       [/telefon/, /^tel$/],
    clientEmail:     [/e-?mail/],
    tervezettKezdes: [/d[aá]tum/, /terv/],
    fovMegjegyzes:   [/megjegyz/, /note/],
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

function toDateStr(v) {
  if (!v) return "";
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return "";
  // ISO / pont-elválasztós magyar dátum (2026.09.14. vagy 2026-09-14)
  const m = s.match(/^(\d{4})[.\-](\d{1,2})[.\-](\d{1,2})\.?$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  return s;
}

export function parseProjektExcelFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error("Nincs kiválasztott fájl.")); return; }
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      reject(new Error("Csak .xlsx, .xls vagy .csv fájl fogadható el."));
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb   = XLSX.read(e.target.result, { type: "array", cellDates: true });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        const fejlecIdx = Math.max(0, rows.findIndex(r => r.filter(c => String(c ?? "").trim() !== "").length >= 2));
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

/**
 * A nyers sorokból projekt-tétel objektumokat épít (még nem menti el őket –
 * ld. ProjektBulkImportPanel.jsx, ami a közös mezőkkel kiegészítve hívja
 * meg a createProjekt()-et soronként).
 */
export function buildProjektekFromRows(sorok, columnMap) {
  const tetelek = [];
  const hibasSorok = [];

  sorok.forEach((sor, i) => {
    const clientNev = columnMap.clientNev !== undefined ? String(sor[columnMap.clientNev] ?? "").trim() : "";
    if (!clientNev) { hibasSorok.push({ sorIndex: i, ok: "Hiányzó ügyfél/helyszín név" }); return; }

    tetelek.push({
      clientNev,
      kulsoAzonosito:  columnMap.kulsoAzonosito  !== undefined ? String(sor[columnMap.kulsoAzonosito] ?? "").trim() : "",
      telepitesiCim:   columnMap.telepitesiCim   !== undefined ? String(sor[columnMap.telepitesiCim] ?? "").trim() : "",
      kapcsolattarto:  columnMap.kapcsolattarto  !== undefined ? String(sor[columnMap.kapcsolattarto] ?? "").trim() : "",
      clientTel:       columnMap.clientTel       !== undefined ? String(sor[columnMap.clientTel] ?? "").trim() : "",
      clientEmail:     columnMap.clientEmail     !== undefined ? String(sor[columnMap.clientEmail] ?? "").trim() : "",
      tervezettKezdes: columnMap.tervezettKezdes !== undefined ? toDateStr(sor[columnMap.tervezettKezdes]) : "",
      fovMegjegyzes:   columnMap.fovMegjegyzes   !== undefined ? String(sor[columnMap.fovMegjegyzes] ?? "").trim() : "",
    });
  });

  return { tetelek, hibasSorok };
}
