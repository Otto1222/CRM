/**
 * Google Drive MCP integráció
 * Adatok mentése/betöltése felhasználónként
 * Elérési út: CRM Napelem/{userId}/data.json
 */

async function callDriveMCP(prompt, maxTokens = 1000) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: "Hajtsd végre a feladatot. Ha adatot kell visszaadni: csak nyers JSON-t adj, semmi mást. Ha nincs adat: null",
      messages: [{ role: "user", content: prompt }],
      mcp_servers: [
        { type: "url", url: "https://drivemcp.googleapis.com/mcp/v1", name: "gdrive" }
      ],
    }),
  });

  if (!res.ok) throw new Error(`API hiba: ${res.status}`);
  const data = await res.json();
  return data.content
    ?.filter(b => b.type === "text")
    .map(b => b.text)
    .join("")
    .trim() || "";
}

export async function driveLoad(userId, key = "data") {
  try {
    const text = await callDriveMCP(
      `Olvasd ki a "CRM Napelem/${userId}/${key}.json" fájl tartalmát a Google Drive-ból. Csak a JSON tartalmat add vissza.`
    );
    const clean = text.replace(/```json|```/g, "").trim();
    return clean === "null" || !clean ? null : JSON.parse(clean);
  } catch (err) {
    console.warn("Drive betöltési hiba:", err);
    return null;
  }
}

export async function driveSave(userId, data, key = "data") {
  try {
    await callDriveMCP(
      `Mentsd el a következő JSON-t a "CRM Napelem/${userId}/${key}.json" fájlba (ha nem létezik, hozd létre a "CRM Napelem/${userId}" mappában): ${JSON.stringify(data)}`,
      200
    );
    return true;
  } catch (err) {
    console.warn("Drive mentési hiba:", err);
    return false;
  }
}
