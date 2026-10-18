// Tâche 5.1 — histogramme brut vs corrigé du climat, 2010-2019, en SVG pur (aucune dépendance).
// Deux barres par année : consommation BRUTE (pleine, valeur au-dessus) et consommation CORRIGÉE du climat (motif à points,
// valeur sous l'année). Années non éligibles hachurées ; année suggérée = contour épais + libellé (pas seulement la couleur).
// Un tableau équivalent est affiché sous le graphique.
import styles from "./Comparateur.module.css";
import { REFERENCE_PERIOD, SUGGESTED_LABEL, formatKwh, type ComparatorRow } from "./reference";

const W = 760, H = 340;
const TOP = 64, BOTTOM = 62, LEFT = 10, RIGHT = 10;
const PLOT_H = H - TOP - BOTTOM;

export function ReferenceChart({ rows, chosenYear }: { rows: ComparatorRow[]; chosenYear: number | null }) {
  const period = rows.filter((r) => r.year >= REFERENCE_PERIOD.from && r.year <= REFERENCE_PERIOD.to);
  const max = Math.max(1, ...period.flatMap((r) => [r.consumptionKwh ?? 0, r.correctedKwh ?? 0]));
  const slot = (W - LEFT - RIGHT) / Math.max(1, period.length);
  const barW = slot * 0.3;
  const gap = slot * 0.04;
  const baseline = TOP + PLOT_H;
  const suggested = period.find((r) => r.isSuggested);
  const height = (v: number | null) => (v ? Math.max(2, (v / max) * PLOT_H) : 0);

  const summary = period
    .map((r) => {
      const values = r.consumptionKwh === null
        ? "pas de consommation"
        : `brute ${formatKwh(r.consumptionKwh)} kWh, corrigée ${r.correctedKwh === null ? "non calculable" : `${formatKwh(r.correctedKwh)} kWh`}`;
      return `${r.year} : ${values}${r.eligible ? "" : ` (non éligible : ${r.ineligibleReason})`}`;
    })
    .join(" ; ");

  return (
    <figure className={styles.figure} aria-labelledby="chart-caption">
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} role="img" aria-labelledby="chart-title chart-desc">
        <title id="chart-title">Consommations annuelles brutes et corrigées du climat, 2010 à 2019 (kWh)</title>
        <desc id="chart-desc">
          {summary}.{suggested ? ` Année suggérée : ${suggested.year}.` : ""}{chosenYear ? ` Référence choisie : ${chosenYear}.` : ""}
        </desc>
        <defs>
          <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="7" height="7" fill="#eceeed" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="#c9cfcc" strokeWidth="3" />
          </pattern>
          <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#e3efe9" />
            <circle cx="3" cy="3" r="1.4" fill="#0e5c54" />
          </pattern>
        </defs>

        {/* Légende : forme ET couleur. */}
        <g aria-hidden="true">
          <rect x={W - 330} y={8} width={14} height={14} rx="2" fill="#7fb0a8" />
          <text x={W - 310} y={19} className={styles.legend}>Brute</text>
          <rect x={W - 250} y={8} width={14} height={14} rx="2" fill="url(#dots)" stroke="#0e5c54" />
          <text x={W - 230} y={19} className={styles.legend}>Corrigée du climat (valeur sous l&apos;année)</text>
        </g>

        <line x1={LEFT} x2={W - RIGHT} y1={baseline} y2={baseline} stroke="#b9c4bf" />
        {period.map((r, i) => {
          const cx = LEFT + slot * i + slot / 2;
          const hRaw = height(r.consumptionKwh);
          const hFixed = height(r.correctedKwh);
          const xRaw = cx - gap / 2 - barW;
          const xFixed = cx + gap / 2;
          const top = baseline - Math.max(hRaw, hFixed);
          const chosen = chosenYear === r.year;
          const fill = !r.eligible ? "url(#hatch)" : r.isSuggested || chosen ? "#0e5c54" : "#7fb0a8";
          return (
            <g key={r.year} data-testid={`bar-${r.year}`} data-eligible={r.eligible} data-suggested={r.isSuggested}>
              <title>{`${r.year} : ${r.consumptionKwh === null ? "pas de consommation" : `brute ${formatKwh(r.consumptionKwh)} kWh, corrigée ${r.correctedKwh === null ? "non calculable" : `${formatKwh(r.correctedKwh)} kWh`}`}${r.eligible ? "" : ` — non éligible : ${r.ineligibleReason}`}${r.isSuggested ? ` — ${SUGGESTED_LABEL}` : ""}`}</title>
              {hRaw > 0 && (
                <rect
                  x={xRaw} y={baseline - hRaw} width={barW} height={hRaw} rx="3" fill={fill}
                  stroke={r.isSuggested || chosen ? "#1f2a27" : r.eligible ? "none" : "#b9c4bf"}
                  strokeWidth={r.isSuggested || chosen ? 3 : 1}
                  strokeDasharray={r.isSuggested && !chosen ? "6 3" : undefined}
                />
              )}
              {hFixed > 0 && (
                <rect
                  x={xFixed} y={baseline - hFixed} width={barW} height={hFixed} rx="3"
                  fill={r.eligible ? "url(#dots)" : "url(#hatch)"} stroke={r.eligible ? "#0e5c54" : "#b9c4bf"} strokeWidth={1}
                  data-testid={`corrected-${r.year}`}
                />
              )}
              <text x={cx} y={hRaw > 0 || hFixed > 0 ? top - 6 : baseline - 6} textAnchor="middle" className={r.eligible ? styles.value : styles.valueMuted}>
                {r.consumptionKwh === null ? "—" : formatKwh(r.consumptionKwh)}
              </text>
              {r.isSuggested && (
                <text x={Math.min(Math.max(cx, 110), W - 110)} y={(hRaw > 0 ? top : baseline) - 24} textAnchor="middle" className={styles.suggestedLabel}>
                  ▼ {SUGGESTED_LABEL}
                </text>
              )}
              <text x={cx} y={baseline + 18} textAnchor="middle" className={r.eligible ? styles.year : styles.yearMuted}>{r.year}</text>
              <text x={cx} y={baseline + 36} textAnchor="middle" className={styles.ratio}>{formatKwh(r.correctedKwh)}</text>
              {!r.eligible && r.consumptionKwh !== null && (
                <text x={cx} y={baseline + 52} textAnchor="middle" className={styles.reasonShort}>non éligible</text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption id="chart-caption" className={styles.caption}>
        Pour chaque année, à gauche la consommation <strong>brute</strong> (kWh d&apos;énergie finale, toutes énergies, valeur au-dessus) et à
        droite la consommation <strong>corrigée du climat</strong> (barre à points, valeur sous l&apos;année). Barres hachurées : années non
        éligibles (raison dans le tableau ci-dessous). Contour pointillé épais : année suggérée.
      </figcaption>
    </figure>
  );
}
