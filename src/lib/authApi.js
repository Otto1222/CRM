/**
 * authApi.js – Hitelesítési rendszer
 * Drive: CRM/01_Adatbazis/auth_users.json   → 1JvDiNSgw-u19ke6HcSYFHQWf5nhtRzCc
 * Log:   CRM/01_Adatbazis/activity_log.json → 1mOBwQpOslyiPtRC7rrcMxtLxcSB6D3kn
 */

const AUTH_FILE_ID = "1JvDiNSgw-u19ke6HcSYFHQWf5nhtRzCc";
const LOG_FILE_ID  = "1mOBwQpOslyiPtRC7rrcMxtLxcSB6D3kn";

export const ROLES = [
  { value: "Admin",            label: "Admin",            color: "#2563EB" },
  { value: "Telepítő",        label: "Telepítő",         color: "#059669" },
  { value: "Projektmenedzser", label: "Projektmenedzser", color: "#D97706" },
  { value: "Iroda/Könyvelés", label: "Iroda/Könyvelés",  color: "#0891B2" },
];

// ─── SHA-256 jelszó hash ──────────────────────────────────────
export async function hashPassword(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}

// ─── API hívó – /api/proxy szerverfunkcióra küld ─────────────
async function callAPI(prompt, mcpServers, maxTokens = 1500) {
  const res = await fetch("/api/proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system: "Hajtsd végre pontosan a kérést. Ha JSON adatot kell visszaadni, CSAK azt add vissza, semmi mást, nincs markdown, nincs magyarázat.",
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

const DRIVE_MCP = [{ type: "url", url: "https://drivemcp.googleapis.com/mcp/v1", name: "gdrive" }];
const GMAIL_MCP = [{ type: "url", url: "https://gmailmcp.googleapis.com/mcp/v1",  name: "gmail"  }];

// ─── Felhasználók betöltése ───────────────────────────────────
export async function loadUsers() {
  try {
    const raw = await callAPI(
      `Olvasd ki ezt a Google Drive fájlt (fileId: ${AUTH_FILE_ID}) és add vissza a teljes JSON tartalmát.`,
      DRIVE_MCP
    );
    const clean = raw.replace(/```json|```/g, "").trim();
    if (!clean || clean === "null") return [];
    const parsed = JSON.parse(clean);
    return Array.isArray(parsed) ? parsed : (parsed.users || []);
  } catch (e) {
    console.warn("[loadUsers]", e.message);
    return [];
  }
}

// ─── Felhasználók mentése ─────────────────────────────────────
export async function saveUsers(users) {
  try {
    const payload = JSON.stringify({ users, _meta: { lastUpdated: new Date().toISOString() } });
    await callAPI(
      `Frissítsd ezt a Google Drive fájlt (fileId: ${AUTH_FILE_ID}) a következő JSON tartalommal – írd felül teljesen: ${payload}`,
      DRIVE_MCP, 400
    );
    return true;
  } catch (e) {
    console.error("[saveUsers]", e.message);
    return false;
  }
}

// ─── Log bejegyzés ────────────────────────────────────────────
export async function appendLog(action, details = {}) {
  try {
    const raw = await callAPI(
      `Olvasd ki ezt a Google Drive fájlt (fileId: ${LOG_FILE_ID}) és add vissza a JSON tartalmát.`,
      DRIVE_MCP
    );
    const clean = raw.replace(/```json|```/g, "").trim();
    let logs = [];
    try { logs = JSON.parse(clean)?.logs || []; } catch {}
    logs.unshift({ id: Date.now(), timestamp: new Date().toISOString(), action, ...details });
    if (logs.length > 500) logs = logs.slice(0, 500);
    await callAPI(
      `Frissítsd ezt a Google Drive fájlt (fileId: ${LOG_FILE_ID}) ezzel a tartalommal: ${JSON.stringify({ logs })}`,
      DRIVE_MCP, 400
    );
  } catch (e) { console.warn("[appendLog]", e.message); }
}

// ─── Email küldés Gmail MCP-n ─────────────────────────────────
export async function sendEmail(to, subject, htmlBody) {
  try {
    await callAPI(
      `Küldj el egy e-mailt a Gmail MCP-n keresztül:
Címzett: ${to}
Tárgy: ${subject}
HTML tartalom: ${htmlBody}`,
      GMAIL_MCP, 500
    );
    return true;
  } catch (e) {
    console.warn("[sendEmail]", e.message);
    return false;
  }
}

// ─── REGISZTRÁCIÓ ─────────────────────────────────────────────
export async function registerUser({ name, username, email, password, role }) {
  if (!name || !username || !email || !password || !role)
    return { ok: false, error: "Minden mező kitöltése kötelező!" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Érvénytelen e-mail cím!" };
  if (password.length < 6)
    return { ok: false, error: "A jelszó legalább 6 karakter legyen!" };

  const users = await loadUsers();

  if (users.find(u => u.username?.toLowerCase() === username.toLowerCase()))
    return { ok: false, error: "Ez a felhasználónév már foglalt!" };
  if (users.find(u => u.email?.toLowerCase() === email.toLowerCase()))
    return { ok: false, error: "Ez az e-mail cím már regisztrált!" };

  const pwHash   = await hashPassword(password);
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const roleColor = ROLES.find(r => r.value === role)?.color || "#2563EB";

  const newUser = {
    id: `u_${Date.now()}`,
    name, username, email, role,
    initials, color: roleColor,
    passwordHash: pwHash,
    active: true,
    createdAt: new Date().toISOString(),
    lastLogin: null,
  };

  users.push(newUser);
  const saved = await saveUsers(users);
  if (!saved) return { ok: false, error: "Drive mentési hiba, próbáld újra!" };

  // Visszaigazoló email – jelszót sosem küldünk emailben
  await sendEmail(email, "CRM Napelem – Sikeres regisztráció", `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px">
      <h2 style="color:#2563EB;margin-bottom:8px">☀️ CRM Napelem</h2>
      <p style="margin-bottom:16px">Szia <b>${name}</b>, sikeresen regisztráltál!</p>
      <div style="background:#fff;border-radius:10px;padding:16px;border:1px solid #e2e8f0;margin-bottom:16px">
        <p style="margin:4px 0"><b>Felhasználónév:</b> ${username}</p>
        <p style="margin:4px 0"><b>Szerepkör:</b> ${role}</p>
        <p style="margin:4px 0"><b>E-mail:</b> ${email}</p>
      </div>
      <p style="color:#64748b;font-size:13px">A jelszavadat az adminisztrátortól kapod meg személyesen.</p>
      <p style="color:#64748b;font-size:12px">CRM Napelem – automatikus értesítő rendszer</p>
    </div>
  `);

  await appendLog("REGISTER", { userId: newUser.id, username, name, email, role });

  const { passwordHash: _, ...safeUser } = newUser;
  return { ok: true, user: safeUser };
}

// ─── BEJELENTKEZÉS ────────────────────────────────────────────
export async function loginUser(usernameOrEmail, password) {
  if (!usernameOrEmail || !password)
    return { ok: false, error: "Add meg a felhasználónevet és jelszót!" };

  const users = await loadUsers();
  const user  = users.find(u =>
    u.username?.toLowerCase() === usernameOrEmail.toLowerCase() ||
    u.email?.toLowerCase()    === usernameOrEmail.toLowerCase()
  );

  if (!user) {
    await appendLog("LOGIN_FAILED", { usernameOrEmail, reason: "not_found" });
    return { ok: false, error: "Nem található ilyen felhasználó!" };
  }
  if (!user.active)
    return { ok: false, error: "A fiók le van tiltva. Keresd az adminisztrátort!" };

  const pwHash = await hashPassword(password);
  if (pwHash !== user.passwordHash) {
    await appendLog("LOGIN_FAILED", { username: user.username, reason: "wrong_password" });
    return { ok: false, error: "Hibás jelszó!" };
  }

  user.lastLogin = new Date().toISOString();
  await saveUsers(users);
  await appendLog("LOGIN_SUCCESS", { userId: user.id, username: user.username, name: user.name });

  const { passwordHash: _, ...safeUser } = user;
  return { ok: true, user: safeUser };
}

// ─── ELFELEJTETT JELSZÓ ───────────────────────────────────────
export async function forgotPassword(email, newPassword) {
  if (!email || !newPassword)
    return { ok: false, error: "Add meg az e-mail címet és az új jelszót!" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { ok: false, error: "Érvénytelen e-mail cím!" };
  if (newPassword.length < 6)
    return { ok: false, error: "A jelszó legalább 6 karakter legyen!" };

  const users = await loadUsers();
  const idx   = users.findIndex(u => u.email?.toLowerCase() === email.toLowerCase());
  if (idx === -1)
    return { ok: false, error: "Nem található fiók ezzel az e-mail címmel!" };

  users[idx].passwordHash = await hashPassword(newPassword);
  const saved = await saveUsers(users);
  if (!saved) return { ok: false, error: "Drive mentési hiba, próbáld újra!" };

  await sendEmail(email, "CRM Napelem – Jelszó megváltozott", `
    <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;background:#f8fafc;border-radius:12px">
      <h2 style="color:#2563EB">☀️ CRM Napelem</h2>
      <p>Szia <b>${users[idx].name}</b>! A jelszavad sikeresen módosult.</p>
      <div style="background:#fff;border-radius:10px;padding:16px;border:1px solid #e2e8f0;margin:16px 0">
        <p style="margin:4px 0"><b>Felhasználónév:</b> ${users[idx].username}</p>
        <p style="margin:4px 0">Az új jelszót az adminisztrátortól kapod meg személyesen.</p>
      </div>
      <p style="color:#64748b;font-size:12px">Ha nem te kérted, azonnal keresd az adminisztrátort!</p>
    </div>
  `);

  await appendLog("PASSWORD_RESET", { userId: users[idx].id, email });
  return { ok: true, message: "Jelszó megváltoztatva! Ellenőrizd az e-mail fiókod." };
}
