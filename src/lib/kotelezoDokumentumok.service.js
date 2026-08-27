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
import { buildTigDocxBlob, getTigSablonMeta } from "./tigDocxService.js";
import { buildTigXlsxBlob } from "./tigXlsxService.js";
import { buildLmraDocxBlob } from "./lmraDocxService.js";
import { driveSaveGeneratedDoc, driveAvailable } from "./driveApi.js";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** A fővállalkozó sablonjának formátuma dönti el, melyik motor generálja a
 * TIG-et – a hívó (mentTipus) ugyanúgy kezeli mindkét eredményt. */
async function buildTig(projekt, fovallalkozo) {
  const meta = getTigSablonMeta(fovallalkozo.id);
  if (meta?.fileType === "xlsx") {
    const res = await buildTigXlsxBlob(projekt, fovallalkozo);
    return { ...res, mimeType: XLSX_MIME };
  }
  return { ...buildTigDocxBlob(projekt, fovallalkozo), mimeType: undefined };
}

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
      const res = await driveSaveGeneratedDoc(projekt, buildResult.fajlnev, buildResult.blob, buildResult.mimeType);
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
    if (!fv) {
      eredmeny.kihagyva.push({ tipus: "TIG", ok: "Nincs fővállalkozó beállítva a projekten" });
    } else if (fv.tigMod === "idoszaki") {
      // Időszaki, összesített TIG-módú fővállalkozónál (pl. Green-Home)
      // NEM projektenként, hanem kézzel, a TIG oldalon, több projektet
      // egybefűzve generálódik a dokumentum – itt semmit nem csinálunk,
      // különben az automatikus, munkánkénti motor (ami más sablon-
      // struktúrát vár) hibás/üres fájlt generálna erre a fővállalkozóra.
      eredmeny.kihagyva.push({ tipus: "TIG", ok: `${fv.nev} időszaki TIG-módú – a TIG oldalon, kézzel generálandó` });
    } else {
      await mentTipus("TIG", await buildTig(projekt, fv));
    }
  }

  if (beall.kellLMRA) {
    const lmraRec = loadLmraRec(munkalap.id);
    const vanAlairas = (lmraRec?.resztvevok || []).some(r => r.signed && r.signatureData);
    if (lmraRec && vanAlairas) await mentTipus("LMRA", buildLmraDocxBlob(lmraRec, munkalap));
    else eredmeny.kihagyva.push({ tipus: "LMRA", ok: "Nincs kitöltött / aláírt LMRA ehhez a munkalaphoz" });
  }

  return eredmeny;
}

/**
 * A TIG-et NEM a legenerált fájlon szerkesztjük, hanem a projekt
 * díjtétel-kosarán (ProjektForm / Pénzügy fül) – ha az módosul, ezt hívjuk
 * meg, hogy a Drive-on lévő TIG-fájl is frissüljön, ne maradjon elavult
 * másolat. Fire-and-forget: projekt.service.js updateProjekt hívja,
 * hibát csendben nyel (nem szabad, hogy egy TIG-generálási hiba miatt a
 * projekt mentése elszálljon).
 */
export async function regenerateTigDocumentum(projekt) {
  try {
    if (!driveAvailable()) return;
    if (projekt?.forrás !== "fovallalkozoi_munka") return;
    const fv = loadFovallalkozok().find(f => f.id === projekt?.penzugy?.fovallalkoziId);
    if (!fv || fv.tigMod === "idoszaki") return; // időszaki módnál a TIG oldalon, kézzel generálódik
    const buildResult = await buildTig(projekt, fv);
    if (!buildResult.ok) return;
    await driveSaveGeneratedDoc(projekt, buildResult.fajlnev, buildResult.blob, buildResult.mimeType);
  } catch (e) {
    console.warn("[kotelezoDokumentumok] regenerateTigDocumentum hiba:", e);
  }
}
