# AUDIT_000 – Jelenlegi állapot technikai audit

**Dátum:** 2026-06-24  
**Verzió:** 1.0  
**Készítette:** Claude (automatikus kódbázis-elemzés)  
**Érintett branch:** main

---

## 1. Projektstruktúra

### Fő mappák

```
CRM-main/
├── src/
│   ├── App.jsx               – Fő alkalmazás, routing, user state, Drive sync trigger
│   ├── main.jsx              – React 18 root renderelés
│   ├── index.css             – Globális stílusok (minimális)
│   ├── components/           – Újrafelhasználható UI komponensek
│   ├── lib/                  – Üzleti logika, service-ek, utility-k
│   ├── modules/              – Funkcionális modulok (ajanlatok, projektek, stb.)
│   ├── pages/                – Oldalszintű komponensek
│   └── services/             – Kiegészítő service-ek
├── docs/                     – Dokumentáció (jelen fájl)
├── api/                      – Vercel serverless API (ha van)
├── appsscript/               – Google Apps Script forrás
├── public/                   – Statikus fájlok, PWA manifest
├── dist/                     – Build kimenet (Vite)
├── package.json
├── vite.config.js
├── vercel.json
└── fix_*.js                  – Egyszeri adatmigráló scriptek (rootban, lásd 11. fejezet)
```

### Fő komponensek (`src/components/`)

| Fájl | Funkció |
|------|---------|
| `Sidebar.jsx` | Navigációs oldalsáv, role-alapú szűrés |
| `TopBar.jsx` | Felső sáv, Drive status jelzővel |
| `JobProgressModal.jsx` | Háttérfeladat progress overlay (commit 7) |
| `ErrorBoundary.jsx` | React error boundary |
| `PwaInstallBanner.jsx` | PWA telepítési banner |
| `DriveStatusPanel.jsx` | Drive szinkron állapot megjelenítő |
| `StatusBadge.jsx` | Státusz badge komponens |
| `Avatar.jsx` | Felhasználói avatar |
| `Card.jsx` | Generikus kártyakomponens |
| `LmraModal.jsx` | Last Minute Risk Assessment modal |
| `LmraTelepltoView.jsx` | LMRA telepítői nézet |
| `VbfAdminCard.jsx` | VBF admin kártya |
| `FotokAdminCard.jsx` | Fotók admin kártya |
| `FelmeresFotokAdminCard.jsx` | Felmérési fotók admin kártya |
| `AlairasModal.jsx` | Aláírás gyűjtő modal |
| `AddressSearch.jsx` | Cím kereső komponens |

### Fő service fájlok (`src/lib/`)

| Fájl | Funkció |
|------|---------|
| `authApi.js` | MCP-alapú Drive auth (nem használt az aktív loginhoz!) |
| `crmUsers.js` | **Aktív auth**: localStorage-alapú, SHA-256 hash, DEFAULT_USERS |
| `roles.js` | Role-page mapping, jogosultság helper-ek |
| `localDb.js` | localStorage wrapper, BroadcastChannel cross-tab sync |
| `driveApi.js` | Google Drive kommunikáció Apps Script-en át |
| `dataSync.service.js` | Drive↔localStorage szinkron, 16 kollekció |
| `backupService.js` | localStorage snapshot backup, max 10 db |
| `jobProgress.js` | Háttérfeladat progress state machine (pub/sub) |
| `workflowRules.js` | Projekt/munkalap státuszok, forrás-típusok, validációk |
| `schema.js` | Munkalap és kártérítés séma |
| `constants.js` | UI konstansok (színek, betűtípusok) |
| `costEngine.js` | Költségszámítás motor |
| `penzugyiRules.js` | Pénzügyi szabályok |
| `elszamolasPillanatkep.js` | Pénzügyi pillanatkép (lezáráskor) |
| `lmraService.js` | LMRA kockázatbecslés logika |
| `lmraData.service.js` | LMRA adatkezelés |
| `vbfDocxService.js` | VBF Word dokumentum generálás (docxtemplater) |
| `vbfPdfMerge.js` | VBF PDF merge (pdf-lib) |
| `lmraPdfMerge.js` | LMRA PDF merge |
| `exportService.js` | Excel/JSON export |
| `export.js` | Alternatív export (párhuzamos fájl – lásd 11. fejezet) |
| `reportService.js` | Riport generáló |
| `geo.js` | Geo helper |
| `geoService.js` | Geo service (párhuzamos fájl – lásd 11. fejezet) |
| `helpers.js` | Általános segédfüggvények |
| `anyagArVerzio.js` | Anyagár-verzió kezelés |
| `anyagtorzs.js` | Anyagtörzs adatok |
| `dokumentumszam.js` | EDI sorszám generálás |
| `azonositoHelper.js` | Azonosító helper |
| `karterites.js` | Kártérítés logika |
| `csapatMigracio.js` | Egyszeri csapat-migráció |
| `munkakiosztasAlgo.js` | Munkakiosztás algoritmus |
| `munkakiosztasSettings.js` | Munkakiosztás beállítások |
| `munkalapDb.js` | Munkalap DB helper |
| `munkalapRiportHelper.js` | Munkalap riport helper |
| `projectTypeFormatter.js` | Projekt típus formázó |
| `sampleData.js` | Minta adatok (szándékosan üres: `[]`) |
| `store.jsx` | (Létezik, nem vizsgált ebben az auditban) |

### Modulok (`src/modules/`)

