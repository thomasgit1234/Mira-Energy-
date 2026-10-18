// API publique du module « climat ». Les autres modules n'importent QUE depuis ce fichier.
// (repository.ts et coefficients-source.ts sont réservés au serveur : ne pas les importer dans un composant client.)
export const MODULE = "climat" as const;
export { CLIMATE_STATION, CLIMATE_FILE, parseClimateCsv, readClimateFile } from "./coefficients-source";
export type { ClimateYear, ParsedClimate } from "./coefficients-source";
export {
  CLIMATE_REFERENCE_PERIOD, COEFFICIENT_BOUNDS, referenceDegreeDays, boundedCoefficient, yearCoefficients, validateShares,
  correctKwh, correctYear, kwhPerM2,
} from "./correction";
export type {
  ReferenceDegreeDays, Coefficient, YearCoefficients, UsageShares, CorrectionStatus, CorrectedMonth, CorrectedEnergy, YearCorrection,
} from "./correction";
export { USAGE_SHARES, ACTIVITY_LABELS, sharesFor, efaCategory } from "./usage-shares";
export type { ShareEnergy } from "./usage-shares";
export { buildYearIndicators, STATUS_LABELS, CORRECTION_LABELS, YEAR_STATUSES } from "./indicators";
export type { YearIndicator, YearStatus, ConsumptionInput, BuildInput } from "./indicators";
export { loadClimatIndicators, loadClimateRows, ClimatError } from "./repository";
export type { ClimatIndicators } from "./repository";
