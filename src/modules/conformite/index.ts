// API publique du module « conformite ». Les autres modules n'importent QUE depuis ce fichier.
// (repository.ts et cabs-source.ts sont réservés au serveur : ne pas les importer dans un composant client.)
export const MODULE = "conformite" as const;
export { MILESTONES, CRELAT_REDUCTION, computeCrelat } from "./crelat";
export type { Milestone, CrelatResult } from "./crelat";
export { CABS_DECREE, CABS_SOURCE, CABS_FILE, ALTITUDE_BANDS, parseCabsJson, readCabsFile } from "./cabs-source";
export type { AltitudeBand, CabsRow, ParsedCabs } from "./cabs-source";
export { cabsThreshold, computeCabs } from "./cabs";
export type { CabsErrorCode, CabsError, CabsThreshold, CabsLine, CabsLineInput, CabsResult } from "./cabs";
export { evaluateVerdict, pickCurrentYear, STATUS_LABELS, WAY_LABELS } from "./verdict";
export type { Verdict, MilestoneVerdict, MethodOutcome, VerdictStatus, FavorableWay } from "./verdict";
export { loadConformite, ConformiteError } from "./repository";
export type { ConformiteData, SiteContext } from "./repository";
export { CABS_COVERAGE_NOTE, cabsForEfas } from "./site-efas";
export type { EfaCabsInput, EfaCabs } from "./site-efas";