| Modul | Fájlok |
|-------|--------|
| `ajanlatok/` | `AjanlatEditor.jsx`, `ajanlat.schema.js`, `ajanlat.service.js`, `ajanlatPrint.js` |
| `projektek/` | `ProjektekPage.jsx`, `ProjektDetail.jsx`, `ProjektForm.jsx`, `ProjektTable.jsx`, `projekt.schema.js`, `projekt.service.js`, `projectRules.js`, `projektWorkflow.js`, `tabs/` (10 tab) |
| `csapatok/` | `CsapatokPage.jsx`, `csapat.schema.js`, `csapat.service.js` |
| `szamlak/` | `SzamlakPage.jsx`, `SzamlaForm.jsx`, `SzamlaPdfSablon.jsx`, `pease.api.js`, `szamla.schema.js`, `szamla.service.js` |
| `fovallalkozok/` | `FovallalkozoPage.jsx`, `elszamolasiMotor.js`, `fovallalkozo.schema.js`, `fovallalkozo.service.js` |
| `munkatipusok/` | `MunkatipusokPage.jsx`, `munkatipus.schema.js`, `munkatipus.service.js` |
| `munkalap_sablonok/` | `MunkalapSablonokPage.jsx`, `munkalapSablon.schema.js`, `munkalapSablon.service.js` |
| `kivitelezesi_csomag/` | `kivitelezesiCsomag.schema.js`, `kivitelezesiCsomag.service.js` |
| `penzugy/` | `penzugyi.schema.js`, `penzugyi.service.js` |

### Page fájlok (`src/pages/`)

| Fájl | Funkció | Státusz |
|------|---------|---------|
| `Login.jsx` | Bejelentkezési oldal | Aktív |
| `Dashboard.jsx` | Főoldal (statisztikák) | Aktív |
| `Munkalapok.jsx` | Munkalap lista + detail | Aktív |
| `Ugyfelek.jsx` | Ügyfélkezelés | Aktív |
| `ArajanlaltokPage.jsx` | Ajánlatok | Aktív |
| `BeallitasokPage.jsx` | Admin beállítások | Aktív |
| `AdminPanel.jsx` | Felhasználókezelő (belül) | Aktív |
| `BackupKezelo.jsx` | Backup kezelő | Aktív |
| `RiportokPage.jsx` | Riportok | Aktív (részleges) |
| `NaptarPage.jsx` | Naptár nézet | Aktív (részleges) |
| `KarteritesekTab.jsx` | Kártérítések | Aktív |
| `ComingSoon.jsx` | Fejlesztés alatt oldal | Template |
| `SablonKezelo.jsx` | Sablon szerkesztő | Aktív |
| `AnyagtorzsPage.jsx` | Anyagtörzs | Aktív |
| `AdatTerkepDebug.jsx` | Debug eszköz (adminOnly) | Aktív |
| `UjMunkalap.jsx` | Új munkalap modal | Aktív |
| `FotoFeltoltes.jsx` | Fotó feltöltés | Aktív |
| `FelmeresFotok.jsx` | Felmérési fotók | Aktív |
| `FelmeresJegyzokonyv.jsx` | Felmérési jegyzőkönyv | Aktív |
| `FelmeresTelepito.jsx` | Felmérés (telepítői) | Aktív |
| `VbfJegyzokonyv.jsx` | VBF jegyzőkönyv | Aktív |
| `TelepItoMunkalap.jsx` | Telepítői munkalap nézet | Aktív |
| `JegyzokonyviBeallitasok.jsx` | Jegyzőkönyvi beállítások | Aktív |
| `Munkakiosztas.jsx` | Munkakiosztás | Aktív (részleges) |
| `MunkakiosztasBeallitasok.jsx` | Munkakiosztás beállítások | Aktív |
| `UjrakiosztasModal.jsx` | Újrakiosztás modal | Aktív |

### Kiegészítő service-ek (`src/services/`)

| Fájl | Funkció |
|------|---------|
| `workorder.service.js` | Munkalap CRUD, státuszkezelés |
| `settlementCalculator.js` | Elszámolás kalkulátor |
| `settlementRule.service.js` | Elszámolási szabályok |
| `financialCalculation.service.js` | Pénzügyi számítások |
| `workFeeCalculation.service.js` | Munkadíj számítás |
| `travelCalculation.service.js` | Utazási költség számítás |
| `workOrderFinancial.service.js` | Munkalap pénzügy |
| `anyagSzamito.service.js` | Anyagszámítás |
| `projectReport.service.js` | Projekt riport |
| `projectWorkorder.service.js` | Projekt-munkalap kapcsolat |
| `calendarSync.service.js` | Google Naptár szinkron |
| `naptar.service.js` | Naptár logika |
| `jelenlet.service.js` | Jelenlét kezelés |

---

## 2. Runtime architektúra

### Frontend
- **Framework:** React 18 + Vite 5
- **Build:** `vite build` → `dist/` mappa, Vercel deploy
- **Routing:** Nincs React Router – `page` useState értéke vezérel (`App.jsx`)
- **Stílus:** Kizárólag inline CSS, nincs Tailwind/MUI/CSS modul
- **PWA:** Van manifest és PwaInstallBanner, de service worker nincs konfigurálva (Nem bizonyított / további ellenőrzés kell)
- **Fonts:** System font stack (`FONT` konstans)
- **Dependencies:** lucide-react (ikonok), recharts (grafikonok), docxtemplater (Word), pdf-lib (PDF), xlsx (Excel), pizzip

### Backend/API
- **Nincs klasszikus backend** – az alkalmazás pure frontend SPA
- `api/` mappa létezik a rootban (Vercel serverless) → **Nem bizonyított / további ellenőrzés kell** (a `authApi.js` hivatkozik `/api/proxy`-ra, de ennek működése nem ellenőrzött)
- `appsscript/` mappa tartalmazza az Apps Script forrást

### Apps Script
- **URL:** `import.meta.env.VITE_APPS_SCRIPT_URL` (Vercel env var)
- **Feladat:** Drive JSON read/write, fotófeltöltés, mappák létrehozása, Calendar sync
- **Kommunikáció:** POST `text/plain;charset=UTF-8` (CORS preflight elkerülés)
- **Actions:** `saveJson`, `loadJson`, `createMunkalapFolder`, `createProjektFolder`, `saveFoto`, `syncCalendarEvent`, `deleteCalendarEvent`, `ping`, `diagnose`, `testPost`
- **Cold start probléma:** Első POST után redirect→GET→HTML 404 jelenség ismert

