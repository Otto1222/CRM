// ─── DESIGN TOKENS ───────────────────────────────────────────
export const C = {
  sidebar:      "#0D1B2A",
  sidebarBorder:"rgba(255,255,255,0.06)",
  sidebarText:  "#94A3B8",
  sidebarActive:"#1E4D8C",
  accent:       "#2563EB",
  accentHover:  "#1D4ED8",
  accentLight:  "#EFF6FF",
  success:      "#059669",
  successLight: "#ECFDF5",
  warning:      "#D97706",
  warningLight: "#FFFBEB",
  danger:       "#DC2626",
  dangerLight:  "#FEF2F2",
  bg:           "#F8FAFC",
  card:         "#FFFFFF",
  text:         "#0F172A",
  textSub:      "#475569",
  muted:        "#94A3B8",
  border:       "#E2E8F0",
  borderHover:  "#CBD5E1",
};

export const FONT         = "'DM Sans', sans-serif";
export const FONT_HEADING = "'Sora', sans-serif";

// ─── FELHASZNÁLÓK ─────────────────────────────────────────────
export const USERS = [
  { id:"u1", name:"Bakonyi Patrik", email:"bakonyi.patrik@szakiflow.hu", role:"Adminisztrátor", color:"#2563EB", initials:"BP" },
  { id:"u2", name:"Kovács Géza",    email:"kovacs.geza@szakiflow.hu",    role:"Klímaszerelő",   color:"#059669", initials:"KG" },
  { id:"u3", name:"Nagy Béla",      email:"nagy.bela@szakiflow.hu",      role:"Klímaszerelő",   color:"#9333EA", initials:"NB" },
  { id:"u4", name:"Varga Réka",     email:"varga.reka@szakiflow.hu",     role:"Irodavezető",    color:"#D97706", initials:"VR" },
];

// ─── STÁTUSZ CONFIG ───────────────────────────────────────────
// Munkalap státuszok – spec 5. pont szerint
export const STATUS_CFG = {
  // ── Kezdeti fázis ────────────────────────────────────────────
  "Létrehozva":           { bg:"#F8FAFC", text:"#64748B", dot:"#94A3B8" },
  "Kiosztva csapatnak":   { bg:"#F5F3FF", text:"#7C3AED", dot:"#7C3AED" },
  // ── Felmérési fázis ──────────────────────────────────────────
  "Felmérés":             { bg:"#F0F9FF", text:"#0EA5E9", dot:"#0EA5E9" },
  "Befejezett Felmérés":  { bg:"#F0FDF4", text:"#16A34A", dot:"#22C55E" },
  // ── Kivitelezési workflow ────────────────────────────────────
  "Kiosztásra vár":       { bg:"#F5F3FF", text:"#7C3AED", dot:"#7C3AED" },
  "Kivitelezésre vár":    { bg:"#EFF6FF", text:"#2563EB", dot:"#2563EB" },
  "Megkezdésre Vár":      { bg:"#F0F9FF", text:"#38BDF8", dot:"#38BDF8" },
  "Folyamatban":          { bg:"#FFF7ED", text:"#EA580C", dot:"#EA580C" },
  "Kivitelezés":          { bg:"#FFF7ED", text:"#EA580C", dot:"#EA580C" },
  "Helyszínen lezárva":   { bg:"#FFFBEB", text:"#D97706", dot:"#D97706" },
  // ── Admin ellenőrzés ─────────────────────────────────────────
  "Ellenőrzés alatt":     { bg:"#FFFBEB", text:"#D97706", dot:"#D97706" },
  "Jóváhagyva":           { bg:"#ECFDF5", text:"#059669", dot:"#059669" },
  // ── Lezárás ──────────────────────────────────────────────────
  "Számlázásra kész":     { bg:"#F0FDF4", text:"#15803D", dot:"#22C55E" },
  "Számlázva":            { bg:"#F0FDF4", text:"#15803D", dot:"#15803D" },
  "Lezárva":              { bg:"#ECFDF5", text:"#059669", dot:"#059669" },
  // ── Egyéb ────────────────────────────────────────────────────
  "Ütemezett":            { bg:"#FFFBEB", text:"#D97706", dot:"#D97706" },
  "Kész":                 { bg:"#ECFDF5", text:"#059669", dot:"#059669" },
  "Befejezett":           { bg:"#ECFDF5", text:"#059669", dot:"#059669" },
  "Meghiúsult":           { bg:"#FEF2F2", text:"#DC2626", dot:"#DC2626" },
};

// Munkalap típusok (spec 4. pont)
export const MUNKALAP_TIPUSOK = [
  "Felmérés",
  "Első kivitelezés",
  "Javítás",
  "Befejezés",
  "Garanciális munka",
  "Hibajavítás",
  "Pótmunkavégzés",
  "Karbantartás",
  "Egyéb",
];

// Munkalap státuszok – spec 5. pont (teljes sorrend)
export const WORKFLOW_STATUSES = [
  "Létrehozva",
  "Kiosztva csapatnak",
  "Folyamatban",
  "Helyszínen lezárva",
  "Ellenőrzés alatt",
  "Jóváhagyva",
  "Számlázásra kész",
  "Lezárva",
  // Extra
  "Felmérés",
  "Befejezett Felmérés",
  "Kiosztásra vár",
  "Kivitelezésre vár",
  "Számlázva",
  "Meghiúsult",
];

export const ALL_STATUSES = ["Összes","Folyamatban","Ütemezett","Kész","Meghiúsult"];

// ─── NAVIGÁCIÓ ────────────────────────────────────────────────
export const NAV_PAGES = [
  { id:"dashboard",   label:"Irányítópult" },
  { id:"munkalapok",  label:"Munkalapok"   },
  { id:"ugyfelek",    label:"Ügyfelek"     },
  { id:"arajanlatok", label:"Árajánlatok"  },
  { id:"szerzodesek", label:"Szerződések"  },
  { id:"csapat",      label:"Csapat"       },
  { id:"naptar",      label:"Naptár"       },
  { id:"beallitasok", label:"Beállítások"  },
];
