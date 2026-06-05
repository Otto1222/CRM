/**
 * roles.js – Szerepkör alapú jogosultság kezelés
 *
 * ROLE_PAGES: mely oldalak elérhetők az adott szerepkörhöz.
 * A sidebar NAV külön szűri, melyeket jelenít meg – a routing
 * megköveteli, hogy a navigálható oldalak itt legyenek.
 */

export const ROLE_PAGES = {
  "Admin": [
    "dashboard",
    // Értékesítés
    "ugyfelek", "arajanlatok", "szerzodesek",
    // Fő modulok
    "projektek", "munkalapok", "naptar", "dokumentumok",
    // Pénzügy
    "szamlak", "karteritesek", "riportok",
    // Beállítások
    "csapat", "munkalap_sablonok", "beallitasok",
  ],
  "Projektmenedzser": [
    "dashboard",
    "ugyfelek", "arajanlatok", "szerzodesek",
    "projektek", "munkalapok", "naptar", "dokumentumok",
    "szamlak", "karteritesek", "riportok",
    "csapat", "munkalap_sablonok", "beallitasok",
  ],
  "Iroda/Könyvelés": [
    "dashboard",
    "ugyfelek",
    "projektek", "munkalapok", "naptar", "dokumentumok",
    "szamlak", "karteritesek", "riportok",
  ],
  "Telepítő": [
    "munkalapok",
  ],
};

export function canSeePrice(role) {
  return ["Admin", "Projektmenedzser", "Iroda/Könyvelés"].includes(role);
}
export function canCreateMunkalap(role) {
  return ["Admin", "Projektmenedzser", "Iroda/Könyvelés"].includes(role);
}
export function canEditMunkalap(role) {
  return ["Admin", "Projektmenedzser", "Iroda/Könyvelés"].includes(role);
}
export function getHomePage(role) {
  return role === "Telepítő" ? "munkalapok" : "dashboard";
}
export function getAllowedPages(role) {
  return ROLE_PAGES[role] || ["munkalapok"];
}

export function canSeeFovallalkozo(role) {
  return role !== "Telepítő";
}
