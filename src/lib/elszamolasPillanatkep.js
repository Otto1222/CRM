/**
 * elszamolasPillanatkep.js – Történeti pillanatkép (spec 12. pont)
 *
 * Lezáráskor mentjük az aktuális elszámolási szabályokat + számítás részleteit.
 * A pillanatkép SOHA NEM VÁLTOZIK – még ha az admin módosítja a szabályokat.
 *
 * Tárolás: localStorage["projekt_pillanatkep_{projektId}"]
 */

import { loadLocal, saveLocal } from "./localDb";
import { loadFovallalkozok, loadSzabalyok } from "../modules/fovallalkozok/fovallalkozo.service";
import { getMunkatipus } from "../modules/munkatipusok/munkatipus.service";

const KEY = (projektId) => `projekt_pillanatkep_${projektId}`;

/**
 * Pillanatkép létrehozása projekt lezárásakor / számlázáskor
 */
export function createPillanatkep(projekt, munkalapok = [], kalkulacio = null) {
  // Aktuális szabályok másolása – deep copy, referencia nélkül
  const fovallalkozok = loadFovallalkozok();
  const szabalyok     = loadSzabalyok();
  const penzugy       = projekt.penzugy || {};

  const fv      = fovallalkozok.find(f => f.id === penzugy.fovallalkoziId) || null;
  const szabaly = szabalyok.find(s => s.id === penzugy.elszamolasiSzabalyId) || null;
  const mtipus  = getMunkatipus(penzugy.munkatipus) || null;

  const pillanatkep = {
    projektId:    projekt.id,
    projektkod:   projekt.projektkod,
    letrehozva:   new Date().toISOString(),
    verzio:       "1.0",
    // Projekt alapadatok pillanatkép
    projekt: {
      id:              projekt.id,
      projektkod:      projekt.projektkod,
      nev:             projekt.nev,
      clientNev:       projekt.clientNev,
      megbizoCeg:      projekt.megbizoCeg || "",
      status:          projekt.status,
      elfogadottAjanlat: projekt.elfogadottAjanlat || 0,
    },
    // Fővállalkozó – teljes másolat a szabályokkal
    fovallalkozo: fv ? JSON.parse(JSON.stringify(fv)) : null,
    // Elszámolási szabály – teljes másolat
    elszamolasiSzabaly: szabaly ? JSON.parse(JSON.stringify(szabaly)) : null,
    // Munkatípus – teljes másolat
    munkatipus: mtipus ? JSON.parse(JSON.stringify(mtipus)) : null,
    // Pénzügyi konfiguráció
    penzugyiKonfig: JSON.parse(JSON.stringify(penzugy)),
    // Kalkuláció eredménye (ha van)
    kalkulacio: kalkulacio ? JSON.parse(JSON.stringify(kalkulacio)) : null,
    // Munkalapok listája (id + státusz + összeg)
    munkalapok: munkalapok.map(m => ({
      id:           m.id,
      munkalapSzam: m.munkalapSzam || m.dokumentumszam || m.ediSorszam,
      tipus:        m.tipus || m.munkalapTipus,
      status:       m.status,
      ar:           m.ar || 0,
      csapatNev:    m.csapatNev || m.assigneeNev || "",
      datum:        m.datum || m.date || "",
    })),
  };

  saveLocal(KEY(projekt.id), pillanatkep);
  return pillanatkep;
}

/**
 * Pillanatkép betöltése
 */
export function loadPillanatkep(projektId) {
  return loadLocal(KEY(projektId)) || null;
}

/**
 * Van-e pillanatkép?
 */
export function hasPillanatkep(projektId) {
  return !!loadLocal(KEY(projektId));
}

/**
 * Összes pillanatkép listázása
 */
export function listPillanatkepek() {
  const result = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("projekt_pillanatkep_")) {
      try {
        const val = JSON.parse(localStorage.getItem(key));
        if (val) result.push(val);
      } catch {}
    }
  }
  return result.sort((a, b) => new Date(b.letrehozva) - new Date(a.letrehozva));
}