### Google Drive
- **Gyökér mappa:** `1-MuCrK__dMkoep19f8cJFBpgJQAkwu-5`
- **DB mappa (01_Adatbazis):** `1jkRh98v5pm73Dyhmn3FioFkznBaxWwsW`
- **Fotók mappa (04_Fotok):** `1ccvd4iUnB-jEyrSGJBZs_fSOScL_aQPx`
- **Auth fájl (authApi.js):** `1JvDiNSgw-u19ke6HcSYFHQWf5nhtRzCc` (csak az unused authApi.js-ben)
- **Activity log:** `1mOBwQpOslyiPtRC7rrcMxtLxcSB6D3kn` (csak az unused authApi.js-ben)

### localStorage (elsődleges adatbázis)
- Minden CRM adat a böngésző localStorage-ban él
- Drive csak szinkron/backup szerepet tölt be
- **Limit:** böngészőnként 5–10 MB (nincs quota monitoring)

### Vite/React működés
- `main.jsx` → `ReactDOM.createRoot().render(<App/>)`
- `App.jsx` kezeli az összes route-ot, user state-et és Drive sync triggert
- `window.dispatchEvent("crm-db-updated")` pub/sub a kollekciók közti kommunikációhoz
- `BroadcastChannel("crm-db-sync")` cross-tab szinkronizációhoz

---

## 3. Authentication / Login

### Hol történik a login
- `src/pages/Login.jsx` – UI form
- `src/lib/crmUsers.js:checkLogin()` – az aktív bejelentkezési logika

### Login folyamat (aktív)
1. `Login.jsx` elküldi `username` + `password` értékeket a `checkLogin()` hívásba
2. `crmUsers.js:checkLogin()` betölti a felhasználókat `localStorage["crm_napelem_users"]`-ból
3. Ha localStorage üres → `DEFAULT_USERS` tömb kerül használatba (hardcoded a forráskódban)
4. SHA-256 hash számítás (`crypto.subtle.digest`) a megadott jelszóra
5. Hash összehasonlítás a tárolt `passwordHash` értékkel
6. Sikernél: `{ ok: true, user: safeUser }` → `App.jsx:handleLogin(u)` hívódik
7. `user` state beállítódik → `useEffect([user])` triggereli a Drive szinkront

### Hardcoded felhasználók (`crmUsers.js` DEFAULT_USERS)
```
id: u1 | username: edi      | role: Admin
id: u2 | username: kutasi   | role: Telepítő
id: u3 | username: csapat2  | role: Telepítő
id: u4 | username: projekt  | role: Projektmenedzser
id: u5 | username: iroda    | role: Iroda/Könyvelés
```
**A jelszóhash-ek a forráskódban szerepelnek. Ha a hash ismert jelszóhoz tartozik (pl. gyenge/default jelszó), a forrásból is kiolvasható.**

### Van-e hardcoded default password?
**IGEN** – a `DEFAULT_USERS`-ban szereplő `passwordHash` értékek alapján az `App.jsx` figyelmeztet ha az éles rendszeren még az eredeti hash-ek vannak (`hasDefaultPasswords()`).

### Van-e frontend oldali login?
**IGEN** – a teljes auth frontend-oldalon fut, `crypto.subtle` API-val. Nincs szerver oldali ellenőrzés.

### Van-e backend oldali ellenőrzés?
**NEM** – a `crmUsers.js`-en keresztüli bejelentkezés kizárólag browser-side. Az `authApi.js` tartalmaz egy alternatív, Drive MCP-alapú auth rendszert (`loginUser()`), de **ezt a `Login.jsx` NEM hívja**. Az `authApi.js` a `/api/proxy` Vercel endpoint-on keresztül kommunikálna – ennek megléte és működése nem bizonyított.

### Session kezelés
- Bejelentkezés után a `user` objektum React `useState`-ben él (nem cookie, nem token, nem localStorage)
- `localStorage["__crm_test_session__"]` kulcs: `App.jsx` startup-kor beolvassa, ha van → user beállítódik, majd AZONNAL törli. Ez egy egyszeri tesztelési mechanizmus.
- Kijelentkezéskor (`logout()`): `setUser(null)` – a session azonnal megszűnik
- **Oldalbetöltés = automatikus kijelentkezés** (nincs session persistencia – kivéve a `__crm_test_session__` egyszeri mechanizmus)

---

## 4. Authorization / Jogosultság

### Roles (szerepkörök)
Definiálva: `src/lib/authApi.js` (ROLES tömb) és `src/lib/roles.js` (ROLE_PAGES)

| Role | Hozzáférés |
|------|-----------|
| `Admin` | Minden oldal (dashboard, ugyfelek, arajanlatok, projektek, munkalapok, naptar, szamlak, karteritesek, riportok, csapat, munkalap_sablonok, beallitasok) |
| `Projektmenedzser` | Azonos az Adminnal |
| `Iroda/Könyvelés` | dashboard, ugyfelek, projektek, munkalapok, naptar, szamlak, karteritesek, riportok |
| `Telepítő` | Csak: munkalapok (saját munkalapok) |

### Hol vannak definiálva
- `src/lib/roles.js` → `ROLE_PAGES` objektum
- `src/lib/authApi.js` → `ROLES` tömb (label + color, nem logika)

### Frontend vagy backend oldalon?
**Kizárólag frontend oldalon.** A `Sidebar.jsx` az `getAllowedPages(role)` segítségével szűri a megjelenő menüpontokat. Az `App.jsx` minden page komponenst feltételesen renderel (`page === "X" && <Component>`), de **nincs szerver oldali route guard**.

### Mit lehet megkerülni?
- A teljes jogosultságvizsgálat megkerülhető browser DevTools-szal (`window.__crm` stb. – nem bizonyított)
- Közvetlenül nem lehet URL-lel navigálni (SPA, nincs React Router), de a `page` state manipulálása megkerülhető
- Egy Telepítő elvben láthat Admin-only adatokat, ha a React state-et módosítja
- A Drive API hívások (Apps Script) semmilyen user/role ellenőrzést nem végeznek – bárki, aki tudja a `VITE_APPS_SCRIPT_URL` értékét, közvetlenül hívhatja

---

## 5. Adattárolás

### localStorage kulcsok (20+)

