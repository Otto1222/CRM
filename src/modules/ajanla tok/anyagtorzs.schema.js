export const ANYAGTORZS_KATEGORIAK = [
  "Napelem panel",
  "Inverter",
  "Akkumulátor",
  "Akkumulátor vezérlő",
  "Okos mérő",
  "Tartószerkezet",
  "DC oldal",
  "AC oldal",
  "Kábel / Vezeték",
  "Védelmi berendezések",
  "Munkadíj",
  "Kiszállás / Fuvar",
  "Engedélyezés",
  "Egyéb",
];

export const ANYAG_EGYSEGEK = ["db", "m", "fm", "óra", "kWp", "komplett", "csomag", "m²", "kg"];
export const AFA_KULCSOK    = [27, 5, 0];

export const ANYAGTORZS_SCHEMA = {
  id:                  "",
  cikkszam:            "",
  kategoria:           "",
  megnevezes:          "",
  egyseg:              "db",
  nettoBeszerzesiAr:   0,
  ajanlatiNetto:       0,
  arresPct:            0,   // auto-computed
  afaKulcs:            27,
  aktiv:               true,
  megjegyzes:          "",
  createdAt:           "",
  updatedAt:           "",
};

export const SAMPLE_ANYAGTORZS = [
  // ── Napelem panelek ──
  { cikkszam: "NP-400W",   kategoria: "Napelem panel", megnevezes: "Napelem panel 400 W monokristályos", egyseg: "db",  nettoBeszerzesiAr: 45000,  ajanlatiNetto: 65000,  afaKulcs: 5  },
  { cikkszam: "NP-550W",   kategoria: "Napelem panel", megnevezes: "Napelem panel 550 W monokristályos", egyseg: "db",  nettoBeszerzesiAr: 58000,  ajanlatiNetto: 85000,  afaKulcs: 5  },
  { cikkszam: "NP-430W",   kategoria: "Napelem panel", megnevezes: "Napelem panel 430 W bifaciális",     egyseg: "db",  nettoBeszerzesiAr: 48000,  ajanlatiNetto: 70000,  afaKulcs: 5  },
  // ── Inverterek ──
  { cikkszam: "INV-3K",    kategoria: "Inverter",      megnevezes: "Szolár inverter 3 kW egyfázisú",    egyseg: "db",  nettoBeszerzesiAr: 130000, ajanlatiNetto: 185000, afaKulcs: 27 },
  { cikkszam: "INV-5K",    kategoria: "Inverter",      megnevezes: "Szolár inverter 5 kW egyfázisú",    egyseg: "db",  nettoBeszerzesiAr: 180000, ajanlatiNetto: 255000, afaKulcs: 27 },
  { cikkszam: "INV-10K",   kategoria: "Inverter",      megnevezes: "Szolár inverter 10 kW háromfázisú", egyseg: "db",  nettoBeszerzesiAr: 290000, ajanlatiNetto: 410000, afaKulcs: 27 },
  { cikkszam: "INV-15K",   kategoria: "Inverter",      megnevezes: "Szolár inverter 15 kW háromfázisú", egyseg: "db",  nettoBeszerzesiAr: 420000, ajanlatiNetto: 590000, afaKulcs: 27 },
  // ── Akkumulátorok ──
  { cikkszam: "AKK-5KWH",  kategoria: "Akkumulátor",   megnevezes: "Akkumulátor 5 kWh LiFePO4",         egyseg: "db",  nettoBeszerzesiAr: 450000, ajanlatiNetto: 630000, afaKulcs: 27 },
  { cikkszam: "AKK-10KWH", kategoria: "Akkumulátor",   megnevezes: "Akkumulátor 10 kWh LiFePO4",        egyseg: "db",  nettoBeszerzesiAr: 850000, ajanlatiNetto: 1190000,afaKulcs: 27 },
  // ── Okos mérő ──
  { cikkszam: "OM-1F",     kategoria: "Okos mérő",     megnevezes: "Okos mérő egyfázisú",               egyseg: "db",  nettoBeszerzesiAr: 25000,  ajanlatiNetto: 38000,  afaKulcs: 27 },
  { cikkszam: "OM-3F",     kategoria: "Okos mérő",     megnevezes: "Okos mérő háromfázisú",             egyseg: "db",  nettoBeszerzesiAr: 32000,  ajanlatiNetto: 48000,  afaKulcs: 27 },
  // ── Tartószerkezet ──
  { cikkszam: "TS-CSER",   kategoria: "Tartószerkezet", megnevezes: "Tartószerkezet cserépfedéshez /db panel", egyseg: "db", nettoBeszerzesiAr: 4500, ajanlatiNetto: 7200, afaKulcs: 27 },
  { cikkszam: "TS-TRAP",   kategoria: "Tartószerkezet", megnevezes: "Tartószerkezet trapézlemezhez /db panel", egyseg: "db", nettoBeszerzesiAr: 3800, ajanlatiNetto: 6000, afaKulcs: 27 },
  // ── DC oldal ──
  { cikkszam: "DC-KABEL4", kategoria: "DC oldal",      megnevezes: "DC kábel 4 mm² (piros/fekete)",     egyseg: "m",   nettoBeszerzesiAr: 350,    ajanlatiNetto: 650,    afaKulcs: 27 },
  { cikkszam: "DC-KABEL6", kategoria: "DC oldal",      megnevezes: "DC kábel 6 mm²",                    egyseg: "m",   nettoBeszerzesiAr: 480,    ajanlatiNetto: 900,    afaKulcs: 27 },
  { cikkszam: "DC-FKA",    kategoria: "DC oldal",      megnevezes: "DC főkapcsoló 1000V 32A",           egyseg: "db",  nettoBeszerzesiAr: 7500,   ajanlatiNetto: 12500,  afaKulcs: 27 },
  // ── AC oldal ──
  { cikkszam: "AC-KAB4",   kategoria: "AC oldal",      megnevezes: "AC kábel 3×4 mm²",                 egyseg: "m",   nettoBeszerzesiAr: 650,    ajanlatiNetto: 1200,   afaKulcs: 27 },
  { cikkszam: "AC-KAB6",   kategoria: "AC oldal",      megnevezes: "AC kábel 3×6 mm²",                 egyseg: "m",   nettoBeszerzesiAr: 950,    ajanlatiNetto: 1700,   afaKulcs: 27 },
  // ── Munkadíj ──
  { cikkszam: "MD-SZREL",  kategoria: "Munkadíj",      megnevezes: "Napelem rendszer szerelési munkadíj", egyseg: "kWp", nettoBeszerzesiAr: 0,    ajanlatiNetto: 45000,  afaKulcs: 27 },
  { cikkszam: "MD-ORA",    kategoria: "Munkadíj",      megnevezes: "Villanyszerelési óradíj",           egyseg: "óra", nettoBeszerzesiAr: 0,    ajanlatiNetto: 8500,   afaKulcs: 27 },
  { cikkszam: "MD-ENGED",  kategoria: "Engedélyezés",  megnevezes: "Hálózati engedélyezési díj",        egyseg: "komplett", nettoBeszerzesiAr: 0, ajanlatiNetto: 45000,  afaKulcs: 27 },
  // ── Védelmi berendezések ──
  { cikkszam: "VD-SPD-DC",  kategoria: "Védelmi berendezések", megnevezes: "DC túlfeszültség-védő (SPD) 1000V Type II", egyseg: "db", nettoBeszerzesiAr: 8500,  ajanlatiNetto: 14500, afaKulcs: 27 },
  { cikkszam: "VD-SPD-AC",  kategoria: "Védelmi berendezések", megnevezes: "AC túlfeszültség-védő (SPD) 3×40A Type II", egyseg: "db", nettoBeszerzesiAr: 12000, ajanlatiNetto: 20000, afaKulcs: 27 },
  { cikkszam: "VD-LEVAL",   kategoria: "Védelmi berendezések", megnevezes: "DC leválasztó 1000V 32A",                   egyseg: "db", nettoBeszerzesiAr: 4500,  ajanlatiNetto: 8000,  afaKulcs: 27 },
  { cikkszam: "VD-KM1P",    kategoria: "Védelmi berendezések", megnevezes: "Kismegszakító 1P 16A C karakterisztika",    egyseg: "db", nettoBeszerzesiAr: 1800,  ajanlatiNetto: 3500,  afaKulcs: 27 },
  { cikkszam: "VD-KM3P",    kategoria: "Védelmi berendezések", megnevezes: "Kismegszakító 3P 25A C karakterisztika",    egyseg: "db", nettoBeszerzesiAr: 4200,  ajanlatiNetto: 7800,  afaKulcs: 27 },
  { cikkszam: "VD-FI",      kategoria: "Védelmi berendezések", megnevezes: "FI relé 2P 25A 30mA AC típus",             egyseg: "db", nettoBeszerzesiAr: 6500,  ajanlatiNetto: 11500, afaKulcs: 27 },
  { cikkszam: "VD-ELOSZT",  kategoria: "Védelmi berendezések", megnevezes: "Elosztószekrény 12 modulos",               egyseg: "db", nettoBeszerzesiAr: 7000,  ajanlatiNetto: 13000, afaKulcs: 27 },
  // ── Akkumulátor vezérlő ──
  { cikkszam: "AV-EMS10",   kategoria: "Akkumulátor vezérlő", megnevezes: "EMS energiakezelő vezérlő 10 kW",           egyseg: "db", nettoBeszerzesiAr: 95000, ajanlatiNetto: 135000, afaKulcs: 27 },
  { cikkszam: "AV-BMS",     kategoria: "Akkumulátor vezérlő", megnevezes: "BMS akkumulátor-menedzsment modul",         egyseg: "db", nettoBeszerzesiAr: 35000, ajanlatiNetto: 52000,  afaKulcs: 27 },
  { cikkszam: "AV-HYBRID",  kategoria: "Akkumulátor vezérlő", megnevezes: "Hibrid inverter vezérlő 5 kW",              egyseg: "db", nettoBeszerzesiAr: 180000,ajanlatiNetto: 250000, afaKulcs: 27 },
  // ── Kiszállás ──
  { cikkszam: "KI-FIX",    kategoria: "Kiszállás / Fuvar", megnevezes: "Kiszállási díj fix",           egyseg: "komplett", nettoBeszerzesiAr: 8000, ajanlatiNetto: 18000, afaKulcs: 27 },
];
