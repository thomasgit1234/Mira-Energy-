import Link from "next/link";
import { CollecteError, ENERGY_LABELS, loadCollecteContext, type CollecteContext } from "@/modules/collecte";
import styles from "@/modules/collecte/Collecte.module.css";

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export default async function Page() {
  let context: CollecteContext | null = null;
  let problem: string | null = null;
  try {
    context = await loadCollecteContext();
  } catch (e) {
    problem = e instanceof CollecteError ? e.message : "Impossible de joindre la base de données : lancez `npm run db:up`, puis rechargez la page.";
    if (!(e instanceof CollecteError)) console.error(e);
  }

  return (
    <main className="page">
      <Link href="/" className="back">← Carte du projet</Link>
      <p className="eyebrow">Phase 02 · Collecte des données</p>
      <h1>Collecte des consommations</h1>
      <p>Toutes les consommations, quel que soit leur mode de collecte, sont enregistrées par la même couche d&apos;écriture : une valeur validée n&apos;est jamais écrasée par une valeur non validée.</p>

      <div className={styles.actions}>
        <Link href="/collecte/saisie" className={styles.primary}>Saisie manuelle (2.2)</Link>
      </div>

      <h2>Données déjà collectées</h2>
      {problem && <p role="alert" style={{ color: "#b3261e" }}>{problem}</p>}
      {context && context.collected.length === 0 && <p className={styles.empty}>Aucune consommation pour l&apos;instant. Commencez par une saisie manuelle.</p>}
      {context && context.collected.length > 0 && (
        <table className={styles.table} data-testid="collected">
          <thead>
            <tr><th>Année</th><th>Énergie</th><th>Origine</th><th className={styles.num}>Mois</th><th className={styles.num}>Validés</th><th className={styles.num}>Total (kWh)</th></tr>
          </thead>
          <tbody>
            {context.collected.map((c) => (
              <tr key={`${c.year}-${c.energyType}`}>
                <td>{c.year}</td>
                <td>{ENERGY_LABELS[c.energyType]}</td>
                <td>{c.sources.join(", ")}</td>
                <td className={styles.num}>{c.monthCount} / 12</td>
                <td className={styles.num}>{c.validatedCount} / {c.monthCount}</td>
                <td className={styles.num}>{nf.format(c.totalKwh)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="hint">Prévus, hors démo : demande d&apos;historique par email (2.3), guide d&apos;export espace client (2.4), API ACD simulée (2.5).</p>
    </main>
  );
}
