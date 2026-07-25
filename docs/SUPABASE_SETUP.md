# Supabase beállítási útmutató

Ez a dokumentum végigvezet a CRM Supabase-alapú hitelesítési és
adatbázis-rétegének beállításán. Ez a **foundation** lépés: a séma, a
hitelesítés és az RLS jön létre – a meglévő localStorage / Google Drive
adatkezelést **még nem** cseréljük le.

> **Biztonsági alapszabály:** a böngészőbe KIZÁRÓLAG a Supabase **publikus
> URL** és az **anon key** kerülhet. A **service_role** kulcs SOHA nem
> kerülhet frontend fájlba, `VITE_` környezeti változóba vagy dokumentációs
> példába. A service_role megkerüli az RLS-t, ezért csak titkos,
> szerveroldali környezetben használható.

---

## 1. Supabase projekt létrehozása

1. Regisztrálj / jelentkezz be: <https://supabase.com>.
2. **New project** → adj nevet, erős adatbázis-jelszót (ezt a Supabase
   tárolja, nem kerül a repóba), válassz régiót (EU – pl. Frankfurt).
3. A projekt elkészülte után: **Project Settings → API** oldalon találod:
   - **Project URL** → ez lesz a `VITE_SUPABASE_URL`
   - **anon public** kulcs → ez lesz a `VITE_SUPABASE_ANON_KEY`
   - **service_role** kulcs → **NE** másold sehova a frontendbe.

---

## 2. Migráció futtatása

A migrációk a `supabase/migrations/` könyvtárban vannak, **sorrendben**
futtatandók:

| Sorrend | Fájl | Tartalom |
|--------|------|----------|
| 1 | `20250101000001_init_schema.sql` | táblák, constraintek, indexek, `updated_at` trigger |
| 2 | `20250101000002_auth_helpers.sql` | SECURITY DEFINER jogosultsági függvények |
| 3 | `20250101000003_rls_policies.sql` | RLS bekapcsolása + házirendek |

### A) Supabase Dashboard SQL Editor (legegyszerűbb)

1. **SQL Editor → New query**.
2. Másold be és futtasd a három fájlt a fenti sorrendben (egyenként).
3. Ellenőrzés: **Table Editor**-ban látszanak a táblák, a **Authentication →
   Policies** alatt az RLS házirendek.

### B) Supabase CLI (verziózott, ajánlott csapatmunkához)

```bash
# egyszeri telepítés: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref <PROJECT_REF>
supabase db push        # lefuttatja a supabase/migrations/ tartalmát
```

---

## 3. URL és anon key elhelyezése (helyi fejlesztés)

A projekt gyökerében másold le a mintát és töltsd ki:

```bash
cp .env.example .env.local
```

`.env.local` (ez a fájl NEM kerül Gitbe – lásd `.gitignore`):

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-public-key>
VITE_APPS_SCRIPT_URL=<a meglévő Apps Script URL, ha használod>
```

Ha valamelyik hiányzik, az alkalmazás nem omlik össze: a bejelentkező
képernyő világos adminisztrátori üzenetet mutat, a
`isSupabaseConfigured` pedig `false`.

---

## 4. Email/Password provider beállítása

1. **Authentication → Providers → Email**: kapcsold be.
2. Fejlesztéshez érdemes az **"Confirm email"** opciót kikapcsolni, hogy a
   kézzel létrehozott felhasználók azonnal beléphessenek. Éles környezetben
   döntsd el a megerősítési folyamatot.
3. **Authentication → URL Configuration**: állítsd be a Site URL-t
   (pl. `http://localhost:3000` fejlesztéshez, illetve a Vercel domain élesben).

> Ebben a PR-ben **nincs** nyilvános önregisztráció. Felhasználót admin hoz létre.

---

## 5. Első admin felhasználó biztonságos létrehozása

**NE** frontend hardcoded regisztrációval hozd létre. Két biztonságos út:

### A) Dashboardon keresztül

1. **Authentication → Users → Add user** → add meg az admin email-címét és egy
   erős jelszót (Auto Confirm bekapcsolva). Ez létrehoz egy sort az
   `auth.users`-ben – **jegyezd fel a felhasználó `id`-ját (UUID)**.
2. Hozd létre a hozzá tartozó profilt (lásd 6. pont).

### B) SQL-lel (service_role kontextusban, pl. SQL Editor)

