// Tâche 6.2 — méthode absolue (Cabs). Fonctions PURES : testées dans cabs.test.ts.
//
// Seuil Cabs d'une sous-catégorie (kWh/m²/an) = composante CVC (zone climatique ET tranche d'altitude) + USE étalon,
// indicateurs d'usage à leur valeur étalon (aucune modulation). Source : arrêté du 1er août 2025 « valeurs absolues VI ».
// Objectif Cabs de l'EFA (kWh/an) = Σ sur les lignes de surface de [seuil de la sous-catégorie × surface de la ligne].
import type { AltitudeBand, CabsRow } from "./cabs-source";

export type CabsErrorCode = "SOUS_CATEGORIE_INCONNUE" | "VALEUR_ABSENTE" | "SURFACE_MANQUANTE";
export type CabsError = { ok: false; code: CabsErrorCode; message: string };

export type CabsThreshold = { ok: true; code: string; label: string; cvc: number; use: number; total: number };

export function cabsThreshold(rows: CabsRow[], subCategoryCode: string, zone: string, altitudeBand: AltitudeBand): CabsThreshold | CabsError {
  const row = rows.find((r) => r.code === subCategoryCode);
  if (!row) {
    return { ok: false, code: "SOUS_CATEGORIE_INCONNUE", message: `Sous-catégorie ${subCategoryCode} absente du référentiel Cabs.` };
  }
  const cvc = row.cvc[altitudeBand]?.[zone];
  if (cvc === undefined) {
    return {
      ok: false,
      code: "VALEUR_ABSENTE",
      message: `Pas de valeur Cabs définie pour ${subCategoryCode} (${row.label}) en zone ${zone}, altitude ${altitudeBand}.`,
    };
  }
  return { ok: true, code: row.code, label: row.label, cvc, use: row.use, total: cvc + row.use };
}

/** Ligne de surface de l'EFA, déjà traduite en code de sous-catégorie OPERAT. */
export type CabsLineInput = { code: string; surfaceM2: number };
export type CabsLine = CabsLineInput & { label: string; cvc: number; use: number; threshold: number; objectiveKwh: number };

export type CabsResult = { ok: true; objectiveKwh: number; surfaceTotal: number; perLine: CabsLine[] } | CabsError;

export function computeCabs(rows: CabsRow[], lines: CabsLineInput[], zone: string, altitudeBand: AltitudeBand): CabsResult {
  if (lines.length === 0) {
    return { ok: false, code: "SURFACE_MANQUANTE", message: "Aucune ligne de surface pour cette EFA : renseignez la décomposition des surfaces." };
  }
  const perLine: CabsLine[] = [];
  for (const line of lines) {
    if (!Number.isFinite(line.surfaceM2) || line.surfaceM2 <= 0) {
      return { ok: false, code: "SURFACE_MANQUANTE", message: `Surface invalide pour la ligne ${line.code}.` };
    }
    const t = cabsThreshold(rows, line.code, zone, altitudeBand);
    if (!t.ok) return t;
    perLine.push({ ...line, label: t.label, cvc: t.cvc, use: t.use, threshold: t.total, objectiveKwh: t.total * line.surfaceM2 });
  }
  return {
    ok: true,
    objectiveKwh: perLine.reduce((s, l) => s + l.objectiveKwh, 0),
    surfaceTotal: perLine.reduce((s, l) => s + l.surfaceM2, 0),
    perLine,
  };
}
