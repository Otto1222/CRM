# RLS kézi ellenőrzési terv

Ez a dokumentum leírja, hogyan ellenőrizhető **manuálisan**, hogy az adatbázis
Row Level Security (RLS) házirendjei valóban megakadályozzák a jogosulatlan
hozzáférést. A cél annak igazolása, hogy a védelmet az **adatbázis**
kényszeríti ki – nem a frontend.

> A tesztek nagy része a Supabase **SQL Editorban** és/vagy a REST API-n
> (`supabase-js` klienssel, anon key + egy adott felhasználó tokenjével)
> futtatható. Az SQL Editor a projekt tulajdonosaként fut (megkerüli az
> RLS-t), ezért a felhasználó-szemszögű teszteknél a REST/`supabase-js`
> hívást, vagy a `set role` + `request.jwt.claims` szimulációt kell használni.

---

## 0. Előkészület: tesztadat

Hozz létre az SQL Editorban (service_role kontextus) legalább:

- 1 admin (`role='admin'`), 1 projektmenedzser, 1 iroda, 2 telepítő profilt
  (a hozzájuk tartozó `auth.users` rekordokkal – lásd `SUPABASE_SETUP.md`);
- 1 csapatot, amelyben **csak az 1. telepítő** tag;
- 2 munkalapot (`workorders`): `WO-A` a csapathoz rendelve
  (`workorder_assignments.team_id`), `WO-B` a **2. telepítőhöz**
  (`workorder_assignments.user_id`) rendelve.

```sql
-- Aktív-e az RLS minden táblán? (mind true kell legyen)
select relname, relrowsecurity
from pg_class
where relname in ('profiles','teams','team_members','customers',
                  'projects','workorders','workorder_assignments')
order by relname;
```

---

## 1. Admin lát minden munkalapot

**Adminként bejelentkezve** (supabase-js, admin tokennel):

```js
const { data, error } = await supabase.from('workorders').select('*');
```

**Elvárt:** minden munkalap (WO-A és WO-B is) visszajön, hiba nélkül.

SQL-szimuláció (opcionális, egy tranzakcióban):

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<ADMIN_UUID>","role":"authenticated"}';
select id, document_number from public.workorders;   -- mindkettő látszik
rollback;
```

---

## 2. Telepítő csak a sajátját látja

**1. telepítőként** (aki a csapaton keresztül csak `WO-A`-hoz kötődik):

```js
const { data } = await supabase.from('workorders').select('*');
// Elvárt: CSAK WO-A jön vissza. WO-B nem.
```

SQL-szimuláció:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<TELEPITO1_UUID>","role":"authenticated"}';
select document_number from public.workorders;   -- csak WO-A
rollback;
```

**Elvárt:** csak a hozzárendelt (közvetlen vagy csapaton át) munkalap.

---

## 3. Telepítő idegen rekordot az API-ból sem ér el

**1. telepítőként** próbáld meg **közvetlenül id szerint** lekérni a `WO-B`-t:

```js
const { data, error } = await supabase
  .from('workorders')
  .select('*')
  .eq('id', '<WO_B_ID>')
  .maybeSingle();
// Elvárt: data === null (az RLS kiszűri, mintha nem létezne). Nincs adatszivárgás.
```

**Elvárt:** üres eredmény – az RLS a közvetlen, célzott API-hívást is blokkolja.

---

## 4. Telepítő nem törölhet munkalapot

**1. telepítőként**:

```js
// a) hard delete kísérlet
const del = await supabase.from('workorders').delete().eq('id', '<WO_A_ID>');
// Elvárt: 0 sor törlődik (nincs DELETE policy telepítőre).

// b) soft delete kísérlet (deleted_at beállítása update-tel)
const upd = await supabase
  .from('workorders')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', '<WO_A_ID>');
// Elvárt: hibát dob – "Telepítő nem törölhet munkalapot"
// (enforce_workorder_write_rules trigger).
```

**Elvárt:** sem hard, sem soft delete nem sikerül.

Bónusz – **lezárt munkalap módosítása telepítővel**: állíts be `closed_at`-et
`WO-A`-n adminként, majd telepítőként próbálj módosítani → az RLS `closed_at is
null` feltétele miatt a sor nem is frissíthető.

---

## 5. Inaktív felhasználó nem használhatja a rendszert

1. Adminként állítsd a 2. telepítő profilját inaktívra:

   ```sql
   update public.profiles set active = false where id = '<TELEPITO2_UUID>';
   ```

2. **2. telepítőként** próbálj belépni a UI-ban (helyes jelszóval):
   - A Supabase Auth belépés a jelszóval technikailag sikerülhet, **de** az
     `AuthProvider` a profil betöltésekor látja az `active = false`-t, azonnal
     **kijelentkeztet**, és a Login "A fiók inaktív…" üzenetet mutatja.
3. Adat szinten: `current_user_role()` csak **aktív** profilra ad szerepkört,
   így az inaktív felhasználó minden szerepkör-alapú policyből kiesik:

   ```sql
   begin;
   set local role authenticated;
   set local request.jwt.claims = '{"sub":"<TELEPITO2_UUID>","role":"authenticated"}';
   select public.current_user_role();          -- NULL
   select count(*) from public.workorders;      -- 0
   rollback;
   ```

**Elvárt:** inaktív felhasználó sem a UI-t, sem az adatot nem éri el.

---

## További, ajánlott ellenőrzések

| Eset | Elvárt |
|------|--------|
| Telepítő ügyféllistát kér (`customers`) | üres – nincs közvetlen hozzáférése |
| Felhasználó a saját `role`-ját `admin`-ra állítja (`profiles` update) | hiba: privilégium-emelés blokkolva |
| Iroda módosítja egy munkalap `closed_at` mezőjét | hiba: iroda nem módosíthatja a lezárást |
| Nem bejelentkezett (anon) bármely táblát kér | üres / tiltott – nincs anon policy |
| Telepítő csak a saját csapattagságát (`team_members`) látja | csak a saját sorai |

> Ha bármelyik teszt **nem** a várt eredményt adja, az RLS hibás – NE tekintsd
> biztonságosnak a rendszert, amíg a policy javítva nincs.
