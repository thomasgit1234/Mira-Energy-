import Link from "next/link";
import { ClimatError, STATUS_LABELS, loadClimatIndicators, type ClimatIndicators, type YearStatus } from "@/modules/climat";
import styles from "@/modules/climat/Climat.module.css";

export const dynamic = "force-dynamic";

const kwhFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const djuFormat = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ratioFormat = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const BADGE: Record<YearStatus, string> = {
  OK: styles.ok,
  ANNEE_INCOMPLETE: styles.warn,
  DJU_MANQUANT: styles.bad,
  PAS_DE_CONSOMMATION: styles.none,
};

export default async function Page() {
  let data: ClimatIndicators | null = null;
  let problem: string | null = null;
  try {
    data = await loadClimatIndicators();
  } catch (e) {
    problem = e instanceof ClimatError ? e.message : "Impossible de joindre la base de données : lancez `npm run db:up`, puis rechargez la page.";
    if (!(e instanceof ClimatError)) console.error(e);
  }

  const hasConsumption = data?.rows.some((r) => r.status !== "PAS_DE_CONSOMMATION") ?? false;
  const missingDju = data?.rows.filter((r) => r.status === "DJU_MANQUANT").map((r) => r.year) ?? [];

  return (
    <main className="page">
      <Link href="/" className="back">← Carte du projet</Link>
      <p className="eyebrow">Tâches 4.1 à 4.3 · Correction climatique</p>
      <h1>Consommation rapportée au climat (kWh/DJU)</h1>
      <p>Pour chaque année : consommation annuelle de l&apos;EFA ÷ degrés-jours unifiés (DJU) de la station météo du bâtiment.
        Plus l&apos;hiver est froid, plus les DJU sont élevés : le kWh/DJU permet de comparer des années au climat différent.</p>

      {problem && <p role="alert" className={styles.error}>{problem}</p>}

      {data && (
        <>
          <p className={styles.building}>{data.buildingLabel}</p>
          <p className={styles.source} data-testid="source">DJU Météo-France, station {data.stationLabel}, base 18 — Source : Météo-France, Licence Ouverte 2.0.</p>

          {!data.hasDju && (
            <p className={styles.notice} role="status">Aucun DJU en base pour la station {data.zone} : lancez <code>npm run db:import</code>, puis rechargez la page.</p>
          )}
          {data.hasDju && missingDju.length > 0 && (
            <p className={styles.notice} role="status">DJU manquant pour {missingDju.join(", ")} : vérifiez le fichier DJU puis lancez <code>npm run db:import</code>.</p>
          )}
          {!hasConsumption && (
            <p className={styles.notice} role="status" data-testid="no-consumption">
              Aucune consommation enregistrée pour ce bâtiment. Commencez par la <Link href="/collecte">collecte des données</Link>.
            </p>
          )}

          {data.rows.length > 0 && (
            <div className={styles.scroll}>
              <table className={styles.table} data-testid="indicators">
                <thead>
                  <tr><th>Année</th><th className={styles.num}>Consommation (kWh)</th><th className={styles.num}>DJU</th><th className={styles.num}>kWh/DJU</th><th>Statut</th></tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.year} className={r.status === "PAS_DE_CONSOMMATION" ? styles.empty : undefined} data-testid={`year-${r.year}`} data-status={r.status}>
                      <td>{r.year}</td>
                      <td className={styles.num}>{r.consumptionKwh === null ? "—" : kwhFormat.format(r.consumptionKwh)}</td>
                      <td className={styles.num}>{r.dju === null ? "—" : djuFormat.format(r.dju)}</td>
                      <td className={`${styles.num} ${r.status === "OK" ? styles.strong : ""}`} data-testid="ratio">{r.kwhPerDju === null ? "—" : ratioFormat.format(r.kwhPerDju)}</td>
                      <td><span className={`${styles.badge} ${BADGE[r.status]}`}>{STATUS_LABELS[r.status]}</span>{r.status === "ANNEE_INCOMPLETE" && <span className={styles.hint}> ({r.monthCount}/12 mois)</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className={styles.hint}>
            Indicateur de suivi calculé sur la consommation totale (toutes énergies) : il est indicatif, la correction climatique rigoureuse
            porte sur la part chauffage. Les DJU ne servent pas à la déclaration OPERAT, qui corrige elle-même le climat.
          </p>
        </>
      )}
    </main>
  );
}
