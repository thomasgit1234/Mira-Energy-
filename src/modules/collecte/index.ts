// API publique du module « collecte ». Les autres modules n'importent QUE depuis ce fichier.
// (repository.ts est réservé au serveur : ne pas l'importer dans un composant client.)
export const MODULE = "collecte" as const;
export { parseKwh, validateManualEntry, isEnergyType, MONTH_LABELS, ENERGY_LABELS, SOURCE_LABELS } from "./manual";
export type { EntryIssue, ManualEntryInput, ManualEntryResult } from "./manual";
export { parseConsumptionCsv, validateImportRows, groupForSave, parseMonth, parseEnergy, decodeCsvBytes, toImportSaveInputs, summarizeImport, MAX_IMPORT_ROWS } from "./csv-import";
export type { RawRow, ParsedFile, RowIssue, RowValue, CheckedRow, ImportBatch, ImportCheck, BatchResult, ImportSummary } from "./csv-import";
export { buildHistoryRequest, checkMeterId, normalizeMeterId, NETWORKS, PROPANE_NOTE, DEFAULT_RANGE, MIRA_DOMAINS } from "./history-request";
export type { NetworkEnergy, HistoryRequestInput, HistoryRequest, RequestIssue } from "./history-request";
export { loadCollecteContext, loadYear, saveManualEntry, importRows, assertEfaOwnedByCurrentUser, CollecteError } from "./repository";
export type { CollecteContext, CollectedYear, MonthState, YearState, SaveReport, ImportResult } from "./repository";
