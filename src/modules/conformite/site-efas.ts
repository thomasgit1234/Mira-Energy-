// Cabs des autres EFA du site (encadré « Autres EFA du site » de la page). Fonctions PURES : testées dans site-efas.test.ts.
// Le verdict complet (Crelat + Cabs) ne porte que sur la première EFA tant que le sélecteur d'EFA n'existe pas (D18).
import { computeCabs, type CabsResult } from "./cabs";
import type { AltitudeBand, CabsRow } from "./cabs-source";

/** Le fichier Cabs fourni ne couvre qu'une catégorie : à rappeler à côté d'un code absent (D13). */
export const CABS_COVERAGE_NOTE = "Le fichier Cabs ne couvre que la catégorie CAP18 (Restauration - Débit de boissons).";

export type EfaCabsInput = { id: string; surfaceTotal: number; lines: { subCategoryCode: string; surfaceM2: number }[] };
export type EfaCabs = { id: string; surfaceTotal: number; codes: string[]; cabs: CabsResult };

/** Cabs de chaque EFA à partir de ses lignes de surface (codes OPERAT tels quels, sans correspondance). */
export function cabsForEfas(rows: CabsRow[], efas: EfaCabsInput[], zone: string, band: AltitudeBand): EfaCabs[] {
  return efas.map((e) => ({
    id: e.id,
    surfaceTotal: e.surfaceTotal,
    codes: [...new Set(e.lines.map((l) => l.subCategoryCode))],
    cabs: computeCabs(rows, e.lines.map((l) => ({ code: l.subCategoryCode, surfaceM2: l.surfaceM2 })), zone, band),
  }));
}
