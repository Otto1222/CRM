/**
 * naptar.service.js
 * Naptár esemény-kezelés: projektek + munkalapok + kézi bejegyzések.
 * ICS export és Google Calendar szinkron támogatással.
 */

import { PROJEKT_STATUSZOK } from "../modules/projektek/projekt.schema.js";

const KEY = "naptar_esemenyek";

function dispatch() {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: KEY } }));
}

// ─── Kézi esemény CRUD ────────────────────────────────────────

export function loadManualEvents() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

export function saveManualEvent(ev) {
  const all = loadManualEvents();
  const withId = { ...ev, id: ev.id || `nev_${Date.now()}` };
  const idx = all.findIndex(e => e.id === withId.id);
  const updated = idx >= 0
    ? all.map((e, i) => i === idx ? withId : e)
    : [...all, withId];
  localStorage.setItem(KEY, JSON.stringify(updated));
  dispatch();
  return updated;
}

export function deleteManualEvent(id) {
  const updated = loadManualEvents().filter(e => e.id !== id);
  localStorage.setItem(KEY, JSON.stringify(updated));
  dispatch();
}

// ─── Esemény-összesítés ───────────────────────────────────────

/**
 * Projektek, munkalapok és kézi bejegyzések közös lista.
 * @returns {Array<NaptarEsemeny>}
 */
export function buildCalendarEvents(projektek = [], munkalapok = [], manualEvents = [], filterUserId = null) {
  const events = [];

  // Projektek
  for (const p of projektek) {
    const start = p.tervezettKezdes || p.valoKezdes || null;
    if (!start) continue;
    const end = p.tervezettBefejezes || p.valoBefejezes || start;
    const statusConf = PROJEKT_STATUSZOK.find(s => s.id === p.status) || { szin: "#2563EB" };
    events.push({
      id:       `p_${p.id}`,
      type:     "projekt",
      title:    p.projektkod
        ? `${p.projektkod} – ${p.nev || p.clientNev || ""}`
        : (p.nev || p.clientNev || "Projekt"),
      start,
      end,
      color:    statusConf.szin,
      status:   p.status,
      ref:      p,
    });
  }

  // Munkalapok (filterUserId esetén csak az adott felhasználóé)
  for (const m of munkalapok) {
    if (filterUserId && m.assigneeId && m.assigneeId !== filterUserId) continue;
    const start = m.date || m.megkezdesIdopont?.slice(0, 10) || null;
    if (!start) continue;
    const end = m.befejezesIdopont?.slice(0, 10) || m.lezarvaDate?.slice(0, 10) || start;
    events.push({
      id:          `m_${m.id}`,
      type:        "munkalap",
      title:       [
        m.dokumentumszam || m.ugyszam || m.ediSorszam || `#${m.id?.slice(-4)}`,
        m.clientNev || m.feladat || "",
      ].filter(Boolean).join(" – "),
      start,
      end,
      color:       m.statusSzin || "#0EA5E9",
      status:      m.status,
      assigneeNev: m.assigneeNev,
      ref:         m,
    });
  }

  // Kézi bejegyzések
  for (const e of manualEvents) {
    events.push({ ...e, type: "manual", color: e.color || "#8B5CF6" });
  }

  return events;
}

/** Visszaadja az adott napra eső eseményeket (start ≤ nap ≤ end). */
export function getEventsForDate(events, dateStr) {
  return events.filter(ev => {
    const end = ev.end || ev.start;
    return ev.start <= dateStr && dateStr <= end;
  });
}

/** Naptár napok tömbje (hónap nézet, hétfőtől vasárnapig, 6 sor = 42 nap). */
export function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  let startDow = firstDay.getDay(); // 0=V
  if (startDow === 0) startDow = 7;
  const start = new Date(firstDay);
  start.setDate(1 - (startDow - 1));
  const days = [];
  const cur = new Date(start);
  while (days.length < 42) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

// ─── ICS export ───────────────────────────────────────────────

export function buildIcsContent(events) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CRM Napelem//HU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const ev of events) {
    const dtStart = (ev.start || "").replace(/-/g, "");
    const dtEnd   = ((ev.end || ev.start) || "").replace(/-/g, "");
    if (!dtStart) continue;
    const desc = [
      ev.status ? `Státusz: ${ev.status}` : "",
      ev.assigneeNev ? `Felelős: ${ev.assigneeNev}` : "",
      ev.ref?.clientCim || ev.ref?.telepitesiCim || "",
      ev.megjegyzes || "",
    ].filter(Boolean).join("\\n");

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id}@crm-napelem`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${(ev.title || "").replace(/[,;\\]/g, c => `\\${c}`)}`);
    if (desc) lines.push(`DESCRIPTION:${desc}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(events, filename = "crm-naptar.ics") {
  const content = buildIcsContent(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Google Calendar szinkron logika kiszervezve: src/services/calendarSync.service.js
