# P0-004 – Authorization Architecture Design

**Dátum:** 2026-06-26  
**Státusz:** Tervdokumentum – nem implementáció  
**Scope:** Jogosultsági modell tervezése a jelenlegi tech stack korlátain belül

---

## 1. Executive Summary

A CRM jelenlegi jogosultsági modellje kizárólag frontend-oldali. Egy felhasználó, aki hozzáfér a DevTools-hoz, módosíthatja a localStorage-ban tárolt `user.role` értéket, és ezzel magasabb jogosultságra tehet szert a felületen.

Ez a dokumentum megtervezi, hogyan lehet **háromrétegű védelmet** kiépíteni a jelenlegi tech stack-en belül – valódi backend szerver nélkül, React SPA + Google Drive + Apps Script architektúrával.

**Reális vég-cél:** az érintett felhasználóknak (5-10 fős csapat) technikai ismeretek nélkül ne legyen lehetőségük jogosultsági határt átlépni. A szándékos, technikailag felkészült belső támadó ellen teljes védelmet csak valódi backend nyújthat.

---

## 2. Threat Model

### Kik az "ellenfelek"?

| Szereplő | Leírás | Kockázati szint |
|---|---|---|
| Véletlen hozzáférés | Telefonon bejelentkezett Telepítő más képernyőjére kattint | Alacsony |
| Kíváncsi kolléga | Másik felhasználó adatait szeretné látni, de nem rosszindulatú | Közepes |
| Belső szándékos visszaélés | Nem admin user adminná akarja magát tenni DevTools-szal | Közepes–Magas |
| Külső behatoló | Valaki az Apps Script URL-jét kitalálja és közvetlenül hívja | Közepes |
| Szofisztikált belső támadó | Teljes JS bundle elemzése, token hamisítás | Magas – valódi backend nélkül NEM védhető |

### Mi ELLEN védekezünk

- ✅ Véletlen / kíváncsi cross-role UI hozzáférés
- ✅ Admin funkciók nem-admin felhasználók általi elérése
- ✅ Telepítő saját munkalapján kívüli adatmódosítás
- ✅ Közvetlen Apps Script API-hívás autentikáció nélkül
- ✅ Drive adatok illetéktelen felülírása

### Mi ELLEN NEM védekezünk (honest limitations)

- ❌ Teljes localStorage manipuláció tudatos támadóval szemben (browser privilege)
- ❌ Hálózati forgalom lehallgatás (HTTPS van, de az Apps Script URL nyilvános)
- ❌ JS bundle reverse engineering (SPA sajátossága)
- ❌ Google Drive-ra közvetlen hozzáféréssel rendelkező belső személy

---

## 3. Jelenlegi állapot

```
[Browser]
  ├── localStorage (user, role, összes adat)
  ├── React SPA (role check: if user.role === "Admin")
  └── Apps Script HTTP kérések (autentikáció NÉLKÜL)
        └── Google Drive (JSON fájlok)
```

**Jelenlegi gyengeségek:**

1. **Role check csak UI szinten** – `user.role` módosítható localStorage-ban
2. **Apps Script nyitott** – bárki hívhatja a publikus URL-t, nincs token validáció
3. **Nincs write-permission ellenőrzés** – bármely autentikált user írhat bármely kollekciót
4. **Nincs audit trail** – ki mikor mit módosított nem követhető

---

## 4. A Fundamentális Korlát

**Valódi backend szerver nélkül a jogosultsági modell mindig sebezhető a kliensen.**

A védekezési stratégia ezért nem "teljes biztonság" elérése, hanem **rétegelt nehézség** kiépítése:

```
Réteg 1: Frontend Guards    → akadályoz véletlen / kíváncsi hozzáférést
Réteg 2: Apps Script Auth   → akadályoz közvetlen API-visszaélést
Réteg 3: Data Isolation     → akadályoz cross-role adatlátást szinkronnál
```

---

## 5. Szerepkörök (Role Model)

