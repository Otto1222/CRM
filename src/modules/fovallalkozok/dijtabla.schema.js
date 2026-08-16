/**
 * dijtabla.schema.js
 * Fővállalkozói díjtábla – tételes munkadíj-katalógus.
 *
 * Egy díjtétel = a fővállalkozói ártábla egy sora (pl. a Green Home Excel
 * "A01 – Napelem kivitelezés" sora). Fővállalkozónként külön tábla.
 *
 * Ez a "tételes elszámolás" alapja: a jelenlegi 5-módú szabály (fix/darab/
 * savos/km/fix_kiszallas) mellett él; ahol van díjtábla + hozzárendelt tétel,
 * ott a tételes számolás az elsődleges (ld. rendszerterv 07. szakasz).
 */

// ─── Egységek (a díjtétel mértékegysége) ──────────────────────
export const DIJTETEL_EGYSEGEK = [
  { id: "panel",   label: "panel" },
  { id: "db",      label: "db" },
  { id: "m",       label: "méter" },
  { id: "km",      label: "km" },
  { id: "ora",     label: "óra" },
  { id: "alkalom", label: "alkalom" },
];

export function egysegLabel(id) {
  return DIJTETEL_EGYSEGEK.find(e => e.id === id)?.label || id || "db";
}

// ─── Adatmodell ───────────────────────────────────────────────
export const DIJTETEL_SCHEMA = {
  id:             "",
  fovallalkozoId: "",
  kod:            "",       // "A01", "B02" … (a fővállalkozó saját kódja)
  csoport:        "",       // "A) Alaptelepítés / kivitelezés"
  megnevezes:     "",
  egyseg:         "db",     // DIJTETEL_EGYSEGEK id-je
  nettoDij:       0,        // nettó Ft / egység
  kmDijas:        false,    // az L) pont szerinti kiszállási díj hozzáadható-e
  minMennyiseg:   0,        // 0 = nincs minimum (pl. "min. 10 panel")
  egyediArFelett: null,     // e mennyiség felett egyedi (kézi) ár – null = nincs
  megjegyzes:     "",
  aktiv:          true,
  forras:         "kezi",   // "kezi" | "import" | "seed"
  createdAt:      "",
};

// ─── Green Home díjtábla – seed (2026. július, keretszerződés 2. melléklet) ──
// Az Excel 1:1 leképezése. A csoportfejlécek nem külön tételek, hanem a
// `csoport` mezőben jelennek meg.
const GH = (kod, csoport, megnevezes, egyseg, nettoDij, kmDijas, extra = {}) =>
  ({ kod, csoport, megnevezes, egyseg, nettoDij, kmDijas, ...extra });

