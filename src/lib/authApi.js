/**
 * authApi.js – Email küldés segédeszköz (Gmail MCP-n keresztül)
 *
 * Az autentikáció és felhasználókezelés: crmUsers.js + localDb.js alapon működik.
 * Ez a fájl kizárólag az email küldés (Gmail MCP via /api/proxy) segédeszközét tartalmazza.
 */

const GMAIL_MCP = [{ type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1", name: "gmail" }];

async function callAPI(prompt, mcpServers, maxTokens = 1500) {
  const res = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: "Hajtsd végre pontosan a kérést.",
      messages: [{ role: "user", content: prompt }],
      mcp_servers: mcpServers,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.content?.filter(b => b.type === "text").map(b => b.text).join("").trim() || "";
}

export async function sendEmail(to, subject, htmlBody) {
  try {
    await callAPI(
      `Küldj el egy e-mailt a Gmail MCP-n keresztül:\nCímzett: ${to}\nTárgy: ${subject}\nHTML tartalom: ${htmlBody}`,
      GMAIL_MCP,
      500
    );
    return true;
  } catch (e) {
    console.warn("[sendEmail]", e.message);
    return false;
  }
}
