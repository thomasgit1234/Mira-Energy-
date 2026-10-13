// Tâches 5.1 à 5.3 — comparateur d'années et année de référence.
// Fonctions PURES (aucun accès base) : testées dans reference.test.ts.
//
// Règles du cadrage Mira (9 octobre) :
// - l'année de référence est une année PLEINE de 12 mois, entre 2010 et 2019 inclus ; jamais une moyenne ;
// - 2020 et 2021 se déclarent sur OPERAT mais sont exclues comme référence et du suivi des objectifs ;
// - comparaison sur consommations BRUTES (kWh d'énergie finale) ; le kWh/DJU est un indicateur indicatif à côté.
import type { YearIndicator, YearStatus } from "@/modules/climat";

export const REFERENCE_PERIOD = { from: 2010, to: 2019 } as const;
export const EXCLUDED_YEARS: readonly number[] = [2020, 2021];

/** Bandeau de démonstration : supprimer cette constante (ou la mettre à null) quand les données seront réelles. */
export const DEMO_BANNER: string | null = "Données de démonstration fictives.";
export const SUGGESTION_HELP = "L'année où vous avez le plus consommé est souvent la plus favorable.";
export const RAW_NOTICE = "Réduction brute, avant la correction climatique que fait OPERAT.";
export const SUGGESTED_LABEL = "Année la plus consommatrice (suggérée)";

export const INELIGIBLE_REASONS = {
  EXCLUDED: "2020 et 2021 : exclues du suivi des objectifs",
  OUT_OF_PERIOD: "hors période de référence 2010-2019",
  NO_CONSUMPTION: "pas de consommation",
  INCOMPLETE: "année incomplète",
  NO_DJU: "DJU manquant",
} as const;

/** Une année peut-elle servir de référence ? (2010 ≤ année ≤ 2019) */
export function isReferenceYearEligible(year: number): boolean {
  return Number.isInteger(year) && year >= REFERENCE_PERIOD.from && year <= REFERENCE_PERIOD.to;
}

type RowLike = Pick<YearIndicator, "year" | "status">;

/**
 * Ligne éligible = année de la période ET statut « OK » de buildYearIndicators (module climat), c'est-à-dire
 * année complète (chaque énergie présente a ses 12 mois). Le critère n'est pas recodé ici.
 * Hypothèse : une année complète mais sans DJU (statut DJU_MANQUANT) n'est pas éligible.
 */
export function isEligibleRow(row: RowLike): boolean {
  return isReferenceYearEligible(row.year) && row.status === "OK";
}

/** Raison pour laquelle l'année ne peut pas servir de référence, ou null si elle le peut. */
export function ineligibleReason(row: RowLike): string | null {
  if (EXCLUDED_YEARS.includes(row.year)) return INELIGIBLE_REASONS.EXCLUDED;
  if (!isReferenceYearEligible(row.year)) return INELIGIBLE_REASONS.OUT_OF_PERIOD;
  if (row.status === "PAS_DE_CONSOMMATION") return INELIGIBLE_REASONS.NO_CONSUMPTION;
  if (row.status === "ANNEE_INCOMPLETE") return INELIGIBLE_REASONS.INCOMPLETE;
  if (row.status === "DJU_MANQUANT") return INELIGIBLE_REASONS.NO_DJU;
  return null;
}

export type ComparatorRow = {
  year: number;
  consumptionKwh: number | null;
  kwhPerDju: number | null;
  status: YearStatus;
  eligible: boolean;
  ineligibleReason: string | null;
  isSuggested: boolean;
};

/**
 * Lignes du comparateur : toutes les années 2010 à 2019 (une année absente des indicateurs est complétée en
 * « pas de consommation »), puis les années postérieures présentes, en lecture seule et non éligibles.
 */
export function buildComparatorRows(indicators: YearIndicator[], suggestedYear: number | null = null): ComparatorRow[] {
  const byYear = new Map(indicators.map((r) => [r.year, r]));
  const later = indicators.filter((r) => r.year > REFERENCE_PERIOD.to).map((r) => r.year);
  const years = [
    ...Array.from({ length: REFERENCE_PERIOD.to - REFERENCE_PERIOD.from + 1 }, (_, i) => REFERENCE_PERIOD.from + i),
    ...[...new Set(later)].sort((a, b) => a - b),
  ];
  return years.map((year) => {
    const r = byYear.get(year);
    const row: RowLike = { year, status: r?.status ?? "PAS_DE_CONSOMMATION" };
    const reason = ineligibleReason(row);
    return {
      year,
      consumptionKwh: r?.consumptionKwh ?? null,
      kwhPerDju: r?.kwhPerDju ?? null,
      status: row.status,
      eligible: reason === null,
      ineligibleReason: reason,
      isSuggested: suggestedYear !== null && year === suggestedYear && reason === null,
    };
  });
}

const kwhFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const ratioFormat = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** « 266 500 » (kWh arrondis à l'unité) ; « — » si absent. */
export function formatKwh(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "—" : kwhFormat.format(value);
}

/** « 19,19 » ; « — » si absent. */
export function formatRatio(value: number | null): string {
  return value === null || !Number.isFinite(value) ? "—" : ratioFormat.format(value);
}
