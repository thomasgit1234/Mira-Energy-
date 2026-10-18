// Parts de la consommation consacrées au chauffage et à la climatisation, par activité et par énergie (D21).
//
// ⚠️ HYPOTHÈSES MIRA ÉNERGIE, À CONFIRMER. C'est le SEUL endroit où ces parts sont écrites : pour les changer,
// on ne modifie que USAGE_SHARES. Pas de champ en base (aucune modification du schéma Prisma).
// Une énergie ou une activité absente de la table n'a PAS de part inventée : sharesFor renvoie null, la
// consommation n'est pas corrigée (corrigée = brute) et l'écran le dit (« part chauffage inconnue, non corrigée »).
import type { EnergyType } from "@/lib/domain";
import type { UsageShares } from "./correction";

/**
 * Énergies de la table. "PROPANE" n'existe pas encore dans ENERGY_TYPES (src/lib/domain.ts) : à y ajouter par une
 * PR dédiée quand la collecte saura l'enregistrer. D'ici là, la part du propane ne sert qu'aux tests.
 */
export type ShareEnergy = EnergyType | "PROPANE";

/** Activité = catégorie OPERAT de l'EFA (référentiel v9.0). */
export const ACTIVITY_LABELS: Record<string, string> = {
  CAP18: "Restauration",
  CAP04: "Bureaux",
};

type Percent = { heating: number; cooling: number };

/** Parts en % (chauffage, climatisation) ; les autres usages = 100 − chauffage − climatisation, non corrigés. */
export const USAGE_SHARES: Record<string, Partial<Record<ShareEnergy, Percent>>> = {
  CAP18: {
    GAS: { heating: 0, cooling: 0 }, // gaz naturel du restaurant : cuisson
    ELECTRICITY: { heating: 25, cooling: 0 },
  },
  CAP04: {
    PROPANE: { heating: 100, cooling: 0 },
    ELECTRICITY: { heating: 25, cooling: 0 },
  },
};

/** Parts (fractions de 1) pour une activité et une énergie, ou null si elles ne sont pas connues. */
export function sharesFor(category: string | null, energyType: string): UsageShares | null {
  if (category === null) return null;
  const p = USAGE_SHARES[category]?.[energyType as ShareEnergy];
  if (!p) return null;
  return { heating: p.heating / 100, cooling: p.cooling / 100, other: (100 - p.heating - p.cooling) / 100 };
}

/** Catégorie OPERAT d'une EFA : celle de toutes ses lignes de surface ; null si aucune ligne ou plusieurs catégories. */
export function efaCategory(lines: { categoryCode: string }[]): string | null {
  const codes = new Set(lines.map((l) => l.categoryCode.trim()).filter(Boolean));
  return codes.size === 1 ? [...codes][0] : null;
}
