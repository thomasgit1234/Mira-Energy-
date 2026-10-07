// API publique du module « surfaces ». Les autres modules n'importent QUE depuis ce fichier.
// (repository.ts est réservé au serveur : ne pas l'importer dans un composant client.)
export const MODULE = "surfaces" as const;
export { validateSurfaceLines, roundM2 } from "./validation";
export type {
  Referential,
  ReferentialOption,
  SubCategoryOption,
  SurfaceLineInput,
  ValidationIssue,
  ValidationResult,
} from "./validation";
export { loadSurfacesContext, saveSurfaceLines, SurfacesError } from "./repository";
export type { SurfacesContext } from "./repository";
