/**
 * kotelezoDokumentumok.service.js
 * Munkalap-szinten kötelezővé tett dokumentumok (VBF / TIG / LMRA)
 * automatikus generálása és Drive-mentése.
 *
 * Hívja: Munkalapok.jsx (a munkalap-státusz "Ellenőrzés alatt"-ra
 * állításakor) – a sablon (ld. munkalapSablon.service.js) beallitasok
 * mezője (kellVBF / kellTIG / kellLMRA) dönti el, melyik dokumentum
 * kötelező az adott munkalapnál.
 *
 * Minden dokumentum-generálás a docxtemplater-alapú, Admin által
 * feltöltött Word sablonokat használja (vbfDocxService.js /
 * tigDocxService.js / lmraDocxService.js – ugyanaz a minta mindháromnál),
 * hogy a végeredmény kinézete/tagolása 1:1 kövesse a feltöltött mintát.
 *
 * Hiányzó sablon / Drive kapcsolat / adat esetén az adott típust csak
 * kihagyja (nem dobja el a többit, nem blokkolja a hívót) – a hívó
 * felület jelzi, ha valami ténylegesen hibázott (nem csak kimaradt).
 */
import { getSablon } from "../modules/munkalap_sablonok/munkalapSablon.service.js";
import { loadFovallalkozok } from "../modules/fovallalkozok/fovallalkozo.service.js";
import { loadVbf } from "./munkalapDb.js";
import { loadLmraRec } from "./lmraData.service.js";
import { buildVbfDocxBlob } from "./vbfDocxService.js";
import { buildTigDocxBlob } from "./tigDocxService.js";
import { buildLmraDocxBlob } from "./lmraDocxService.js";
import { driveSaveGeneratedDoc, driveAvailable } from "./driveApi.js";

export async function generateKotelezoDokumentumok(munkalap, projekt) {
  const eredmeny = { generalt: [], kihagyva: [], hiba: [] };

  if (!driveAvailable()) {
    eredmeny.kihagyva.push({ tipus: "mind", ok: "Nincs Drive kapcsolat konfigurálva" });
    return eredmeny;
  }

  const sablon = munkalap?.sablonId ? getSablon(munkalap.sablonId) : null;
  const beall  = sablon?.beallitasok || {};

  async function mentTipus(tipus, buildResult) {
    if (!buildResult.ok) {
      eredmeny.kihagyva.push({ tipus, ok: buildResult.error });
      return;
    }
    try {
      const res = await driveSaveGeneratedDoc(projekt, buildResult.fajlnev, buildResult.blob);
      if (res?.ok) eredmeny.generalt.push({ tipus, fajlnev: buildResult.fajlnev });
      else eredmeny.hiba.push({ tipus, ok: res?.error || "Drive mentés sikertelen" });
    } catch (e) {
      eredmeny.hiba.push({ tipus, ok: e?.message || String(e) });
    }
  }

  if (beall.kellVBF) {
    await mentTipus("VBF", buildVbfDocxBlob(munkalap, projekt, loadVbf(munkalap.id)));
  }

  if (beall.kellTIG) {
    const fv = loadFovallalkozok().find(f => f.id === projekt?.penzugy?.fovallalkoziId);
    if (fv) await mentTipus("TIG", buildTigDocxBlob(projekt, fv));
    else eredmeny.kihagyva.push({ tipus: "TIG", ok: "Nincs fővállalkozó beállítva a projekten" });
  }

  if (beall.kellLMRA) {
    const lmraRec = loadLmraRec(munkalap.id);
    const vanAlairas = (lmraRec?.resztvevok || []).some(r => r.signed && r.signatureData);
    if (lmraRec && vanAlairas) await mentTipus("LMRA", buildLmraDocxBlob(lmraRec, munkalap));
    else eredmeny.kihagyva.push({ tipus: "LMRA", ok: "Nincs kitöltött / aláírt LMRA ehhez a munkalaphoz" });
  }

  return eredmeny;
}
