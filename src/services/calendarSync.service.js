/**
 * calendarSync.service.js
 *
 * Stabil, duplikátum-mentes Google Calendar szinkron.
 *
 * Elvek:
 *  – Minden munkalaphoz egy calendarEventId tartozik (localStorage-ban tárolt).
 *  – Újraszinkronnál a meglévő eseményt frissíti, nem hoz létre újat.
 *  – Ha az Apps Script-ben az esemény nem található (manuálisan törölték),
 *    új eseményt hoz létre és menti az új ID-t.
 *  – A calendarEventId visszamentése updateItem-mel történik (NEM updateWorkorder-rel),
 *    hogy ne okozzon szinkron-hurkot.
 *
 * ─────────────────────────────────────────────────────────────
 * Apps Script kiegészítés (doPost switch-be kell illeszteni):
 *
 *   case "syncCalendarEvent": {
 *     var calId = data.calendarId;
 *     var cal   = CalendarApp.getCalendarById(calId);
 *     if (!cal) return { ok: false, error: "Calendar not found: " + calId };
 *
 *     var ev   = data.event;
 *     var sDate = new Date(ev.start + "T07:00:00");
 *     var eDate = new Date((ev.end || ev.start) + "T18:00:00");
 *     var opts  = {
 *       description: ev.description || "",
 *       location:    ev.location    || ""
 *     };
 *     if (ev.guests) opts.guests = ev.guests;
 *
 *     // Meglévő esemény frissítése calendarEventId alapján
 *     if (ev.calendarEventId) {
 *       try {
 *         var existing = cal.getEventById(ev.calendarEventId);
 *         if (existing) {
 *           existing.setTitle(ev.title);
 *           existing.setTime(sDate, eDate);
 *           existing.setDescription(opts.description);
 *           if (opts.location) existing.setLocation(opts.location);
 *           return { ok: true, eventId: ev.calendarEventId, action: "updated" };
 *         }
 *       } catch(e) { } // esemény nem létezik – új kerül létrehozásra
 *     }
 *
 *     // Új esemény létrehozása
 *     var newEv = cal.createEvent(ev.title, sDate, eDate, opts);
 *     return { ok: true, eventId: newEv.getId(), action: "created" };
 *   }
 *
 *   case "deleteCalendarEvent": {
 *     var calId = data.calendarId;
 *     var cal   = CalendarApp.getCalendarById(calId);
 *     if (!cal) return { ok: false, error: "Calendar not found: " + calId };
 *     if (data.eventId) {
 *       try {
 *         var ev = cal.getEventById(data.eventId);
 *         if (ev) ev.deleteEvent();
 *       } catch(e) { } // már nem létezik, rendben
 *     }
 *     return { ok: true };
 *   }
 * ─────────────────────────────────────────────────────────────
 */

import { loadLocal } from "../lib/localDb.js";
import {
  driveSyncCalendarEvent,
  driveDeleteCalendarEvent,
  driveAvailable,
} from "../lib/driveApi.js";

// ─── Konfiguráció ─────────────────────────────────────────────

export function getCalendarConfig() {
  try {
    const b = JSON.parse(localStorage.getItem("beallitasok") || "{}");
    return {
      enabled:    !!b.googleCalendarId && driveAvailable(),
      calendarId: b.googleCalendarId || "",
    };
  } catch {
    return { enabled: false, calendarId: "" };
  }
}

// ─── Esemény payload építés ───────────────────────────────────