A jelenlegi 4 szerepkör megmarad. Nincs szükség szerepkör-refaktorra.

| Szerepkör | Leírás |
|---|---|
| **Admin** | Teljes hozzáférés. Felhasználókezelés, Drive backup, pénzügyi adatok, törlési jog. |
| **Projektmenedzser** | Projektek és munkalapok kezelése. Pénzügyi adatok olvasása. Felhasználókezelés nélkül. |
| **Iroda/Könyvelés** | Pénzügyi adatok, számlák, riportok. Projektek és munkalapok read-only. |
| **Telepítő** | Csak saját munkalapjai. Nincs pénzügyi adat. Nincs projekt-módosítás. |

---

## 6. Permission Matrix

### 6.1 Projektek

| Művelet | Admin | Projektmenedzser | Iroda/Könyvelés | Telepítő |
|---|---|---|---|---|
| Létrehozás | ✅ | ✅ | ❌ | ❌ |
| Olvasás (összes) | ✅ | ✅ | ✅ | ❌ |
| Módosítás | ✅ | ✅ | ❌ | ❌ |
| Törlés | ✅ | ❌ | ❌ | ❌ |
| Státusz változtatás | ✅ | ✅ | ❌ | ❌ |

### 6.2 Munkalapok

| Művelet | Admin | Projektmenedzser | Iroda/Könyvelés | Telepítő |
|---|---|---|---|---|
| Létrehozás | ✅ | ✅ | ❌ | ❌ |
| Olvasás (összes) | ✅ | ✅ | ✅ | ❌ |
| Olvasás (saját) | ✅ | ✅ | ✅ | ✅ |
| Módosítás (összes) | ✅ | ✅ | ❌ | ❌ |
| Módosítás (saját) | ✅ | ✅ | ❌ | ✅ |
| Törlés | ✅ | ❌ | ❌ | ❌ |

### 6.3 Pénzügyi adatok (számlák, elszámolás, pénzügyi lapok)

| Művelet | Admin | Projektmenedzser | Iroda/Könyvelés | Telepítő |
|---|---|---|---|---|
| Olvasás | ✅ | ✅ | ✅ | ❌ |
| Módosítás | ✅ | ✅ | ✅ | ❌ |
| Törlés | ✅ | ❌ | ❌ | ❌ |

### 6.4 Rendszer / Admin

| Művelet | Admin | Projektmenedzser | Iroda/Könyvelés | Telepítő |
|---|---|---|---|---|
| Felhasználókezelés | ✅ | ❌ | ❌ | ❌ |
| Drive teljes mentés | ✅ | ❌ | ❌ | ❌ |
| Drive szinkron (olvasás) | ✅ | ✅ | ✅ | ✅ |
| Beállítások oldal | ✅ | ❌ | ❌ | ❌ |
| Riportok | ✅ | ✅ | ✅ | ❌ |
| Naptár | ✅ | ✅ | ✅ | ✅ |
| Ügyfelek | ✅ | ✅ | ✅ | ❌ |

---

## 7. Réteg 1 – Frontend Guards (tervezett refaktoring)

### Jelenlegi helyzet

Role check-ek szétszórtan a komponensekben:
```jsx
// Jelenlegi minta – szétszórt, nem konzisztens
if (user?.role === "Admin") { ... }
{currentUser?.role === "Admin" && <button>Törlés</button>}
```

### Tervezett guard pattern

Egységes `usePermission` hook:
```jsx
// Tervezett – NEM IMPLEMENTÁLVA MÉG
function usePermission(action) {
  const user = useContext(UserContext);
  return PERMISSIONS[user?.role]?.[action] ?? false;
}

// Komponensben:
const canDelete = usePermission("projektek.delete");
{canDelete && <button>Törlés</button>}
```

Egységes `ProtectedRoute` komponens oldalszintű védelemhez:
```jsx
// Tervezett – NEM IMPLEMENTÁLVA MÉG
<ProtectedRoute roles={["Admin"]}>
  <AdminPanel />
</ProtectedRoute>
```

