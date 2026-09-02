/**
 * utemezesOptimalizalo.js
 * Napi kiosztás-tervezés: sok, egyforma munkatípusú feladat (projekt) minél
 * hatékonyabb szétosztása csapatok és napok között, cím-közelség alapján.
 *
 * NEM garantáltan optimális (a "hány csapat melyik napon melyik címekre
 * menjen" klasszikus útvonal-optimalizálási / rendezési feladat NP-nehéz) –
 * ehelyett egy gyakorlatban jól működő, mohó (greedy) heurisztikát ad:
 * minden csapat, sorban, a hozzá legközelebb eső, még be nem osztott
 * feladatokat kapja meg, naponta a munkatípushoz beállított maximális
 * darabszámig (ld. munkatipus.schema.js maxDbNapCsapatonkent).
 *
 * A távolságszámítás légvonalban (haversine) történik – ez ingyenes és
 * azonnali (nincs API-hívás), a klaszterezéshez ez elég pontos. A tényleges
 * vezetési útvonal/idő (OSRM, ld. geoService.js) csak a végleges, kis
 * (napi, csapatonkénti) listák pontosítására érdemes, nem a teljes
 * klaszterezéshez – emiatt ez a modul szándékosan NEM hívja az OSRM-et.
 */

/** Két { lat, lon } pont közti légvonaltávolság km-ben. */
export function haversineKm(a, b) {
  if (!a || !b || a.lat == null || a.lon == null || b.lat == null || b.lon == null) return Infinity;
  const R = 6371;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s1 = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
}

