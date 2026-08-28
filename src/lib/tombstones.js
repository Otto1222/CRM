/**
 * tombstones.js
 * A törlés-napló (crm_tombstones) puszta, függőség-mentes olvasása és
 * alkalmazása – ld. dataSync.service.js a tombstone-mechanizmus teljes
 * leírásáért (recordDeletion, mergeByIdUpdatedAt).
 *
 * KÜLÖN, alacsony szintű modulban van, hogy körkörös import nélkül tudja
 * használni mind a driveApi.js (kimenő Drive-mentés védelme – ld. driveSave),
 * mind a dataSync.service.js (bejövő Drive-adat szűrése – ld.
 * loadCollectionWithStatus). A driveApi.js-nek a dataSync.service.js-t NEM
 * szabad importálnia (az importálja ŐT), ezért a szűrő-logika ide került ki.
 *
 * Miért kell a KIMENŐ oldalon (driveSave) is szűrni, nem csak a bejövőn?
 * A törlés két, egymástól független Drive-mentésből áll (a lekurtított
 * tömb mentése + a recordDeletion tombstone-mentése) – ha eközben egy másik
 * fül/eszköz/háttér-szinkron egy még a törlés ELŐTTI állapotú tömböt ment el
 * (pl. mert nem vette észre időben a törlést), az visszaírhatja a törölt
 * rekordot Drive-ra, akkor is, ha a tombstone már megvan. A driveSave()-be
 * épített szűrés ez ellen is véd: bármelyik hívási helyről érkező, akár
 * elavult tömb sem tartalmazhat olyan rekordot Drive-on, amire érvényes,
 * nála frissebb tombstone létezik ezen az eszközön.
 */
const TOMBSTONE_KEY = "crm_tombstones";

function loadTombstones() {
  try {
    const raw = localStorage.getItem(TOMBSTONE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Kiszűri egy kollekció tömbjéből azokat a rekordokat, amelyekre érvényes
 * (a rekordnál nem régebbi) tombstone létezik. Nem-tömb adatra és magára a
 * tombstone kollekcióra no-op.
 */
export function applyTombstones(collection, data) {
  if (collection === TOMBSTONE_KEY || !Array.isArray(data)) return data;
  const tombstones = loadTombstones();
  if (tombstones.length === 0) return data;
  const relevant = tombstones.filter(t => t.collection === collection);
  if (relevant.length === 0) return data;
  return data.filter(rec => {
    const t = relevant.find(t => t.targetId === rec?.id);
    if (!t) return true;
    const recordTs = rec?.updatedAt ? new Date(rec.updatedAt).getTime() : 0;
    const tombTs    = new Date(t.updatedAt).getTime();
    // Ha a rekord frissebb, mint a törlés (pl. valaki újra létrehozta ugyanazzal
    // az id-vel egy törlés UTÁN), a rekord marad – az újabb módosítás nyer.
    return tombTs < recordTs;
  });
}
