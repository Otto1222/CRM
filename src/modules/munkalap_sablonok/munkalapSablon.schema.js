/**
 * munkalapSablon.schema.js
 * Munkalap sablon adatmodell + mezőtípusok + 7 gyári sablon.
 * Gyári sablon: gyari:true → nem törölhető, csak másolható/inaktiválható.
 */

// ─── Mezőtípusok ─────────────────────────────────────────────

export const MEZO_TIPUSOK = [
  { id: "szoveg",              label: "Szöveg",              ikon: "Aa",  leiras: "Egyszerű szöveges bevitel" },
  { id: "hosszu_szoveg",       label: "Hosszú szöveg",       ikon: "≡",   leiras: "Többsoros szöveges mező" },
  { id: "szam",                label: "Szám",                ikon: "#",   leiras: "Numerikus érték, mértékegység + min/max" },
  { id: "datum",               label: "Dátum",               ikon: "📅",  leiras: "Dátumválasztó" },
  { id: "ido",                 label: "Idő",                 ikon: "⏰",  leiras: "Időpont (óra:perc)" },
  { id: "igen_nem",            label: "Igen / Nem",          ikon: "☑",   leiras: "Kétállapotú kapcsoló" },
  { id: "legordulo",           label: "Legördülő lista",     ikon: "▼",   leiras: "Előre megadott opciók közül választás" },
  { id: "alairas",             label: "Aláírás",             ikon: "✍",   leiras: "Ujjal aláírt elektronikus aláírás" },
  { id: "jelenletiIv",        label: "Jelenléti ív",        ikon: "👥",  leiras: "Helyszínen dolgozók nevei + aláírások" },
  { id: "fotoKategoria",       label: "Fotó kategória",      ikon: "📷",  leiras: "Fotókategória minimum fotószámmal" },
  { id: "anyagfelhasznalasok", label: "Anyagfelhasználás",   ikon: "📦",  leiras: "Felhasznált anyagok listája (db, egység)" },
  { id: "meresiAdat",          label: "Mérési adat",         ikon: "📏",  leiras: "Mért érték mértékegységgel + min/max ellenőrzés" },
];

// ─── Sablon beállítások definíciói ────────────────────────────

export const SABLON_BEALLITASOK_DEF = [
  { key: "kellVBF",               label: "VBF kötelező",              leiras: "Veszélyhelyzet Biztonsági Feladatlap" },
  { key: "kellLMRA",              label: "LMRA kötelező",             leiras: "Last Minute Risk Assessment" },
  { key: "kellTIG",               label: "TIG kötelező",              leiras: "Teljesítési igazolás szükséges" },
  { key: "kellJelenletiIv",      label: "Jelenléti ív kötelező",     leiras: "Munkahelyi jelenléti ív" },
  { key: "kellFotoDokumentacio",  label: "Fotódokumentáció kötelező", leiras: "Minden fotókategóriából min. 1 fotó" },
  { key: "kellAnyagfelhasznalasok", label: "Anyagfelhasználás kötelező", leiras: "Legalább 1 anyagtétel megadása szükséges" },
  { key: "kellAlairas",           label: "Aláírás kötelező",          leiras: "Ügyfél aláírása lezárás előtt" },
];

export const DEFAULT_BEALLITASOK = {
  kellVBF:                false,
  kellLMRA:               false,
  kellTIG:                false,
  kellJelenletiIv:       false,
  kellFotoDokumentacio:   false,
  kellAnyagfelhasznalasok: false,
  kellAlairas:            false,
};

// ─── Üres mező séma ──────────────────────────────────────────

export function ujMezo(tipus = "szoveg", cimke = "") {
  return {
    id:                  `mezo_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    cimke:               cimke || "",
    tipus,
    kotelezo:            false,
    // szam / meresiAdat specifikus
    mertekegyseg:        "",
    szamMin:             null,
    szamMax:             null,
    // legordulo specifikus
    legordulo_opciok:    [],
    // fotoKategoria specifikus
    foto_minDb:          1,
  };
}

export function ujFotoKategoria(label = "") {
  return {
    id:       `fkat_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    label:    label || "",
    kotelezo: false,
    minDb:    1,
  };
}

// ─── Sablon séma ─────────────────────────────────────────────

export const MUNKALAP_SABLON_SCHEMA = {
  id:             "",
  nev:            "",
  leiras:         "",
  ikon:           "📋",
  aktiv:          true,
  gyari:          false,
  beallitasok:    { ...DEFAULT_BEALLITASOK },
  mezok:          [],
  fotoKategoriak: [],
  createdAt:      "",
  updatedAt:      "",
  version:        1,
};

// ─── 7 Gyári sablon ──────────────────────────────────────────

function m(cimke, tipus, extraConfig = {}) {
  return { ...ujMezo(tipus, cimke), ...extraConfig };
}
function fk(label, minDb = 1, kotelezo = false) {
  return { ...ujFotoKategoria(label), minDb, kotelezo };
}

