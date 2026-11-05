// Tâches 7.2 (frise de trajectoire) et 7.3 (comparatif N-2 / N-1 / N). Fonctions PURES : testées dans trajectory.test.ts.
//
// Aucun calcul réglementaire ici : les objectifs Crelat / Cabs, la voie la plus favorable et le statut de chaque jalon
// viennent du verdict du module conformité (evaluateVerdict) ; la complétude et la correction climatique de chaque année
// viennent du module climat. Ce fichier ne fait que les ranger sur une frise et calculer des écarts (en kWh et en %).
//
// Règles reprises des autres modules :
// - seules les années complètes (statut « OK ») sont comparables ;
// - 2020 et 2021 sont affichées (déclarées sur OPERAT) mais exclues du suivi ;
// - la conformité se juge sur la consommation BRUTE ; la corrigée est donnée pour information (évolution hors climat).
import { EXCLUDED_YEARS } from "@/modules/comparateur";
import type { YearStatus } from "@/modules/climat";
import { MILESTONES, type FavorableWay, type MethodOutcome, type Milestone, type VerdictStatus } from "@/modules/conformite";

/** Ligne d'année lue dans le module climat (forme minimale). */
export type TrajectoryRow = {
  year: number;
  consumptionKwh: number | null;
  correctedKwh: number | null;
  correctedKwhPerM2: number | null;
  status: YearStatus;
};

/** Objectifs lus dans le module conformité (forme minimale) ; null si la conformité n'a pas pu être chargée. */
export type TrajectoryObjectives = {
  reference: { year: number | null; crefKwh: number | null };
  verdict: { milestones: { milestone: Milestone; crelat: MethodOutcome; cabs: MethodOutcome; favorable: FavorableWay; status: VerdictStatus }[] };
};

// ---------------------------------------------------------------------------------------------------------------
// 7.2 — frise.

/**
 * Rôle d'une année sur la frise. REFERENCE = année de référence choisie ; SUIVIE = année suivie (verdict) ;
 * EXCLUE = 2020 ou 2021 ; INCOMPLETE = moins de 12 mois pour une énergie ; AUTRE = année complète sans rôle particulier.
 */
export type YearRole = "REFERENCE" | "SUIVIE" | "EXCLUE" | "INCOMPLETE" | "AUTRE";

export type TimelineYear = {
  year: number;
  rawKwh: number;
  correctedKwh: number | null;
  role: YearRole;
  /** Années complètes postérieures à la référence (hors 2020-2021) : sous / au-dessus de l'objectif 2030 retenu. */
  vsTarget2030: "SOUS" | "AU_DESSUS" | null;
};

export type TimelineMilestone = {
  year: Milestone;
  crelatKwh: number | null;
  cabsKwh: number | null;
  /** Objectif de la voie la plus favorable (celui qui autorise la consommation la plus haute) ; null si aucune méthode. */
  targetKwh: number | null;
  favorable: FavorableWay;
  /** Statut du jalon avec la consommation suivie (verdict du module conformité) ; null si la conformité est indisponible. */
  status: VerdictStatus | null;
  /** Années restantes avant le jalon (0 si l'année est atteinte). */
  yearsLeft: number;
};

export type Timeline = {
  years: TimelineYear[];
  referenceYear: number | null;
  currentYear: number | null;
  milestones: TimelineMilestone[];
  /** Première et dernière année de l'axe (la dernière est toujours 2050). */
  axis: { from: number; to: number };
  /** Raison pour laquelle les objectifs manquent sur la frise, sinon null. */
  objectivesNote: string | null;
};

const objectiveOf = (o: MethodOutcome): number | null => (o.calculable ? o.objectiveKwh : null);

function targetOf(m: TrajectoryObjectives["verdict"]["milestones"][number]): number | null {
  if (m.favorable === "CABS") return objectiveOf(m.cabs);
  if (m.favorable === "CRELAT" || m.favorable === "EGALITE") return objectiveOf(m.crelat);
  return null;
}

/**
 * Frise de l'EFA : consommations annuelles (brute et corrigée) depuis la première année renseignée, puis les jalons
 * 2030 / 2040 / 2050 avec leurs objectifs. `currentYear` = année suivie (pickCurrentYear), ou null.
 */
