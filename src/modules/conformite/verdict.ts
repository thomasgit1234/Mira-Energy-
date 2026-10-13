// Tâche 6.3 — verdict de conformité par jalon. Fonctions PURES : testées dans verdict.test.ts.
//
// Règle : CONFORME si AU MOINS UNE des deux méthodes (Crelat, Cabs) est satisfaite — le décret permet de retenir la plus
// favorable. Hypothèses (README) :
// - « satisfaite » = consommation ≤ objectif ;
// - Cabs à l'étalon, jamais combiné avec la modulation ; le fichier ne donne qu'une valeur, appliquée aux trois jalons ;
// - consommation actuelle = dernière année COMPLÈTE hors 2020 et 2021 (critère « année complète » du module climat).
import { EXCLUDED_YEARS } from "@/modules/comparateur";
import type { YearStatus } from "@/modules/climat";
import type { CabsResult } from "./cabs";
import { MILESTONES, type CrelatResult, type Milestone } from "./crelat";

export type MethodOutcome =
  | { calculable: true; objectiveKwh: number; met: boolean | null; gapKwh: number | null }
  | { calculable: false; reason: string };

export type VerdictStatus = "CONFORME" | "NON_CONFORME" | "INDETERMINE";
export type FavorableWay = "CRELAT" | "CABS" | "EGALITE" | null;

export type MilestoneVerdict = {
  milestone: Milestone;
  crelat: MethodOutcome;
  cabs: MethodOutcome;
  /** Voie dont l'objectif autorise la consommation la plus haute (parmi les méthodes calculables). */
  favorable: FavorableWay;
  status: VerdictStatus;
  message: string;
};

export type VerdictInput = {
  crelat: CrelatResult;
  cabs: CabsResult;
  currentKwh: number | null;
  currentYear: number | null;
  referenceYear: number | null;
};

export type Verdict = { main: MilestoneVerdict; milestones: MilestoneVerdict[] };

export const STATUS_LABELS: Record<VerdictStatus, string> = {
  CONFORME: "CONFORME",
  NON_CONFORME: "NON CONFORME",
  INDETERMINE: "INDÉTERMINÉ",
};
export const WAY_LABELS: Record<"CRELAT" | "CABS", string> = {
  CRELAT: "objectif relatif (Crelat)",
  CABS: "objectif en valeur absolue (Cabs)",
};

type YearRow = { year: number; status: YearStatus; consumptionKwh: number | null };

/** Année de suivi : la dernière année complète (statut « OK » du module climat), jamais 2020 ni 2021. */
export function pickCurrentYear(rows: YearRow[]): { year: number; consumptionKwh: number } | null {
  const candidates = rows
    .filter((r) => r.status === "OK" && r.consumptionKwh !== null && !EXCLUDED_YEARS.includes(r.year))
    .sort((a, b) => b.year - a.year);
  return candidates[0] ? { year: candidates[0].year, consumptionKwh: candidates[0].consumptionKwh! } : null;
}

function outcome(objectiveKwh: number, currentKwh: number | null): MethodOutcome {
  if (currentKwh === null) return { calculable: true, objectiveKwh, met: null, gapKwh: null };
  return { calculable: true, objectiveKwh, met: currentKwh <= objectiveKwh, gapKwh: currentKwh - objectiveKwh };
}

function evaluateMilestone(milestone: Milestone, input: VerdictInput): MilestoneVerdict {
  const { crelat, cabs, currentKwh, referenceYear } = input;
  const crelatOutcome: MethodOutcome = crelat.ok
    ? outcome(crelat.objectives[milestone], currentKwh)
    : { calculable: false, reason: referenceYear === null ? "non calculable : pas d'année de référence" : `non calculable : ${crelat.reason}` };
  const cabsOutcome: MethodOutcome = cabs.ok ? outcome(cabs.objectiveKwh, currentKwh) : { calculable: false, reason: `non calculable : ${cabs.message}` };

  let favorable: FavorableWay = null;
  if (crelatOutcome.calculable && cabsOutcome.calculable) {
    favorable = crelatOutcome.objectiveKwh > cabsOutcome.objectiveKwh ? "CRELAT" : crelatOutcome.objectiveKwh < cabsOutcome.objectiveKwh ? "CABS" : "EGALITE";
  } else if (crelatOutcome.calculable) favorable = "CRELAT";
  else if (cabsOutcome.calculable) favorable = "CABS";

  const toFill: string[] = [];
  if (!crelatOutcome.calculable) toFill.push(referenceYear === null ? "choisissez une année de référence (comparateur)" : crelatOutcome.reason);
  if (!cabsOutcome.calculable) toFill.push(cabsOutcome.reason);

  if (currentKwh === null) {
    return { milestone, crelat: crelatOutcome, cabs: cabsOutcome, favorable, status: "INDETERMINE",
      message: "Aucune année complète hors 2020 et 2021 : renseignez les consommations (collecte)." };
  }
  const met = [crelatOutcome.calculable && crelatOutcome.met ? "CRELAT" : null, cabsOutcome.calculable && cabsOutcome.met ? "CABS" : null]
    .filter((x): x is "CRELAT" | "CABS" => x !== null);
  if (met.length > 0) {
    const by = met.length === 2 ? "par les deux méthodes" : `par l'${WAY_LABELS[met[0]]}`;
    return { milestone, crelat: crelatOutcome, cabs: cabsOutcome, favorable, status: "CONFORME", message: `Conforme ${by}.` };
  }
  if (crelatOutcome.calculable && cabsOutcome.calculable) {
    return { milestone, crelat: crelatOutcome, cabs: cabsOutcome, favorable, status: "NON_CONFORME",
      message: "Aucune des deux méthodes n'est satisfaite : la consommation dépasse les deux objectifs." };
  }
  return { milestone, crelat: crelatOutcome, cabs: cabsOutcome, favorable, status: "INDETERMINE",
    message: `Verdict impossible : ${toFill.join(" ; ")}.` };
}

/** Verdict pour 2030 (verdict principal), 2040 et 2050 (pour information). */
export function evaluateVerdict(input: VerdictInput): Verdict {
  const milestones = MILESTONES.map((m) => evaluateMilestone(m, input));
  return { main: milestones[0], milestones };
}
