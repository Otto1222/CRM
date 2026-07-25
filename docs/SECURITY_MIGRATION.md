# Biztonsági migráció – localStorage/SHA-256 → Supabase Auth + RLS

Ez a dokumentum leírja, **miért** cseréljük a korábbi hitelesítést, **mi**
került át Supabase Auth alá, **mi marad** még átmenetileg localStorage-ban, és
**milyen** további lépések szükségesek.

---

## 1. Miért nem biztonságos a korábbi localStorage + SHA-256 hitelesítés

A régi rendszer (`src/lib/crmUsers.js`, `src/lib/authApi.js`,
`src/pages/Login.jsx` korábbi verziója) a következő okokból nem nyújt valódi
biztonságot:

- **Kliensoldali jelszó-ellenőrzés.** A `checkLogin()` a böngészőben
  hasonlítja össze a hasht. Bárki, aki megnyitja a devtools-t vagy módosítja a
  kliens kódot, megkerülheti.
- **Gyenge jelszótárolás.** A jelszó egyszerű **SHA-256**, **só (salt) és
  kulcsnyújtás (pl. bcrypt/argon2 iterációk) nélkül**. Ez sérülékeny szótár- és
  szivárványtábla-támadásokra. (Supabase Auth belül `bcrypt`-et használ.)
- **A felhasználólista és a hash a kliens elől olvasható** (localStorage,
  illetve a Drive-ra szinkronizált `crm_napelem_users` / `auth_users.json`).
- **Nincs szerveroldali jogosultság-kényszerítés.** A `roles.js` csak a UI-t
  szűri; az adat maga védtelen – aki eléri a tárolót vagy az API-t, mindent lát.
- **Hardcoded alapértelmezett jelszóhashek** voltak a forrásban
  (`DEFAULT_USERS`), ami éles indulásnál kockázat.
- **A regisztrációs email nyílt szövegben** küldte vissza a jelszót
  (`authApi.js`), ami önmagában is súlyos szivárgás.

---

## 2. Mi került át Supabase Auth alá

- **A bejelentkezés** (`email + jelszó`) mostantól a Supabase Auth-on keresztül
  történik: `supabase.auth.signInWithPassword()` (`src/pages/Login.jsx`).
- **A session-kezelés** a Supabase hivatalos mechanizmusán fut (token frissítés,
  `onAuthStateChange`), NEM saját localStorage-kulccsal
  (`src/auth/AuthProvider.jsx`).
- **A felhasználói identitás és szerepkör** a `profiles` táblából jön, amit
  **RLS véd** – a szerepkört DB constraint korlátozza
  (`admin | projektmenedzser | iroda | telepito`).
- **A jogosultság érvényesítése** az adatbázisban, RLS házirendekkel történik
  (`supabase/migrations/…_rls_policies.sql`). A frontend `roles.js` innentől
  **csak megjelenítési** védelem.

### Amit szándékosan NEM teszünk

- **Nincs** automatikus migráció a régi SHA-256 hashekből Supabase Auth-ba – a
  hashek nem konvertálhatók, és a gyenge tárolást nem visszük tovább. A
  felhasználók **új, Supabase Auth jelszót** kapnak (admin által létrehozva).
- **Nincs** nyilvános önregisztráció ebben a lépésben.
- **Nincs** hardcoded admin – az első admin a Supabase Dashboardon / SQL-lel jön
  létre (lásd `SUPABASE_SETUP.md`).

---

## 3. Mi marad (egyelőre) localStorage-ban

Ez a PR **csak a felhasználó- és session-kezelést** választja le. A CRM üzleti
adatai átmenetileg maradnak a jelenlegi tárolásban:

- munkalapok, projektek, ügyfelek, ajánlatok, számlák, kártérítések,
  sablonok, munkatípusok, fővállalkozók, elszámolási szabályok, csapatok –
  `localDb.js` (localStorage) + `driveApi.js` / `dataSync.service.js` (Drive).
- A régi felhasználókezelő UI és a `crmUsers.js` **megmarad**, mert más
  komponensek még importálják (lásd 5. pont) – de a **normál belépésből ki van
  vezetve**, és `@deprecated` jelölést kapott.

---

## 4. Milyen további migráció szükséges (következő lépések)

Javasolt sorrend a következő PR-ekhez:

1. **Ügyfelek + projektek** átvezetése Supabase táblákba (írás/olvasás a
   `customers` / `projects` táblákra), a localStorage fokozatos kivezetésével.
2. **Munkalapok** (`workorders`) és **hozzárendelések**
   (`workorder_assignments`) átvezetése – ez adja a telepítői láthatóság magját.
3. **Csapatok** (`teams` / `team_members`) átvezetése és a régi
   `csapatMigracio.js` kivezetése.
4. A `crmUsers.js` / `authApi.js` teljes eltávolítása, miután minden importáló
   komponens (AdminPanel, Munkalapok, UjMunkalap, CsapatokPage, ProjektForm,
   store.jsx) Supabase-adatra vált.
5. Google Drive szerepének tisztázása (fájl/fotó tároló marad, adat-igazság
   forrása a Postgres lesz).
6. Opcionális: offline/IndexedDB szinkron, TypeScript átállás – külön feladatok.

---

## 5. Mely adatok NEM kerülhetnek kliensoldalra

- **service_role kulcs** – SOHA. Sem frontend fájlban, sem `VITE_` env-ben, sem
  dokumentációs példában. Megkerüli az RLS-t.
- **Adatbázis-jelszó**, egyéb szerver-titkok, API secretek.
- **Más felhasználók jelszava / hash-e** – a Supabase Auth ezt nem is teszi
  elérhetővé a kliens felé.
- **Teljes ügyfél-/munkalap-adathalmaz olyan szerepkörnek, akinek nem jár** –
  ezt már nem a kliens szűri, hanem az RLS (pl. telepítő csak a saját
  munkalapját kapja meg, idegen rekordot közvetlen API-hívással sem).

---

## 6. Az anon key és a service_role kulcs

- **anon key**: **publikus**, szándékosan a böngészőbe kerül. Önmagában **nem
  titok**, és önmagában **nem** ad hozzáférést – kizárólag a megfelelő **RLS
  házirendekkel együtt** biztonságos. Ezért kritikus, hogy **minden táblán**
  aktív az RLS, és nincs túl megengedő policy.
- **service_role key**: **titkos**, minden RLS-t megkerül. Csak biztonságos,
  szerveroldali környezetben (pl. háttérfeladat, migráció) használható, a
  böngészőbe **soha** nem szivároghat.

---

## 7. Kapcsolódó, mérséklendő pontok (a régi rendszerből)

- `src/lib/authApi.js` – a régi Drive-alapú regisztráció/belépés/jelszó-reset
  **nyílt jelszót** küld emailben, és kliensoldali hasht használ. **Nem
  hívja** semmi a normál folyamatból; a következő tisztító lépésben
  eltávolítandó. **Ne** használd új kódból.
- `src/lib/crmUsers.js` `DEFAULT_USERS` – tartalmaz beépített (bár csak hash)
  alapértelmezett belépési adatokat. A Supabase-belépés ezt megkerüli; a fájl
  a függő importok miatt marad, `@deprecated` jelöléssel.