**Mit véd:** véletlen kattintás, kíváncsi kolléga  
**Mit NEM véd:** localStorage role manipuláció

---

## 8. Réteg 2 – Apps Script Authentication

### Jelenlegi Apps Script hívás

```javascript
// Jelenlegi – nincs autentikáció
fetch(APPS_SCRIPT_URL, {
  method: "POST",
  body: JSON.stringify({ action: "save", collection: "projektek", data: [...] })
});
```

### Tervezett token séma

**Napi rotáló, password hash-alapú token:**

```
authKey = SHA-256( user.passwordHash + ":" + YYYY-MM-DD )
```

- Az `authKey` minden napra egyedi
- Az Apps Script kiszámolja az `authKey`-t a saját user-tárából (Drive fájlból)
- Egyezés esetén engedélyez, nem egyezés esetén elutasít
- A token nem tartalmaz plaintext jelszót
- Replay támadás csak 24 óráig működik

**Tervezett kérés struktúra:**

```javascript
// Tervezett – NEM IMPLEMENTÁLVA MÉG
{
  action: "save",
  collection: "projektek",
  data: [...],
  auth: {
    userId: "u1",
    role: "Admin",
    token: "<SHA-256 authKey>",
    date: "2026-06-26"
  }
}
```

**Apps Script validáció (tervezett logika):**

```javascript
// Apps Script oldalon – NEM IMPLEMENTÁLVA MÉG
function validateAuth(auth) {
  const users = readUsersFromDrive(); // crm_napelem_users.json
  const user = users.find(u => u.id === auth.userId);
  if (!user) return { ok: false, reason: "unknown_user" };
  
  const expectedToken = sha256(user.passwordHash + ":" + auth.date);
  if (expectedToken !== auth.token) return { ok: false, reason: "invalid_token" };
  if (user.role !== auth.role) return { ok: false, reason: "role_mismatch" };
  
  return { ok: true, user };
}
```

**Limitációk:**
- Apps Script minden írásnál olvassa a users fájlt (Drive API hívás) → lassítás
- Megkerülhető ha valaki a saját passwordHash-ét ismeri (ami az ő jelszavából számolható)
- NEM véd teljes belső kompromisszum ellen

**Megkerülési nehézség:** Közepes. Jelentősen magasabb, mint a jelenlegi nulla.

---

## 9. Réteg 2b – Apps Script Role-based Write Restrictions

Az auth validáción túl az Apps Script maga is ellenőrzi, hogy az adott szerepkör írhat-e az adott kollekciót.

**Tervezett write permission tábla (Apps Script oldalon):**

```javascript
// NEM IMPLEMENTÁLVA MÉG
const WRITE_PERMISSIONS = {
  "projektek":      ["Admin", "Projektmenedzser"],
  "munkalapok":     ["Admin", "Projektmenedzser", "Telepítő"],
  "ugyfelek":       ["Admin", "Projektmenedzser"],
  "szamlak":        ["Admin", "Projektmenedzser", "Iroda/Könyvelés"],
  "crm_napelem_users": ["Admin"],
  // ...
};
```

Ez szerver-oldali kényszer – akkor is érvényes, ha a frontend-et megkerülik.

---

## 10. Réteg 3 – Data Isolation (Drive szinkronnál)

### Jelenlegi szinkron

Minden felhasználó minden kollekciót kap a Drive szinkronnál.

### Tervezett szűrés szinkronnál

A `syncAllFromDrive()` visszatérő adatain alkalmazni kell egy szerepkör-alapú filtert:

```javascript
// Tervezett – NEM IMPLEMENTÁLVA MÉG
function filterSyncedDataByRole(data, userRole, userId) {
  if (userRole === "Telepítő") {
    return {
      ...data,
      munkalapok: data.munkalapok?.filter(m => m.assigneeId === userId),
      szamlak: undefined,         // Telepítő nem kap pénzügyi adatot
      projektek: undefined,       // Telepítő nem kap projektadatot
    };
  }
  return data; // Admin/PM/Iroda mindent kap
}
```

