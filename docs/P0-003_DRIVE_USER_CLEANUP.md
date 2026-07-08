# P0-003 – Drive user adatbázis defaultPassword tisztítás

**Dátum:** 2026-06-26  
**Sprint:** 14 napos stabilizációs sprint  
**Előfeltétel:** P0-001 és P0-002 deploy megtörtént

---

## 1. Mi a probléma?

A P0-001 eltávolította a `defaultPassword` mező tárolását a kódból, és a `getUsers()` egy egyszeri scrubbot futtat: ha lokálisan talál `defaultPassword` mezőt, eltávolítja és visszamenti a localStorage-ba.

**Azonban a Google Drive-on tárolt `crm_napelem_users.json` fájlban még maradhatnak régi rekordok, amelyek tartalmazzák a `defaultPassword` mezőt.**

A `syncAllFromDrive()` (belépéskor automatikusan lefut) `mergeByIdUpdatedAt()` logikát alkalmaz: ha a Drive-on lévő rekord `updatedAt` értéke egyenlő vagy újabb a lokálisnál, a Drive verzió nyer – és visszahozza a `defaultPassword` mezőt a localStorage-ba.

Ez azt jelenti, hogy a lokális scrub önmagában nem elegendő: a Drive-on is meg kell tisztítani az adatokat.

---

## 2. Mi a megoldás?

Nem írunk automata migrációt. A sprint célja a stabilizáció.

**A megoldás:** az admin P0-001/P0-002 deploy után belép, és futtatja a „Drive teljes mentés" funkciót. Ez a lokálisan már megtisztított (scrubolt) állapotot felülírja a Drive-on, eltávolítva a `defaultPassword` mezőket.

Ezt csak egyszer kell elvégezni.

---

## 3. Manuális lépések (sorrendben)

### 3.1 Előkészítés

1. **Friss build deploy** – győzödj meg róla, hogy a Vercel-en (vagy az éles szerveren) a P0-001 + P0-002 commit fut.
2. **Böngésző hard refresh** – `Ctrl+Shift+R` (vagy `Cmd+Shift+R` Mac-en) – biztosítja, hogy ne a régi JS bundle fusson.

### 3.2 Belépés és cleanup

3. **Admin felhasználóval bejelentkezés** – fontos, hogy Admin szerepkörű userrel lépj be, mert csak ő érheti el a Beállítások oldalt.
4. **Navigálj a Beállítások oldalra** (bal oldali menü → Beállítások).
5. **Drive teljes mentés gomb megnyomása** – a gomb neve: „Drive teljes mentés" (BeállítasokPage vagy DriveStatusPanel).
6. **Várj a visszajelzésre** – a felület jelez, ha a mentés sikeres volt. Ha hibát kapsz, lásd a Rollback tervet (5. fejezet).

### 3.3 Ellenőrzés

7. **Újratöltés** – `F5` vagy `Ctrl+R`.
8. **Login teszt** – jelentkezz ki, majd lépj be újra admin userrel. A belépésnek sikerülnie kell.

---

## 4. Ellenőrzési lépések (Drive JSON vizsgálat)

A Drive teljes mentés után ellenőrizd a Google Drive-on a `crm_napelem_users.json` fájlt.

### Hogyan nyisd meg

- Google Drive → keress rá: `crm_napelem_users`
- Kattints jobb egérrel → Letöltés, majd nyisd meg szövegszerkesztőben (Notepad++, VS Code, stb.)
- Vagy: Google Drive → jobb klikk → Előnézet (ha szövegként jeleníti meg)

### Elvárt ellenőrzési eredmények

| Keresett minta | Elvárt eredmény |
|---|---|
| `defaultPassword` | **0 találat** – ha van találat, a mentés nem sikerült teljesen |
| `passwordHash` | Megtalálható – ez helyes, a hash-ek maradhatnak |
| `"edi"`, `"kutasi"`, `"csapat2"`, `"projekt"`, `"iroda"` (régi demo userek) | **0 találat** – kivéve ha ezek valós, átnevezett felhasználók |
| Csak a valós felhasználók neve és `username` értéke | Megtalálható |

### Mi a siker?

- A JSON nem tartalmaz `defaultPassword` kulcsot egyetlen user rekordban sem.
- Nincs DEFAULT_USERS-ből örökölt demo felhasználó (hacsak valaki nem tartotta meg és nem nevezte át valósra).
- Az admin belépés működik.
- Hibás jelszóval a belépés elutasításra kerül.
- Ha teljesen üres lenne a user lista (pl. friss telepítés), a login felület a P0-001 szerinti hibaüzenetet adja: „Nincs konfigurált felhasználó. Adminisztrátori inicializálás szükséges."

---

## 5. Rollback terv

**Ha a Drive teljes mentés után login hiba lép fel:**

1. Ne töröld kézzel a felhasználói rekordokat.
2. Nyisd meg a Google Drive-ot és keresd meg a `crm_napelem_users` fájl előző verzióját (Google Drive automatikusan verzióhistóriát tart).
3. Állítsd vissza a korábbi verziót: jobb klikk → Verziókezelés → válaszd a P0-001 előtti verziót.
4. Jelentkezz be a CRM-be – az oldal szinkronizálja a visszaállított adatokat.
5. Nyiss hibajelentést a fejlesztőnél.

**Általános szabályok:**

- localStorage-t soha ne töröld kézzel, amíg nincs érvényes Drive backup.
- Felhasználói rekordot kézzel ne szerkessz éles adaton backup nélkül.
- A Drive verzióhistória az egyetlen rollback pont ebben a rendszerben.

---

## 6. Elfogadási feltételek

A P0-003 akkor tekinthető lezártnak, ha az alábbiak mindegyike teljesül:

- [ ] `crm_napelem_users.json` a Drive-on **nem tartalmaz** `defaultPassword` mezőt
- [ ] Nincs DEFAULT_USERS-ből örökölt demo/teszt felhasználó a Drive-ban
- [ ] Admin belépés sikeres a valós jelszóval
- [ ] Hibás jelszóval a belépés elutasításra kerül
- [ ] Üres localStorage esetén a login „Nincs konfigurált felhasználó..." hibaüzenetet ad
- [ ] Drive szinkron futtatása után a `defaultPassword` mező nem jelenik meg újra

---

## 7. Megjegyzések

- **Miért nem automata migráció?** A sprint célja a stabilizáció. Egy Migration Engine új infrastruktúra, nem cleanup. Ez a döntés tudatos és dokumentált.
- **Miért elég egyszer?** A P0-001 scrub az első `getUsers()` hívásnál lokálisan már megtisztítja az adatokat. Ha egyszer a Drive-ot is felülírjuk a tisztított lokális állapottal, a merge logika (`mergeByIdUpdatedAt`) a jövőben már nem hozhat vissza `defaultPassword` mezőt – mert a Drive-on sem lesz.
- **Mikor kell újra elvégezni?** Soha – kivéve ha valaki kézzel szerkeszt Drive JSON-t, vagy régi backup-ból állít vissza.