// API publique du module « batiment ». Les autres modules n'importent QUE depuis ce fichier.
// (operat-activites.ts, zone-climatique.ts et site.ts lisent le disque ou la base : réservés au serveur, ne pas les importer dans un composant client.)
export const MODULE = "batiment" as const;
export { OPERAT_DIR, operatVersionFromFileName, parseOperatActivities, readOperatActivities } from "./operat-activites";
export type { OperatActivities, OperatAjustements, OperatCategory, OperatIndicateur, OperatSubCategory } from "./operat-activites";
export { DEPARTMENT_ZONES_FILE, parseDepartmentZones, readDepartmentZones, departmentFromPostcode, climateZoneForPostcode } from "./zone-climatique";
export type { DepartmentZone, ParsedDepartmentZones, ZoneErrorCode, ZoneError, ZoneResult } from "./zone-climatique";
export { SITE_ALTITUDE_BAND, SITE_ALTITUDE_NOTE, BatimentError, loadUserSite } from "./site";
export type { SiteEfa, UserSite } from "./site";
export { EFA_COOKIE, efaLabel, efaParam, pickEfaId, safeBackPath } from "./efa-choice";
export { resolveUserEfaId, userEfaIds } from "./efa-selection";
// Fiche bâtiment (1.1) et zone climatique (1.2).
export { RNB_API, RNB_SITE, RNB_STATUS_LABELS, normalizeRnbId, checkRnbId, formatRnbId, parseRnbBuilding, parseRnbAddressSearch, fetchRnbBuilding, searchRnbByAddress } from "./rnb-source";
export type { RnbAddress, RnbBuilding, RnbError, RnbErrorCode, RnbLookup, RnbSearch } from "./rnb-source";
export { validateBuildingInput, parseSurface, stationDepartment, zoneForPostcode } from "./building-form";
export type { BuildingInput, BuildingData, BuildingField, BuildingIssue, BuildingCheck, BuildingContext } from "./building-form";
export { loadBuildingSheet, saveBuilding, BuildingSaveError } from "./building";
export type { BuildingSheet } from "./building";
