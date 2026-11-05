// Tâche 7.2 — frise de trajectoire en SVG pur (aucune dépendance, rendu serveur).
// Barres : consommation BRUTE annuelle (celle de la conformité). Année de référence et année suivie : barre foncée + libellé
// (pas seulement la couleur). 2020-2021 et années incomplètes : hachurées. Trajectoire Crelat : ligne pointillée de Créf vers
// les losanges 2030 / 2040 / 2050. Cabs : ligne horizontale (un seul seuil pour les trois jalons), ou mention « hors échelle »
// s'il écraserait les barres. Info-bulle sur chaque barre ; un tableau équivalent est proposé sous le graphique.
import styles from "./Dashboard.module.css";
import { fmtKwh } from "./format";
import type { Timeline, TimelineYear, YearRole } from "./trajectory";

const W = 820, H = 330;
const TOP = 46, BOTTOM = 58, LEFT = 64, RIGHT = 20;
const PLOT_W = W - LEFT - RIGHT, PLOT_H = H - TOP - BOTTOM;
const GRID = "#e6ebe9", PETROL = "#0e5c54", LIGHT = "#7fb0a8", AMBER = "#9a6412";

export const ROLE_LABELS: Record<YearRole, string> = {
  REFERENCE: "année de référence",
  SUIVIE: "année suivie",
  EXCLUE: "2020-2021 : exclue du suivi",
  INCOMPLETE: "année incomplète",
  AUTRE: "année complète",
};

