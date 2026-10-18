// Indicateurs climatiques par année : consommation brute, consommation corrigée du climat (par mois et par an)
// et kWh corrigés/m². Fonctions PURES (aucun accès base) : testées dans indicators.test.ts.
//
// Hypothèses (détaillées dans README.md) :
// - consommation annuelle = somme de tous les mois et de toutes les énergies de l'EFA pour l'année ;
// - année complète = chaque énergie présente a ses 12 mois (critère repris par le comparateur et la conformité) ;
// - mois validés ou non pris tels quels ;
// - la correction est séparée de la complétude : une année non corrigeable garde sa consommation brute et son statut.
import type { ClimateYear } from "./coefficients-source";
import { correctYear, kwhPerM2, referenceDegreeDays, yearCoefficients, type CorrectedMonth, type CorrectionStatus } from "./correction";

/** Complétude de l'année (sur la consommation BRUTE). « OK » = année complète, utilisable par le comparateur et la conformité. */
export const YEAR_STATUSES = ["OK", "ANNEE_INCOMPLETE", "PAS_DE_CONSOMMATION"] as const;
export type YearStatus = (typeof YEAR_STATUSES)[number];

export const STATUS_LABELS: Record<YearStatus, string> = {
  OK: "Année complète",
  ANNEE_INCOMPLETE: "Année incomplète (non comparable)",
  PAS_DE_CONSOMMATION: "Pas de consommation",
};

export const CORRECTION_LABELS: Record<CorrectionStatus, string> = {
  CORRIGEE: "Corrigée",
  NON_CORRIGEABLE: "Non corrigeable",
};

export type ConsumptionInput = { year: number; energyType: string; months: { month: number; kwh: number }[] };

export type YearIndicator = {
  year: number;
  /** Consommation brute : somme de tous les mois et énergies (kWh). */
  consumptionKwh: number | null;
  /** Consommation corrigée du climat (kWh) ; null si l'année n'est pas corrigeable. */
  correctedKwh: number | null;
  /** kWh corrigés / m² (surface de l'EFA) ; null si non corrigeable ou surface inconnue. */
  correctedKwhPerM2: number | null;
  /** Nombre de mois distincts renseignés (toutes énergies confondues). */
  monthCount: number;
  status: YearStatus;
  correction: CorrectionStatus;
  /** Raison, en français, quand l'année n'est pas corrigeable. */
  correctionProblem: string | null;
  /** Énergies sans part chauffage connue : comptées sans correction (corrigée = brute). */
  unknownShares: string[];
  /** Détail mensuel : brut et corrigé. */
  months: CorrectedMonth[];
};

export type BuildInput = {
  /** Degrés-jours de la station, ou null si le fichier n'est pas utilisable. */
  climateRows: ClimateYear[] | null;
  /** Raison affichée pour toutes les années quand la correction est impossible (fichier absent, autre station…). */
  unavailableReason?: string;
  consumptions: ConsumptionInput[];
  /** Catégorie OPERAT de l'EFA (CAP18, CAP04…), ou null. */
  category: string | null;
  /** Surface de l'EFA (m²), ou null. */
  surfaceM2: number | null;
};

/** Indicateurs par année avec consommation, triés. */
export function buildYearIndicators({ climateRows, unavailableReason, consumptions, category, surfaceM2 }: BuildInput): YearIndicator[] {
  const reference = climateRows ? referenceDegreeDays(climateRows) : null;
  const reason = climateRows === null
    ? unavailableReason ?? "Fichier climatique indisponible : correction impossible."
    : reference === null
      ? "Le fichier climatique ne couvre pas toute la période de référence 2001-2020 : correction impossible."
      : unavailableReason;
  const byYear = new Map<number, ConsumptionInput[]>();
  for (const c of consumptions) {
    if (c.months.length === 0) continue;
    byYear.set(c.year, [...(byYear.get(c.year) ?? []), c]);
  }

  return [...byYear.keys()].sort((a, b) => a - b).map((year) => {
    const entries = byYear.get(year)!;
    const usable = climateRows !== null && reference !== null && !unavailableReason;
    const coefficients = usable ? yearCoefficients(climateRows, reference, year) : null;
    const result = correctYear({
      year,
      energies: entries.map((c) => ({ energyType: c.energyType, months: c.months })),
      category,
      coefficients,
      unavailableReason: usable ? undefined : reason,
    });
    const complete = entries.every((c) => new Set(c.months.map((m) => m.month)).size === 12);
    return {
      year,
      consumptionKwh: result.rawKwh,
      correctedKwh: result.correctedKwh,
      correctedKwhPerM2: kwhPerM2(result.correctedKwh, surfaceM2),
      monthCount: new Set(entries.flatMap((c) => c.months.map((m) => m.month))).size,
      status: complete ? ("OK" as const) : ("ANNEE_INCOMPLETE" as const),
      correction: result.status,
      correctionProblem: result.problem,
      unknownShares: result.unknownShares,
      months: result.months,
    };
  });
}
