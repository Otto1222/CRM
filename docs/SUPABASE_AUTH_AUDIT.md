# Repository audit – hitelesítés & migrációs felület

Ez az audit a Supabase-alapú hitelesítési átállás **kiindulási állapotát**
rögzíti: hol kezelődik jelenleg felhasználó, szerepkör, jelszóhash és
bejelentkezési állapot, és a későbbi migráció során mely fájlokat kell
megszüntetni vagy átalakítani.

## 1. Hitelesítés / felhasználókezelés érintett fájljai

| Fájl | Jelenlegi szerep | Migrációs teendő |
|------|------------------|------------------|
| `src/pages/Login.jsx` | Bejelentkezés | **Átalakítva** Supabase Auth-ra (kész) |
| `src/App.jsx` | `useState(null)` user + `__crm_test_session__` | **Átalakítva** `AuthProvider`-re (kész) |
| `src/lib/crmUsers.js` | localStorage + SHA-256 belépés, `DEFAULT_USERS` | **@deprecated**; kivezetni, ha az importálók átálltak |
| `src/lib/authApi.js` | Régi Drive-alapú regisztráció/belépés/reset (nyílt jelszót emailez) | **Eltávolítandó** a következő tisztító lépésben |
| `src/lib/roles.js` | UI szerepkör-szűrés | **Átalakítva**: kisbetűs DB szerepkörök + normalizálás (kész) |
| `src/pages/AdminPanel.jsx` | Felhasználó-CRUD (`getUsers`, `saveUsersLocal`, `hashPw`) | Átalakítandó Supabase profil-kezelésre |

## 2. Keresett minták előfordulása

| Minta | Előfordulás (fő helyek) | Státusz |
|-------|-------------------------|---------|
| `checkLogin` | `crmUsers.js` (def), `Login.jsx` (korábban) | Login-ból **eltávolítva** |
| `passwordHash` | `crmUsers.js`, `authApi.js`, `AdminPanel.jsx`, `store.jsx` | Régi rendszer; kivezetendő |
| `defaultPassword` / `hasDefaultPasswords` | `crmUsers.js`, `App.jsx`, `DriveStatusPanel.jsx` | Legacy figyelmeztetés; marad, míg a régi user-tár él |
| `__crm_test_session__` | `App.jsx` (korábban) | **Eltávolítva** (teszt-backdoor megszűnt) |
| `localStorage` / `sessionStorage` | `localDb.js` + sok modul | **Marad** (üzleti adat); csak az auth vált le |

## 3. Szerepkör-elnevezések

- Régi (UI, magyar): `Admin`, `Projektmenedzser`, `Iroda/Könyvelés`, `Telepítő`.
- Új (DB, kisbetűs): `admin`, `projektmenedzser`, `iroda`, `telepito`.
- A `roles.js` `normalizeRole()` / `toDisplayRole()` hidalja át a kettőt, hogy a
  meglévő UI-komponensek változatlanul működjenek az átmenet alatt.

## 4. Amit ez a PR NEM érint (marad localStorage/Drive alatt)

Munkalapok, projektek, ügyfelek, ajánlatok, számlák, kártérítések, sablonok,
munkatípusok, fővállalkozók, elszámolási szabályok, csapatok – ezek a
`localDb.js` + `driveApi.js` / `dataSync.service.js` rétegen maradnak. A
Supabase séma (`customers`, `projects`, `workorders`, …) elkészült, de az
adatmigráció külön, későbbi feladat (lásd `SECURITY_MIGRATION.md` 4. pont).