export function buildTimeline(
  rows: TrajectoryRow[],
  objectives: TrajectoryObjectives | null,
  currentYear: number | null,
  objectivesProblem: string | null,
  now = new Date(),
): Timeline {
  const referenceYear = objectives?.reference.year ?? null;
  const verdictMilestones = objectives?.verdict.milestones ?? [];
  const milestones: TimelineMilestone[] = MILESTONES.map((year) => {
    const m = verdictMilestones.find((v) => v.milestone === year);
    return {
      year,
      crelatKwh: m ? objectiveOf(m.crelat) : null,
      cabsKwh: m ? objectiveOf(m.cabs) : null,
      targetKwh: m ? targetOf(m) : null,
      favorable: m?.favorable ?? null,
      status: m?.status ?? null,
      yearsLeft: Math.max(0, year - now.getFullYear()),
    };
  });
  const target2030 = milestones[0]?.targetKwh ?? null;
  // Années « de suivi » : après la référence (ou après la période de référence 2010-2019 si elle n'est pas choisie).
  const followFrom = (referenceYear ?? 2019) + 1;

  const years: TimelineYear[] = rows
    .filter((r): r is TrajectoryRow & { consumptionKwh: number } => r.consumptionKwh !== null)
    .sort((a, b) => a.year - b.year)
    .map((r) => {
      const complete = r.status === "OK";
      const excluded = EXCLUDED_YEARS.includes(r.year);
      const role: YearRole = excluded ? "EXCLUE"
        : !complete ? "INCOMPLETE"
        : r.year === referenceYear ? "REFERENCE"
        : r.year === currentYear ? "SUIVIE"
        : "AUTRE";
      const tracked = complete && !excluded && r.year >= followFrom && target2030 !== null;
      return {
        year: r.year,
        rawKwh: r.consumptionKwh,
        correctedKwh: r.correctedKwh,
        role,
        vsTarget2030: tracked ? (r.consumptionKwh <= target2030 ? "SOUS" : "AU_DESSUS") : null,
      };
    });

  const noTarget = milestones.every((m) => m.targetKwh === null);
  const objectivesNote = objectives === null
    ? `Objectifs indisponibles : ${objectivesProblem ?? "la conformité n'a pas pu être chargée."}`
    : noTarget ? "Aucun objectif calculable (ni Crelat, ni Cabs) : voir le détail de la conformité." : null;

  return {
    years,
    referenceYear,
    currentYear,
    milestones,
    axis: { from: Math.min(years[0]?.year ?? 2010, referenceYear ?? 2010, 2010), to: 2050 },
    objectivesNote,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// 7.3 — comparatif N-2 / N-1 / N.

/** COMPLETE = 12 mois ; INCOMPLETE = mois manquants (non comparable) ; ABSENTE = aucune consommation ; EXCLUE = 2020 / 2021. */
export type ComparisonState = "COMPLETE" | "INCOMPLETE" | "ABSENTE" | "EXCLUE";

export const COMPARISON_STATE_LABELS: Record<ComparisonState, string> = {
  COMPLETE: "Année complète",
  INCOMPLETE: "Année incomplète (non comparable)",
  ABSENTE: "Aucune consommation",
  EXCLUE: "Déclarée sur OPERAT, exclue du suivi (2020-2021)",
};

export type ComparisonYear = {
  label: "N-2" | "N-1" | "N";
  year: number;
  state: ComparisonState;
  rawKwh: number | null;
  correctedKwh: number | null;
  correctedKwhPerM2: number | null;
  /** Évolution par rapport à la colonne précédente (en %), si les deux années sont complètes. */
  rawChangePct: number | null;
  correctedChangePct: number | null;
  /** Écart à la consommation de référence (Créf), en %, si l'année est complète. */
  vsCrefPct: number | null;
  /** Consommation brute − objectif 2030 retenu (kWh) ; négatif = marge sous l'objectif. */
  gap2030Kwh: number | null;
};

export type Comparison = {
  /** Année N = année suivie (dernière année complète hors 2020 et 2021). */
  currentYear: number;
  years: ComparisonYear[];
  crefKwh: number | null;
  referenceYear: number | null;
  target2030Kwh: number | null;
};

/** Variation en %, arrondie au dixième ; null si une valeur manque ou si la base est nulle. */
export function changePct(from: number | null, to: number | null): number | null {
  if (from === null || to === null || from === 0) return null;
  return Math.round(((to - from) / from) * 1000) / 10;
}

function stateOf(r: TrajectoryRow | undefined): ComparisonState {
  if (!r || r.consumptionKwh === null) return "ABSENTE";
  if (EXCLUDED_YEARS.includes(r.year)) return "EXCLUE";
  return r.status === "OK" ? "COMPLETE" : "INCOMPLETE";
}

/** Tableau N-2 / N-1 / N autour de l'année suivie `currentYear`. */
export function buildComparison(rows: TrajectoryRow[], currentYear: number, objectives: TrajectoryObjectives | null): Comparison {
  const crefKwh = objectives?.reference.crefKwh ?? null;
  const m2030 = objectives?.verdict.milestones.find((m) => m.milestone === 2030);
  const target2030Kwh = m2030 ? targetOf(m2030) : null;
  const labels = ["N-2", "N-1", "N"] as const;

  const raw = labels.map((label, i) => {
    const year = currentYear - 2 + i;
    const r = rows.find((x) => x.year === year);
    const state = stateOf(r);
    const has = state !== "ABSENTE";
    return {
      label, year, state,
      complete: r?.status === "OK" && has,
      rawKwh: has ? r!.consumptionKwh : null,
      correctedKwh: has ? r!.correctedKwh : null,
      correctedKwhPerM2: has ? r!.correctedKwhPerM2 : null,
    };
  });

  const years: ComparisonYear[] = raw.map((y, i) => {
    const prev = i > 0 ? raw[i - 1] : null;
    const comparable = y.complete && prev !== null && prev.complete;
    // 2020-2021 : exclues du suivi, donc ni écart à la référence ni écart à l'objectif.
    const tracked = y.complete && y.state === "COMPLETE";
    return {
      label: y.label,
      year: y.year,
      state: y.state,
      rawKwh: y.rawKwh,
      correctedKwh: y.correctedKwh,
      correctedKwhPerM2: y.correctedKwhPerM2,
      rawChangePct: comparable ? changePct(prev!.rawKwh, y.rawKwh) : null,
      correctedChangePct: comparable ? changePct(prev!.correctedKwh, y.correctedKwh) : null,
      vsCrefPct: tracked ? changePct(crefKwh, y.rawKwh) : null,
      gap2030Kwh: tracked && target2030Kwh !== null && y.rawKwh !== null ? y.rawKwh - target2030Kwh : null,
    };
  });

  return { currentYear, years, crefKwh, referenceYear: objectives?.reference.year ?? null, target2030Kwh };
}
