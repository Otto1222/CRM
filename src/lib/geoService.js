/**
 * geoService.js
 * Ingyenes geocoding (Nominatim/OSM) + útvonaltervezés (OSRM).
 * Nincs API kulcs, nincs fizetős szolgáltatás.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const OSRM_URL      = "https://router.project-osrm.org";

/**
 * Cím geocodolása → { lat, lon, display_name }[]
 * Rate limit: max 1 req/sec, ezért debounce-olt hívás ajánlott.
 */
export async function geocodeAddress(query, limit = 5) {
  if (!query || query.trim().length < 4) return [];
  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      addressdetails: "1",
      countrycodes: "hu",
      limit: String(limit),
    });
    const res = await fetch(`${NOMINATIM_URL}/search?${params}`, {
      headers: { "Accept-Language": "hu", "User-Agent": "EDI-CRM/1.0" },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Két koordináta közötti vezető távolság km-ben (OSRM).
 * Visszaadja: { km: number, minutes: number } vagy null hiba esetén.
 */
export async function calcDrivingDistance(from, to) {
  // from/to: { lat: number, lon: number }
  if (!from?.lat || !from?.lon || !to?.lat || !to?.lon) return null;
  try {
    const url = `${OSRM_URL}/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.code !== "Ok" || !json.routes?.length) return null;
    const route = json.routes[0];
    return {
      km:      Math.round((route.distance / 1000) * 10) / 10,
      minutes: Math.round(route.duration / 60),
    };
  } catch {
    return null;
  }
}

/**
 * Oda-vissza km kiszámítása cím stringekből.
 * Ha a geocoding sikeres, OSRM-mel számolja az oda-vissza km-t.
 */
export async function calcRoundTripKm(fromAddress, toAddress) {
  if (!fromAddress?.trim() || !toAddress?.trim()) return null;
  const [fromResults, toResults] = await Promise.all([
    geocodeAddress(fromAddress, 1),
    geocodeAddress(toAddress, 1),
  ]);
  if (!fromResults.length || !toResults.length) return null;
  const from = { lat: parseFloat(fromResults[0].lat), lon: parseFloat(fromResults[0].lon) };
  const to   = { lat: parseFloat(toResults[0].lat),   lon: parseFloat(toResults[0].lon)   };
  const result = await calcDrivingDistance(from, to);
  if (!result) return null;
  return {
    oda:       result.km,
    odaVissza: Math.round(result.km * 2 * 10) / 10,
    minutes:   result.minutes,
  };
}
