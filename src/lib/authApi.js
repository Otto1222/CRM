/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  authApi.js – Teljes hitelesítési rendszer               ║
 * ║  • Felhasználók: Drive db/auth_users.json                ║
 * ║  • Log:          Drive db/activity_log.json              ║
 * ║  • Email:        Gmail MCP via Anthropic API             ║
 * ╚══════════════════════════════════════════════════════════╝
 */

// ─── Drive File ID-k ─────────────────────────────────────────
export const AUTH_FILE_ID = "1hHAiB8PvRCbKagTghpKQ1N4L8Y5zlyXu";
export const LOG_FILE_ID  = "1naVQ491QbU6MuT2ErDVkjpJB0IhXIGHz";

// ─── Elérhető szerepkörök ─────────────────────────────────────
export const ROLES = [
  { value: "Admin",            label: "Admin",            color: "#2563EB" },
  { value: "Telepítő",        label: "Telepítő",         color: "#059669" },
  { value: "Projektmenedzser", label: "Projektmenedzser", color: "#9333EA" },
  { value: "Iroda/Könyvelés", label: "Iroda/Könyvelés",  color: "#D97706" },
];

// ─── Jelszó hash (SHA-256) ────────────────────────────────────
export async function hashPassword(pw) {
  const buf  = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

// ─── Anthropic API hívó (Drive + Gmail MCP) ──────────────────
async function callAPI(prompt, mcpServers, maxTokens = 1200) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: "Hajtsd végre a feladatot pontosan. Ha JSON adatot kell visszaadni, csak azt add vissza, semmi mást.",
      messages: [{ role: "user", content: prompt }],
      mcp_servers: mcpServers,
    }),
  });
  const data = await res.json();
  return data.content?.filter(b => b.type === "text").map(b => b.text).join("").trim() || "";
}

const DRIVE_MCP = [{ type: "url", url: "https://drivemcp.googleapis.com/mcp/v1", name: "gdrive" }];
const GMAIL_MCP = [{ type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1", name: "gmail" }];

// ─── Felhasználók betöltése Drive-ból ────────────────────────
export async function loadUsers() {
  try {
    const text = await callAPI(
      `Olvasd ki a Google Drive fájl tartalmát (fileId: ${AUTH_FILE_ID}). Csak a JSON tartalmat add vissza.`,
      DRIVE_MCP
    );
    const clean = text.replace(/```json|```/g, "").trim();
    if (!clean || clean === "null") return [];
    const parsed = JSON.parse(clean);
    return parsed.users || [];
  } catch { return []; }
}

// ─── Felhasználók mentése Drive-ba ───────────────────────────
export async function saveUsers(users) {
  try {
    await callAPI(
      `Frissítsd a Google Drive fájlt (fileId: ${AUTH_FILE_ID}) ezzel a JSON tartalommal: ${JSON.stringify({ users, _meta: { lastUpdated: new Date().toISOString() } })}`,
      DRIVE_MCP, 300
    );
    return true;
  } catch { return false; }
}

// ─── Log bejegyzés hozzáadása ────────────────────────────────
export async function appendLog(action, details = {}) {
  try {
    const existing = await callAPI(
      `Olvasd ki a Google Drive fájl tartalmát (fileId: ${LOG_FILE_ID}). Csak a JSON tartalmat add vissza.`,
      DRIVE_MCP
    );
    const clean = existing.replace(/```json|```/g, "").trim();
    let logs = [];
    try { logs = JSON.parse(clean)?.logs || []; } catch {}
    
    const entry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      ...details,
      ip: "client",
    };
    logs.unshift(entry); // legújabb elöl
    if (logs.length > 500) logs = logs.slice(0, 500); // max 500 sor

    await callAPI(
      `Frissítsd a Google Drive fájlt (fileId: ${LOG_FILE_ID}) ezzel a JSON tartalommal: ${JSON.stringify({ logs })}`,
      DRIVE_MCP, 300
    );
    console.log("[LOG]", action, details);
  } catch (e) {
    console.warn("[LOG hiba]", e);
  }
}

// ─── Email küldés Gmail MCP-n keresztül ──────────────────────
export async function sendEmail(to, subject, htmlBody) {
  try {
    await callAPI(
      `Küldj el egy e-mailt a következő adatokkal:
Címzett: ${to}
Tárgy: ${subject}
HTML tartalom: ${htmlBody}

Használd a Gmail MCP send vagy create_draft funkcióját.`,
      GMAIL_MCP, 500
    );
    await appendLog("EMAIL_SENT", { to, subject });
    return true;
  } catch (e) {
    console.warn("[Email hiba]", e);
    await appendLog("EMAIL_ERROR", { to, subject, error: e.message });
    return false;
  }
}

// ─── REGISZTRÁCIÓ ─────────────────────────────────────────────
export async function registerUser({ name, username, email, password, role }) {
  // Validáció
  if (!name || !username || !email || !password || !role) {
    return { ok: false, error: "Minden mező kitöltése kötelező!" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Érvénytelen e-mail cím!" };
  }
  if (password.length < 6) {
    return { ok: false, error: "A jelszó legalább 6 karakter legyen!" };
  }

  const users = await loadUsers();

  if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, error: "Ez a felhasználónév már foglalt!" };
  }
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { ok: false, error: "Ez az e-mail cím már regisztrált!" };
  }

  const pwHash = await hashPassword(password);
  const roleData = ROLES.find(r => r.value === role) || ROLES[1];
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0,2);

  const newUser = {
    id: `u_${Date.now()}`,
    name, username, email, role,
    initials,
    color: roleData.color,
    passwordHash: pwHash,
    active: true,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  };

  users.push(newUser);
  const saved = await saveUsers(users);
  if (!saved) return { ok: false, error: "Adatbázis hiba, próbáld újra!" };

  // Üdvözlő email
  await sendEmail(email, "CRM Napelem – Sikeres regisztráció", `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#2563EB">☀️ CRM Napelem</h2>
      <p>Szia <b>${name}</b>!</p>
      <p>Sikeresen regisztráltál a rendszerbe. Belépési adataid:</p>
      <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:16px 0">
        <p><b>Felhasználónév:</b> ${username}</p>
        <p><b>Jelszó:</b> ${password}</p>
        <p><b>Szerepkör:</b> ${role}</p>
      </div>
      <p>Kérjük, őrizd meg ezeket az adatokat biztonságos helyen!</p>
      <p style="color:#64748b;font-size:12px">CRM Napelem rendszer – automatikus értesítés</p>
    </div>
  `);

  await appendLog("REGISTER", { userId: newUser.id, username, name, email, role });

  // Visszaadjuk a felhasználót jelszó nélkül
  const { passwordHash: _, ...safeUser } = newUser;
  return { ok: true, user: safeUser };
}