| Kulcs | Típus | Tartalom |
|-------|-------|----------|
| `munkalapok` | Array | Munkalapok (workorder-ek) |
| `ugyfelek` | Array | Ügyfelek |
| `projektek` | Array | Projektek |
| `ajanlatok` | Array | Ajánlatok |
| `szamlak` | Array | Számlák |
| `csapatok` | Array | Csapatok |
| `csapat_tagok` | Array | Csapattagok |
| `crm_napelem_users` | Array | Felhasználók (SHA-256 hash-el) |
| `beallitasok` | Object | Alkalmazás beállítások |
| `fovallalkozok` | Array | Fővállalkozók |
| `munkatipusok` | Array | Munkatípusok |
| `elszamolasi_szabalyok` | Array | Elszámolási szabályok |
| `karteritesek` | Array | Kártérítések |
| `sablonok` | Array | Sablonok (felhasználói dokumentum sablonok) |
| `anyag_ar_verziok` | Array | Anyagár-verziók |
| `kivitelezesi_csomagok` | Array | Kivitelezési csomagok |
| `edi_sorszam_counter` | Number | EDI munkalap sorszám számláló |
| `edi_projekt_sorszam_counter` | Number | E.D.I.XXX projekt sorszám számláló |
| `edi_ajanlat_sorszam_counter` | Object | AJA-YYYY-XXX ajánlat sorszám (évente) |
| `crm_backups` | Array | Backup snapshot-ok (max 10) |
| `crm_drive_sync_log` | Object | Drive szinkron napló (per kollekció) |
| `crm_schema_version` | String | Séma verzió |
| `vbf_<munkalapId>` | Object | VBF adatok per-munkalap |
| `fotok_<munkalapId>` | Object | Fotók (base64) per-munkalap |
| `felh_anyagok_<munkalapId>` | Object | Felhasznált anyagok per-munkalap |
| `karterites_<munkalapId>` | Object | Kártérítés per-munkalap |
| `projekt_pillanatkep_<projektId>` | Object | Pénzügyi pillanatkép per-projekt |

### Drive fájlok (01_Adatbazis mappa)
Egy-egy JSON fájl `SYNC_COLLECTIONS`-ból:
- `projektek.json`, `munkalapok.json`, `ugyfelek.json`, `beallitasok.json`, `munkatipusok.json`, `fovallalkozok.json`, `elszamolasi_szabalyok.json`, `karteritesek.json`, `sablonok.json`, `csapatok.json`, `csapat_tagok.json`, `crm_napelem_users.json`, `szamlak.json`, `anyag_ar_verziok.json`, `kivitelezesi_csomagok.json`, `ajanlatok.json`
- `pillanatkepek.json` – összesített pillanatképek
- `vbf_<munkalapId>.json` – per-munkalap VBF adatok
- `crm_backups.json` – manuális Drive mentésnél

### Melyik adat hol van tárolva?

| Adat | localStorage | Drive | Megjegyzés |
|------|-------------|-------|-----------|
| Projektek | ✓ (elsődleges) | ✓ (szinkron) | |
| Munkalapok | ✓ | ✓ | |
| Ügyfelek | ✓ | ✓ | |
| Ajánlatok | ✓ | ✓ | |
| Számlák | ✓ | ✓ | |
| Felhasználók (hash) | ✓ | ✓ | `crm_napelem_users` |
| Fotók (base64) | ✓ | ✓ (Drive file) | Nagy méret! |
| VBF adatok | ✓ (`vbf_*`) | ✓ (`vbf_*.json`) | |
| Backup-ok | ✓ | Csak manuálisan | |
| Pillanatképek | ✓ (`projekt_pillanatkep_*`) | ✓ | |

---

## 6. Sync / Backup

### Drive szinkron (`dataSync.service.js`)

**Bejelentkezéskor (syncAllFromDrive):**
1. Mind a 16 `SYNC_COLLECTIONS` + `pillanatkepek` Drive-ról betöltve
2. Merge stratégia: `mergeByIdUpdatedAt()` – Drive + lokális, frissebb nyer, lokális rekord SOSEM törlődik
3. Counter öngyógyítás: ha localStorage törlődött, a Drive adatokból visszaállítja a sorszám-számláló értékét
4. JobProgressModal mutatja a haladást (17 lépés)

**Manuális mentés (syncAllToDrive):**
1. Beállítások → "Drive teljes mentés" gomb, vagy `App.jsx:handleSyncAllToDrive()`
2. Mind a 16 `SYNC_COLLECTIONS` lokálisból Drive-ra írva
3. `saveCollection()` hívja a driveSave-et per-kollekció

**Automata mentés (per-módosítás):**
- Minden `saveWorkorders()`, `saveProjektek()`, stb. azonnal meghívja a `driveSave()`-t
- Nem várja be – `.catch(() => notifySyncFailed())` mintával

### Van-e automata backup?
**Nem** – a `createBackup()` csak `createProjekt()` és `deleteProjekt()` előtt fut automatikusan. A `BackupKezelo.jsx`-en keresztül manuálisan is indítható. Legfeljebb 10 snapshot tárolódik localStorage-ban (`crm_backups`).

### Adatütközés-kezelés
- `mergeByIdUpdatedAt()`: `updatedAt` timestamp-alapú, lokális rekord nem törlődik
- Ha mindkét oldalon változott, a frissebb nyer
- Ha az `updatedAt` hiányzik → lokális marad

### Üres adat felülírás elleni védelem
- `saveCollection()` tartalmaz védelmet: `if (!opts.force && Array.isArray(data) && data.length === 0)` → megakadályozza az üres array mentését, ha lokálisan van adat
- `beallitasok` (objektum típus) – nincsen hasonló védelme
- `clearCollection()` az egyetlen engedélyezett felülírás (Admin → "Teljes tesztadat törlés")

### Netkimaradás esetén
- `driveAvailable()` – SCRIPT_URL megléte alapján ellenőrzi
- Offline esetén: lokálisan mentés, `crm-sync-warning` event
- `isOnline` state figyelő: `window.addEventListener("online"/"offline")`
- UI-ban piros sáv: "Nincs internetkapcsolat"

---

## 7. Fő entitások (mezőszint)

