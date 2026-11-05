import { efaParam } from "@/modules/batiment";
import { EfaSelector } from "@/modules/batiment/EfaSelector";
import Link from "next/link";
import {
  COMPARISON_STATE_LABELS, DASHBOARD_BANNER, DATA_ORIGIN, STATE_LABELS, fmtGapKwh, fmtKwh, fmtKwhPerM2, fmtKwhYear, fmtM2, fmtPct,
  loadDashboard, type Comparison, type EmptyState, type Section, type StepState, type Timeline, type VerdictSection,
} from "@/modules/dashboard";
import styles from "@/modules/dashboard/Dashboard.module.css";
import { ROLE_LABELS, TrajectoryChart } from "@/modules/dashboard/TrajectoryChart";
import { STATUS_LABELS } from "@/modules/conformite";

// Tâches 7.1 (synthèse), 7.2 (frise), 7.3 (comparatif N-2 / N-1 / N) et 7.4 (états vides). Lecture seule, rendu serveur : loadDashboard ne lève jamais d'erreur.
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

const STATUS_TAG: Record<VerdictSection["status"], { cls: string; icon: string }> = {
  CONFORME: { cls: styles.tagOk, icon: "✓" },
  NON_CONFORME: { cls: styles.tagKo, icon: "✗" },
  INDETERMINE: { cls: styles.tagNa, icon: "?" },
};
const WAY_SHORT = { CRELAT: "Crelat", CABS: "Cabs", EGALITE: "Crelat = Cabs" } as const;

