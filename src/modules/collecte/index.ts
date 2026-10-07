// API publique du module « collecte ». Les autres modules n'importent QUE depuis ce fichier.
// (repository.ts est réservé au serveur : ne pas l'importer dans un composant client.)
export const MODULE = "collecte" as const;
export { parseKwh, validateManualEntry, isEnergyType, MONTH_LABELS, ENERGY_LABELS } from "./manual";
export type { EntryIssue, ManualEntryInput, ManualEntryResult } from "./manual";
export { loadCollecteContext, loadYear, saveManualEntry, assertEfaOwnedByCurrentUser, CollecteError } from "./repository";
export type { CollecteContext, CollectedYear, MonthState, YearState, SaveReport } from "./repository";