### Projekt (`PROJEKT_SCHEMA`, `projekt.schema.js`)
```
id, projektkod (E.D.I.XXX), kulsoAzonosito,
nev, clientId, megbizoCeg, clientNev, clientCim, clientTel, clientEmail,
kapcsolattarto, telepitesiCim,
tipus (enum: 7 érték), status (enum: 8 érték),
napelemDb, inverterDb, akkumulatorDb, smartMeterDb,
akkumulator (bool), okosmerő (bool), autoTolto (bool),
projektvezetoId, projektvezetoNev, csapatId, csapatNev,
tervezettKezdes, tervezettBefejezes, valoKezdes, valoBefejezes,
elvegzettMunkaora, munkalapIds[], dokumentumIds[],
elfogadottAjanlat, megjegyzesek[], esemenynaplo[],
forrás (enum: sajat_ajanlat | fovallalkozoi_munka | belso_munka),
anyagelszamolasiMod (NINCS_KIVALASZTVA | 3 aktív mód),
adminReviewRequired, projektTipus, ajanlatId,
elfogadottAjanlatPillanatkep (mély másolat, immutábilis),
fovKapcsolattarto, fovFizetesiHatarido, fovMegjegyzes,
penzugy (PENZUGY_DEFAULTS: fovallalkoziId, munkatipus, elszamolasiSzabalyId,
         tavKm, tavKmForras, tavKmNaplo, csapatLetszam, munkanapok, darabszam,
         felultBevitel, keziCsapatBer, keziUtikoltség, keziAnyagkoltség, keziKartérités),
driveProjektMappa, createdAt, updatedAt, createdBy, updatedBy, version, syncStatus
```

### Munkalap (`MUNKALAP_SCHEMA`, `schema.js`)
```
id, ediSorszam, dokumentumszam, munkalapSzam, projektId,
fovallalkoiAzonosito, munkalapTipus (enum: 7), status (enum: 6),
indoklas (kötelező ha Részben kész/Sikertelen),
datum, clientId, clientNev, clientCim, clientTel, clientEmail,
telepitesiCim, assigneeId, assigneeNev, csapatId, csapatNev, csapatKiosztasok[],
megkezdesIdopont, befejezesIdopont, lezarvaDate,
projektMegnevezes, feladat, description, megjegyzes,
items[] (számlázási tételek), anyagok[] (felhasznált anyagok),
felmeres{} (felmérési adatok), alairas (base64), felmeresAlairas,
megkezdve (bool), lezarva (bool), felmeresKesz (bool), forrasKiosztas (bool),
ar, munkaeroDij, kiszallasiDij, egyebKolts,
createdAt, updatedAt, createdBy, updatedBy, version, syncStatus
```

### Ügyfél (nem explicit schema fájl)
```
id, nev, cim, tel, email, megjegyzes, createdAt, updatedAt
```
(Nem bizonyított / az ügyfél schema direkten a komponensből vezérelt)

### Ajánlat (`AJANLAT_SCHEMA`, `ajanlat.schema.js`)
```
id, ajanlatkod (AJA-YYYY-XXX), clientId, clientNev, clientTel, clientEmail, clientCim,
nev, status (6 állapot: Piszkozat/Kiküldve/Módosítás alatt/Elfogadva/Elutasítva/Lejárt),
osszeg, ervenyesseg (YYYY-MM-DD), megjegyzes, projektId, keszitette,
createdAt, updatedAt, afa_szazalek (27),
fo_tetelek[] (11 elem: termék és összesített tételek, profitlogikával),
reszlet_tetelek[], kivi_kalkulator{}
```

### Számla (nem auditált mélységig)
```
Nem bizonyított / részletes séma: szamla.schema.js
PEASE API integrációval tervezett (stub – jelenleg nem él)
```

### Csapat (`csapat.schema.js`)
```
Nem bizonyított / részletes mezők: csapat.schema.js
id, nev, tagok[], tagNevek[] – Nem bizonyított további mezők
```

### User (`DEFAULT_USERS`, `crmUsers.js`)
```
id, name, username, email (opcionális), role (4 érték),
initials, color, passwordHash (SHA-256), active (bool),
createdAt, lastLogin
```
**Megjegyzés:** az `AdminPanel.jsx` menti a `defaultPassword` mezőt is (plaintext!) – lásd 9. fejezet P0-2.

### Dokumentum (sablon)
```
Nem bizonyított / a sablonok Beállítások → Dokumentum sablonok alatt kezelhetők
vbfDocxService.js via docxtemplater
```

### Fotó
```
Nem önálló rekord-típus – munkalaphoz tartozik
localStorage: fotok_<munkalapId> (base64 string)
Drive: 04_Fotok mappában, projektkód alapú almappában
```

---

## 8. Kritikus folyamatok (fájlhivatkozásokkal)

### Bejelentkezés
1. `src/pages/Login.jsx` (form submit, `handleSubmit`)
2. `src/lib/crmUsers.js:checkLogin()` (SHA-256 hash, localStorage lookup)
3. `src/App.jsx:handleLogin()` (user state beállítás, initSablonok, csapatMigráció)
4. `src/App.jsx useEffect([user])` → `src/lib/dataSync.service.js:syncAllFromDrive()`

### Kijelentkezés
1. `src/components/Sidebar.jsx` → kijelentkezés gomb
2. `src/App.jsx:logout()` → `setUser(null)`, `setSel(null)`, `setPage("dashboard")`
3. Nincs localStorage törlés – az adatok megmaradnak böngészőben

### Projekt létrehozás
1. `src/modules/projektek/ProjektForm.jsx` (form, validateProjektDatum, validateProjektForrás)
2. `src/modules/projektek/projekt.service.js:createProjekt()` (validáció → createBackup → localStorage → Drive)
3. Ha `sajat_ajanlat`: `src/modules/kivitelezesi_csomag/kivitelezesiCsomag.service.js:createKivitelezesiCsomagForProjekt()`

### Munkalap létrehozás
1. `src/pages/UjMunkalap.jsx` (form UI)
2. `src/App.jsx:handleNewMunkalap()` (ID generálás, localStorage, Drive, linkMunkalap)
3. Alternatívan: `src/services/workorder.service.js:createWorkorder()` (sorszám-ütközésvédelem, naptár szinkron)

