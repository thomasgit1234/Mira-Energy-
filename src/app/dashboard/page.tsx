import Link from "next/link";
import { efaParam } from "@/modules/batiment";
import { EfaSelector } from "@/modules/batiment/EfaSelector";
import {
  DASHBOARD_BANNER, DATA_ORIGIN, STATE_LABELS, buildKpis, fmtKwh, fmtKwhPerM2, fmtKwhYear, fmtM2, loadDashboard, type StepState,
} from "@/modules/dashboard";
import styles from "@/modules/dashboard/Dashboard.module.css";
import { Card, ComparisonView, Empty, KpiTiles, STATUS_TONE, TimelineView, VerdictHero } from "@/modules/dashboard/DashboardParts";

// Tâches 7.1 (synthèse), 7.2 (frise), 7.3 (comparatif N-2 / N-1 / N) et 7.4 (états vides). Lecture seule, rendu serveur :
// loadDashboard ne lève jamais d'erreur. Ordre de lecture : verdict et indicateurs → prochaine étape → parcours → frise →
// détails → comparatif → origine des données.
export const dynamic = "force-dynamic";

const ENERGY_LABELS: Record<string, string> = { ELECTRICITY: "électricité", GAS: "gaz naturel", PROPANE: "propane" };
const STEP_MARK: Record<StepState, { cls: string; mark: string }> = {
  FAIT: { cls: styles.stepDone, mark: "✓" },
  A_FAIRE: { cls: styles.stepTodo, mark: "!" },
  INDISPONIBLE: { cls: styles.stepNa, mark: "—" },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: PageProps) {
  const efaId = efaParam((await searchParams).efa); // ?efa= explicite, sinon EFA du sélecteur
  const s = await loadDashboard(efaId);
  const { site, verdict, objectives, followUp, timeline, comparison } = s.sections;
  const next = s.nextAction;
  const kpis = buildKpis(s);

  return (
    <main className={`page page-wide ${styles.dashboard}`}>
      <header className={styles.pageHead}>
        <div>
          <p className="eyebrow">Tableau de bord · tâches 7.1 à 7.4</p>
          <h1>Synthèse de l&apos;EFA</h1>
          {site.ok && (
            <p className={styles.subtitle}>
              {site.data.buildingLabel ?? `${site.data.postcode} ${site.data.city}`}
              {site.data.efaLabel ? <> · <strong>{site.data.efaLabel}</strong></> : null}
            </p>
          )}
        </div>
        <p className={styles.banner} role="note" data-testid="demo-banner">{DASHBOARD_BANNER}</p>
      </header>
      <EfaSelector back="/dashboard" efaId={efaId} />

      {/* Verdict et indicateurs clés */}
      <div className={styles.hero}>
        <Card title="Verdict 2030" id="verdict" section={verdict}
          className={verdict.ok ? `${styles.verdict} ${STATUS_TONE[verdict.data.status]}` : ""}
          aside={<Link href="/conformite" className={styles.more}>Détail</Link>}>
          {(d) => (
            <VerdictHero d={d} consumptionKwh={followUp.ok ? followUp.data.consumptionKwh : null} year={followUp.ok ? followUp.data.year : null} />
          )}
        </Card>
        <div className={styles.heroSide}>
          <KpiTiles k={kpis} />
          <section className={`${styles.next} ${next.code === null ? styles.nextDone : ""}`} aria-labelledby="next-title"
            data-testid="next-action" data-code={next.code ?? "AUCUN"}>
            <span className={styles.label} id="next-title">{next.code === null ? "✓ Tout est renseigné" : "Prochaine étape"}</span>
            <p>{next.reason}</p>
            {next.action.command && <p className={styles.command}>Commande : <code>{next.action.command}</code></p>}
            {next.action.href && <p><Link href={next.action.href} className={styles.button}>{next.action.label}</Link></p>}
          </section>
        </div>
      </div>

      {/* Parcours de la démonstration */}
      <section aria-labelledby="steps-title" data-testid="steps" className={styles.stepsBlock}>
        <h2 id="steps-title" className={styles.sectionTitle}>Parcours de la démonstration</h2>
        <ol className={styles.steps}>
          {s.steps.map((st) => (
            <li key={st.id} className={`${styles.step} ${STEP_MARK[st.state].cls}`} data-testid={`step-${st.id}`} data-state={st.state}>
              <span className={styles.stepMark} aria-hidden="true">{STEP_MARK[st.state].mark}</span>
              <div className={styles.stepBody}>
                {st.href ? <Link href={st.href} className={styles.stepLabel}>{st.label}</Link> : <strong className={styles.stepLabel}>{st.label}</strong>}
                <span className={styles.stepState}>{STATE_LABELS[st.state]}</span>
                <p title={st.detail}>{st.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* 7.2 — frise */}
      <Card title="Trajectoire : de l'année de référence à 2050" id="timeline" section={timeline} className={styles.wide}>
        {(d) => <TimelineView t={d} />}
      </Card>

      {/* Détails */}
      <div className={styles.grid3}>
        <Card title="Site et EFA" id="site" section={site} aside={<Link href="/surfaces" className={styles.more}>Surfaces</Link>}>
          {(d) => (
            <dl>
              <dt>Bâtiment</dt><dd>{d.buildingLabel ?? `${d.postcode} ${d.city}`}</dd>
              <dt>EFA affichée</dt><dd>{d.efaLabel ?? "—"}</dd>
              <dt>Surface</dt><dd data-testid="surface">{fmtM2(d.surfaceM2)}</dd>
              <dt>Zone climatique</dt><dd>{d.zone ?? "—"}</dd>
              <dt>EFA du site</dt><dd>{d.efaCount}</dd>
            </dl>
          )}
        </Card>

        <Card title="Objectifs" id="objectives" section={objectives} aside={<Link href="/comparateur" className={styles.more}>Référence</Link>}>
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

        <Card title="Consommation suivie" id="follow-up" section={followUp} aside={<Link href="/climat" className={styles.more}>Climat</Link>}>
          {(d) => (
            <>
              <dl>
                <dt>Année suivie</dt><dd data-testid="current-year">{d.year}</dd>
                <dt>Brute</dt><dd data-testid="current-kwh">{fmtKwh(d.consumptionKwh)}</dd>
                <dt>Corrigée du climat</dt><dd data-testid="corrected-kwh">{fmtKwh(d.correctedKwh)}</dd>
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

      {/* 7.3 — comparatif */}
      <Card title="Comparatif N-2 / N-1 / N" id="comparison" section={comparison} className={styles.wide}>
        {(d) => <ComparisonView c={d} />}
      </Card>

      {/* Origine des données (à dire au jury) */}
      <details className={styles.originBox} data-testid="data-origin" open>
        <summary>D&apos;où viennent les données ? (réelles et sourcées / fictives)</summary>
        <div className={styles.origin}>
          <section aria-labelledby="real-title">
            <h2 id="real-title">Données réelles et sourcées</h2>
            <ul>{DATA_ORIGIN.real.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
          <section aria-labelledby="fictive-title">
            <h2 id="fictive-title">Données fictives (démonstration)</h2>
            <ul>{DATA_ORIGIN.fictive.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
        </div>
      </details>
    </main>
  );
}