Az SQL Editor a projekt tulajdonosaként fut, így megkerüli az RLS-t – ez a
helyes hely az **első** admin profil beszúrására (mielőtt bármilyen admin
létezne, a kliens felől az RLS eleve tiltaná).

---

## 6. Profilrekord létrehozása

Minden `auth.users` felhasználóhoz kell egy `public.profiles` sor. Az első
adminét az SQL Editorban szúrd be (cseréld ki a UUID-t és a nevet):

```sql
insert into public.profiles (id, full_name, role, active)
values ('<AUTH_USER_UUID>', 'E.D.I. Admin', 'admin', true);
```

Engedélyezett `role` értékek (DB constraint ellenőrzi):
`admin`, `projektmenedzser`, `iroda`, `telepito`.

A további felhasználókat ezután már a bejelentkezett admin is létrehozhatja
(Authentication → Users az auth rekordhoz, majd a profil beszúrása – a
`profiles_insert_admin` policy engedi az adminnak).

---

## 7. RLS tesztelése

A részletes, lépésenkénti kézi ellenőrzés a
[`docs/RLS_VERIFICATION.md`](./RLS_VERIFICATION.md) fájlban található. Röviden
ellenőrizd, hogy:

1. admin **minden** munkalapot lát;
2. telepítő **csak a sajátját** látja;
3. telepítő idegen rekordot **közvetlen API-hívással sem** ér el;
4. telepítő **nem törölhet** munkalapot;
5. **inaktív** felhasználó nem használhatja a rendszert.

Gyors ellenőrzés SQL Editorban:

```sql
-- Minden táblán aktív az RLS?
select relname, relrowsecurity
from pg_class
where relname in ('profiles','teams','team_members','customers',
                  'projects','workorders','workorder_assignments');
```

---

## 8. Lokális fejlesztés

```bash
npm install
npm run dev        # Vite dev szerver (VITE_ env a .env.local-ból)
npm run build      # éles build
npm run test       # Vitest tesztek
npm run lint       # ESLint
```

Ha a `.env.local` nincs kitöltve, a UI a "hitelesítés nincs beállítva"
üzenetet mutatja, de a többi (localStorage-alapú) funkció fejleszthető.

---

## 9. Vercel környezeti változók

**Project → Settings → Environment Variables** alatt add meg (Production +
Preview környezethez):

| Név | Érték | Megjegyzés |
|-----|-------|-----------|
| `VITE_SUPABASE_URL` | a projekt URL | publikus |
| `VITE_SUPABASE_ANON_KEY` | anon public key | publikus, RLS mellett biztonságos |
| `VITE_APPS_SCRIPT_URL` | Apps Script URL | ha a Drive szinkron aktív |

> **Tilos** a service_role kulcsot a Vercel *frontend* env-jébe tenni.
> Kizárólag akkor kerülhet szerveroldali (nem `VITE_` prefixű) env-be, ha
> később szerverless függvény használja – az böngészőbe soha nem szivárog.

Deploy után a **URL Configuration** Site URL-jét állítsd a Vercel domainre.

---

## 10. Rollback lépések

Mivel ez a PR nem cseréli le a meglévő adatkezelést, a visszaállás egyszerű:

1. **Alkalmazás szinten:** töröld / ürítsd a `VITE_SUPABASE_URL` és
   `VITE_SUPABASE_ANON_KEY` változókat → a Login "nincs beállítva" állapotba
   kerül. (A régi belépés kódja külön ág; a mainre visszaállás a PR
   visszavonásával történik.)
2. **Adatbázis szinten (a séma eltávolítása egy nem-éles projektben):**

   ```sql
   -- FIGYELEM: minden adatot töröl ezekben a táblákban!
   drop table if exists public.workorder_assignments cascade;
   drop table if exists public.workorders cascade;
   drop table if exists public.projects cascade;
   drop table if exists public.customers cascade;
   drop table if exists public.team_members cascade;
   drop table if exists public.teams cascade;
   drop table if exists public.profiles cascade;

   drop function if exists public.is_assigned_to_workorder(uuid);
   drop function if exists public.is_team_member(uuid);
   drop function if exists public.is_admin();
   drop function if exists public.current_user_role();
   drop function if exists public.enforce_workorder_write_rules();
   drop function if exists public.prevent_profile_privilege_escalation();
   drop function if exists public.set_updated_at();
   ```

3. Git szinten: a `feature/supabase-auth-foundation` ág / PR visszavonása.
