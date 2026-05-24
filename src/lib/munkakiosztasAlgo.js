/**
 * munkakiosztasAlgo.js – Munkakiosztó algoritmus
 *
 * Stratégia:
 * 1. Geocódol minden munkacímet
 * 2. Napról napra halad (indulásDatum-tól kezdve)
 * 3. Minden napon, minden csapathoz megkeresi a legközelebbi
 *    elvégezhető munkát (Nearest Neighbor heurisztika)
 * 4. A csapat napi kapacitásáig oszt ki munkákat
 * 5. Hétvégét figyelembe veszi
 */

import { geocodeAddress, getDistance } from "./geo";

function isWeekend(date) {
  const d = new Date(date);
  return d.getDay() === 0 || d.getDay() === 6;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

export async function kioszt(munkak, settings, onProgress) {
  const { csapatok, indulasDatum, googleMapsApiKey } = settings;

  onProgress?.("Geocoding: munkacímek feldolgozása...", 5);

  // 1. Geocodoljuk a munkákat
  const munkakGeo = await Promise.all(
    munkak.map(async (m, i) => {
      const geo = await geocodeAddress(m.cim);
      onProgress?.(`Geocoding: ${i + 1}/${munkak.length}`, 5 + (i / munkak.length) * 30);
      return { ...m, lat: geo.lat, lon: geo.lon, geoFound: geo.found };
    })
  );

  onProgress?.("Csapat helyek feldolgozása...", 38);

  // 2. Csapat állapot inicializálása
  const csapatAllapot = csapatok.map(cs => ({
    ...cs,
    currentLat: cs.lat,
    currentLon: cs.lon,
    naplista:   {}, // { "2026-05-25": [munka1, munka2, ...] }
  }));

  let osszesMunka = munkakGeo.filter(m => m.cim && m.munkatipus);
  let kiosztottak = [];
  let kiosztottIds = new Set();

  let datum = indulasDatum;
  let maxNap = 200; // végtelen ciklus védelem
  let napSzam = 0;

  onProgress?.("Kiosztás számítása...", 40);

  while (kiosztottIds.size < osszesMunka.length && napSzam < maxNap) {
    // 3. Minden csapatnál ezen a napon
    for (const cs of csapatAllapot) {
      // Hétvége ellenőrzés
      if (isWeekend(datum) && !cs.hetvegen) continue;

      // Ennapi munkák száma csapatonként
      const napi = cs.naplista[datum] || [];

      // Csapat által elvégezhető, még ki nem osztott munkák
      const elvegezhetok = osszesMunka.filter(m =>
        !kiosztottIds.has(m._id) &&
        cs.munkatipusok.includes(m.munkatipus)
      );
      if (elvegezhetok.length === 0) continue;

      // Napi kapacitás típusonként
      const napiDb   = napi.length;
      const maxNapiM = cs.maxNapiMunka?.[elvegezhetok[0]?.munkatipus] || 3;

      // Távolság alapján rendezzük és kiválasztjuk a legközelebbit
      // (párhuzamos távolság számítás)
      const tavok = await Promise.all(
        elvegezhetok.map(async m => {
          const d = await getDistance(
            cs.currentLat, cs.currentLon,
            m.lat, m.lon,
            googleMapsApiKey
          );
          return { munka: m, tavolsag: d };
        })
      );

      // Legközelebbi elsőként
      tavok.sort((a, b) => a.tavolsag - b.tavolsag);

      // Munkákat kioszt napi limitig – típusonként figyelve
      const naipiKiosztva = { ...Object.fromEntries(
        Object.entries(cs.maxNapiMunka || {}).map(([k]) => [k, 0])
      )};
      napi.forEach(m => { naipiKiosztva[m.munkatipus] = (naipiKiosztva[m.munkatipus] || 0) + 1; });

      for (const { munka, tavolsag } of tavok) {
        if (kiosztottIds.has(munka._id)) continue;
        const maxE = cs.maxNapiMunka?.[munka.munkatipus] ?? 3;
        const eddig = naipiKiosztva[munka.munkatipus] || 0;
        if (eddig >= maxE) continue;

        // Kiosztás
        const kiosztott = {
          ...munka,
          csapatId:   cs.id,
          csapatNev:  cs.nev,
          csapatSzin: cs.szin,
          datum,
          datumFormatted: formatDate(datum),
          tavolsag:   Math.round(tavolsag * 10) / 10,
        };

        cs.naplista[datum] = [...(cs.naplista[datum] || []), kiosztott];
        kiosztottak.push(kiosztott);
        kiosztottIds.add(munka._id);
        naipiKiosztva[munka.munkatipus] = eddig + 1;

        // Csapat mostani helyzete = utolsó munka helye
        cs.currentLat = munka.lat;
        cs.currentLon = munka.lon;
      }
    }

    datum = addDays(datum, 1);
    napSzam++;
    onProgress?.(`Kiosztás... (${kiosztottIds.size}/${osszesMunka.length})`, 40 + (kiosztottIds.size / osszesMunka.length) * 55);
  }

  // Kiosztás nélkül maradt munkák
  const kiosztatlank = osszesMunka.filter(m => !kiosztottIds.has(m._id)).map(m => ({
    ...m, csapatNev: "—", datum: "Nincs kiosztva", datumFormatted: "Nincs kiosztva",
  }));

  onProgress?.("Kész!", 100);

  // Rendezés: dátum, majd csapat
  const osszes = [...kiosztottak, ...kiosztatlank];
  osszes.sort((a, b) => {
    if (a.datum === "Nincs kiosztva") return 1;
    if (b.datum === "Nincs kiosztva") return -1;
    if (a.datum !== b.datum) return a.datum.localeCompare(b.datum);
    return a.csapatNev.localeCompare(b.csapatNev);
  });

  return osszes;
}
