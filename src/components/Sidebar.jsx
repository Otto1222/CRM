import { useState, useEffect } from "react";
import {
  LayoutDashboard, Users, ClipboardList, Calendar, Settings,
  LogOut, Building2, Receipt, FileText, BarChart3, BookOpen, X,
  AlertTriangle, LayoutTemplate, ChevronDown, TrendingUp,
} from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { getAllowedPages } from "../lib/roles.js";
import Avatar from "./Avatar";

// ─── Navigáció struktúra ─────────────────────────────────────────────────────
//
//  type "single" : közvetlen navigációs gomb
//  type "group"  : összecsukható csoport gyerekekkel

const NAV_GROUPS = [
  {
    type: "single",
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    type: "group",
    id: "ertekesites",
    label: "Értékesítés",
    icon: TrendingUp,
    children: [
      { id: "ugyfelek",    label: "Ügyfelek",  icon: Users },
      { id: "arajanlatok", label: "Ajánlatok", icon: ClipboardList },
    ],
  },
  {
    type: "single",
    id: "projektek",
    label: "Projektek",
    icon: Building2,
  },
  {
    type: "single",
    id: "naptar",
    label: "Naptár",
    icon: Calendar,
  },
  {
    type: "group",
    id: "penzugy",
    label: "Pénzügy",
    icon: Receipt,
    children: [
      { id: "szamlak",      label: "Számlák",       icon: Receipt },
      { id: "karteritesek", label: "Kártérítések",  icon: AlertTriangle },
      { id: "riportok",     label: "Riportok",      icon: BarChart3 },
    ],
  },
  {
    type: "group",
    id: "beallitasok_csoport",
    label: "Beállítások",
    icon: Settings,
    children: [
      { id: "csapat",            label: "Csapatok",    icon: Users },
      { id: "munkalap_sablonok", label: "ML Sablonok", icon: LayoutTemplate },
      { id: "beallitasok",       label: "Rendszer",    icon: Settings },
    ],
  },
];

// ─── Telepítő nézet ───────────────────────────────────────────────────────────

function TelepItoNav({ page, onNav, onClose }) {
  const label = {
    fontSize: 10, fontWeight: 700, letterSpacing: 1.8,
    color: "rgba(111,173,168,0.5)", textTransform: "uppercase",
    padding: "4px 10px", marginBottom: 6,
  };

  function btn(id, label_, Icon) {
    const active = page === id;
    return (
      <button
        onClick={() => { onNav(id); onClose?.(); }}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 11,
          padding: "10px 12px", borderRadius: 9, border: "none",
          borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
          background: active ? C.sidebarActive : "transparent",
          color: active ? C.accent : C.sidebarText,
          cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500,
          marginBottom: 2, transition: "all .15s", fontFamily: FONT,
        }}
      >
        <Icon size={16} strokeWidth={active ? 2.2 : 1.7} />{label_}
      </button>
    );
  }

  return (
    <>
      <p style={label}>Feladataim</p>
      {btn("munkalapok", "Saját munkalapok", FileText)}
      <div style={{ borderTop: `1px solid ${C.sidebarBorder}`, margin: "10px 0" }} />
      <button
        onClick={() => {
          try {
            const b = JSON.parse(localStorage.getItem("beallitasok") || "{}");
            const url = b?.oktatoAnyagokUrl;
            if (url) window.open(url, "_blank", "noopener");
            else alert("Az oktató anyagok mappája még nincs beállítva.\nKérj meg egy Adminisztrátort, hogy állítsa be a Beállítások menüben.");
          } catch { alert("Hiba az URL betöltésekor."); }
          onClose?.();
        }}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 11,
          padding: "10px 12px", borderRadius: 9, border: "none",
          borderLeft: "3px solid transparent", background: "transparent",
          color: "#67E8F9", cursor: "pointer", fontSize: 14,
          fontFamily: FONT, fontWeight: 600,
        }}
      >
        <BookOpen size={17} strokeWidth={1.7} />Oktató anyagok
      </button>
    </>
  );
}

// ─── Egyszeres nav gomb ───────────────────────────────────────────────────────

function SingleItem({ id, label, icon: Icon, page, onNav, onClose }) {
  const active = page === id;
  return (
    <button
      onClick={() => { onNav(id); onClose?.(); }}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 11,
        padding: "10px 12px", borderRadius: 9, border: "none",
        borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
        background: active ? C.sidebarActive : "transparent",
        color: active ? C.accent : C.sidebarText,
        cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500,
        marginBottom: 2, transition: "all .15s", fontFamily: FONT,
      }}
    >
      <Icon size={16} strokeWidth={active ? 2.2 : 1.7} />{label}
    </button>
  );
}

// ─── Gyerek nav gomb (inden tálva csoporton belül) ───────────────────────────

function ChildItem({ id, label, icon: Icon, page, onNav, onClose }) {
  const active = page === id;
  return (
    <button
      onClick={() => { onNav(id); onClose?.(); }}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "7px 12px 7px 28px", borderRadius: 7, border: "none",
        borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
        background: active ? C.sidebarActive : "transparent",
        color: active ? C.accent : C.sidebarText,
        cursor: "pointer", fontSize: 12, fontWeight: active ? 700 : 500,
        marginBottom: 1, transition: "all .15s", fontFamily: FONT,
      }}
    >
      <Icon size={14} strokeWidth={active ? 2.2 : 1.7} />{label}
    </button>
  );
}

// ─── Összecsukható csoport ────────────────────────────────────────────────────