### Munkalap lezárás
1. `src/pages/Munkalapok.jsx` → `MunkalapDetail` komponens (státuszváltás)
2. `src/services/workorder.service.js:updateWorkorder()` (validateWorkorderBeforeSave, projekt státusz automata frissítés)
3. `src/services/calendarSync.service.js:syncMunkalapToCalendar()`
4. Ha minden munkalap kész: pénzügyi előkészítés (dinamikus import → `src/services/financialCalculation.service.js`)

### Fotófeltöltés
1. `src/pages/FotoFeltoltes.jsx` vagy `src/components/FotokAdminCard.jsx`
2. `src/lib/driveApi.js:driveUploadFoto()` (FileReader → base64 → POST → Apps Script → Drive 04_Fotok)

### Dokumentumgenerálás (VBF/LMRA)
1. `src/lib/vbfDocxService.js` (docxtemplater + sablon Word) → browser download
2. `src/lib/vbfPdfMerge.js` (pdf-lib) → PDF merge
3. `src/lib/lmraPdfMerge.js` → LMRA PDF

### Drive mentés (egy kollekció)
1. `src/lib/driveApi.js:driveSave(collection, data)` → POST Apps Script → JSON fájl Drive-on

### Drive betöltés (bejelentkezéskor)
1. `src/lib/dataSync.service.js:syncAllFromDrive()` → `driveLoad()` per-kollekció → `mergeByIdUpdatedAt()` → `saveLocal()`

### Backup
1. Manuális: `src/pages/BackupKezelo.jsx` → `src/lib/backupService.js:createBackup()`
2. Automata: `createBackup()` hívódik `projekt.service.js:createProjekt()` és `deleteProjekt()` előtt
3. Snapshot: `localStorage["crm_backups"]` max 10 db
4. Drive backup: csak ha `saveToDrive: true` paraméterrel hívják (alapértelmezetten nem)

---

## 9. Biztonsági kockázatok

### P0 – Kritikus

**P0-SEC-1 – Plaintext jelszó localStorage-ban**
- **Érintett fájl:** `src/pages/AdminPanel.jsx:49`
- **Probléma:** `updates.defaultPassword = newPw.trim()` – az admin jelszómódosításkor a plaintext jelszót elmenti a user objektumba, ami `crm_napelem_users` kulcs alatt a localStorage-ba, majd Drive-ra (`crm_napelem_users.json`) is kerül
- **Miért veszélyes:** A Drive-on tárolt felhasználói rekord tartalmazza a jelszót plaintext formátumban. Bárki, aki hozzáfér a Drive fájlhoz vagy a localStorage-hoz, megkapja az összes felhasználó jelszavát
- **Javasolt javítás:** Az `updates.defaultPassword` sor törlése. Jelszóváltoztatáskor csak a `passwordHash` mentendő

**P0-SEC-2 – Hardcoded jelszóhash-ek forráskódban**
- **Érintett fájl:** `src/lib/crmUsers.js:15-61` (DEFAULT_USERS)
- **Probléma:** 5 felhasználó jelszóhash-e forráskódban van (GitHub-on nyilvánosan látható), a felhasználónevekkel együtt
- **Miért veszélyes:** Ha bármelyik hash ismert jelszóhoz (pl. alapértelmezett gyenge jelszóhoz) tartozik, az attacker teljes hozzáférést szerez. A hash egy ismert jelszó esetén visszafejthető (rainbow table, brute force)
- **Javasolt javítás:** DEFAULT_USERS törlése, vagy a hashek cseréje erős, nem kitalálható jelszóra. Kötelező jelszócsere az első bejelentkezésnél

**P0-SEC-3 – Nincs szerver oldali autentikáció**
- **Érintett fájlok:** `src/lib/crmUsers.js`, `src/pages/Login.jsx`, `src/lib/roles.js`
- **Probléma:** A teljes login és jogosultságkezelés böngésző-oldalon fut. Browser DevTools-szal a `user` React state-et manipulálva bármilyen role-lal lehet "belépni"
- **Miért veszélyes:** Bárki, aki megnyitja az oldalt, Admin-ként tud hozzáférni az adatokhoz ha a React state-et manipulálja. Az Apps Script sem ellenőriz jogosultságot
- **Javasolt javítás:** Szerver oldali session kezelés (pl. Vercel middleware + titkos token). Az Apps Script is ellenőrizze a hívó identitását

**P0-SEC-4 – Apps Script URL nyilvánosan hozzáférhető**
- **Érintett fájl:** `src/lib/driveApi.js`, `.env`/Vercel config
- **Probléma:** A `VITE_` prefixű env változók a build során a JavaScript bundle-be kerülnek (szándékosan – Vite spec), tehát az Apps Script URL nyilvánosan olvasható minden böngészőből
- **Miért veszélyes:** Bárki, aki tudja az Apps Script URL-t, tetszőleges JSON adatot írhat a Drive-ra (pl. törlés, felülírás, hamis adat). Nincs autentikáció az Apps Script oldalán
- **Javasolt javítás:** Az Apps Script-hez adjunk titkos tokent (shared secret), amelyet minden hívásnak tartalmaznia kell. A token Vercel serverless function-ön legyen, ne a frontend bundle-ben

### P1 – Magas

**P1-SEC-1 – Jogosultság csak frontend szinten érvényesítve**
- **Érintett fájl:** `src/lib/roles.js`, `src/components/Sidebar.jsx`, `src/App.jsx`
- **Probléma:** A ROLE_PAGES csak a Sidebar szűrőjét és az `App.jsx` renderelési feltételeit befolyásolja. A service-ek (`projekt.service.js`, `workorder.service.js` stb.) nem ellenőrzik a `user.role`-t a mentési/olvasási műveleteknél
- **Miért veszélyes:** Egy Telepítő beláthat Admin-only oldalakra, módosíthat pénzügyi adatokat, ha a page state-et manipulálja

