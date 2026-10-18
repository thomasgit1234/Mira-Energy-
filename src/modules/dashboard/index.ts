// API publique du module « dashboard ». Les autres modules n'importent QUE depuis ce fichier.
// (repository.ts lit la base : réservé au serveur, ne pas l'importer dans un composant client.)
export const MODULE = "dashboard" as const;
export {
  buildSynthesis, classifyError, sourceEmpty, EMPTY_PRIORITY, STATE_LABELS, DASHBOARD_BANNER, DATA_ORIGIN,
} from "./synthesis";
export type {
  Synthesis, DashboardInputs, Source, SourceError, SourceErrorKind, EmptyCode, EmptyState, Action, Section,
  SiteSection, VerdictSection, ObjectivesSection, FollowUpSection, RetainedMethod, Step, StepId, StepState,
} from "./synthesis";
export { fmtKwh, fmtKwhYear, fmtM2, fmtKwhPerM2 } from "./format";
export { loadDashboard } from "./repository";
