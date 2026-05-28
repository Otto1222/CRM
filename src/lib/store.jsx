/**
 * store.js – Központi reaktív adatforrás
 *
 * EGYETLEN igazság forrás az egész alkalmazásban.
 * Minden UI komponens ebből olvas – SOHA nem saját lokális cache-ből.
 *
 * Architektúra:
 *   localStorage → store (egyirányú szinkron)
 *   store változás → crm-db-updated event → store újraolvas → UI re-render
 *
 * Bővítés: új collection hozzáadása = új sor a COLLECTIONS objektumba.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { loadLocal } from "./localDb";
import { getUsers } from "./crmUsers";

// ─── Az összes adat-kollekció, amit a store kezel ─────────────
const COLLECTIONS = {
  munkalapok:  () => loadLocal("munkalapok")  || [],
  ugyfelek:    () => loadLocal("ugyfelek")    || [],
  users:       () => getUsers(),                        // felhasználók
  beallitasok: () => { try { return JSON.parse(localStorage.getItem("beallitasok")||"{}"); } catch { return {}; } },
  karteritesek:() => { try { return JSON.parse(localStorage.getItem("karteritesek")||"[]"); } catch { return []; } },
  sablonok:    () => { try { return JSON.parse(localStorage.getItem("sablonok")||"[]");     } catch { return []; } },
};

/** Teljes store betöltése localStorage-ból */
function loadAllCollections() {
  return Object.fromEntries(
    Object.entries(COLLECTIONS).map(([k, fn]) => [k, fn()])
  );
}

// ─── React Context ────────────────────────────────────────────
export const StoreContext = createContext(null);

/**
 * StoreProvider – az App gyökerén helyezd el
 * Minden child komponens useStore()-ral olvashat belőle
 */
export function StoreProvider({ children, initialData }) {
  const [store, setStore] = useState(() => ({
    ...loadAllCollections(),
    ...(initialData || {}),   // App.jsx-ből átadott kezdeti adatok
  }));

  // Bármely collection változásakor újraolvassa az érintett részeket
  const refresh = useCallback((collection) => {
    if (!collection || collection === "all") {
      setStore(loadAllCollections());
      return;
    }
    const fn = COLLECTIONS[collection];
    if (fn) {
      setStore(prev => ({ ...prev, [collection]: fn() }));
    }
    // munkalapok változásakor a users/beallitasok is jöhet (cross-collection)
    if (collection === "munkalapok") {
      setStore(prev => ({ ...prev, munkalapok: COLLECTIONS.munkalapok() }));
    }
  }, []);

  // Globális eseményfigyelő – MINDEN localStorage változást fog
  useEffect(() => {
    function handleDbUpdate(e) {
      const col = e.detail?.collection || "all";

      // Ha ismert collection, csak azt frissítjük
      if (col === "all") {
        setStore(loadAllCollections());
      } else {
        // Minden érintett collection-t frissítünk
        setStore(prev => {
          const next = { ...prev };
          // Mindig frissítjük az érintett collection-t
          if (COLLECTIONS[col]) next[col] = COLLECTIONS[col]();
          // Kapcsolódó collection-k
          if (col.startsWith("felmeres_fotok_") || col.startsWith("fotok_") || col.startsWith("vbf_")) {
            next.munkalapok = COLLECTIONS.munkalapok();
          }
          if (col === "users" || col === "crm_napelem_users") {
            next.users = COLLECTIONS.users();
          }
          return next;
        });
      }
    }

    // localStorage változás más tab-ból (cross-tab sync)
    function handleStorageEvent(e) {
      const mapping = {
        "munkalapok": "munkalapok",
        "ugyfelek":   "ugyfelek",
        "karteritesek":"karteritesek",
        "sablonok":   "sablonok",
        "beallitasok":"beallitasok",
        "crm_napelem_users": "users",
      };
      const col = mapping[e.key];
      if (col) refresh(col);
    }

    window.addEventListener("crm-db-updated", handleDbUpdate);
    window.addEventListener("storage", handleStorageEvent);
    return () => {
      window.removeEventListener("crm-db-updated", handleDbUpdate);
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, [refresh]);

  return (
    <StoreContext.Provider value={{ store, setStore, refresh }}>
      {children}
    </StoreContext.Provider>
  );
}

/**
 * useStore() – Adatolvasás hook
 * Minden UI komponens ezt hívja, SOHA nem loadLocal()-t direkt
 *
 * Példa:
 *   const { munkalapok, users, beallitasok } = useStore();
 */
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore() csak StoreProvider-en belül használható!");
  return ctx.store;
}

/**
 * useStoreActions() – Írási műveletek
 */
export function useStoreActions() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStoreActions() csak StoreProvider-en belül használható!");
  return { refresh: ctx.refresh };
}