**P1-SEC-2 – Drive fájl ID-k nyilvánosan láthatók**
- **Érintett fájlok:** `src/lib/driveApi.js:15-16`, `src/lib/authApi.js:7-8`
- **Probléma:** A Drive mappa és fájl ID-k a forráskódban vannak, így a bundle-ből kiolvashatók
- **Miért veszélyes:** Az ID-k ismeretében közvetlenül hozzáférhetők a Drive-on tárolt adatfájlok (ha a Drive megosztási beállítások nem megfelelők)

**P1-SEC-3 – Email tartalmaz plaintext jelszót**
- **Érintett fájl:** `src/lib/authApi.js:151-163` (registerUser) és `:221-230` (forgotPassword)
- **Probléma:** A regisztrációs és jelszó-visszaállítási emailek plaintext jelszót tartalmaznak: `<p>Jelszó: ${password}</p>`
- **Miért veszélyes:** Az email logokban, a Gmail tárhelyén és a céges email szervereken megjelenik a jelszó

### P2 – Közepes

**P2-SEC-1 – authApi.js nem integrált, de gyártói szinten érzékeny kódot tartalmaz**
- **Érintett fájl:** `src/lib/authApi.js`
- **Probléma:** Az `authApi.js` tartalmaz MCP-alapú Claude API hívásokat, hardcoded Drive fájl ID-kat, és email küldési logikát – de a `Login.jsx` NEM használja ezt. A `/api/proxy` endpoint megléte és biztonsága nem bizonyított
- **Miért veszélyes:** Ha az `/api/proxy` endpoint él és nincs megfelelően védve, arbitrary Claude API hívásokat tehet bárki

**P2-SEC-2 – BroadcastChannel üzenetforrás nem ellenőrzött**
- **Érintett fájl:** `src/lib/localDb.js:37-46`
- **Probléma:** A BroadcastChannel (`crm-db-sync`) üzeneteket validáció nélkül fogadja és dispatch-eli
- **Miért veszélyes:** Más origin-ú tab-ok nem tudnak BroadcastChannel-en üzenni (ugyanolyan origin kell), de egyazon origin-on futó más alkalmazás manipulálhatja az adatokat

### P3 – Alacsony

**P3-SEC-1 – Nincs rate limiting a login form-on**
- **Érintett fájl:** `src/pages/Login.jsx`, `src/lib/crmUsers.js`
- **Probléma:** Nincs brute-force védelem a bejelentkezési próbálkozásokra

**P3-SEC-2 – Base64 fotók a localStorage-ban**
- **Érintett fájl:** `src/lib/driveApi.js:130-147`
- **Probléma:** Ha a localStorage tartalmának mérete megközelíti a böngészős limitet (~5MB), írási hibák léphetnek fel, amelyek néma adatvesztéshez vezethetnek

---

## 10. Adatvesztési kockázatok

**ADV-1 – Backup nem fedi le az összes kollekciót**
- **Érintett fájl:** `src/lib/backupService.js:12-28`
- **Probléma:** A `MAIN_KEYS` tömbben nem szerepel: `csapatok`, `csapat_tagok`, `crm_napelem_users`, `szamlak`, `anyag_ar_verziok`, `kivitelezesi_csomagok`, `ajanlatok`
- **Hogyan veszhet adat:** Visszaállítás után a fenti kollekciók az újabb Drive szinkronból töltődnek vissza (ha van Drive), de ha nincs Drive, ezek az adatok elvesznek
- **Javasolt javítás:** `MAIN_KEYS` bővítése minden szinkronizált kollekcióval

**ADV-2 – Max 10 backup snapshot localStorage-ban**
- **Érintett fájl:** `src/lib/backupService.js:137-141`
- **Probléma:** A legrégebbi snapshot-ok automatikusan törlődnek
- **Hogyan veszhet adat:** Ha 10-nél több módosítás történt, a régi állapot visszaállíthatatlan backup-ból
- **Javasolt javítás:** Manuális Drive backup lehetőség (a `saveToDrive` opció be van vezetve, de csak manuálisan hívható)

**ADV-3 – Apps Script cold start sikertelenség néma adatvesztés**
- **Érintett fájl:** `src/lib/driveApi.js:28-47`
- **Probléma:** Az Apps Script hideginduláskor redirect választ adhat, ami `ok: false` visszatérést okoz, de a lokális mentés már megtörtént
- **Hogyan veszhet adat:** A felhasználó azt hiszi, hogy az adat Drive-on is van, de csak lokálisan mentett
- **Javasolt javítás:** A hibás Drive szinkron esetén UI értesítés (a `crm-sync-warning` event már létezik, de UI megjelenítése Nem bizonyított / ellenőrzés szükséges)

**ADV-4 – localStorage quota meghaladás**
- **Érintett fájl:** `src/lib/localDb.js:95-101`
- **Probléma:** `localStorage.setItem()` hiba esetén csak `console.warn` hívódik, a mentés sikertelenségéről nem kap értesítést a felhasználó
- **Hogyan veszhet adat:** Fotók (base64), VBF adatok és a 20+ kollekció összesen meghaladhatja az 5-10 MB limitet. A legfrissebb módosítás elvész, de a felhasználó erről nem tud
- **Javasolt javítás:** `saveLocal()` adjon vissza hibakódot, és a magasabb rétegek jelezzék a felhasználónak

**ADV-5 – Párhuzamos tab-ok adatütközése**
- **Érintett fájl:** `src/lib/localDb.js` (BroadcastChannel), `src/lib/dataSync.service.js`
- **Probléma:** Két tab egyidejűleg módosíthatja ugyanazt a kollekciót. A BroadcastChannel értesít, de `mergeByIdUpdatedAt()` csak ms pontosságú `updatedAt` alapján dönt
- **Hogyan veszhet adat:** Két egyidejű mentésnél az egyik felülírhatja a másikat
- **Javasolt javítás:** Optimistic locking (verzióazonosító, conflict alert)

**ADV-6 – Restore nem szinkronizál Drive-ra**
- **Érintett fájl:** `src/lib/backupService.js:165-207`
- **Probléma:** `restoreBackup()` visszaállítja a localStorage tartalmát, de nem triggereli a Drive szinkront
- **Hogyan veszhet adat:** A Drive-on lévő adatok nem frissülnek, ezért következő bejelentkezésnél a Drive felülírja a visszaállított állapotot
- **Javasolt javítás:** Restore után azonnal `syncAllToDrive()` hívás (vagy erős UI figyelmeztetés a kézzel indítandó Drive mentésre)

