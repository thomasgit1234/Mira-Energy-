// API publique du module « climat ». Les autres modules n'importent QUE depuis ce fichier.
// (repository.ts et dju-source.ts sont réservés au serveur : ne pas les importer dans un composant client.)
export const MODULE = "climat" as const;
export { parseDjuCsv, readDjuFile } from "./dju-source";
export type { DjuEntry, ParsedDju } from "./dju-source";
export { normalizeZone, findDju, isValidDju, computeKwhPerDju, buildYearIndicators, STATUS_LABELS, YEAR_STATUSES } from "./indicators";
export type { YearIndicator, YearStatus, ConsumptionInput, BuildInput } from "./indicators";
export { STATION_LABELS, stationLabel } from "./stations";
export { loadDjuTable, loadClimatIndicators, ClimatError } from "./repository";
export type { ClimatIndicators } from "./repository";