/** Arrondi « joli » vers le haut, divisible en 4 graduations lisibles : 1, 2, 4, 6, 8 × 10^n. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 4, 6, 8, 10].find((m) => m * p >= v) ?? 10) * p;
}

function tooltip(y: TimelineYear): string {
  const corrected = y.correctedKwh === null ? "corrigée non calculable" : `corrigée du climat ${fmtKwh(y.correctedKwh)}`;
  const target = y.vsTarget2030 === "SOUS" ? " — sous l'objectif 2030" : y.vsTarget2030 === "AU_DESSUS" ? " — au-dessus de l'objectif 2030" : "";
  return `${y.year} (${ROLE_LABELS[y.role]}) : brute ${fmtKwh(y.rawKwh)}, ${corrected}${target}`;
}

export function TrajectoryChart({ t }: { t: Timeline }) {
  const { from, to } = t.axis;
  const slot = PLOT_W / (to - from + 1);
  const cx = (year: number) => LEFT + (year - from) * slot + slot / 2;
  const barW = Math.max(4, slot * 0.62);

  const crelat = t.milestones.filter((m) => m.crelatKwh !== null);
  const cabsKwh = t.milestones.find((m) => m.cabsKwh !== null)?.cabsKwh ?? null;
  const dataMax = Math.max(1, ...t.years.map((y) => y.rawKwh), ...crelat.map((m) => m.crelatKwh!));
  // Le Cabs du restaurant (278 400 kWh/an) vaut plus de 5 fois sa consommation : au-delà de 1,6 × le maximum, on le signale
  // au lieu de l'inclure dans l'échelle (sinon les barres deviennent illisibles).
  const cabsOnScale = cabsKwh !== null && cabsKwh <= dataMax * 1.6;
  const yMax = niceCeil(Math.max(dataMax, cabsOnScale ? cabsKwh! : 0) * 1.08);
  const baseline = TOP + PLOT_H;
  const y = (kwh: number) => baseline - (kwh / yMax) * PLOT_H;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);

  const ref = t.years.find((v) => v.role === "REFERENCE");
  const trajectory = ref && crelat.length > 0
    ? [[cx(ref.year), y(ref.rawKwh)], ...crelat.map((m) => [cx(m.year), y(m.crelatKwh!)])]
    : [];
  const named = new Set([t.referenceYear, t.currentYear].filter((v): v is number => v !== null));
  const yearLabels = Array.from({ length: to - from + 1 }, (_, i) => from + i).filter(
    (yr) => named.has(yr) || (yr % 5 === 0 && ![...named].some((n) => Math.abs(n - yr) <= 1)),
  );

  const summary = [
    ...t.years.map(tooltip),
    ...t.milestones.map((m) => `${m.year} : objectif Crelat ${fmtKwh(m.crelatKwh)}, Cabs ${fmtKwh(m.cabsKwh)}`),
  ].join(" ; ");

  return (
    <figure className={styles.figure}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-labelledby="traj-title traj-desc" data-testid="trajectory-chart">
        <title id="traj-title">Consommations annuelles brutes et objectifs 2030, 2040, 2050 (kWh)</title>
        <desc id="traj-desc">{summary}.</desc>
        <defs>
          <pattern id="traj-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#eceeed" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#b9c4bf" strokeWidth="3" />
          </pattern>
        </defs>

        {/* Légende : forme ET couleur. */}
        <g aria-hidden="true" className={styles.legend}>
          <rect x={LEFT} y={10} width={12} height={12} rx="2" fill={LIGHT} />
          <text x={LEFT + 18} y={20}>Consommation brute</text>
          <rect x={LEFT + 150} y={10} width={12} height={12} rx="2" fill="url(#traj-hatch)" stroke="#b9c4bf" />
          <text x={LEFT + 168} y={20}>Exclue (2020-2021) ou incomplète</text>
          <line x1={LEFT + 378} x2={LEFT + 404} y1={16} y2={16} stroke={PETROL} strokeWidth="2" strokeDasharray="6 4" />
          <rect x={LEFT + 386} y={11} width={9} height={9} fill={PETROL} transform={`rotate(45 ${LEFT + 390.5} 15.5)`} />
          <text x={LEFT + 410} y={20}>Objectif Crelat</text>
          {cabsKwh !== null && (
            <>
              <line x1={LEFT + 520} x2={LEFT + 546} y1={16} y2={16} stroke={AMBER} strokeWidth="2" strokeDasharray="2 3" />
              <text x={LEFT + 552} y={20}>Objectif Cabs</text>
            </>
          )}
        </g>

        {/* Grille et axe des kWh, discrets. */}
        {ticks.map((v) => (
          <g key={v} aria-hidden="true">
            <line x1={LEFT} x2={W - RIGHT} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#b9c4bf" : GRID} />
            <text x={LEFT - 8} y={y(v) + 4} textAnchor="end" className={styles.axis}>{new Intl.NumberFormat("fr-FR").format(v)}</text>
          </g>
        ))}
        <text x={LEFT - 8} y={TOP - 10} textAnchor="end" className={styles.axis} aria-hidden="true">kWh</text>

        {/* Jalons : repères verticaux. */}
        {t.milestones.map((m) => (
          <g key={m.year} aria-hidden="true">
            <line x1={cx(m.year)} x2={cx(m.year)} y1={TOP} y2={baseline} stroke="#c9d2ce" strokeDasharray="3 4" />
            <text x={cx(m.year)} y={baseline + 34} textAnchor="middle" className={styles.axisStrong}>jalon</text>
          </g>
        ))}

        {/* Cabs : un seul seuil pour les trois jalons. */}
        {cabsKwh !== null && cabsOnScale && (
          <g data-testid="cabs-line">
            <title>{`Objectif Cabs : ${fmtKwh(cabsKwh)} par an (même seuil en 2030, 2040, 2050)`}</title>
            <line x1={LEFT} x2={W - RIGHT} y1={y(cabsKwh)} y2={y(cabsKwh)} stroke={AMBER} strokeWidth="2" strokeDasharray="2 3" />
            <text x={W - RIGHT} y={y(cabsKwh) - 6} textAnchor="end" className={styles.valueLabel}>Cabs {fmtKwh(cabsKwh)}/an</text>
          </g>
        )}
        {cabsKwh !== null && !cabsOnScale && (
          <text x={W - RIGHT} y={TOP - 8} textAnchor="end" className={styles.valueLabel} data-testid="cabs-off-scale">
            ▲ Cabs : {fmtKwh(cabsKwh)}/an, hors échelle (bien au-dessus des consommations)
          </text>
        )}

        {/* Barres annuelles. */}
        {t.years.map((v) => {
          const h = Math.max(2, baseline - y(v.rawKwh));
          const dark = v.role === "REFERENCE" || v.role === "SUIVIE";
          const muted = v.role === "EXCLUE" || v.role === "INCOMPLETE";
          return (
            <g key={v.year} data-testid={`traj-bar-${v.year}`} data-role={v.role} data-target={v.vsTarget2030 ?? "NONE"}>
              <title>{tooltip(v)}</title>
              {/* Zone de survol plus large que la barre. */}
              <rect x={cx(v.year) - slot / 2} y={TOP} width={slot} height={PLOT_H} fill="transparent" />
              <rect x={cx(v.year) - barW / 2} y={baseline - h} width={barW} height={h} rx="3"
                fill={muted ? "url(#traj-hatch)" : dark ? PETROL : LIGHT} stroke={muted ? "#b9c4bf" : "none"} />
              {dark && (
                <text x={cx(v.year)} y={baseline - h - 8} textAnchor={v.role === "REFERENCE" ? "start" : "middle"} className={styles.valueLabel}>
                  {v.role === "REFERENCE" ? "Réf. " : "Suivie "}{fmtKwh(v.rawKwh)}
                </text>
              )}
            </g>
          );
        })}

        {/* Trajectoire Crelat : Créf → objectifs des jalons. */}
        {trajectory.length > 1 && (
          <polyline points={trajectory.map((p) => p.join(",")).join(" ")} fill="none" stroke={PETROL} strokeWidth="2" strokeDasharray="6 4" aria-hidden="true" />
        )}
        {crelat.map((m) => (
          <g key={m.year} data-testid={`crelat-${m.year}`}>
            <title>{`Objectif Crelat ${m.year} : ${fmtKwh(m.crelatKwh)}`}</title>
            <rect x={cx(m.year) - 5} y={y(m.crelatKwh!) - 5} width={10} height={10} fill={PETROL} stroke="#fff" strokeWidth="2"
              transform={`rotate(45 ${cx(m.year)} ${y(m.crelatKwh!)})`} />
            <text x={cx(m.year)} y={y(m.crelatKwh!) - 12} textAnchor="middle" className={styles.valueLabel}>{fmtKwh(m.crelatKwh)}</text>
          </g>
        ))}

        {/* Années (une sur cinq + référence et année suivie). */}
        {yearLabels.map((yr) => (
          <text key={yr} x={cx(yr)} y={baseline + 18} textAnchor="middle"
            className={t.milestones.some((m) => m.year === yr) || named.has(yr) ? styles.axisStrong : styles.axis}>{yr}</text>
        ))}
      </svg>
      <figcaption className={styles.hint}>
        Barres : consommation <strong>brute</strong> de chaque année (kWh d&apos;énergie finale, toutes énergies), celle sur laquelle
        se juge la conformité. Survolez une barre pour voir la consommation corrigée du climat.
      </figcaption>
    </figure>
  );
}
