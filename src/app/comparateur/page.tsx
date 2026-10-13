import Link from "next/link";
import {
  ComparateurError, DEMO_BANNER, RAW_NOTICE, REFERENCE_PERIOD, SUGGESTED_LABEL, SUGGESTION_HELP, formatKwh, formatRatio, loadComparator,
  type ComparatorData,
} from "@/modules/comparateur";
import { ReferenceChart } from "@/modules/comparateur/ReferenceChart";
import { ReferenceChooser } from "@/modules/comparateur/ReferenceChooser";
import styles from "@/modules/comparateur/Comparateur.module.css";

export const dynamic = "force-dynamic";

export default async function Page() {
  let data: ComparatorData | null = null;
  let problem: string | null = null;
  try {
    data = await loadComparator();
  } catch (e) {
    problem = e instanceof ComparateurError ? e.message : "Impossible de joindre la base de données : lancez `npm run db:up`, puis rechargez la page.";
    if (!(e instanceof ComparateurError)) console.error(e);
  }

  const hasConsumption = data?.rows.some((r) => r.consumptionKwh !== null) ?? false;
  const eligibleCount = data?.rows.filter((r) => r.eligible).length ?? 0;
  const later = data?.rows.filter((r) => r.year > REFERENCE_PERIOD.to) ?? [];
  const period = data?.rows.filter((r) => r.year <= REFERENCE_PERIOD.to) ?? [];

  return (
    <main className="page">
      <Link href="/" className="back">← Carte du projet</Link>
      <p className="eyebrow">Tâches 5.1 à 5.3 · Comparateur d&apos;années</p>
      <h1>Choisir l&apos;année de référence</h1>
      {DEMO_BANNER && <p className={styles.banner} role="note" data-testid="demo-banner">{DEMO_BANNER}</p>}
      <p>
        L&apos;année de référence est une année <strong>pleine de 12 mois</strong>, choisie entre {REFERENCE_PERIOD.from} et {REFERENCE_PERIOD.to}.
        2020 et 2021 se déclarent sur OPERAT mais ne peuvent pas servir de référence ni de suivi des objectifs.
      </p>
      <p className={styles.hint} data-testid="raw-notice">{RAW_NOTICE}</p>

      {problem && <p role="alert" className={styles.error}>{problem}</p>}

      {data && (
        <>
          <p className={styles.meta}>{data.buildingLabel} — {data.efaLabel}</p>

          {!hasConsumption && (
            <div className={`${styles.notice} ${styles.warn}`} role="status" data-testid="no-consumption">
              Aucune consommation enregistrée. Commencez par la <Link href="/collecte">collecte des données</Link>
              {" "}(par exemple l&apos;import du fichier <code>consommations-demo-2010-2018.csv</code>).
            </div>
          )}
          {hasConsumption && eligibleCount === 0 && (
            <div className={`${styles.notice} ${styles.warn}`} role="status" data-testid="no-eligible">
              Aucune année éligible : il faut au moins une année complète (12 mois pour chaque énergie) entre {REFERENCE_PERIOD.from} et {REFERENCE_PERIOD.to}.
            </div>
          )}

          {data.suggested && (
            <div className={styles.notice} role="status" data-testid="suggestion">
              <p><span className={`${styles.badge} ${styles.badgeSuggested}`}>{SUGGESTED_LABEL}</span> <strong>{data.suggested.year}</strong> — {formatKwh(data.suggested.consumptionKwh)} kWh</p>
              <p className={styles.hint}>{SUGGESTION_HELP}</p>
            </div>
          )}

          {data.chosenYear !== null && !data.rows.some((r) => r.year === data!.chosenYear && r.eligible) && (
            <div className={`${styles.notice} ${styles.warn}`} role="status" data-testid="chosen-ineligible">
              L&apos;année de référence enregistrée ({data.chosenYear}) n&apos;est plus éligible avec les données actuelles : choisissez-en une autre.
            </div>
          )}

          <ReferenceChooser efaId={data.efaId} rows={data.rows} suggested={data.suggested} chosenYear={data.chosenYear} />

          {hasConsumption && <ReferenceChart rows={data.rows} chosenYear={data.chosenYear} />}

          <div className={styles.scroll}>
            <table className={styles.table} data-testid="comparator-table">
              <caption>Données du graphique (consommations brutes, kWh d&apos;énergie finale)</caption>
              <thead>
                <tr><th scope="col">Année</th><th scope="col" className={styles.num}>Consommation (kWh)</th><th scope="col" className={styles.num}>kWh/DJU (indicatif)</th><th scope="col">Référence possible ?</th></tr>
              </thead>
              <tbody>
                {period.map((r) => (
                  <tr key={r.year} className={r.eligible ? undefined : styles.muted} data-testid={`row-${r.year}`} data-eligible={r.eligible}>
                    <th scope="row">{r.year}</th>
                    <td className={styles.num}>{formatKwh(r.consumptionKwh)}</td>
                    <td className={styles.num}>{formatRatio(r.kwhPerDju)}</td>
                    <td>
                      {r.isSuggested && <span className={`${styles.badge} ${styles.badgeSuggested}`}>{SUGGESTED_LABEL}</span>}
                      {data!.chosenYear === r.year && <span className={`${styles.badge} ${styles.badgeChosen}`}>Référence choisie</span>}
                      {r.eligible ? <span className={`${styles.badge} ${styles.badgeOk}`}>éligible</span> : <span className={`${styles.badge} ${styles.badgeNo}`}>non : {r.ineligibleReason}</span>}
                    </td>
                  </tr>
                ))}
                {later.length > 0 && (
                  <tr className={styles.separator}><td colSpan={4}>Années suivantes — lecture seule, non éligibles comme référence</td></tr>
                )}
                {later.map((r) => (
                  <tr key={r.year} className={styles.muted} data-testid={`row-${r.year}`} data-eligible={false}>
                    <th scope="row">{r.year}</th>
                    <td className={styles.num}>{formatKwh(r.consumptionKwh)}</td>
                    <td className={styles.num}>{formatRatio(r.kwhPerDju)}</td>
                    <td><span className={`${styles.badge} ${styles.badgeNo}`}>non : {r.ineligibleReason}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.hint}>
            Le kWh/DJU (module climat) est un indicateur indicatif calculé sur la consommation totale ; ce n&apos;est pas une consommation corrigée du climat.
          </p>
        </>
      )}
    </main>
  );
}
