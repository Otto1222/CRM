/**
 * anyagArVerzio.js – Append-only árverzió napló az Anyagtörzshöz (Fázis 2A / V2)
 *
 * Minden alkalommal, amikor egy anyag beszerzési ára, alap haszonkulcsa
 * vagy javasolt eladási ára módosul, a RÉGI értékek ide kerülnek mentésre,
 * MIELŐTT az anyagtörzs rekord felülíródna az új árral.
 *
 * Append-only: régi bejegyzés sosem törlődik vagy módosul – ld. appendAnyagArVerzio().
 * Régi projektek / ajánlatok / munkalapok saját ár-pillanatképei (elszamolasPillanatkep.js
 * mintájára) ettől függetlenek, ők a saját mezőikben rögzített árakkal dolgoznak tovább.
 *
 * Kollekció neve (localDb + Drive sync): "anyag_ar_verziok"
 *
 * Rekord mezők:
 *   id, anyagtorzsId, datum, nettoBeszerzesiAr, javasoltEladasiAr,
 *   alapHaszonkulcsPct, rogzitette, megjegyzes, createdAt
 */
import { loadLocal, addItem } from "./localDb.js";

const COLLECTION = "anyag_ar_verziok";

export function loadAnyagArVerziok() {
  return loadLocal(COLLECTION) || [];
}

export function getAnyagArVerziokFor(anyagtorzsId) {
  return loadAnyagArVerziok()
    .filter(v => v.anyagtorzsId === anyagtorzsId)
    .sort((a, b) => String(b.datum).localeCompare(String(a.datum)));
}

export function appendAnyagArVerzio({
  anyagtorzsId,
  nettoBeszerzesiAr,
  javasoltEladasiAr,
  alapHaszonkulcsPct,
  rogzitette = "",
  megjegyzes = "",
}) {
  const now = new Date().toISOString();
  const entry = {
    id: `arv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    anyagtorzsId,
    datum: now,
    nettoBeszerzesiAr: Number(nettoBeszerzesiAr) || 0,
    javasoltEladasiAr: Number(javasoltEladasiAr) || 0,
    alapHaszonkulcsPct: Number(alapHaszonkulcsPct) || 0,
    rogzitette,
    megjegyzes,
    createdAt: now,
  };
  addItem(COLLECTION, entry);
  return entry;
}
