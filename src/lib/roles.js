/**
 * roles.js – Szerepkör alapú jogosultság kezelés
 */

export const ROLE_PAGES = {
  "Admin":            ["dashboard","projektek","munkakiosztas","ugyfelek","arajanlatok","szerzodesek","naptar","beallitasok"],
  "Projektmenedzser": ["dashboard","projektek","munkakiosztas","ugyfelek","arajanlatok","szerzodesek","naptar","beallitasok"],
  "Iroda/Könyvelés":  ["dashboard","projektek","ugyfelek","arajanlatok","szerzodesek","naptar","beallitasok"],
  "Telepítő":         ["munkalapok"],
};

export function canSeePrice(role) {
  return ["Admin","Projektmenedzser","Iroda/Könyvelés"].includes(role);
}
export function canCreateMunkalap(role) {
  return ["Admin","Projektmenedzser","Iroda/Könyvelés"].includes(role);
}
export function canEditMunkalap(role) {
  return ["Admin","Projektmenedzser","Iroda/Könyvelés"].includes(role);
}
export function getHomePage(role) {
  return role==="Telepítő" ? "munkalapok" : "dashboard";
}
export function getAllowedPages(role) {
  return ROLE_PAGES[role] || ["munkalapok"];
}
