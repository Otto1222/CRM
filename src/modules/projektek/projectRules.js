/**
 * projectRules.js
 * Thin wrapper – minden üzleti szabály a workflowRules.js-ben van.
 * Ez a fájl backward compat aliasokat biztosít a meglévő importoknak.
 */

export {
  WORKORDER_STATUSES_VISIBLE_TO_INSTALLER,
  INSTALLER_SETTABLE_STATUSES,
  PROJECT_CLOSE_ROLES,
  isInstallerVisibleWorkorder,
  isWorkorderAssignedToUser,
  canInstallerSetStatus,
  canCloseProject,
  getProjektTipus,
  validateProjektForrás,
  validateWorkorderBeforeSave,
  munkalapIndoklasKotelezo,
  getProjectStatusFromWorkorder,
  migrateProjektStatus,
  migrateProjektForras,
  migrateProjektForrasFromRekord,
  migrateMunkalapStatus,
} from "../../lib/workflowRules.js";

// ─── Projekt validáció – régi API alias ──────────────────────────────────

export { validateProjektForrás as validateProjectBeforeSave } from "../../lib/workflowRules.js";

// ─── Telepítőnek látható projekt státuszok ────────────────────────────────

export const PROJECT_STATUSES_VISIBLE_TO_INSTALLER = [
  "Kivitelezésre vár",
  "Kivitelezés alatt",
  "Vissza kell menni",
];

export function isInstallerVisibleProjectStatus(status) {
  return PROJECT_STATUSES_VISIBLE_TO_INSTALLER.includes(status);
}

// ─── Munkalap kötelező mezők ─────────────────────────────────────────────

export function getRequiredProjectFields() {
  return [{ key: "nev", label: "Projekt neve" }];
}

// ─── Kezdeti munkalap projekt státusz alapján ─────────────────────────────

export function getInitialWorkorderTypeByProjectStatus(status) {
  if (status === "Kivitelezésre vár") return "Kivitelezés";
  return null;
}

export function shouldCreateInitialWorkorder(status) {
  return !!getInitialWorkorderTypeByProjectStatus(status);
}

export function isPastDate(dateValue) {
  if (!dateValue) return false;
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth() + 1).padStart(2, "0");
  const dd    = String(today.getDate()).padStart(2, "0");
  return String(dateValue).slice(0, 10) < `${yyyy}-${mm}-${dd}`;
}
