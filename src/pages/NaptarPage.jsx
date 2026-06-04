import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Download, RefreshCw, X, Settings,
} from "lucide-react";
import { batchSyncAllMunkalapok, getCalendarConfig } from "../services/calendarSync.service";
import { C, FONT } from "../lib/constants";
import { loadLocal, saveLocal } from "../lib/localDb";
import {
  buildCalendarEvents, getEventsForDate, getCalendarDays,
  loadManualEvents, saveManualEvent, deleteManualEvent,
  downloadIcs,
} from "../services/naptar.service";

const NAPOK  = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const HONAPOK = ["Január","Február","Március","Április","Május","Június",
                 "Július","Augusztus","Szeptember","Október","November","December"];

const SYNC_COLORS = {
  idle:    { bg: "rgba(255,255,255,0.08)", color: C?.muted || C.muted },
  syncing: { bg: C.accent,               color: "#fff" },
  ok:      { bg: C.success,               color: "#fff" },
  error:   { bg: C.danger,               color: "#fff" },
};

function toDateStr(d) { return d.toISOString().slice(0, 10); }

function fmtDate(ds) {
  if (!ds) return "";
  try {
    return new Date(ds + "T12:00:00").toLocaleDateString("hu-HU", {
      year: "numeric", month: "long", day: "numeric", weekday: "long",
    });
  } catch { return ds; }
}

// ─── Kézi esemény modal ───────────────────────────────────────