export const GREEN_HOME_DIJTABLA = [
  // A) Alaptelepítés / kivitelezés
  GH("A01", "A) Alaptelepítés / kivitelezés", "Napelem kivitelezés – teljes anyagvásárlással", "panel", 17500, true,  { minMennyiseg: 10, egyediArFelett: 30, megjegyzes: "Minimum 10 panel (alatta is a 10 paneles ár); 30 panel felett egyedi ár" }),
  GH("A02", "A) Alaptelepítés / kivitelezés", "Napelem kivitelezés – részleges anyagvásárlással", "panel", 17500, true, { minMennyiseg: 10, egyediArFelett: 30, megjegyzes: "Minimum 10 panel (alatta is a 10 paneles ár); 30 panel felett egyedi ár" }),
  GH("A03", "A) Alaptelepítés / kivitelezés", "Panelbővítés teljes anyagvásárlással (extra panel utólag)", "panel", 20000, true, { minMennyiseg: 6, egyediArFelett: 30, megjegyzes: "Minimum 6 panel (alatta is a 6 paneles ár); 30 panel felett egyedi ár" }),
  GH("A04", "A) Alaptelepítés / kivitelezés", "Rendszer rákötés / beüzemelés külön kiszállással", "db", 50000, true),
  GH("A05", "A) Alaptelepítés / kivitelezés", "Teljes rendszer felülvizsgálat 20 kW-ig", "db", 50000, true),
  GH("A06", "A) Alaptelepítés / kivitelezés", "Teljes rendszer felülvizsgálat 20–50 kW", "db", 95000, true),

  // B) Inverter és akkumulátor
  GH("B01", "B) Inverter és akkumulátor", "Inverter csere (önállóan)", "db", 50000, true),
  GH("B02", "B) Inverter és akkumulátor", "Inverter csere + akkumulátor beépítés + mérés", "db", 100000, true, { megjegyzes: "Mérő, LoRa vagy WiFi mérőeszköz nélkül" }),
  GH("B03", "B) Inverter és akkumulátor", "Akkumulátor beépítés kivitelezéssel", "db", 20000, false, { megjegyzes: "Mérés nélkül" }),
  GH("B04", "B) Inverter és akkumulátor", "Akkumulátor beépítés, bővítés vagy csere külön kiszállással", "db", 50000, true, { megjegyzes: "Mérés nélkül" }),
  GH("B05", "B) Inverter és akkumulátor", "Akkumulátor paraméter-konfigurálás", "db", 30000, true),

  // C) Mérés és csatlakozás
  GH("C01", "C) Mérés és csatlakozás", "Smart meter beépítés kivitelezéssel", "db", 20000, false, { megjegyzes: "A smart metert a Green Home biztosítja; a díj a beépítés munkadíja" }),
  GH("C02", "C) Mérés és csatlakozás", "Smart meter beépítés külön kiszállással", "db", 50000, true, { megjegyzes: "A smart metert a Green Home biztosítja; a díj a beépítés munkadíja" }),
  GH("C03", "C) Mérés és csatlakozás", "Vezeték nélküli mérés kialakítása", "db", 20000, false, { megjegyzes: "Az eszközöket a Green Home biztosítja; a díj a kialakítás munkadíja" }),
  GH("C04", "C) Mérés és csatlakozás", "Vezeték nélküli mérés kialakítása külön kiszállással", "db", 50000, true, { megjegyzes: "Az eszközöket a Green Home biztosítja; a díj a kialakítás munkadíja" }),
  GH("C05", "C) Mérés és csatlakozás", "Csatlakozási pont kialakítása (főelosztó átalakítás)", "db", 20000, false),
  GH("C06", "C) Mérés és csatlakozás", "Csatlakozási pont kialakítása külön kiszállással", "db", 50000, true),
  GH("C07", "C) Mérés és csatlakozás", "Mérési pont kialakítása (fogadódobozban)", "db", 20000, false),
  GH("C08", "C) Mérés és csatlakozás", "Mérési pont kialakítása külön kiszállással", "db", 50000, true),

  // D) Backup rendszerek
  GH("D01", "D) Backup rendszerek", "Kis backup box (Deye / Anker / SigenSTOR)", "db", 20000, false),
  GH("D02", "D) Backup rendszerek", "Kis backup box külön kiszállással", "db", 50000, true),
  GH("D03", "D) Backup rendszerek", "Full backup kiépítés – Deye", "db", 100000, true, { megjegyzes: "Külön kiszállással; ha telepítés mellett napon belül elkészül, a teljes díj jár km-díj nélkül" }),
  GH("D04", "D) Backup rendszerek", "Full backup kiépítés – Huawei", "db", 100000, true, { megjegyzes: "Külön kiszállással; a külső eszközt nem tartalmazza" }),
  GH("D05", "D) Backup rendszerek", "Full backup kiépítés – SolarEdge", "db", 100000, true, { megjegyzes: "Külön kiszállással; a külső eszközt nem tartalmazza" }),
  GH("D06", "D) Backup rendszerek", "Full backup kiépítés – Sigen 1 fázis", "db", 100000, true, { megjegyzes: "Külön kiszállással; a külső eszközt nem tartalmazza" }),
  GH("D07", "D) Backup rendszerek", "Full backup kiépítés – Sigen 3 fázis", "db", 100000, true, { megjegyzes: "Külön kiszállással; a külső eszközt nem tartalmazza" }),

  // E) EV töltő
  GH("E01", "E) EV töltő", "EV töltő kiépítése (AC oldali bekötés, töltő nélkül)", "db", 20000, false, { megjegyzes: "A töltőt nem tartalmazza; AC kábelt 5 méterig tartalmaz" }),
  GH("E02", "E) EV töltő", "EV töltő kiépítése külön kiszállással", "db", 50000, true, { megjegyzes: "A töltőt nem tartalmazza; AC kábelt 5 méterig tartalmaz" }),
  GH("E03", "E) EV töltő", "EV töltő nyomvonal felár (5 m felett)", "m", 1000, false, { megjegyzes: "Méterenként, 5 m felett" }),

  // J) Bontás / leszerelés
  GH("J01", "J) Bontás / leszerelés", "Optimalizáló leszedés", "panel", 8000, false),
  GH("J02", "J) Bontás / leszerelés", "Panel és tartó leszerelés", "panel", 17500, false),
  GH("J03", "J) Bontás / leszerelés", "Inverter le- és visszaszerelése (épületszigeteléshez)", "db", 100000, true, { megjegyzes: "Két külön kiszállás – 2× kiszállási díj + munkadíj" }),

  // K) Support és szerviz
  GH("K01", "K) Support és szerviz", "Support munkadíj", "ora", 15500, false, { megjegyzes: "Óradíj" }),
  GH("K02", "K) Support és szerviz", "Support alap kiszállási díj", "db", 35500, true, { megjegyzes: "Minden kiszállás alapdíja; tartalmazza az első órát, utána óradíj" }),

  // L) Kiszállási díjak (a km-díjas tételek kiszállási díjának forrása)
  GH("L01", "L) Kiszállási díjak", "Kiszállási díj – kivitelezési munkák", "km", 210, false, { megjegyzes: "A km-díjas tételekhez oda-vissza számolva" }),
  GH("L02", "L) Kiszállási díjak", "Kiszállási díj – support munkák", "km", 210, false, { megjegyzes: "A support km-díjas tételekhez oda-vissza számolva" }),

  // M) Egyéb
  GH("M01", "M) Egyéb", "Meghiúsult kivitelezés (ügyfél hibájából) – pótdíj", "alkalom", 150000, true, { megjegyzes: "Ha a kivitelezés az ügyfél hibájából hiúsul meg a helyszínen" }),
];

// ─── Csoportosítás (megjelenítéshez) ──────────────────────────
export function groupByCsoport(tetelek) {
  const map = new Map();
  (tetelek || []).forEach(t => {
    const key = t.csoport || "Egyéb";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(t);
  });
  return Array.from(map.entries()).map(([csoport, items]) => ({ csoport, items }));
}
