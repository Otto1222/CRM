/**
 * driveApi.js – Google Drive adatkezelés
 * /api/proxy szerverfunkcióra küld (API kulcs server oldalon)
 *
 * Drive File ID-k:
 *   munkalapok  → 1Hgv7eTM4LgFi2HJAx2FI30Y1HSBesQy9
 *   ugyfelek    → 1SmPLppxPV8wDmLr68jkYBLTv3fmzQa4I
 *   arajanlatok → 18P-I6-6hewGacj5DeFOCWAVr4wefJtK-
 *   szerzodesek → 15quNQ6Q71R6Tv164gYBTFWv3P3FKbL8v
 */

const DRIVE_FILE_IDS = {
  munkalapok:  "1Hgv7eTM4LgFi2HJAx2FI30Y1HSBesQy9",
  ugyfelek:    "1SmPLppxPV8wDmLr68jkYBLTv3fmzQa4I",
  arajanlatok: "18P-I6-6hewGacj5DeFOCWAVr4wefJtK-",
  szerzodesek: "15quNQ6Q71R6Tv164gYBTFWv3P3FKbL8v",
};

async function callProxy(prompt, maxTokens = 1200) {
  const res = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: "Hajtsd végre a feladatot. Ha adatot kell visszaadni: csak nyers JSON-t adj, semmi mást. Ha nincs adat: null",
      messages: [{ role: "user", content: prompt }],
      mcp_servers: [{ type: "url", url: "https://drivemcp.googleapis.com/mcp/v1", name: "gdrive" }],
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.content?.filter(b => b.type === "text").map(b => b.text).join("").trim() || "";
}

export async function driveLoad(collection) {
  const fileId = DRIVE_FILE_IDS[collection];
  if (!fileId) return null;
  try {
    const raw   = await callProxy(`Olvasd ki a Google Drive fájl tartalmát (fileId: ${fileId}). Csak a JSON tartalmat add vissza.`);
    const clean = raw.replace(/```json|```/g, "").trim();
    return clean === "null" || !clean ? null : JSON.parse(clean);
  } catch (e) { console.warn(`[driveLoad:${collection}]`, e.message); return null; }
}

export async function driveSave(collection, payload) {
  const fileId = DRIVE_FILE_IDS[collection];
  if (!fileId) return false;
  try {
    await callProxy(`Frissítsd a Google Drive fájlt (fileId: ${fileId}) ezzel a JSON tartalommal: ${JSON.stringify(payload)}`, 400);
    return true;
  } catch (e) { console.warn(`[driveSave:${collection}]`, e.message); return false; }
}