function NewEventModal({ defaultDate, onSave, onClose }) {
  const [form, setForm] = useState({
    title: "", start: defaultDate || "", end: defaultDate || "",
    color: "#8B5CF6", megjegyzes: "",
  });
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={{ ...MODAL_BOX, maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div style={MODAL_HEAD}>
          <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Új esemény</span>
          <button onClick={onClose} style={ICON_BTN}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          <Field label="Megnevezés *">
            <input value={form.title} onChange={e => F("title", e.target.value)}
              style={INPUT_STYLE} placeholder="Esemény neve..." />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Kezdés *" style={{ flex: 1 }}>
              <input type="date" value={form.start} onChange={e => F("start", e.target.value)}
                style={INPUT_STYLE} />
            </Field>
            <Field label="Befejezés" style={{ flex: 1 }}>
              <input type="date" value={form.end} onChange={e => F("end", e.target.value)}
                style={INPUT_STYLE} />
            </Field>
          </div>
          <Field label="Szín">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="color" value={form.color} onChange={e => F("color", e.target.value)}
                style={{ width: 44, height: 36, borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, cursor: "pointer", padding: 3 }} />
              {["#8B5CF6",C.accent,C.success,C.warning,C.danger,"#0891B2"].map(c => (
                <button key={c} onClick={() => F("color", c)}
                  style={{ width: 20, height: 20, borderRadius: "50%", background: c, border: form.color === c ? "3px solid #fff" : "2px solid transparent", cursor: "pointer" }} />
              ))}
            </div>
          </Field>
          <Field label="Megjegyzés">
            <textarea value={form.megjegyzes} onChange={e => F("megjegyzes", e.target.value)} rows={3}
              style={{ ...INPUT_STYLE, resize: "vertical" }} placeholder="Opcionális..." />
          </Field>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={onClose} style={BTN_SECONDARY}>Mégse</button>
            <button
              onClick={() => onSave(form)}
              disabled={!form.title || !form.start}
              style={{ ...BTN_PRIMARY, opacity: (!form.title || !form.start) ? 0.45 : 1 }}>
              Mentés
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Esemény detail modal ─────────────────────────────────────

function EventModal({ ev, onClose, onNavigate, onDelete }) {
  if (!ev) return null;
  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={{ ...MODAL_BOX, maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
          <div style={{ width: 6, borderRadius: 4, background: ev.color, alignSelf: "stretch", flexShrink: 0, minHeight: 44 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: C.text, lineHeight: 1.3 }}>{ev.title}</div>
            <div style={{ fontSize: 12, color: ev.color, fontWeight: 600, marginTop: 2 }}>
              {ev.type === "projekt" ? "Projekt" : ev.type === "munkalap" ? "Munkalap" : "Egyedi esemény"}
            </div>
          </div>
          <button onClick={onClose} style={ICON_BTN}><X size={18} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 13 }}>
          {ev.status && <Row label="Státusz">{ev.status}</Row>}
          <Row label="Dátum">
            {ev.start}{ev.end && ev.end !== ev.start ? ` – ${ev.end}` : ""}
          </Row>
          {ev.assigneeNev && <Row label="Felelős">{ev.assigneeNev}</Row>}
          {(ev.ref?.clientNev) && <Row label="Ügyfél">{ev.ref.clientNev}</Row>}
          {(ev.ref?.clientCim || ev.ref?.telepitesiCim) && (
            <Row label="Cím">{ev.ref?.clientCim || ev.ref?.telepitesiCim}</Row>
          )}
          {ev.megjegyzes && <Row label="Megjegyzés">{ev.megjegyzes}</Row>}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          {ev.type === "manual" && onDelete && (
            <button onClick={() => onDelete(ev.id)} style={{ ...BTN_SECONDARY, color: C.danger, borderColor: C.danger }}>
              Töröl
            </button>
          )}
          {ev.type !== "manual" && onNavigate && (
            <button onClick={() => onNavigate(ev)} style={BTN_PRIMARY}>Megnyit</button>
          )}
          <button onClick={onClose} style={BTN_SECONDARY}>Bezár</button>
        </div>
      </div>
    </div>
  );
}

// ─── Google szinkron beállítások modal ────────────────────────

function CalendarSettingsModal({ onClose }) {
  const [calId, setCalId] = useState(() => {
    try { return JSON.parse(localStorage.getItem("beallitasok") || "{}").googleCalendarId || ""; }
    catch { return ""; }
  });

  function save() {
    try {
      const b = JSON.parse(localStorage.getItem("beallitasok") || "{}");
      saveLocal("beallitasok", { ...b, googleCalendarId: calId.trim() });
      window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "beallitasok" } }));
    } catch {}
    onClose();
  }

  return (
    <div style={OVERLAY} onClick={onClose}>
      <div style={{ ...MODAL_BOX, maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={MODAL_HEAD}>
          <span style={{ fontWeight: 700, fontSize: 16, color: C.text }}>Google Calendar beállítás</span>
          <button onClick={onClose} style={ICON_BTN}><X size={18} /></button>
        </div>
        <div style={{ marginTop: 16, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
          <p style={{ margin: "0 0 14px" }}>
            A szinkronizáláshoz az Apps Script-nek is frissíteni kell (a naptar.service.js-ben lévő kód szerint),
            és engedélyezni kell a <strong style={{ color: C.text }}>Calendar API</strong>-t a scriptnél.
          </p>
          <Field label="Google Calendar ID (pl. xxxx@group.calendar.google.com)">
            <input value={calId} onChange={e => setCalId(e.target.value)}
              style={INPUT_STYLE} placeholder="your-calendar@group.calendar.google.com" />
          </Field>
          <p style={{ margin: "12px 0 0", fontSize: 12 }}>
            A Calendar ID-t a Google Naptárban találod: naptár neve → ⋮ → Beállítások → Naptár azonosítója
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} style={BTN_SECONDARY}>Mégse</button>
          <button onClick={save} style={BTN_PRIMARY}>Mentés</button>
        </div>
      </div>
    </div>
  );
}

// ─── Fő oldal ─────────────────────────────────────────────────

export default function NaptarPage({ data, currentUser, onNavigate }) {
  const today    = new Date();
  const todayStr = toDateStr(today);

  const [viewYear,    setViewYear]    = useState(today.getFullYear());
  const [viewMonth,   setViewMonth]   = useState(today.getMonth());
  const [selDate,     setSelDate]     = useState(todayStr);
  const [selEvent,    setSelEvent]    = useState(null);
  const [showNew,     setShowNew]     = useState(false);
  const [showGCal,    setShowGCal]    = useState(false);
  const [manEvents,   setManEvents]   = useState(loadManualEvents);
  const [syncStatus,  setSyncStatus]  = useState("idle"); // idle|syncing|ok|error
  const [syncMsg,     setSyncMsg]     = useState("");

  useEffect(() => {
    const h = () => setManEvents(loadManualEvents());
    window.addEventListener("crm-db-updated", h);
    return () => window.removeEventListener("crm-db-updated", h);
  }, []);

  // Csak saját munkalapok a Telepítő számára
  const filterUserId = currentUser?.role === "Telepítő" ? currentUser?.id : null;

  const allEvents = useMemo(() =>
    buildCalendarEvents(data?.projektek || [], data?.munkalapok || [], manEvents, filterUserId),
    [data, manEvents, filterUserId]
  );

  const calDays = useMemo(() => getCalendarDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const selDateEvents = useMemo(() =>
    selDate ? getEventsForDate(allEvents, selDate) : [],
    [allEvents, selDate]
  );

  // Napok amelyeken van esemény (a hónapban) – az aktuális hónapra
  const eventDotDays = useMemo(() => {
    const set = new Set();
    for (const ev of allEvents) {
      const s = new Date(ev.start + "T12:00:00");
      const e = new Date((ev.end || ev.start) + "T12:00:00");
      const cur = new Date(s);
      while (cur <= e) {
        const ds = toDateStr(cur);
        if (ds.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`)) {
          set.add(ds);
        }
        cur.setDate(cur.getDate() + 1);
        if (cur > e) break;
      }
    }
    return set;
  }, [allEvents, viewYear, viewMonth]);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function handleDayClick(day) {
    const ds = toDateStr(day);
    setSelDate(ds === selDate ? null : ds);
    setSelEvent(null);
  }

  function handleSaveNewEvent(form) {
    saveManualEvent({ ...form, id: `nev_${Date.now()}` });
    setShowNew(false);
  }

  function handleDeleteEvent(id) {
    deleteManualEvent(id);
    setSelEvent(null);
  }

  function handleNavigate(ev) {
    if (!onNavigate) return;
    onNavigate(ev.type, ev.ref);
    setSelEvent(null);
  }

  async function handleGoogleSync() {
    const cfg = getCalendarConfig();
    if (!cfg.enabled) {
      setShowGCal(true);
      return;
    }

    setSyncStatus("syncing");
    setSyncMsg("Teljes újraszinkronizálás...");
    try {
      const res = await batchSyncAllMunkalapok();
      if (res?.ok) {
        setSyncStatus("ok");
        setSyncMsg(res.msg || "Kész");
      } else {
        setSyncStatus("error");
        setSyncMsg(res?.reason || res?.error || "Hiba");
      }
    } catch (e) {
      setSyncStatus("error");
      setSyncMsg(e.message || "Hiba");
    }
    setTimeout(() => { setSyncStatus("idle"); setSyncMsg(""); }, 5000);
  }

  const sc          = SYNC_COLORS[syncStatus] || SYNC_COLORS.idle;
  const calCfg      = getCalendarConfig();
  const liveActive  = calCfg.enabled;

  return (
    <div style={{ padding: "16px 18px 32px", maxWidth: 860, margin: "0 auto", fontFamily: FONT }}>

      {/* ── Live szinkron státusz sáv ─────────── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 12px", borderRadius: 8, marginBottom: 12,
        background: liveActive ? C.text : "rgba(255,255,255,0.04)",
        border: `1px solid ${liveActive ? C.accent : C.border}`,
        fontSize: 12,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: liveActive ? C.success : C.muted,
          flexShrink: 0,
          boxShadow: liveActive ? "0 0 0 3px #34D39930" : "none",
        }} />
        <span style={{ color: liveActive ? C.success : C.muted }}>
          {liveActive
            ? "Live Google Calendar szinkron: aktív – minden mentéskor automatikusan frissül"
            : "Live Google Calendar szinkron: nincs beállítva – kattints a ⚙️ gombra"}
        </span>
      </div>

      {/* ── Fejléc ──────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
        {/* Hónap navigáció */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button onClick={prevMonth} style={NAV_BTN}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 18, fontWeight: 700, color: C.text, minWidth: 190, textAlign: "center" }}>
            {viewYear}. {HONAPOK[viewMonth]}
          </span>
          <button onClick={nextMonth} style={NAV_BTN}><ChevronRight size={16} /></button>
          <button onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelDate(todayStr); }}
            style={{ ...NAV_BTN, background: C.accent, color: "#fff", border: "none", padding: "6px 12px", fontWeight: 700, fontSize: 12 }}>
            Ma
          </button>
        </div>

        <div style={{ flex: 1 }} />

        {/* Akciók */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setShowNew(true)}
            style={{ ...BTN_PRIMARY, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <Plus size={14} />Új esemény
          </button>
          <button onClick={() => downloadIcs(allEvents)}
            title="iCal fájl letöltése – importálható Google Calendar-ba"
            style={{ ...BTN_SECONDARY, display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <Download size={14} />ICS export
          </button>
          <button onClick={handleGoogleSync}
            disabled={syncStatus === "syncing"}
            style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 13,
              padding: "8px 14px", borderRadius: 9, border: "none",
              background: sc.bg, color: sc.color,
              cursor: syncStatus === "syncing" ? "wait" : "pointer",
              fontWeight: 600, transition: "background .2s",
            }}>
            <RefreshCw size={14} className={syncStatus === "syncing" ? "spin" : ""} />
            {syncMsg || "Teljes újraszinkronizálás"}
          </button>
          <button onClick={() => setShowGCal(true)} title="Google Calendar beállítások"
            style={{ ...BTN_SECONDARY, padding: "8px 10px" }}>
            <Settings size={15} />
          </button>
        </div>
      </div>

      {/* ── Naptár rács ─────────────────────────── */}
      <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {/* Fejsor */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: `1px solid ${C.border}` }}>
          {NAPOK.map(n => (
            <div key={n} style={{ padding: "10px 4px", textAlign: "center", fontSize: 12, fontWeight: 700, color: C.muted }}>
              {n}
            </div>
          ))}
        </div>
        {/* Napok */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {calDays.map((day, i) => {
            const ds             = toDateStr(day);
            const isThisMonth    = day.getMonth() === viewMonth;
            const isToday        = ds === todayStr;
            const isSelected     = ds === selDate;
            const dayEvs         = getEventsForDate(allEvents, ds);
            const hasEvents      = dayEvs.length > 0;
            const MAX_CHIPS      = window.innerWidth < 480 ? 1 : 2;

            return (
              <div key={i} onClick={() => handleDayClick(day)} style={{
                minHeight: 72,
                padding: "5px 4px",
                borderRight: (i + 1) % 7 === 0 ? "none" : `1px solid ${C.border}`,
                borderBottom: i < 35 ? `1px solid ${C.border}` : "none",
                background: isSelected
                  ? "rgba(37,99,235,0.15)"
                  : isToday ? "rgba(37,99,235,0.06)" : "transparent",
                cursor: "pointer",
              }}>
                {/* Nap szám */}
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: isToday ? 800 : 400,
                  color: isToday ? "#fff" : isThisMonth ? C.text : C.muted,
                  background: isToday ? C.accent : "transparent",
                  marginBottom: 3,
                }}>
                  {day.getDate()}
                </div>

                {/* Esemény chipek */}
                {dayEvs.slice(0, MAX_CHIPS).map(ev => (
                  <div key={ev.id} onClick={e => { e.stopPropagation(); setSelDate(ds); setSelEvent(ev); }}
                    title={ev.title}
                    style={{
                      fontSize: 10, fontWeight: 600,
                      background: ev.color + "25",
                      color: ev.color,
                      borderLeft: `2px solid ${ev.color}`,
                      borderRadius: 3,
                      padding: "2px 4px",
                      marginBottom: 2,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}>
                    {ev.title}
                  </div>
                ))}
                {dayEvs.length > MAX_CHIPS && (
                  <div style={{ fontSize: 10, color: C.muted, paddingLeft: 3 }}>
                    +{dayEvs.length - MAX_CHIPS}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Kijelölt nap eseményei ───────────────── */}
      {selDate && (
        <div style={{ marginTop: 16, background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{fmtDate(selDate)}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowNew(true); }} title="Új esemény erre a napra"
                style={{ ...ICON_BTN, background: C.accent + "22", color: C.accent, borderRadius: 8, width: 30, height: 30 }}>
                <Plus size={14} />
              </button>
              <button onClick={() => setSelDate(null)} style={ICON_BTN}><X size={16} /></button>
            </div>
          </div>

          {selDateEvents.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Nincs esemény ezen a napon.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selDateEvents.map(ev => (
                <div key={ev.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  background: ev.color + "14",
                  border: `1px solid ${ev.color}35`,
                  borderRadius: 10, padding: "10px 12px",
                }}>
                  <div style={{ width: 4, background: ev.color, borderRadius: 4, alignSelf: "stretch", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 2 }}>{ev.title}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: ev.color, fontWeight: 600 }}>
                        {ev.type === "projekt" ? "Projekt" : ev.type === "munkalap" ? "Munkalap" : "Esemény"}
                      </span>
                      {ev.status && <span style={{ fontSize: 11, color: C.muted }}>{ev.status}</span>}
                      {ev.start !== ev.end && ev.end && (
                        <span style={{ fontSize: 11, color: C.muted }}>{ev.start} – {ev.end}</span>
                      )}
                    </div>
                    {ev.assigneeNev && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>👤 {ev.assigneeNev}</div>
                    )}
                    {(ev.ref?.clientCim || ev.ref?.telepitesiCim) && (
                      <div style={{ fontSize: 11, color: C.muted }}>📍 {ev.ref?.clientCim || ev.ref?.telepitesiCim}</div>
                    )}
                    {ev.megjegyzes && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{ev.megjegyzes}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => setSelEvent(ev)}
                      style={{ fontSize: 11, padding: "3px 10px", background: "rgba(255,255,255,0.08)", color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer" }}>
                      Részlet
                    </button>
                    {ev.type !== "manual" && onNavigate && (
                      <button onClick={() => handleNavigate(ev)}
                        style={{ fontSize: 11, padding: "3px 10px", background: C.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>
                        Megnyit
                      </button>
                    )}
                    {ev.type === "manual" && (
                      <button onClick={() => handleDeleteEvent(ev.id)}
                        style={{ fontSize: 11, padding: "3px 10px", background: "#EF444422", color: C.danger, border: `1px solid #EF444440`, borderRadius: 6, cursor: "pointer" }}>
                        Töröl
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Jelmagyarázat ───────────────────────── */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, fontSize: 12, color: C.muted }}>
        {[
          { color: C.accent, label: "Projekt" },
          { color: C.accent, label: "Munkalap" },
          { color: "#8B5CF6", label: "Kézi esemény" },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, background: color, borderRadius: 2, display: "inline-block" }} />
            {label}
          </span>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11 }}>
          ICS export → importálható Google Calendar-ba
        </span>
      </div>

      {/* ── Modalok ──────────────────────────────── */}
      {showNew && (
        <NewEventModal
          defaultDate={selDate || toDateStr(today)}
          onSave={handleSaveNewEvent}
          onClose={() => setShowNew(false)}
        />
      )}

      {selEvent && (
        <EventModal
          ev={selEvent}
          onClose={() => setSelEvent(null)}
          onNavigate={handleNavigate}
          onDelete={handleDeleteEvent}
        />
      )}

      {showGCal && (
        <CalendarSettingsModal onClose={() => setShowGCal(false)} />
      )}
    </div>
  );
}

// ─── Segéd komponensek ────────────────────────────────────────

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 12, color: C.muted, display: "block", marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ color: C.text }}>
      <span style={{ color: C.muted, marginRight: 4 }}>{label}:</span>{children}
    </div>
  );
}

