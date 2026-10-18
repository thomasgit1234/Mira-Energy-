import Link from "next/link";
import {
  DASHBOARD_BANNER, DATA_ORIGIN, STATE_LABELS, fmtKwh, fmtKwhPerM2, fmtKwhYear, fmtM2, loadDashboard,
  type EmptyState, type Section, type StepState, type VerdictSection,
} from "@/modules/dashboard";
import styles from "@/modules/dashboard/Dashboard.module.css";

// Tâches 7.1 (synthèse) et 7.4 (états vides). Lecture seule, rendu serveur : loadDashboard ne lève jamais d'erreur.
export const dynamic = "force-dynamic";

const ENERGY_LABELS: Record<string, string> = { ELECTRICITY: "électricité", GAS: "gaz naturel", PROPANE: "propane" };
const VERDICT_STYLE: Record<VerdictSection["status"], string> = { CONFORME: styles.ok, NON_CONFORME: styles.ko, INDETERMINE: styles.unknown };
const STEP_STYLE: Record<StepState, { pill: string; mark: string }> = {
  FAIT: { pill: styles.pillDone, mark: "✓" },
  A_FAIRE: { pill: styles.pillTodo, mark: "…" },
  INDISPONIBLE: { pill: styles.pillNa, mark: "—" },
};

/** État vide : un message et UNE action (bouton vers une page, et/ou commande à lancer faute de page). */
function Empty({ e }: { e: EmptyState }) {
  return (
    <div className={styles.empty} role="status" data-testid="empty" data-code={e.code}>
      <p>{e.message}</p>
      {e.action.command && <p className={styles.command}>Commande : <code>{e.action.command}</code></p>}
      {e.action.href && <Link href={e.action.href} className={styles.button}>{e.action.label}</Link>}
    </div>
  );
}

function Card<T>({ title, id, section, className, children }: { title: string; id: string; section: Section<T>; className?: string; children: (data: T) => React.ReactNode }) {
  return (
    <section className={`${styles.card} ${className ?? ""}`} aria-labelledby={`${id}-title`} data-testid={id}>
      <h2 id={`${id}-title`}>{title}</h2>
      {section.ok ? children(section.data) : <Empty e={section.empty} />}
    </section>
  );
}