function GroupItem({ group, page, onNav, onClose, allowed, openGroups, toggleGroup }) {
  const visible = group.children.filter(c => allowed.includes(c.id));
  if (visible.length === 0) return null;

  const hasActive = group.children.some(c => c.id === page);
  const isOpen = openGroups.has(group.id);
  const Icon = group.icon;

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={() => toggleGroup(group.id)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 11,
          padding: "10px 12px", borderRadius: 9, border: "none",
          borderLeft: hasActive && !isOpen ? `3px solid ${C.accent}` : "3px solid transparent",
          background: "transparent",
          color: hasActive ? C.accent : C.sidebarText,
          cursor: "pointer", fontSize: 13, fontWeight: hasActive ? 700 : 500,
          transition: "all .15s", fontFamily: FONT,
        }}
      >
        <Icon size={16} strokeWidth={hasActive ? 2.2 : 1.7} />
        <span style={{ flex: 1, textAlign: "left" }}>{group.label}</span>
        <ChevronDown
          size={13}
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform .2s", opacity: 0.55, flexShrink: 0,
          }}
        />
      </button>
      {isOpen && (
        <div style={{ marginBottom: 4 }}>
          {visible.map(child => (
            <ChildItem
              key={child.id}
              {...child}
              page={page}
              onNav={onNav}
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar belső tartalom ───────────────────────────────────────────────────

function SidebarContent({ page, onNav, user, onLogout, onClose }) {
  const allowed    = getAllowedPages(user?.role);
  const isTelepito = user?.role === "Telepítő";

  // Csoportok nyitott állapota – az aktív oldal csoportja automatikusan nyílik
  const [openGroups, setOpenGroups] = useState(() => {
    const open = new Set();
    NAV_GROUPS.forEach(g => {
      if (g.type === "group" && g.children?.some(c => c.id === page)) open.add(g.id);
    });
    return open;
  });

  // Oldalváltáskor az aktív csoport automatikusan kinyílik
  useEffect(() => {
    NAV_GROUPS.forEach(g => {
      if (g.type === "group" && g.children?.some(c => c.id === page)) {
        setOpenGroups(prev => {
          if (prev.has(g.id)) return prev;
          const n = new Set(prev); n.add(g.id); return n;
        });
      }
    });
  }, [page]);

  function toggleGroup(id) {
    setOpenGroups(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: FONT }}>

      {/* ── Fejléc ── */}
      <div style={{
        padding: "20px 20px 16px", borderBottom: `1px solid ${C.sidebarBorder}`,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT_HEADING, fontWeight: 800, fontSize: 22,
            color: C.accent, letterSpacing: 2, lineHeight: 1,
          }}>E.D.I.</div>
          <div style={{
            fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 10,
            color: C.sidebarText, letterSpacing: 3, textTransform: "uppercase", marginTop: 2,
          }}>Solutions CRM</div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: C.sidebarText, padding: 4, display: "flex",
            alignItems: "center", flexShrink: 0,
          }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* ── Navigáció ── */}
      <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
        {isTelepito ? (
          <TelepItoNav page={page} onNav={onNav} onClose={onClose} />
        ) : (
          <>
            <p style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.8,
              color: "rgba(111,173,168,0.5)", textTransform: "uppercase",
              padding: "4px 10px", marginBottom: 6,
            }}>Főmenü</p>

            {NAV_GROUPS.map(item => {
              if (item.type === "single") {
                if (!allowed.includes(item.id)) return null;
                return (
                  <SingleItem
                    key={item.id}
                    {...item}
                    page={page}
                    onNav={onNav}
                    onClose={onClose}
                  />
                );
              }
              return (
                <GroupItem
                  key={item.id}
                  group={item}
                  page={page}
                  onNav={onNav}
                  onClose={onClose}
                  allowed={allowed}
                  openGroups={openGroups}
                  toggleGroup={toggleGroup}
                />
              );
            })}
          </>
        )}
      </nav>

      {/* ── Felhasználó + kijelentkezés ── */}
      <div style={{ padding: "14px 14px 20px", borderTop: `1px solid ${C.sidebarBorder}` }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px", borderRadius: 10,
          background: "rgba(24,172,160,0.06)", marginBottom: 4,
        }}>
          <Avatar u={user} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              color: "#fff", fontWeight: 600, fontSize: 13,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              fontFamily: FONT,
            }}>{user.name}</div>
            <div style={{ color: C.sidebarText, fontSize: 11, fontFamily: FONT }}>{user.role}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", borderRadius: 8, border: "none",
          background: "transparent", color: C.sidebarText,
          cursor: "pointer", fontSize: 12, fontFamily: FONT, fontWeight: 500,
        }}>
          <LogOut size={14} />Kijelentkezés
        </button>
      </div>
    </div>
  );
}

// ─── Fő export: desktop sticky sidebar + mobil overlay drawer ────────────────

export default function Sidebar({ page, onNav, user, onLogout, open, onClose }) {
  return (
    <>
      {/* ── DESKTOP sidebar (≥768px) ── */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: C.sidebar,
        height: "100vh",
        position: "sticky", top: 0,
        display: "flex", flexDirection: "column",
        ...(typeof window !== "undefined" && window.innerWidth < 768 ? { display: "none" } : {}),
      }} className="sidebar-desktop">
        <SidebarContent page={page} onNav={onNav} user={user} onLogout={onLogout} />
      </aside>

      {/* ── MOBIL overlay backdrop ── */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* ── MOBIL drawer ── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: 280, zIndex: 1000,
        background: C.sidebar,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column",
        boxShadow: open ? "4px 0 32px rgba(0,0,0,0.4)" : "none",
      }} className="sidebar-mobile">
        <SidebarContent page={page} onNav={onNav} user={user} onLogout={onLogout} onClose={onClose} />
      </aside>
    </>
  );
}
