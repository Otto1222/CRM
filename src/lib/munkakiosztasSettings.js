/**
 * munkakiosztasSettings.js
 * Munkakiosztás beállítások – localStorage-ban tárolva
 */

const LS_KEY = "crm_munkakiosztas_settings";

export const DEFAULT_SETTINGS = {
  // Indulási dátum
  indulasDatum: new Date().toISOString().split("T")[0],

  // Google Maps API kulcs (opcionális, nélküle OpenStreetMap/OSRM)
  googleMapsApiKey: "",

  // Excel oszlop nevek (a fejlécek nevei az Excel fájlban)
  excelOszlopok: {
    cim:        "Cím",
    munkatipus: "Munka típusa",
    megjegyzes: "Megjegyzés",
  },

  // Munkakiosztás típusai
  munkatipusok: [
    { id: "mt1", nev: "Napelem telepítés",  szin: "#2563EB" },
    { id: "mt2", nev: "Napelem csere",      szin: "#9333EA" },
    { id: "mt3", nev: "Szerviz / javítás",  szin: "#059669" },
    { id: "mt4", nev: "Felmérés",           szin: "#D97706" },
  ],

  // Csapatok konfigurációja
  csapatok: [
    {
      id: "cs1",
      nev: "Kutasi László",
      telephely: "Budapest, Magyarország",
      lat: 47.4979, lon: 19.0402,
      szin: "#059669",
      hetvegen: false,
      munkatipusok: ["Napelem telepítés", "Napelem csere", "Szerviz / javítás", "Felmérés"],
      maxNapiMunka: {
        "Napelem telepítés": 2,
        "Napelem csere":     2,
        "Szerviz / javítás": 4,
        "Felmérés":          5,
      },
    },
    {
      id: "cs2",
      nev: "Csapat2",
      telephely: "Debrecen, Magyarország",
      lat: 47.5316, lon: 21.6273,
      szin: "#9333EA",
      hetvegen: false,
      munkatipusok: ["Napelem telepítés", "Napelem csere", "Felmérés"],
      maxNapiMunka: {
        "Napelem telepítés": 2,
        "Napelem csere":     2,
        "Felmérés":          5,
      },
    },
  ],
};

export function getSettings() {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (s) return { ...DEFAULT_SETTINGS, ...JSON.parse(s) };
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(s) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}