**Mit véd:** Telepítő nem látja más munkalapjait lokálisan sem  
**Mit NEM véd:** Admin role-ra lépett felhasználó a saját filterét kapcsolja ki

---

## 11. Összefoglaló: Mi kerül hova

### A három réteg hatékonyságáról

| Támadási vektor | Réteg 1 (Frontend) | Réteg 2 (Apps Script) | Réteg 3 (Data Isolation) |
|---|---|---|---|
| Kíváncsi kattintás | ✅ Megakadályozza | N/A | N/A |
| localStorage role módosítás | ❌ Nem véd | ✅ Write-nál blokkolja | ✅ Szinkronnál szűri |
| Közvetlen Apps Script hívás | N/A | ✅ Token nélkül elutasít | N/A |
| Jelszó ismeretével token hamisítás | N/A | ❌ Nem véd (saját hash) | ❌ Nem véd |
| Drive fájl közvetlen olvasás | N/A | N/A | ❌ Nem véd (Drive jogok) |

---

## 12. Apps Script API – Tervezett végpont struktúra

### Jelenleg (egységes, nyitott endpoint)

```
POST /exec
{ action: "save" | "load", collection: string, data: any }
```

### Tervezett (autentikált, role-checked)

```
POST /exec

// Kérés wrapper
{
  action: "save" | "load" | "save_users",
  collection: string,
  data: any,
  auth: {
    userId: string,
    role: string,
    token: string,   // SHA-256(passwordHash + ":" + date)
    date: string     // "YYYY-MM-DD"
  }
}

// Válasz
{ ok: true, data: any }
{ ok: false, error: "unauthorized" | "invalid_token" | "forbidden_collection" | ... }
```

### Különleges végpontok (tervezett)

| Action | Szerepkör | Leírás |
|---|---|---|
| `save` | Kollekciófüggő | Általános write, role check szerint |
| `load` | Kollekciófüggő | Általános read, role filter szerint |
| `save_users` | Admin only | User rekordok írása (különválasztva) |
| `audit_log` | Admin only | Audit napló lekérése |

---

## 13. Implementációs prioritások

A tervezett rétegek nem egyszerre implementálandók. Javasolt sorrend a sprint után:

| Fázis | Feladat | Értéke | Kockázata |
|---|---|---|---|
| **M1** | Frontend `usePermission` hook + konzisztens guard pattern | Magas | Alacsony |
| **M2** | Apps Script auth token validáció | Magas | Közepes |
| **M3** | Apps Script role-based write restrictions | Magas | Közepes |
| **M4** | Data isolation szinkronnál (Telepítő szűrés) | Közepes | Közepes |
| **M5** | Audit napló (ki mikor mit módosított) | Magas | Alacsony |

**Jelenlegi sprint:** M1-M5 egyike sem indul el. A stabilizációs sprint lezárása az előfeltétel.

---

## 14. Amit ebből a tervből NEM csinálunk

- ❌ Google OAuth / Google account-alapú login (túl komplex, más rendszerbe illeszkedik)
- ❌ JWT token (nincs backend a validáláshoz)
- ❌ Role-based DB (localStorage egy monolith)
- ❌ Microservice architektúra
- ❌ Real-time sync (WebSocket, Firebase) – Drive marad
- ❌ Apps Script teljes átírása – csak auth réteg kerül rá

---

## 15. Döntési pontok (jövőre halasztva)

Ezekről a sprint után kell dönteni:

1. **Apps Script user-tár:** A users fájlt olvassa be minden auth-hoz, vagy Scripts Properties-be tükrözze az admin? (Sebesség vs. egyszerűség)
2. **Token lejárat:** Napi rotáló token elég, vagy kell session-invalidáció kilépéskor?
3. **Audit log tárolás:** Drive fájlban vagy Apps Script Spreadsheet logban?
4. **Telepítő data isolation:** Szinkron szűrés szerver- vagy kliensoldalon történjen?