// ─── BEJELENTKEZÉS ────────────────────────────────────────────
export async function loginUser(username, password) {
  if (!username || !password) {
    return { ok: false, error: "Add meg a felhasználónevet és jelszót!" };
  }

  const users = await loadUsers();
  const user  = users.find(u =>
    u.username.toLowerCase() === username.toLowerCase() ||
    u.email.toLowerCase()    === username.toLowerCase()
  );

  if (!user) {
    await appendLog("LOGIN_FAILED", { username, reason: "not_found" });
    return { ok: false, error: "Nem található ilyen felhasználó!" };
  }
  if (!user.active) {
    return { ok: false, error: "A fiók le van tiltva. Keresd az adminisztátort!" };
  }

  const pwHash = await hashPassword(password);
  if (pwHash !== user.passwordHash) {
    await appendLog("LOGIN_FAILED", { username, reason: "wrong_password" });
    return { ok: false, error: "Hibás jelszó!" };
  }

  // Utolsó belépés frissítése
  user.lastLogin = new Date().toISOString();
  await saveUsers(users);

  await appendLog("LOGIN_SUCCESS", { userId: user.id, username: user.username, name: user.name });

  const { passwordHash: _, ...safeUser } = user;
  return { ok: true, user: safeUser };
}

// ─── ELFELEJTETT JELSZÓ ───────────────────────────────────────
export async function forgotPassword(email, newPassword) {
  if (!email || !newPassword) {
    return { ok: false, error: "Add meg az e-mail címet és az új jelszót!" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Érvénytelen e-mail cím!" };
  }
  if (newPassword.length < 6) {
    return { ok: false, error: "A jelszó legalább 6 karakter legyen!" };
  }

  const users = await loadUsers();
  const idx   = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) {
    return { ok: false, error: "Nem található fiók ezzel az e-mail címmel!" };
  }

  const pwHash = await hashPassword(newPassword);
  users[idx].passwordHash = pwHash;
  const saved = await saveUsers(users);
  if (!saved) return { ok: false, error: "Adatbázis hiba, próbáld újra!" };

  await sendEmail(email, "CRM Napelem – Jelszó módosítva", `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#2563EB">☀️ CRM Napelem</h2>
      <p>Szia <b>${users[idx].name}</b>!</p>
      <p>A jelszavad sikeresen megváltozott.</p>
      <div style="background:#f1f5f9;border-radius:10px;padding:16px;margin:16px 0">
        <p><b>Felhasználónév:</b> ${users[idx].username}</p>
        <p><b>Új jelszó:</b> ${newPassword}</p>
      </div>
      <p>Ha te kérted a változtatást, nem kell tenned semmit.</p>
      <p>Ha nem te kérted, azonnal vedd fel a kapcsolatot az adminisztrátorral!</p>
      <p style="color:#64748b;font-size:12px">CRM Napelem rendszer – automatikus értesítés</p>
    </div>
  `);

  await appendLog("PASSWORD_RESET", { userId: users[idx].id, email });
  return { ok: true, message: "Jelszó sikeresen megváltoztatva! Ellenőrizd az e-mail fiókod." };
}
