import Link from "next/link";
import { CORRECTION_LABELS, ClimatError, STATUS_LABELS, loadClimatIndicators, type ClimatIndicators, type YearIndicator } from "@/modules/climat";
import styles from "@/modules/climat/Climat.module.css";

export const dynamic = "force-dynamic";

const kwhFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const perM2Format = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const ENERGY_LABELS: Record<string, string> = { ELECTRICITY: "électricité", GAS: "gaz naturel", PROPANE: "propane" };

const kwh = (v: number | null) => (v === null ? "—" : kwhFormat.format(v));
const perM2 = (v: number | null) => (v === null ? "—" : perM2Format.format(v));

function statusBadge(r: YearIndicator) {
  if (r.correction === "NON_CORRIGEABLE") return <span className={`${styles.badge} ${styles.bad}`}>{CORRECTION_LABELS.NON_CORRIGEABLE}</span>;
  if (r.status !== "OK") return <span className={`${styles.badge} ${styles.warn}`}>{STATUS_LABELS[r.status]} ({r.monthCount}/12 mois)</span>;
  return <span className={`${styles.badge} ${styles.ok}`}>{CORRECTION_LABELS.CORRIGEE}</span>;
}

export default async function Page() {
  let data: ClimatIndicators | null = null;
  let problem: string | null = null;
  try {
    data = await loadClimatIndicators();
  } catch (e) {
    problem = e instanceof ClimatError ? e.message : "Impossible de joindre la base de données : lancez `npm run db:up`, puis rechargez la page.";
    if (!(e instanceof ClimatError)) console.error(e);
  }

  const rows = data?.rows ?? [];
  const notCorrectable = data?.correctionAvailable ? rows.filter((r) => r.correction === "NON_CORRIGEABLE") : [];
  const unknown = [...new Set(rows.flatMap((r) => r.unknownShares))];

  return (
    <main className="page">
      <Link href="/" className="back">← Carte du projet</Link>
      <p className="eyebrow">Phase 04 · Correction climatique</p>
      <h1>Consommation brute et corrigée du climat</h1>
      <p>
        Pour chaque mois : la consommation <strong>brute</strong> (relevée) et la consommation <strong>corrigée</strong>, ramenée à un
        climat moyen pour comparer des années à l&apos;hiver plus ou moins froid. Indicateur annuel : kWh corrigés par m² de l&apos;EFA.
      </p>
      <p className={styles.source} data-testid="source">Correction climatique automatique (station Saint-Quentin).</p>

      {problem && <p role="alert" className={styles.error}>{problem}</p>}

      {data && (
        <>
          <p className={styles.building}>
            {data.buildingLabel}{data.activityLabel ? ` — ${data.activityLabel}` : ""}{data.surfaceM2 ? ` — ${kwhFormat.format(data.surfaceM2)} m²` : ""}
          </p>

          {data.problem && <p className={styles.notice} role="status" data-testid="correction-problem">{data.problem}</p>}
          {notCorrectable.length > 0 && (
            <p className={styles.notice} role="status" data-testid="not-correctable">
              Année non corrigeable : {notCorrectable.map((r) => r.year).join(", ")} (absente du fichier climatique de la station). La consommation brute reste affichée.
            </p>
          )}
          {unknown.length > 0 && (
            <p className={styles.notice} role="status" data-testid="unknown-shares">
              Part chauffage inconnue, non corrigée : {unknown.map((e) => ENERGY_LABELS[e] ?? e).join(", ")}{data.activityLabel ? "" : " (activité de l'EFA inconnue)"}.
              La consommation corrigée de cette énergie est égale à la brute.
            </p>
          )}
          {rows.length === 0 && (
            <p className={styles.notice} role="status" data-testid="no-consumption">
              Aucune consommation enregistrée pour ce bâtiment. Commencez par la <Link href="/collecte">collecte des données</Link>.
            </p>
          )}

          {rows.length > 0 && (
            <div className={styles.scroll}>
              <table className={styles.table} data-testid="indicators">
                <thead>
                  <tr>
                    <th>Année</th><th className={styles.num}>Brute (kWh)</th><th className={styles.num}>Corrigée (kWh)</th>
                    <th className={styles.num}>kWh corrigés/m²</th><th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.year} data-testid={`year-${r.year}`} data-status={r.status} data-correction={r.correction}>
                      <td>{r.year}</td>
                      <td className={styles.num}>{kwh(r.consumptionKwh)}</td>
                      <td className={`${styles.num} ${styles.strong}`} data-testid="corrected">{kwh(r.correctedKwh)}</td>
                      <td className={styles.num} data-testid="per-m2">{perM2(r.correctedKwhPerM2)}</td>
                      <td>{statusBadge(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {rows.length > 0 && <h2 className={styles.subtitle}>Détail par mois</h2>}
          {[...rows].reverse().map((r, i) => (
            <details key={r.year} className={styles.details} open={i === 0} data-testid={`months-${r.year}`}>
              <summary>{r.year} — brute {kwh(r.consumptionKwh)} kWh, corrigée {kwh(r.correctedKwh)} kWh</summary>
              <div className={styles.scroll}>
                <table className={styles.table}>
                  <thead><tr><th>Mois</th><th className={styles.num}>Brute (kWh)</th><th className={styles.num}>Corrigée (kWh)</th></tr></thead>
                  <tbody>
                    {r.months.map((m) => (
                      <tr key={m.month}>
                        <td>{MONTHS[m.month - 1] ?? m.month}</td>
                        <td className={styles.num}>{kwh(m.rawKwh)}</td>
                        <td className={`${styles.num} ${styles.strong}`}>{kwh(m.correctedKwh)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {r.correctionProblem && <p className={styles.hint}>{r.correctionProblem}</p>}
            </details>
          ))}

          <p className={styles.hint}>
            Seules les parts chauffage et climatisation de chaque énergie sont corrigées (hypothèses Mira Énergie, à confirmer) ; les autres
            usages restent inchangés. La conformité au décret tertiaire reste calculée sur la consommation brute.
          </p>
        </>
      )}
    </main>
  );
}
