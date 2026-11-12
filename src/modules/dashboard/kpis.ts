// Indicateurs clés du haut du tableau de bord. Fonction PURE : testée dans kpis.test.ts.
// Aucun calcul nouveau : on reprend des valeurs déjà présentes dans la synthèse (suivi, frise, comparatif) ;
// seule la marge (objectif retenu − consommation suivie) est une soustraction d'affichage.
import type { Synthesis } from "./synthesis";

export type Kpis = {
  /** Année suivie et sa consommation brute (celle de la conformité). */
  current: { year: number; rawKwh: number } | null;
  /** kWh corrigés du climat par m² de l'année suivie. */
  correctedKwhPerM2: number | null;
  /** Évolution de la consommation brute par rapport à l'année de référence (%). */
  vsReference: { pct: number; referenceYear: number } | null;
  /** Objectif 2030 retenu (voie la plus favorable) et marge : positive = sous l'objectif. */
  target2030: { kwh: number; way: "CRELAT" | "CABS" | "EGALITE"; marginKwh: number | null } | null;
};

export function buildKpis(s: Synthesis): Kpis {
  const follow = s.sections.followUp.ok ? s.sections.followUp.data : null;
  const timeline = s.sections.timeline.ok ? s.sections.timeline.data : null;
  const comparison = s.sections.comparison.ok ? s.sections.comparison.data : null;
  const current = follow ? { year: follow.year, rawKwh: follow.consumptionKwh } : null;

  const n = comparison?.years.find((y) => y.label === "N");
  const vsReference = n && n.vsCrefPct !== null && comparison?.referenceYear
    ? { pct: n.vsCrefPct, referenceYear: comparison.referenceYear }
    : null;

  const m2030 = timeline?.milestones.find((m) => m.year === 2030);
  const target2030 = m2030 && m2030.targetKwh !== null && m2030.favorable
    ? { kwh: m2030.targetKwh, way: m2030.favorable, marginKwh: current ? m2030.targetKwh - current.rawKwh : null }
    : null;

  return { current, correctedKwhPerM2: follow?.correctedKwhPerM2 ?? null, vsReference, target2030 };
}
