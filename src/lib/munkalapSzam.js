/**
 * munkalapSzam.js – Egységes munkalapszám kezelés
 *
 * EGYETLEN forrása az összes munkalapszám megjelenítésnek.
 * A felhasználó soha nem lát ml_ / #random / timestamp azonosítót.
 *
 * Formátum:
 *   E.D.I.005/001              – projektkód/sorszám
 *   E.D.I.005/001 / T003700   – ha van fővállalkozói külső azonosító
 *
 * Belső ID (id, ml_xxxxx) sosem jelenik meg UI-on.
 */

/**
 * getWorkOrderDisplayCode(munkalap, projekt?)
 *
 * Ez az EGYETLEN függvény ami meghatározza a megjelenített munkalapszámot.
 * Minden komponens ezt hívja.
 *
 * @param {object} munkalap
 * @param {object|null} projekt – ha elérhető, a projektkódhoz megnézzük a sorszámot
 * @param {object[]} osszesMunkalapok – projekt munkalapjainak listája a sorszám meghatározáshoz
 * @returns {string} – megjelenítendő munkalapszám
 */
export function getWorkOrderDisplayCode(munkalap, projekt = null, osszesMunkalapok = null) {
  if (!munkalap) return "—";

  const kulso = munkalap.fovallalkoiAzonosito?.trim()
    || munkalap.kulsoAzonosito?.trim()
    || "";

  // 1. Ha már van helyes formátumú dokumentumszam (E.D.I.XXX/NNN)
  const docszam = munkalap.dokumentumszam || munkalap.munkalapSzam || "";
  if (isValidFormat(docszam)) {
    return kulso && !docszam.includes("/") && !docszam.includes(kulso)
      ? `${docszam} / ${kulso}`
      : docszam;
  }

  // 2. Projekt kódból + sorszámból generálás
  const projektkod = projekt?.projektkod
    || munkalap.projektKod
    || munkalap.projektkod
    || "";

  if (projektkod && isEdiFormat(projektkod)) {
    const sorszam = getMunkalapSorszam(munkalap, projektkod, osszesMunkalapok);
    const alap = `${projektkod}/${String(sorszam).padStart(3, "0")}`;
    return kulso ? `${alap} / ${kulso}` : alap;
  }

  // 3. Fallback: régi ugyszam / ediSorszam mezők ha van
  const regi = munkalap.ugyszam || munkalap.ediSorszam;
  if (regi && isEdiFormat(regi)) {
    return kulso && !regi.includes(kulso) ? `${regi} / ${kulso}` : regi;
  }

  // 4. Utolsó lehetőség: "Admin ellenőrizze" jelölés
  return `⚠️ Nincs projektkód`;
}

/**
 * Ellenőrzi hogy az azonosító E.D.I. formátumú-e
 */
function isEdiFormat(str) {
  return /^E\.D\.I\.\d+/.test(str || "");
}

/**
 * Ellenőrzi hogy a dokumentumszám már helyes E.D.I.XXX/NNN formátumú-e
 */
function isValidFormat(str) {
  return /^E\.D\.I\.\d+\/\d+/.test(str || "");
}

/**
 * Meghatározza a munkalap sorszámát a projekten belül
 * A munkalapok createdAt szerint rendezve, 1-től
 */
function getMunkalapSorszam(munkalap, projektkod, osszesMunkalapok) {
  // Ha van tárolva sorszám
  if (munkalap._projektSorszam) return munkalap._projektSorszam;

  if (!osszesMunkalapok?.length) return 1;

  // A projekt összes munkalapja, createdAt szerint rendezve
  const projektMls = osszesMunkalapok
    .filter(m =>
      m.projektKod === projektkod ||
      m.projektkod === projektkod ||
      (m.projektId && m.projektId === munkalap.projektId)
    )
    .sort((a, b) => {
      const da = new Date(a.createdAt || a.datum || 0).getTime();
      const db = new Date(b.createdAt || b.datum || 0).getTime();
      return da - db || a.id.localeCompare(b.id);
    });

  const idx = projektMls.findIndex(m => m.id === munkalap.id);
  return idx >= 0 ? idx + 1 : projektMls.length + 1;
}

/**
 * Munkalap megjelenítő szám generálás új munkalaphoz
 * Létrehozáskor ezt hívjuk, és el is tároljuk a munkalapba
 *
 * @param {string} projektkod – pl. "E.D.I.005"
 * @param {string} kulsoAzonosito – pl. "T003700" (opcionális)
 * @param {object[]} meglevoMunkalapok – a projekt eddi munkalapjai
 * @returns {string}
 */
export function generateMunkalapSzam(projektkod, kulsoAzonosito = "", meglevoMunkalapok = []) {
  if (!projektkod) return "";

  const sorszam = meglevoMunkalapok.filter(m =>
    m.projektKod === projektkod ||
    m.projektkod === projektkod ||
    (m.dokumentumszam || "").startsWith(projektkod + "/")
  ).length + 1;

  const alap = `${projektkod}/${String(sorszam).padStart(3, "0")}`;
  return kulsoAzonosito?.trim() ? `${alap} / ${kulsoAzonosito.trim()}` : alap;
}

/**
 * Migráció: régi munkalapok dokumentumszám javítása
 * Adatot NEM töröl, csak kiegészít.
 * Visszaadja: { fixed: [], needsAdminCheck: [] }
 */
export function migrateMunkalapSzamok(munkalapok, projektek) {
  const fixed = [];
  const needsAdminCheck = [];
  const perProjekt = {}; // projektkod → sorszám számláló

  // Sorba rendezés az eredeti létrehozási idő szerint
  const sorted = [...munkalapok].sort((a, b) => {
    const da = new Date(a.createdAt || 0).getTime();
    const db = new Date(b.createdAt || 0).getTime();
    return da - db || a.id.localeCompare(b.id);
  });

  for (const m of sorted) {
    // Már helyes formátum → kihagyja
    if (isValidFormat(m.dokumentumszam)) {
      continue;
    }

    // Megkeressük a projektet
    const projekt = projektek.find(p =>
      p.id === m.projektId ||
      p.projektkod === m.projektKod ||
      p.projektkod === m.projektkod
    );

    if (!projekt?.projektkod || !isEdiFormat(projekt.projektkod)) {
      needsAdminCheck.push({
        id: m.id,
        regi: m.dokumentumszam || m.munkalapSzam || m.ugyszam || m.id,
        ok: "Nincs E.D.I. projektkód",
      });
      continue;
    }

    const pk = projekt.projektkod;
    perProjekt[pk] = (perProjekt[pk] || 0) + 1;
    const sorszam = perProjekt[pk];
    const kulso = m.fovallalkoiAzonosito?.trim() || m.kulsoAzonosito?.trim() || "";
    const ujSzam = kulso
      ? `${pk}/${String(sorszam).padStart(3, "0")} / ${kulso}`
      : `${pk}/${String(sorszam).padStart(3, "0")}`;

    fixed.push({
      id: m.id,
      regi: m.dokumentumszam || m.munkalapSzam || m.ugyszam || m.id,
      uj: ujSzam,
      _projektSorszam: sorszam,
    });
  }

  return { fixed, needsAdminCheck };
}
