/**
 * geo.js – Geocoding és távolságszámítás
 * Elsődleges: OSRM (ingyenes, nincs API kulcs)
 * Opcionális: Google Maps API (ha megadva)
 */

const geocodeCache = new Map();
const distanceCache = new Map();

// ─── Nominatim geocoding (OpenStreetMap) ──────────────────────
export async function geocodeAddress(address) {
  if (geocodeCache.has(address)) return geocodeCache.get(address);

  try {
    const q = encodeURIComponent(address + ", Magyarország");
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=hu`,
      { headers: { "Accept-Language": "hu", "User-Agent": "CRM-Napelem/1.0" } }
    );
    const data = await res.json();
    if (data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), found: true };
      geocodeCache.set(address, result);
      return result;
    }
  } catch (e) { console.warn("[geocode]", address, e.message); }

  // Fallback: ismeretlen koordináta
  const fallback = { lat: 47.4979, lon: 19.0402, found: false };
  geocodeCache.set(address, fallback);
  return fallback;
}

// ─── Haversine légvonal távolság (km) ──────────────────────────
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ─── OSRM útvonal távolság (km, valódi út) ───────────────────
export async function routeDistance(lat1, lon1, lat2, lon2) {
  const key = `${lat1.toFixed(4)},${lon1.toFixed(4)};${lat2.toFixed(4)},${lon2.toFixed(4)}`;
  if (distanceCache.has(key)) return distanceCache.get(key);

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.code === "Ok" && data.routes?.length > 0) {
      const km = data.routes[0].distance / 1000;
      distanceCache.set(key, km);
      return km;
    }
  } catch {}

  // Fallback: légvonal * 1.3 (átlagos kanyaró koefficiens)
  const km = haversine(lat1, lon1, lat2, lon2) * 1.3;
  distanceCache.set(key, km);
  return km;
}

// ─── Google Maps Distance Matrix (ha van API kulcs) ──────────
export async function googleMapsDistance(lat1, lon1, lat2, lon2, apiKey) {
  const key = `gm_${lat1.toFixed(4)},${lon1.toFixed(4)};${lat2.toFixed(4)},${lon2.toFixed(4)}`;
  if (distanceCache.has(key)) return distanceCache.get(key);

  try {
    const origins      = `${lat1},${lon1}`;
    const destinations = `${lat2},${lon2}`;
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origins}&destinations=${destinations}&key=${apiKey}&language=hu`;
    const res  = await fetch(url);
    const data = await res.json();
    if (data.rows?.[0]?.elements?.[0]?.status === "OK") {
      const km = data.rows[0].elements[0].distance.value / 1000;
      distanceCache.set(key, km);
      return km;
    }
  } catch {}

  return routeDistance(lat1, lon1, lat2, lon2);
}

// ─── Távolság számítás (auto: Google Maps vagy OSRM) ─────────
export async function getDistance(lat1, lon1, lat2, lon2, apiKey = "") {
  if (apiKey) return googleMapsDistance(lat1, lon1, lat2, lon2, apiKey);
  return routeDistance(lat1, lon1, lat2, lon2);
}