export default async function Page() {
  const s = await loadDashboard();
  const { site, verdict, objectives, followUp } = s.sections;
  const next = s.nextAction;

  return (
    <main className="page">
      <Link href="/" className="back">← Carte du projet</Link>
      <p className="eyebrow">Tâches 7.1 et 7.4 · Tableau de bord</p>
      <h1>Synthèse de l&apos;EFA</h1>
      <p className={styles.banner} role="note" data-testid="demo-banner">{DASHBOARD_BANNER}</p>

      <section className={`${styles.next} ${next.code === null ? styles.nextDone : ""}`} aria-labelledby="next-title" data-testid="next-action" data-code={next.code ?? "AUCUN"}>
        <span className={styles.label} id="next-title">{next.code === null ? "Tout est renseigné" : "Prochaine étape"}</span>
        <p>{next.reason}</p>
        {next.action.command && <p className={styles.command}>Commande : <code>{next.action.command}</code></p>}
        {next.action.href && <p><Link href={next.action.href} className={styles.button}>{next.action.label}</Link></p>}
      </section>

      <div className={styles.grid}>
        <Card title="Site et EFA" id="site" section={site}>
          {(d) => (
            <dl>
              <dt>Bâtiment</dt><dd>{d.buildingLabel ?? `${d.postcode} ${d.city}`}</dd>
              <dt>EFA affichée</dt><dd>{d.efaLabel ?? "—"}</dd>
              <dt>Surface de l&apos;EFA</dt><dd data-testid="surface">{fmtM2(d.surfaceM2)}</dd>
              <dt>Zone climatique</dt><dd>{d.zone ?? "—"}</dd>
              <dt>EFA du site</dt><dd>{d.efaCount}</dd>
            </dl>
          )}
        </Card>

        <Card title="Verdict 2030" id="verdict" section={verdict} className={verdict.ok ? `${styles.verdict} ${VERDICT_STYLE[verdict.data.status]}` : ""}>
          {(d) => (
            <>
              <p className={styles.status} data-testid="verdict-status" data-status={d.status}>
                <span className={styles.icon} aria-hidden="true">{d.icon}</span>{d.statusLabel}
              </p>
              <p>{d.message}</p>
              <p>Méthode retenue : <strong data-testid="retained">{d.retainedLabel}</strong>.</p>
              <p>Voie la plus favorable : {d.favorableLabel}.</p>
              <p className={styles.hint}>2040 et 2050 : voir le <Link href="/conformite">détail de la conformité</Link>.</p>
            </>
          )}
        </Card>

        <Card title="Objectifs" id="objectives" section={objectives}>
          {(d) => (
            <>
              <dl>
                <dt>Année de référence</dt><dd data-testid="reference-year">{d.referenceYear ?? "non choisie"}</dd>
                <dt>Créf</dt><dd data-testid="cref">{fmtKwh(d.crefKwh)}</dd>
                <dt>Crelat 2030 (−40 %)</dt><dd data-testid="crelat-2030">{fmtKwh(d.crelat?.[2030])}</dd>
                <dt>Crelat 2040 (−50 %)</dt><dd data-testid="crelat-2040">{fmtKwh(d.crelat?.[2040])}</dd>
                <dt>Crelat 2050 (−60 %)</dt><dd data-testid="crelat-2050">{fmtKwh(d.crelat?.[2050])}</dd>
                <dt>Cabs</dt><dd data-testid="cabs">{fmtKwhYear(d.cabsKwh)}</dd>
              </dl>
              {d.empties.map((e) => <Empty key={e.code} e={e} />)}
            </>
          )}
        </Card>

        <Card title="Consommation suivie" id="follow-up" section={followUp}>
          {(d) => (
            <>
              <dl>
                <dt>Année suivie</dt><dd data-testid="current-year">{d.year}</dd>
                <dt>Consommation brute</dt><dd data-testid="current-kwh">{fmtKwh(d.consumptionKwh)}</dd>
                <dt>Consommation corrigée</dt><dd data-testid="corrected-kwh">{fmtKwh(d.correctedKwh)}</dd>
                <dt>kWh corrigés/m²</dt><dd data-testid="corrected-per-m2">{fmtKwhPerM2(d.correctedKwhPerM2)}</dd>
              </dl>
              {d.unknownShares.length > 0 && (
                <p className={styles.hint} data-testid="unknown-shares">
                  Part chauffage inconnue, non corrigée : {d.unknownShares.map((e) => ENERGY_LABELS[e] ?? e).join(", ")}.
                </p>
              )}
              <p className={styles.hint}>Dernière année complète hors 2020 et 2021. Correction climatique automatique (station
                Saint-Quentin). La conformité est calculée sur la consommation brute.</p>
            </>
          )}
        </Card>
      </div>

      <section aria-labelledby="steps-title" data-testid="steps">
        <h2 id="steps-title">Chaîne de la démonstration</h2>
        <ol className={styles.steps}>
          {s.steps.map((st) => (
            <li key={st.id} className={styles.step} data-testid={`step-${st.id}`} data-state={st.state}>
              <div>
                <strong>{st.label}</strong>
                <span className={`${styles.pill} ${STEP_STYLE[st.state].pill}`}>{STEP_STYLE[st.state].mark} {STATE_LABELS[st.state]}</span>
                <p>{st.detail}</p>
              </div>
              {st.href && <Link href={st.href}>Ouvrir</Link>}
            </li>
          ))}
        </ol>
      </section>

      <div className={styles.origin} data-testid="data-origin">
        <section className={styles.card} aria-labelledby="real-title">
          <h2 id="real-title">Données réelles et sourcées</h2>
          <ul>{DATA_ORIGIN.real.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
        <section className={styles.card} aria-labelledby="fictive-title">
          <h2 id="fictive-title">Données fictives (démonstration)</h2>
          <ul>{DATA_ORIGIN.fictive.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      </div>
    </main>
  );
}