/** 7.2 — frise : graphique, puis les étapes clés (référence, année suivie, jalons) et le tableau des valeurs. */
function TimelineView({ t }: { t: Timeline }) {
  const ref = t.years.find((y) => y.role === "REFERENCE");
  const current = t.years.find((y) => y.year === t.currentYear);
  return (
    <>
      <TrajectoryChart t={t} />
      {t.objectivesNote && <p className={styles.hint} role="status" data-testid="objectives-note">{t.objectivesNote}</p>}
      <ol className={styles.frise} data-testid="frise">
        <li className={styles.past}>
          <strong>{t.referenceYear ?? "—"}</strong>
          <span>Année de référence</span>
          <span>{ref ? fmtKwh(ref.rawKwh) : "non choisie"}</span>
        </li>
        <li className={styles.past}>
          <strong>{t.currentYear ?? "—"}</strong>
          <span>Année suivie</span>
          <span>{current ? fmtKwh(current.rawKwh) : "aucune année complète"}</span>
        </li>
        {t.milestones.map((m) => (
          <li key={m.year} data-testid={`milestone-${m.year}`}>
            <strong>{m.year}</strong>
            <span>Objectif retenu : {m.targetKwh === null ? "non calculable" : `${fmtKwh(m.targetKwh)} (${WAY_SHORT[m.favorable ?? "CRELAT"]})`}</span>
            <span>Crelat {fmtKwh(m.crelatKwh)} · Cabs {fmtKwh(m.cabsKwh)}</span>
            {m.status && (
              <span><span className={`${styles.tag} ${STATUS_TAG[m.status].cls}`}>{STATUS_TAG[m.status].icon} {STATUS_LABELS[m.status]}</span></span>
            )}
            <span className={styles.hint}>{m.yearsLeft > 0 ? `dans ${m.yearsLeft} an${m.yearsLeft > 1 ? "s" : ""}` : "échéance atteinte"}</span>
          </li>
        ))}
      </ol>
      <details className={styles.values}>
        <summary>Voir les valeurs de la frise</summary>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th scope="col">Année</th><th scope="col">Statut</th><th scope="col">Brute</th><th scope="col">Corrigée du climat</th><th scope="col">Objectif 2030</th></tr></thead>
            <tbody>
              {t.years.map((y) => (
                <tr key={y.year}>
                  <td>{y.year}</td>
                  <td>{ROLE_LABELS[y.role]}</td>
                  <td>{fmtKwh(y.rawKwh)}</td>
                  <td>{fmtKwh(y.correctedKwh)}</td>
                  <td>{y.vsTarget2030 === "SOUS" ? "✓ sous l'objectif" : y.vsTarget2030 === "AU_DESSUS" ? "✗ au-dessus" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

/** 7.3 — comparatif N-2 / N-1 / N : une colonne par année, une ligne par indicateur. */
function ComparisonView({ c }: { c: Comparison }) {
  const cell = (fn: (y: Comparison["years"][number]) => React.ReactNode) => c.years.map((y) => <td key={y.year}>{fn(y)}</td>);
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="comparison-table">
          <thead>
            <tr>
              <th scope="col">Indicateur</th>
              {c.years.map((y) => <th key={y.year} scope="col" data-testid={`col-${y.label}`}>{y.label}<span className={styles.sub}>{y.year}</span></th>)}
            </tr>
          </thead>
          <tbody>
            <tr><th scope="row">État</th>{cell((y) => <span className={styles.sub} data-state={y.state}>{COMPARISON_STATE_LABELS[y.state]}</span>)}</tr>
            <tr><th scope="row">Consommation brute</th>{cell((y) => fmtKwh(y.rawKwh))}</tr>
            <tr><th scope="row">Évolution brute<span className={styles.sub}>par rapport à l&apos;année précédente</span></th>{cell((y) => fmtPct(y.rawChangePct))}</tr>
            <tr><th scope="row">Consommation corrigée du climat</th>{cell((y) => fmtKwh(y.correctedKwh))}</tr>
            <tr><th scope="row">Évolution corrigée<span className={styles.sub}>hors effet du climat</span></th>{cell((y) => fmtPct(y.correctedChangePct))}</tr>
            <tr><th scope="row">kWh corrigés/m²</th>{cell((y) => fmtKwhPerM2(y.correctedKwhPerM2))}</tr>
            <tr>
              <th scope="row">Écart à la référence<span className={styles.sub}>{c.referenceYear ? `Créf ${c.referenceYear} : ${fmtKwh(c.crefKwh)}` : "année de référence non choisie"}</span></th>
              {cell((y) => fmtPct(y.vsCrefPct))}
            </tr>
            <tr>
              <th scope="row">Écart à l&apos;objectif 2030<span className={styles.sub}>{c.target2030Kwh === null ? "objectif non calculable" : `objectif retenu : ${fmtKwh(c.target2030Kwh)}`}</span></th>
              {cell((y) => y.gap2030Kwh === null ? "—" : (
                <span className={`${styles.tag} ${y.gap2030Kwh <= 0 ? styles.tagOk : styles.tagKo}`}>{y.gap2030Kwh <= 0 ? "✓" : "✗"} {fmtGapKwh(y.gap2030Kwh)}</span>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className={styles.hint}>N = dernière année complète hors 2020 et 2021. Une évolution n&apos;est calculée qu&apos;entre deux années
        complètes. Écart négatif à l&apos;objectif = marge sous l&apos;objectif. La conformité se juge sur la consommation brute ; la
        corrigée montre l&apos;évolution sans l&apos;effet de la météo.</p>
    </>
  );
}

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: PageProps) {
  const efaId = efaParam((await searchParams).efa); // ?efa= explicite, sinon EFA du sélecteur
  const s = await loadDashboard(efaId);
  const { site, verdict, objectives, followUp, timeline, comparison } = s.sections;
  const next = s.nextAction;

  return (
    <main className="page">
      <Link href="/" className="back">← Carte du projet</Link>
      <p className="eyebrow">Tâches 7.1 à 7.4 · Tableau de bord</p>
      <h1>Synthèse de l&apos;EFA</h1>
      <EfaSelector back="/dashboard" efaId={efaId} />
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

      <Card title="Frise : de l'année de référence à 2050" id="timeline" section={timeline} className={styles.wide}>
        {(d) => <TimelineView t={d} />}
      </Card>

      <Card title="Comparatif N-2 / N-1 / N" id="comparison" section={comparison} className={styles.wide}>
        {(d) => <ComparisonView c={d} />}
      </Card>

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
