/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  fullBackupExport.js – Teljes localStorage mentés exportáló  ║
 * ║                                                              ║
 * ║  CSAK OLVAS. Semmit nem töröl, nem módosít, nem ír Drive-ra. ║
 * ║  Letölt egy JSON fájlt a böngészőből.                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Adatfolyam:
 *   localStorage
 *     ↓ (olvasás)
 *   exportFullLocalBackup()
 *     ↓ (Blob + <a> elem)
 *   szakiflow_backup_YYYYMMDD_HHMM.json  ← letöltés, semmi más
 */

// ─── Segédfüggvény: dátum → fájlnév-kompatibilis string ──────────────────────
function getTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const YYYY = now.getFullYear();
  const MM   = pad(now.getMonth() + 1);
  const DD   = pad(now.getDate());
  const HH   = pad(now.getHours());
  const MIN  = pad(now.getMinutes());
  return `${YYYY}${MM}${DD}_${HH}${MIN}`;
}

// ─── Segédfüggvény: ISO datetime string ──────────────────────────────────────
function getISONow() {
  return new Date().toISOString();
}

// ─── Segédfüggvény: biztonságos JSON parse ────────────────────────────────────
function safeParse(raw) {
  if (raw === null || raw === undefined) return null;
  try {
    return JSON.parse(raw);
  } catch {
    // Ha nem valid JSON, visszaadjuk nyers stringként
    return raw;
  }
}

// ─── Fő export függvény ───────────────────────────────────────────────────────
/**
 * exportFullLocalBackup()
 *
 * Összegyűjti az összes localStorage kulcsot, kategorizálja,
 * majd elindít egy JSON letöltést. Nem módosít semmit.
 *
 * @returns {{ success: boolean, itemCount: number, fileName: string }}
 */
export function exportFullLocalBackup() {
  // ── 1. Ismert kulcsok kiolvasása ──────────────────────────────
  const projektek  = safeParse(localStorage.getItem("projektek"))
                  ?? safeParse(localStorage.getItem("crm_projektek"))
                  ?? [];

  const munkalapok = safeParse(localStorage.getItem("munkalapok"))
                  ?? safeParse(localStorage.getItem("crm_munkalapok"))
                  ?? [];

  const ugyfelek   = safeParse(localStorage.getItem("ugyfelek"))
                  ?? safeParse(localStorage.getItem("crm_ugyfelek"))
                  ?? [];

  const beallitasok = safeParse(localStorage.getItem("beallitasok"))
                   ?? safeParse(localStorage.getItem("crm_beallitasok"))
                   ?? {};

  // ── 2. Prefixelt kulcsok összegyűjtése ────────────────────────
  const vbf                = {};
  const fotok              = {};
  const felhasznaltAnyagok = {};
  const karteritesek       = {};
  const otherLocalStorage  = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const val = safeParse(localStorage.getItem(key));

    if (key.startsWith("vbf_")) {
      vbf[key] = val;
    } else if (key.startsWith("fotok_")) {
      fotok[key] = val;
    } else if (key.startsWith("felh_anyagok_")) {
      felhasznaltAnyagok[key] = val;
    } else if (key.startsWith("karterites")) {
      karteritesek[key] = val;
    } else {
      // Minden egyéb kulcs – a már feldolgozottakat kihagyjuk
      const knownKeys = [
        "projektek", "crm_projektek",
        "munkalapok", "crm_munkalapok",
        "ugyfelek", "crm_ugyfelek",
        "beallitasok", "crm_beallitasok",
      ];
      if (!knownKeys.includes(key)) {
        otherLocalStorage[key] = val;
      }
    }
  }

  // ── 3. Backup objektum összeállítása ──────────────────────────
  const backup = {
    exportedAt : getISONow(),
    version    : "manual-backup-v1",
    source     : "browser-localStorage",
    meta: {
      userAgent : navigator.userAgent,
      url       : window.location.href,
      totalKeys : localStorage.length,
    },
    data: {
      projektek,
      munkalapok,
      ugyfelek,
      beallitasok,
      vbf,
      fotok,
      felhasznaltAnyagok,
      karteritesek,
      otherLocalStorage,
    },
  };

  // ── 4. Letöltés indítása ──────────────────────────────────────
  const fileName = `szakiflow_backup_${getTimestamp()}.json`;
  const jsonStr  = JSON.stringify(backup, null, 2);
  const blob     = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  const url      = URL.createObjectURL(blob);

  const anchor      = document.createElement("a");
  anchor.href       = url;
  anchor.download   = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Blob URL felszabadítása (kis késleltetéssel, hogy a letöltés el tudjon indulni)
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  // ── 5. Összefoglalás visszaadása ──────────────────────────────
  const itemCount =
    (Array.isArray(projektek)  ? projektek.length  : 0) +
    (Array.isArray(munkalapok) ? munkalapok.length : 0) +
    (Array.isArray(ugyfelek)   ? ugyfelek.length   : 0) +
    Object.keys(vbf).length +
    Object.keys(fotok).length +
    Object.keys(felhasznaltAnyagok).length +
    Object.keys(karteritesek).length;

  return { success: true, itemCount, fileName };
}
