// API publique du module « batiment ». Les autres modules n'importent QUE depuis ce fichier.
// (operat-activites.ts, zone-climatique.ts et site.ts lisent le disque ou la base : réservés au serveur, ne pas les importer dans un composant client.)
export const MODULE = "batiment" as const;
export { OPERAT_DIR, operatVersionFromFileName, parseOperatActivities, readOperatActivities } from "./operat-activites";
export type { OperatActivities, OperatAjustements, OperatCategory, OperatIndicateur, OperatSubCategory } from "./operat-activites";
export { DEPARTMENT_ZONES_FILE, parseDepartmentZones, readDepartmentZones, departmentFromPostcode, climateZoneForPostcode } from "./zone-climatique";
export type { DepartmentZone, ParsedDepartmentZones, ZoneErrorCode, ZoneError, ZoneResult } from "./zone-climatique";
export { SITE_ALTITUDE_BAND, SITE_ALTITUDE_NOTE, BatimentError, loadUserSite } from "./site";
export type { SiteEfa, UserSite } from "./site";