function toLocalDateStr(d) {
  // FONTOS: NEM toISOString() – az UTC-re konvertál, ami UTC-nél keletebbi
  // időzónában (pl. Magyarország) egy nappal visszacsúsztatná a dátumot.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Munkanapok listája (YYYY-MM-DD) egy dátumtartományban – hétvégén csak ha a csapat vállalja. */
export function munkanapokListaja(datumTol, datumIg, hetvegenIs = false) {
  const napok = [];
  const d = new Date(datumTol + "T00:00:00");
  const vege = new Date(datumIg + "T00:00:00");
  if (isNaN(d.getTime()) || isNaN(vege.getTime())) return napok;
  while (d <= vege) {
    const nap = d.getDay(); // 0 = vasárnap, 6 = szombat
    if (hetvegenIs || (nap !== 0 && nap !== 6)) napok.push(toLocalDateStr(d));
    d.setDate(d.getDate() + 1);
  }
  return napok;
}

/**
 * A fő tervező függvény – tiszta, szinkron, nincs benne hálózati hívás.
 *
 * @param feladatok  [{ id, nev, cim, lat, lon }]  – MÁR geokódolt feladatok
 * @param csapatok   [{ id, nev, lat, lon, hetvegen, maxDbNap }] – MÁR geokódolt
 *   csapat-telephelyek; a maxDbNap CSAPATONKÉNT eltérő lehet (a hívó oldja fel
 *   a csapat saját maxNapiMunka[munkatipusId] / kapacitas mezőjéből – ez a
 *   függvény már csak egy kész számot vár, nem tud munkatípusról).
 * @param datumTol, datumIg  "YYYY-MM-DD"
 * @returns { napiKotegek: [{ csapatId, csapatNev, datum, feladatok: [{...,tavKm}], osszTavKm }], beosztatlanFeladatok }
 */
export function tervezzNapiUtemezest({ feladatok = [], csapatok = [], datumTol, datumIg }) {
  const maradek = feladatok.filter(f => f && f.lat != null && f.lon != null).slice();
  const napiKotegek = [];

  for (const csapat of csapatok) {
    if (maradek.length === 0) break;
    if (csapat.lat == null || csapat.lon == null) continue; // nincs geokódolt telephely – kihagyjuk
    const maxDbNap = Math.max(1, Number(csapat.maxDbNap) || 1);
    const napok = munkanapokListaja(datumTol, datumIg, !!csapat.hetvegen);

    for (const nap of napok) {
      if (maradek.length === 0) break;
      let utolsoPont = { lat: csapat.lat, lon: csapat.lon }; // minden nap a telephelyről indul
      const napiFeladatok = [];

      for (let i = 0; i < maxDbNap; i++) {
        if (maradek.length === 0) break;
        let legjobbIdx = -1, legjobbTav = Infinity;
        maradek.forEach((f, idx) => {
          const tav = haversineKm(utolsoPont, f);
          if (tav < legjobbTav) { legjobbTav = tav; legjobbIdx = idx; }
        });
        if (legjobbIdx === -1) break;
        const [f] = maradek.splice(legjobbIdx, 1);
        napiFeladatok.push({ ...f, tavKm: Math.round(legjobbTav * 10) / 10 });
        utolsoPont = f;
      }

      if (napiFeladatok.length > 0) {
        const osszTavKm = napiFeladatok.reduce((s, f) => s + f.tavKm, 0);
        napiKotegek.push({
          csapatId: csapat.id,
          csapatNev: csapat.nev,
          datum: nap,
          feladatok: napiFeladatok,
          osszTavKm: Math.round(osszTavKm * 10) / 10,
        });
      }
    }
  }

  return { napiKotegek, beosztatlanFeladatok: maradek };
}

function bucketKoltseg(telephely, feladatok) {
  if (!telephely) return 0;
  let koltseg = 0, prev = telephely;
  for (const f of feladatok) { koltseg += haversineKm(prev, f); prev = f; }
  return koltseg;
}

/**
 * Csere-alapú helyi javítás (local search) a kezdeti mohó beosztáson.
 *
 * A tervezzNapiUtemezest() CSAPATONKÉNT, sorban dolgozik – az elsőként
 * feldolgozott csapat "learathatja" a hozzá legközelebbi címeket, mielőtt a
 * következő csapat egyáltalán választhatna, még akkor is, ha egy adott cím
 * valójában a MÁSODIK csapathoz esne közelebb. Minél több csapat/cím van
 * egyszerre, ennek annál nagyobb az esélye – ez ronthatja a gazdaságosságot
 * (felesleges km).
 *
 * Ez a függvény minden lehetséges párt megvizsgál KÉT különböző csapat/nap
 * köteg között, és ha egy csere (A köteg X feladata ↔ B köteg Y feladata)
 * csökkentené a két köteg össz-távolságát, végrehajtja – addig ismétli,
 * amíg talál javító cserét (vagy eléri a körkorlátot). Tisztán légvonal-
 * alapú, gyors, nincs benne hálózati hívás – a "Javaslat készítése" minden
 * futtatásakor érdemes lefuttatni, a kezdeti eredmény UTÁN.
 *
 * @param napiKotegek           tervezzNapiUtemezest() eredménye
 * @param csapatTelephelyLookup (csapatId) => { lat, lon } | undefined
 */
export function javitsCsereLepesekkel(napiKotegek, csapatTelephelyLookup, maxKor = 25) {
  const kotegek = napiKotegek.map(k => ({ ...k, feladatok: [...k.feladatok] }));
  const telephelyek = kotegek.map(k => csapatTelephelyLookup(k.csapatId) || null);

  let javult = true, kor = 0;
  while (javult && kor < maxKor) {
    javult = false;
    kor++;
    for (let a = 0; a < kotegek.length; a++) {
      if (!telephelyek[a]) continue;
      for (let b = a + 1; b < kotegek.length; b++) {
        if (!telephelyek[b]) continue;
        const regiA = bucketKoltseg(telephelyek[a], kotegek[a].feladatok);
        const regiB = bucketKoltseg(telephelyek[b], kotegek[b].feladatok);
        for (let i = 0; i < kotegek[a].feladatok.length; i++) {
          for (let j = 0; j < kotegek[b].feladatok.length; j++) {
            const ujA = kotegek[a].feladatok.slice(); ujA[i] = kotegek[b].feladatok[j];
            const ujB = kotegek[b].feladatok.slice(); ujB[j] = kotegek[a].feladatok[i];
            const ujKoltseg = bucketKoltseg(telephelyek[a], ujA) + bucketKoltseg(telephelyek[b], ujB);
            if (ujKoltseg < regiA + regiB - 0.05) { // kis epsilon a lebegőpontos zajra
              kotegek[a].feladatok = ujA;
              kotegek[b].feladatok = ujB;
              javult = true;
            }
          }
        }
      }
    }
  }

  // Táv-mezők és összegek frissítése a végleges sorrend alapján
  return kotegek.map((k, idx) => {
    const tel = telephelyek[idx];
    let prev = tel, osszTavKm = 0;
    const feladatok = k.feladatok.map(f => {
      const tav = tel ? haversineKm(prev, f) : (f.tavKm ?? 0);
      osszTavKm += tav;
      prev = f;
      return { ...f, tavKm: Math.round(tav * 10) / 10 };
    });
    return { ...k, feladatok, osszTavKm: Math.round(osszTavKm * 10) / 10 };
  });
}

/**
 * Egy napi köteg légvonal-becslését valós vezetési távolságra/időre cseréli
 * (OSRM, ld. geoService.js calcDrivingDistance) – csak a jóváhagyás előtti
 * véglegesítéshez hívandó, NEM a klaszterezéshez, mert napi kötegenként
 * legfeljebb (maxDbNap+1) sorosan láncolt hívást jelent, ami a klaszterezés
 * teljes N×N mátrixával szemben elfogadható API-terhelés. Hiba esetén (pl.
 * az OSRM demo szerver átmenetileg nem válaszol) az adott szakasz a
 * légvonal-becslésnél marad – ez nem állítja meg a többi köteg finomítását.
 */
export async function finomitsNapiKotegOsrmVal(napiKoteg, csapatTelephely, calcDrivingDistanceFn) {
  let elozoPont = csapatTelephely;
  let osszKm = 0, osszPerc = 0;
  const finomitottFeladatok = [];
  for (const f of napiKoteg.feladatok) {
    const eredmeny = await calcDrivingDistanceFn(elozoPont, f);
    if (eredmeny) {
      osszKm += eredmeny.km;
      osszPerc += eredmeny.minutes;
      finomitottFeladatok.push({ ...f, tavKm: eredmeny.km, utazasPerc: eredmeny.minutes });
    } else {
      finomitottFeladatok.push(f); // marad a légvonal-becslés
    }
    elozoPont = f;
  }
  return {
    ...napiKoteg,
    feladatok: finomitottFeladatok,
    osszTavKm: Math.round(osszKm * 10) / 10,
    osszUtazasPerc: osszPerc || null,
  };
}
