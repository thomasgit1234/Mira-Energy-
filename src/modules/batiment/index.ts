// API publique du module « batiment ». Les autres modules n'importent QUE depuis ce fichier.
// (operat-activites.ts lit le disque : réservé au serveur, ne pas l'importer dans un composant client.)
export const MODULE = "batiment" as const;
export { OPERAT_DIR, operatVersionFromFileName, parseOperatActivities, readOperatActivities } from "./operat-activites";
export type { OperatActivities, OperatAjustements, OperatCategory, OperatIndicateur, OperatSubCategory } from "./operat-activites";