export const GYARI_SABLONOK = [
  // ── 1. Felmérés ──────────────────────────────────────────
  {
    id: "factory_felmeres",
    nev: "Felmérés",
    leiras: "Helyszíni felmérési napló napelemes telepítéshez",
    ikon: "📐",
    aktiv: true,
    gyari: true,
    beallitasok: {
      ...DEFAULT_BEALLITASOK,
      kellFotoDokumentacio: true,
      kellAlairas: true,
    },
    mezok: [
      m("Csatlakozási pont", "szoveg"),
      m("Csatlakozási pont állapota", "szoveg"),
      m("Tető típusa", "legordulo", {
        legordulo_opciok: ["Cserép", "Bitumenes hullámlemez", "Trapézlemez", "Betoncserép", "Egyéb"],
      }),
      m("Tetőszerkezet típusa", "legordulo", {
        legordulo_opciok: ["Szarufás", "Torokgerendás", "Szelemenes", "Egyéb"],
      }),
      m("DC kábel tervezett hossza (m)", "meresiAdat", { mertekegyseg: "m", szamMin: 0, szamMax: 500 }),
      m("AC kábel tervezett hossza (m)", "meresiAdat", { mertekegyseg: "m", szamMin: 0, szamMax: 500 }),
      m("Inverter elhelyezés leírása", "hosszu_szoveg"),
      m("Akkumulátor elhelyezés leírása", "hosszu_szoveg"),
      m("Telepítéshez szükséges emelőgép", "igen_nem"),
      m("Villámhárító van", "igen_nem"),
      m("Megközelíthetőség / megjegyzés", "hosszu_szoveg"),
      m("Felmérés időpontja", "datum"),
    ],
    fotoKategoriak: [
      fk("Tető – madártávlat", 1, true),
      fk("Csatlakozási pont", 1, true),
      fk("Villanyóra szekrény", 1, true),
      fk("Inverter tervezett helye", 1, false),
      fk("DC kábel tervezett nyomvonala", 1, false),
      fk("Egyéb", 0, false),
    ],
  },

  // ── 2. Napelemes kivitelezés ─────────────────────────────
  {
    id: "factory_napelem_kivitelezes",
    nev: "Napelemes kivitelezés",
    leiras: "Napelem rendszer telepítési munkalap – LMRA, VBF, TIG kötelező",
    ikon: "☀️",
    aktiv: true,
    gyari: true,
    beallitasok: {
      kellVBF:                true,
      kellLMRA:               true,
      kellTIG:                true,
      kellJelenletiIv:       true,
      kellFotoDokumentacio:   true,
      kellAnyagfelhasznalasok: true,
      kellAlairas:            true,
    },
    mezok: [
      m("Napelem panelek száma (db)", "szam", { mertekegyseg: "db", szamMin: 1, szamMax: 500 }),
      m("Rendszer teljesítménye", "meresiAdat", { mertekegyseg: "kWp", szamMin: 0, szamMax: 2000 }),
      m("Panel típusa / gyártó", "szoveg"),
      m("Inverter típusa / gyártó", "szoveg"),
      m("Akkumulátor beépítve", "igen_nem"),
      m("Akkumulátor típusa", "szoveg"),
      m("Hálózati szám / EDI azonosító", "szoveg"),
      m("LMRA kitöltve és aláírva", "igen_nem", { kotelezo: true }),
      m("Mért hálózati feszültség", "meresiAdat", { mertekegyseg: "V", szamMin: 180, szamMax: 260 }),
      m("Kivitelezés megjegyzés", "hosszu_szoveg"),
    ],
    fotoKategoriak: [
      fk("Tető – panel elhelyezés előtt", 2, true),
      fk("Tető – panel elhelyezés után", 2, true),
      fk("Inverter beépítve", 2, true),
      fk("DC kábelek", 1, true),
      fk("AC csatlakozás", 1, true),
      fk("Teljesítmény mérés", 1, true),
      fk("Ügyfél jelenlét", 1, false),
      fk("Egyéb", 0, false),
    ],
  },

  // ── 3. Villanyszerelés ───────────────────────────────────
  {
    id: "factory_villanyszereles",
    nev: "Villanyszerelés",
    leiras: "Általános villanyszerelési munkalap",
    ikon: "⚡",
    aktiv: true,
    gyari: true,
    beallitasok: {
      ...DEFAULT_BEALLITASOK,
      kellLMRA:             true,
      kellJelenletiIv:     true,
      kellFotoDokumentacio: true,
      kellAnyagfelhasznalasok: true,
      kellAlairas:          true,
    },
    mezok: [
      m("Munka típusa", "legordulo", {
        legordulo_opciok: ["Áramkör bővítés", "Csere / felújítás", "Hálózat felülvizsgálat", "Mérőhely kialakítás", "Egyéb"],
      }),
      m("Elvégzett munkák leírása", "hosszu_szoveg", { kotelezo: true }),
      m("Mért hálózati feszültség", "meresiAdat", { mertekegyseg: "V" }),
      m("Mért áram", "meresiAdat", { mertekegyseg: "A" }),
      m("Érintésvédelmi próba elvégzve", "igen_nem"),
      m("Megjegyzés", "hosszu_szoveg"),
    ],
    fotoKategoriak: [
      fk("Előtte", 1, false),
      fk("Elvégzett munka", 2, true),
      fk("Kapcsolótábla", 1, false),
      fk("Egyéb", 0, false),
    ],
  },

  // ── 4. Belső munka ───────────────────────────────────────
  {
    id: "factory_belso_munka",
    nev: "Belső munka",
    leiras: "Garancia, karbantartás, belső fejlesztés – nem számlázható",
    ikon: "🏢",
    aktiv: true,
    gyari: true,
    beallitasok: { ...DEFAULT_BEALLITASOK },
    mezok: [
      m("Feladat leírása", "hosszu_szoveg", { kotelezo: true }),
      m("Elvégzés módja / módszer", "hosszu_szoveg"),
      m("Időráfordítás", "szam", { mertekegyseg: "óra", szamMin: 0, szamMax: 24 }),
      m("Megállapítások / eredmény", "hosszu_szoveg"),
    ],
    fotoKategoriak: [
      fk("Előtte", 1, false),
      fk("Utána", 1, false),
    ],
  },

  // ── 5. Garanciális javítás ───────────────────────────────
  {
    id: "factory_garanciális_javítás",
    nev: "Garanciális javítás",
    leiras: "Garanciális reklamáció kezelése és javítás dokumentálása",
    ikon: "🛡️",
    aktiv: true,
    gyari: true,
    beallitasok: {
      ...DEFAULT_BEALLITASOK,
      kellFotoDokumentacio: true,
      kellAlairas:          true,
    },
    mezok: [
      m("Reklamáció száma / azonosítója", "szoveg"),
      m("Bejelentett hiba leírása", "hosszu_szoveg", { kotelezo: true }),
      m("Diagnosztika eredménye", "hosszu_szoveg", { kotelezo: true }),
      m("Elvégzett javítás leírása", "hosszu_szoveg", { kotelezo: true }),
      m("Csere alkatrészek", "anyagfelhasznalasok"),
      m("Rendszer visszaállt normál működésre", "igen_nem", { kotelezo: true }),
      m("Következő ellenőrzés szükséges", "igen_nem"),
      m("Következő ellenőrzés dátuma", "datum"),
    ],
    fotoKategoriak: [
      fk("Hiba fotó", 2, true),
      fk("Javítás közben", 1, false),
      fk("Javítás után", 2, true),
    ],
  },

  // ── 6. Karbantartás ─────────────────────────────────────
  {
    id: "factory_karbantartas",
    nev: "Karbantartás",
    leiras: "Rendszeres karbantartási ellenőrzés dokumentálása",
    ikon: "🔧",
    aktiv: true,
    gyari: true,
    beallitasok: {
      ...DEFAULT_BEALLITASOK,
      kellFotoDokumentacio: true,
      kellAlairas:          true,
    },
    mezok: [
      m("Karbantartás típusa", "legordulo", {
        legordulo_opciok: ["Éves karbantartás", "Féléves karbantartás", "Hibabejelentés utáni", "Rendkívüli"],
      }),
      m("Megvizsgált elemek", "hosszu_szoveg", { kotelezo: true }),
      m("Talált problémák / megállapítások", "hosszu_szoveg"),
      m("Mért inverter teljesítmény", "meresiAdat", { mertekegyseg: "kW" }),
      m("Mért hálózati feszültség", "meresiAdat", { mertekegyseg: "V" }),
      m("Panel tisztítás elvégezve", "igen_nem"),
      m("Következő karbantartás ajánlott dátuma", "datum"),
      m("Összefoglaló megjegyzés", "hosszu_szoveg"),
    ],
    fotoKategoriak: [
      fk("Tető állapot", 2, true),
      fk("Inverter kijelző", 1, true),
      fk("Csatlakozások", 1, false),
      fk("Egyéb", 0, false),
    ],
  },

  // ── 7. Egyéb ────────────────────────────────────────────
  {
    id: "factory_egyeb",
    nev: "Egyéb",
    leiras: "Általános célú munkalap – egyedi feladathoz",
    ikon: "📄",
    aktiv: true,
    gyari: true,
    beallitasok: { ...DEFAULT_BEALLITASOK },
    mezok: [
      m("Feladat leírása", "hosszu_szoveg", { kotelezo: true }),
      m("Elvégzett munkák", "hosszu_szoveg"),
      m("Megjegyzés", "hosszu_szoveg"),
    ],
    fotoKategoriak: [
      fk("Egyéb fotók", 0, false),
    ],
  },
];
