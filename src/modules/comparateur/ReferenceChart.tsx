// Tâche 5.1 — histogramme des consommations BRUTES 2010-2019, en SVG pur (aucune dépendance).
// Une barre par année : kWh au-dessus, kWh/DJU en dessous de l'année. Années non éligibles grisées et hachurées ;
// année suggérée = contour épais + libellé (pas seulement la couleur). Un tableau équivalent est affiché sous le graphique.
import styles from "./Comparateur.module.css";
import { REFERENCE_PERIOD, SUGGESTED_LABEL, formatKwh, formatRatio, type ComparatorRow } from "./reference";

const W = 760, H = 330;
const TOP = 58, BOTTOM = 62, LEFT = 10, RIGHT = 10;
const PLOT_H = H - TOP - BOTTOM;

export function ReferenceChart({ rows, chosenYear }: { rows: ComparatorRow[]; chosenYear: number | null }) {
  const period = rows.filter((r) => r.year >= REFERENCE_PERIOD.from && r.year <= REFERENCE_PERIOD.to);
  const max = Math.max(1, ...period.map((r) => r.consumptionKwh ?? 0));
  const slot = (W - LEFT - RIGHT) / Math.max(1, period.length);
  const barW = slot * 0.62;
  const baseline = TOP + PLOT_H;
  const suggested = period.find((r) => r.isSuggested);

  const summary = period
    .map((r) => `${r.year} : ${r.consumptionKwh === null ? "pas de consommation" : `${formatKwh(r.consumptionKwh)} kWh`}${r.eligible ? "" : ` (non éligible : ${r.ineligibleReason})`}`)
    .join(" ; ");

  return (
    <figure className={styles.figure} aria-labelledby="chart-caption">
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-labelledby="chart-title chart-desc">
        <title id="chart-title">Consommations brutes annuelles 2010 à 2019 (kWh)</title>
        <desc id="chart-desc">
          {summary}.{suggested ? ` Année suggérée : ${suggested.year}.` : ""}{chosenYear ? ` Référence choisie : ${chosenYear}.` : ""}
        </desc>
        <defs>
          <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="#eceeed" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#c9cfcc" strokeWidth="3" />
          </pattern>
        </defs>
        <line x1={LEFT} x2={W - RIGHT} y1={baseline} y2={baseline} stroke="#b9c4bf" />
        {period.map((r, i) => {
          const cx = LEFT + slot * i + slot / 2;
          const h = r.consumptionKwh ? Math.max(2, (r.consumptionKwh / max) * PLOT_H) : 0;
          const y = baseline - h;
          const chosen = chosenYear === r.year;
          const fill = !r.eligible ? "url(#hatch)" : r.isSuggested || chosen ? "#0e5c54" : "#7fb0a8";
          return (
            <g key={r.year} data-testid={`bar-${r.year}`} data-eligible={r.eligible} data-suggested={r.isSuggested}>
              <title>{`${r.year} : ${r.consumptionKwh === null ? "pas de consommation" : `${formatKwh(r.consumptionKwh)} kWh`}${r.eligible ? "" : ` — non éligible : ${r.ineligibleReason}`}${r.isSuggested ? ` — ${SUGGESTED_LABEL}` : ""}`}</title>
              {h > 0 && (
                <rect
                  x={cx - barW / 2} y={y} width={barW} height={h} rx="3" fill={fill}
                  stroke={r.isSuggested || chosen ? "#1f2a27" : r.eligible ? "none" : "#b9c4bf"}
                  strokeWidth={r.isSuggested || chosen ? 3 : 1}
                  strokeDasharray={r.isSuggested && !chosen ? "6 3" : undefined}
                />
              )}
              <text x={cx} y={h > 0 ? y - 6 : baseline - 6} textAnchor="middle" className={r.eligible ? styles.value : styles.valueMuted}>
                {r.consumptionKwh === null ? "—" : formatKwh(r.consumptionKwh)}
              </text>
              {r.isSuggested && (
                <text x={Math.min(Math.max(cx, 110), W - 110)} y={(h > 0 ? y : baseline) - 24} textAnchor="middle" className={styles.suggestedLabel}>
                  ▼ {SUGGESTED_LABEL}
                </text>
              )}
              <text x={cx} y={baseline + 18} textAnchor="middle" className={r.eligible ? styles.year : styles.yearMuted}>{r.year}</text>
              <text x={cx} y={baseline + 36} textAnchor="middle" className={styles.ratio}>{formatRatio(r.kwhPerDju)}</text>
              {!r.eligible && r.consumptionKwh !== null && (
                <text x={cx} y={baseline + 52} textAnchor="middle" className={styles.reasonShort}>non éligible</text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption id="chart-caption" className={styles.caption}>
        Consommations <strong>brutes</strong> (kWh d&apos;énergie finale, toutes énergies) de 2010 à 2019. Sous chaque année :
        le kWh/DJU, indicateur indicatif. Barres hachurées : années non éligibles (raison dans le tableau ci-dessous).
        Contour pointillé épais : année suggérée.
      </figcaption>
    </figure>
  );
}
