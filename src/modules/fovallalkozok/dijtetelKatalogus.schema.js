/**
 * dijtetelKatalogus.schema.js
 * Fővállalkozói díjtábla-katalógus – egy fővállalkozó (pl. Green Home
 * Technologies) tényleges, tételes díjtáblájának tárolt alakja.
 *
 * Ez a modell EGYSZERŰBB, mint az elszamolasiMotor.js szabály-motorja
 * (fix/darab/sávos/km/fix_kiszallas + munkatípus-kulcs): itt minden sor
 * önmagában egy "egységár × mennyiség" tétel, kategóriával (a díjtábla
 * A)/B)/C)... szakaszai) és km-díj jelöléssel – pontosan úgy, ahogy egy
 * valódi alvállalkozói díjtábla Excel fel van építve.
 *
 * A projekt létrehozásnál ebből válogat a PM egy "tétel-kosarat" (ld.
 * DijtetelKosarPicker.jsx), tetszőleges kombinációban és mennyiséggel –
 * ez adja a "tételes számolást", nem egyetlen Munkatípus-választás.
 *
 * A régi elszámolási szabály-motor (fovallalkozo.schema.js /
 * elszamolasiMotor.js) VÁLTOZATLANUL megmarad – aki nem tölt fel
 * katalógust egy fővállalkozóhoz, a korábbi kézi szabály-flow-t használja
 * tovább (ld. ProjektForm.jsx, validateProjektForrás).
 *
 * "savos" típusú tétel: a fix "ár × mennyiség" helyett a mennyiség (pl.
 * panelszám) alapján SÁV szerint számol – ugyanaz a lookup, mint az
 * elszamolasiMotor.js "savos" szabály-módja (ld. calcSavosOsszeg, közösen
 * használva, nincs duplikálva). Pl.: "1–10 db: fix 81 120 Ft, 11–15 db:
 * 8 112 Ft/db a teljes darabszámra" – nem progresszív sávozás.
 */
import { calcSavosOsszeg } from "./elszamolasiMotor.js";

// Egy katalógus-tétel (= a díjtábla egy sora)
export const DIJTETEL_KATALOGUS_TETEL_SCHEMA = {
  id:            "",
  tulajdonosId:  "",     // fővállalkozó id (fovallalkozok kollekció)
  kod:           "",     // pl. "A01" – opcionális, csak megjelenítéshez/import-egyeztetéshez
  kategoria:     "",     // pl. "A) ALAPTELEPÍTÉS / KIVITELEZÉS" – csoportosításhoz a kosárban
  megnevezes:    "",     // pl. "Napelem kivitelezés – teljes anyagvásárlással"
  egyseg:        "db",   // panel | db | m | óra | alkalom | km | ...
  ar:            0,      // nettó Ft / egység (a "km" egységű tételeknél Ft/km) – "savos" típusnál nem használt
  tipus:         "flat", // "flat" (ár × mennyiség) | "savos" (mennyiség szerinti sáv-lookup, ld. savok)
  savok:         [],     // csak tipus==="savos": [{ tol, ig, osszeg, perDb }]
  kmDij:         false,  // true = "+ km-díj" – a projektben egyszer, összesítve számolandó fel
  kmKuszobKm:    0,      // csak kmDij tételnél: ennyi km-ig nincs km-díj, csak a felette lévő rész számolódik
  aktiv:         true,
  megjegyzes:    "",
  forras:        "kezi", // "kezi" | "excelImport"
  importFileName: "",
  createdAt:     "",
  updatedAt:     "",
};

/**
 * Egy projektbe/kosárba felvett tétel pillanatképe – a katalógus-tételből
 * másolódik (ár + leíró adatok befagyasztva), utólagos katalógus-módosítás
 * nem írja felül (ugyanaz a pillanatkép-elv, mint a Kivitelezési Csomagnál).
 */
export const DIJTABLA_KOSAR_TETEL_SCHEMA = {
  katalogusTetelId: "",
  kod:              "",
  kategoria:        "",
  nev:              "",
  egyseg:           "db",
  egysegar:         0,
  tipus:            "flat", // "flat" | "savos" – a katalógus-tétel pillanatképe
  savok:            [],     // csak tipus==="savos"
  mennyiseg:        1,
  osszesen:         0,
  kmDij:            false,
};

export function calcKosarTetelOsszesen(tetel) {
  if (tetel?.tipus === "savos") {
    return calcSavosOsszeg(tetel.savok, tetel.mennyiseg);
  }
  return Math.round((Number(tetel?.mennyiseg) || 0) * (Number(tetel?.egysegar) || 0));
}

/** A kosár teljes nettó összege, a km-díj sor(ok) NÉLKÜL – azt a hívó adja hozzá. */
export function calcKosarTetelekOsszesen(tetelek = []) {
  return (tetelek || []).reduce((s, t) => s + (Number(t.osszesen) || calcKosarTetelOsszesen(t)), 0);
}