---

## 11. Halott / félkész / fake modulok

### ComingSoon oldalak
| Oldal | `App.jsx` route | Megjegyzés |
|-------|----------------|-----------|
| Szerződések | `szerzodesek` | Menüpont látható, csak ComingSoon jelenik meg |
| Dokumentumok | `dokumentumok` | Menüpont látható (Nem bizonyított – App.jsx-ben nincs regisztrálva külön oldalként, de a `dokumentumIds` mező létezik a Projektben) |

### Nem a aktív login-ba kötött modulok
| Fájl | Megjegyzés |
|------|-----------|
| `src/lib/authApi.js` | MCP-alapú Drive auth + email rendszer, de a `Login.jsx` NEM hivatkozik rá. Esetleg adminisztratív szándék, de aktívan nem fut. Saját hardcoded Drive fájl ID-kkal rendelkezik |
| `src/modules/szamlak/pease.api.js` | PEASE számlázó API integrációs stub. Env változók nélkül (`VITE_PEASE_API_URL`, `VITE_PEASE_API_KEY`) nem működik. UI gombok láthatók a `SzamlakPage.jsx`-en, de funkció nem él |

### Duplikált logikák (Nem bizonyított / részletes elemzés szükséges)
| Fájlpár | Gyanú |
|---------|-------|
| `src/lib/geo.js` + `src/lib/geoService.js` | Két geo-kapcsolatos fájl – tartalmuk felülvizsgálata szükséges |
| `src/lib/export.js` + `src/lib/exportService.js` | Két export fájl – tartalmuk felülvizsgálata szükséges |
| `src/lib/munkalapDb.js` + `src/services/workorder.service.js` | Mindkettő munkalap DB műveletet végez – hatáskörük tisztázandó |

### Root szintű egyszeri migráló scriptek (félkész státusz)
A következő `.js` fájlok a root mappában vannak, nem részei a `src/`-nek:
```
fix_dup_pm_buttons.js
fix_f2_statusut.js
fix_projekt_status_names.js
fix_tabdokumentumok.js
fix_vbf_renders.js
fix_vbf_steps457.js
crm_e2e_full.mjs
crm_smoke_nav.mjs
```
Ezek egyszeri adatmigráló vagy tesztszkriptek. Ha már lefutottak, eltávolíthatók. Ha nem futottak le, aktiválásuk szükséges-e? **Nem bizonyított / megőrzendők-e tisztázandó.**

### Félkész funkciók
| Funkció | Hol | Megjegyzés |
|---------|-----|-----------|
| PEASE számlázó integráció | `SzamlakPage.jsx`, `pease.api.js` | Gomb megjelenik, de env nélkül nem működik |
| Google Calendar szinkron | `calendarSync.service.js`, `NaptarPage.jsx` | Részlegesen megvalósított; Calendar ID konfiguráció szükséges |
| Munkakiosztás algoritmus | `munkakiosztasAlgo.js`, `Munkakiosztas.jsx` | Létezik az algoritmus, UI részlegesen implementált |
| KM elszámolás (tavKmForras, tavKmNaplo) | `projekt.schema.js:PENZUGY_DEFAULTS` | Mezők léteznek, automatikus OSRM integrálás nincs |
| Anyagtörzs árver zió | `anyagArVerzio.js` | Rendszer létezik, de UI és workflow nem teljesen kész |

---

## 12. Javasolt első 10 fejlesztési feladat

Csak javaslat – sorrendű prioritással, nem kódmódosítás.

**P0-001 – Plaintext jelszó törlése a user objektumból**  
`AdminPanel.jsx:49` – a `defaultPassword` plaintext mező tárolása azonnali kockázat. Egyetlen sor törlése javítja.

**P0-002 – Apps Script titkos token hozzáadása**  
Az Apps Script URL nyilvánosan elérhető. Shared secret / HMAC token bevezetése az Apps Script és a frontend közé megakadályozza az illetéktelen Drive-írást.

**P0-003 – DEFAULT_USERS jelszóhash-ek eltávolítása forráskódból**  
A `crmUsers.js:DEFAULT_USERS` hash-eket privát konfig fájlba kell vinni (`.env` + Vercel env var), vagy első-bejelentkezéses jelszóváltást kötelezővé tenni.

**P0-004 – Backup scope bővítése minden kollekcióra**  
`backupService.js:MAIN_KEYS` nem fedi le az összes szinkronizált kollekciót. A `SYNC_COLLECTIONS`-szal szinkronizálva kell tartani.

**P0-005 – localStorage quota monitoring és értesítés**  
`localDb.js:saveLocal()` néma hibája adatvesztéshez vezet. `try/catch` után felhasználói értesítés szükséges.

**P1-006 – Restore után Drive szinkron kötelező figyelmeztetés**  
`backupService.js:restoreBackup()` után következő Drive szinkron felülírja az állapotot. UI figyelmeztetés vagy automatikus `syncAllToDrive()` szükséges.

**P1-007 – duplikált geo és export fájlok tisztázása**  
`geo.js` vs `geoService.js`, `export.js` vs `exportService.js` – melyik aktív, melyik halott kód?

**P1-008 – authApi.js státuszának döntése**  
Az `authApi.js` aktív kódnak tűnik (importok, típusos struktúra), de a Login nem használja. Vagy integrálni kell, vagy törölni.

**P1-009 – PEASE integráció vagy dokumentált törlés**  
A `SzamlakPage.jsx`-en megjelenő "PEASE szinkron" gomb félrevezető, ha az env változók nincsenek beállítva. Vagy be kell kötni, vagy a gomb elrejtendő, vagy dokumentálni kell.

**P1-010 – Root szintű fix_*.js fájlok auditja és eltávolítása**  
A 6+ egyszeri migráló szkript a repo root-ban van. Lefutottak-e? Szükségesek-e még? Ha nem → törlendők a repo tisztaság érdekében.