function buildEventPayload(m) {
  const start = m.date || m.datum || m.megkezdesIdopont?.slice(0, 10) || null;
  if (!start) return null;

  const end = m.befejezesIdopont?.slice(0, 10)
    || m.lezarvaDate?.slice(0, 10)
    || start;

  // Lezárt állapot jelölése a cím elején
  const isClosed = m.lezarva === true
    || m.status === "Lezárva"
    || m.status === "Elkészült"
    || m.status === "Befejezve";

  const title = [
    isClosed ? "[✓] " : "",
    m.dokumentumszam || m.ugyszam || m.ediSorszam || `ML-${(m.id || "").slice(-4)}`,
    " – ",
    m.clientNev || m.feladat || "",
  ].join("");

  const description = [
    `Státusz: ${m.status || ""}`,
    m.assigneeNev  ? `Felelős: ${m.assigneeNev}`                       : "",
    m.csapatNev    ? `Csapat: ${m.csapatNev}`                          : "",
    m.feladat      ? `Feladat: ${m.feladat}`                           : "",
    (m.telepitesiCim || m.clientCim) ? `Helyszín: ${m.telepitesiCim || m.clientCim}` : "",
    m.clientTel    ? `Telefon: ${m.clientTel}`                         : "",
    m.megjegyzes   ? `Megjegyzés: ${m.megjegyzes}`                     : "",
  ].filter(Boolean).join("\n");

  return {
    id:              m.id,
    calendarEventId: m.calendarEventId || null,
    title:           title.trim(),
    start,
    end,
    location:        m.telepitesiCim || m.clientCim || "",
    guests:          m.assigneeEmail || "",
    description,
  };
}

// ─── Szinkron műveletek ───────────────────────────────────────

/**
 * Egy munkalap szinkronizálása Google Calendar-ba.
 * Mentéskor automatikusan hívódik (live szinkron).
 * Ha nincs calendarId beállítva, csendesen kihagyja.
 */
export async function syncMunkalapToCalendar(m) {
  const config = getCalendarConfig();
  if (!config.enabled) return { skipped: true, reason: "no config" };

  const event = buildEventPayload(m);
  if (!event) return { skipped: true, reason: "no date" };

  try {
    const res = await driveSyncCalendarEvent(event, config.calendarId);

    // Új esemény jött létre → calendarEventId visszamentése DISPATCH NÉLKÜL
    // (updateItem helyett direkt LS write – elkerüli a felesleges crm-db-updated trigger-t)
    if (res?.ok && res.eventId && res.action === "created") {
      try {
        const list = JSON.parse(localStorage.getItem("munkalapok") || "[]");
        const idx  = list.findIndex(w => w.id === m.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], calendarEventId: res.eventId };
          localStorage.setItem("munkalapok", JSON.stringify(list));
        }
      } catch {}
    }

    return res;
  } catch (e) {
    console.warn("[calendarSync] sync hiba:", m.id, e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Munkalap törlése esetén a naptár eseményt is törli.
 */
export async function deleteMunkalapFromCalendar(m) {
  const config = getCalendarConfig();
  if (!config.enabled) return { skipped: true, reason: "no config" };
  if (!m?.calendarEventId) return { skipped: true, reason: "no eventId" };

  try {
    const res = await driveDeleteCalendarEvent(m.calendarEventId, config.calendarId);
    if (res?.ok) {
      try {
        const list = JSON.parse(localStorage.getItem("munkalapok") || "[]");
        const idx  = list.findIndex(w => w.id === m.id);
        if (idx >= 0) {
          list[idx] = { ...list[idx], calendarEventId: null };
          localStorage.setItem("munkalapok", JSON.stringify(list));
        }
      } catch {}
    }
    return res;
  } catch (e) {
    console.warn("[calendarSync] delete hiba:", m.id, e.message);
    return { ok: false, error: e.message };
  }
}

/**
 * Az összes munkalap teljes újraszinkronizálása (kézi gomb).
 * Létrehozza a hiányzó eseményeket, frissíti a meglévőket.
 * Egyenként hívja syncMunkalapToCalendar → minden calendarEventId eltárolódik.
 */
export async function batchSyncAllMunkalapok() {
  const config = getCalendarConfig();
  if (!config.enabled) {
    return { ok: false, reason: "Nincs Google Calendar ID beállítva." };
  }

  const munkalapok = loadLocal("munkalapok") || [];
  let synced = 0, skipped = 0, errors = 0;

  for (const m of munkalapok) {
    const r = await syncMunkalapToCalendar(m);
    if (r.skipped) skipped++;
    else if (r.ok)  synced++;
    else            errors++;
  }

  return {
    ok:      true,
    synced,
    skipped,
    errors,
    total:   munkalapok.length,
    msg:     `Szinkronizálva: ${synced}, kihagyva: ${skipped}${errors ? `, hiba: ${errors}` : ""}`,
  };
}
