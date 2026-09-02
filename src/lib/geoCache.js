/**
 * geoCache.js
 * Vékony réteg a geoService.js geocodeAddress() fölött – a Napi
 * kiosztás-tervezőhöz kell sok cím (projektek, csapat-telephelyek)
 * gyorsítótárazott geokódolása, a Nominatim "max 1 kérés/mp"
 * szabályát tiszteletben tartva (throttle-olt, soros hívások).
 */
import { geocodeAddress } from "./geoService.js";

/** Egy cím geokódolása – csak az első Nominatim-találat lat/lon-ja, vagy null. */
export async function geocodeElso(cim) {
  if (!cim?.trim()) return null;
  try {
    const results = await geocodeAddress(cim, 1);
    if (!results.length) return null;
    return { lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) };
  } catch {
    return null;
  }
}

/**
 * Tömeges, throttle-olt geokódolás. entitesek: [{ id, cim }].
 * onSaved(id, {lat,lon}|null) minden elem után hívódik – a hívó felel a
 * perzisztálásért (pl. updateProjekt/updateCsapat). onProgress(kesz, osszes)
 * opcionális, UI-progresshez.
 */
export async function geocodeTomegesen(entitesek, onSaved, onProgress) {
  for (let i = 0; i < entitesek.length; i++) {
    const e = entitesek[i];
    const geo = await geocodeElso(e.cim);
    onSaved?.(e.id, geo);
    onProgress?.(i + 1, entitesek.length);
    if (i < entitesek.length - 1) await new Promise(r => setTimeout(r, 1100));
  }
}
