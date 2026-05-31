import { getProjekt } from "../modules/projektek/projekt.service.js";
import { getWorkordersByProjectId } from "./workorder.service.js";

export function getProjectReportData(projectId) {
  const projekt = getProjekt(projectId);

  if (!projekt) {
    throw new Error("Projekt nem található");
  }

  const munkalapok = getWorkordersByProjectId(projectId);

  const osszesMunkalap = munkalapok.length;

  const lezartMunkalap = munkalapok.filter(m =>
    ["Lezárt", "Befejezve", "Elkészült"].includes(m.status)
  ).length;

  const aktivMunkalap = munkalapok.filter(m =>
    !["Lezárt", "Befejezve", "Elkészült"].includes(m.status)
  ).length;

  const penzugy = projekt.penzugy || {};

  const elfogadottAjanlat = Number(projekt.elfogadottAjanlat || 0);

  const becsultKoltseg =
    Number(penzugy.emelőgepKoltseg || 0) +
    Number(penzugy.egyebKoltseg || 0) +
    Number(penzugy.keziCsapatBer || 0) +
    Number(penzugy.keziUtikoltség || 0) +
    Number(penzugy.keziAnyagkoltség || 0) +
    Number(penzugy.keziKartérités || 0);

  const becsultHaszon = elfogadottAjanlat - becsultKoltseg;

  const haszonSzazalek =
    elfogadottAjanlat > 0
      ? Math.round((becsultHaszon / elfogadottAjanlat) * 100)
      : 0;

  return {
    projekt,
    munkalapok,
    osszesites: {
      osszesMunkalap,
      aktivMunkalap,
      lezartMunkalap,
      elfogadottAjanlat,
      becsultKoltseg,
      becsultHaszon,
      haszonSzazalek,
    },
  };
}