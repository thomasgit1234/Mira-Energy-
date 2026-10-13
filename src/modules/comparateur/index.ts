// API publique du module « comparateur ». Les autres modules n'importent QUE depuis ce fichier.
// (repository.ts est réservé au serveur : ne pas l'importer dans un composant client.)
export const MODULE = "comparateur" as const;
export {
  REFERENCE_PERIOD, EXCLUDED_YEARS, DEMO_BANNER, SUGGESTION_HELP, RAW_NOTICE, SUGGESTED_LABEL, INELIGIBLE_REASONS,
  isReferenceYearEligible, isEligibleRow, ineligibleReason, buildComparatorRows, suggestReferenceYear, validateReferenceChoice,
  formatKwh, formatRatio,
} from "./reference";
export type { ComparatorRow, ReferenceChoiceCode, ReferenceChoiceResult } from "./reference";
export { loadComparator, chooseReferenceYear, ComparateurError } from "./repository";
export type { ComparatorData, Suggestion } from "./repository";
