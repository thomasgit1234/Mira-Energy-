// Tâche 6.1 — méthode relative (Crelat). Fonctions PURES : testées dans crelat.test.ts.
//
// Décret tertiaire : Crelat(jalon) = (1 − réduction) × Créf, où Créf = consommation BRUTE totale (kWh d'énergie finale)
// de l'année de référence choisie (EFA.referenceYear, tâche 5). Jamais de moyenne. Aucun arrondi ici : il se fait à l'affichage.

export const MILESTONES = [2030, 2040, 2050] as const;
export type Milestone = (typeof MILESTONES)[number];

/** Réduction à atteindre par rapport à l'année de référence. */
export const CRELAT_REDUCTION: Record<Milestone, number> = { 2030: 0.4, 2040: 0.5, 2050: 0.6 };

export type CrelatResult =
  | { ok: true; crefKwh: number; objectives: Record<Milestone, number> }
  | { ok: false; reason: string };

export function computeCrelat(crefKwh: number | null | undefined): CrelatResult {
  if (crefKwh === null || crefKwh === undefined) return { ok: false, reason: "Pas de consommation pour l'année de référence." };
  if (typeof crefKwh !== "number" || !Number.isFinite(crefKwh)) return { ok: false, reason: "Consommation de référence illisible." };
  if (crefKwh <= 0) return { ok: false, reason: "La consommation de référence doit être strictement positive." };
  const objectives = Object.fromEntries(MILESTONES.map((m) => [m, (1 - CRELAT_REDUCTION[m]) * crefKwh])) as Record<Milestone, number>;
  return { ok: true, crefKwh, objectives };
}