// ─── Stílus konstansok ────────────────────────────────────────

const OVERLAY = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.55)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
};

const MODAL_BOX = {
  background: C?.bg || C.text, borderRadius: 16,
  padding: 24, width: "100%",
  boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
  maxHeight: "90vh", overflowY: "auto",
};

const MODAL_HEAD = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
};

const ICON_BTN = {
  background: "none", border: "none", cursor: "pointer",
  color: C?.muted || C.muted, display: "flex", alignItems: "center",
  padding: 4, borderRadius: 6,
};

const INPUT_STYLE = {
  width: "100%", padding: "8px 12px", borderRadius: 9,
  border: `1px solid ${C?.border || C.border}`,
  background: C?.card || C.border, color: C?.text || C.bg,
  fontSize: 14, boxSizing: "border-box", fontFamily: "system-ui, sans-serif",
};

const BTN_PRIMARY = {
  padding: "8px 16px", borderRadius: 9, border: "none",
  background: C?.accent || C.accent, color: "#fff",
  cursor: "pointer", fontWeight: 700, fontSize: 13,
};

const BTN_SECONDARY = {
  padding: "8px 14px", borderRadius: 9,
  border: `1px solid ${C?.border || C.border}`,
  background: C?.card || C.border, color: C?.text || C.bg,
  cursor: "pointer", fontSize: 13,
};

const NAV_BTN = {
  background: C?.card || C.border,
  border: `1px solid ${C?.border || C.border}`,
  borderRadius: 8, padding: "6px 10px",
  cursor: "pointer", color: C?.text || C.bg,
  display: "flex", alignItems: "center",
};
