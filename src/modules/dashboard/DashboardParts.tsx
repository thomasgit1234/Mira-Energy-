// Morceaux d'affichage du tableau de bord (composants serveur, sans état). Les données viennent de loadDashboard :
// aucun calcul ici, seulement de la mise en forme. Les data-testid sont repris par les recettes (docs/RECETTE-7.md).
import Link from "next/link";
import { STATUS_LABELS } from "@/modules/conformite";
import styles from "./Dashboard.module.css";
import { fmtGapKwh, fmtKwh, fmtKwhPerM2, fmtPct } from "./format";
import type { Kpis } from "./kpis";
import { COMPARISON_STATE_LABELS, type Comparison, type Timeline } from "./trajectory";
import { ROLE_LABELS, TrajectoryChart } from "./TrajectoryChart";
import type { EmptyState, MethodResult, Section, VerdictSection } from "./synthesis";

const WAY_SHORT = { CRELAT: "Crelat", CABS: "Cabs", EGALITE: "Crelat = Cabs" } as const;
export const STATUS_TONE: Record<VerdictSection["status"], string> = { CONFORME: styles.toneOk, NON_CONFORME: styles.toneKo, INDETERMINE: styles.toneWarn };
const STATUS_TAG: Record<VerdictSection["status"], { cls: string; icon: string }> = {
  CONFORME: { cls: styles.tagOk, icon: "✓" },
  NON_CONFORME: { cls: styles.tagKo, icon: "✗" },
  INDETERMINE: { cls: styles.tagNa, icon: "?" },
};

/** État vide : un message et UNE action (bouton vers une page, et/ou commande à lancer faute de page). */
export function Empty({ e }: { e: EmptyState }) {
  return (
    <div className={styles.empty} role="status" data-testid="empty" data-code={e.code}>
      <p>{e.message}</p>
      {e.action.command && <p className={styles.command}>Commande : <code>{e.action.command}</code></p>}
      {e.action.href && <Link href={e.action.href} className={styles.button}>{e.action.label}</Link>}
    </div>
  );
}

export function Card<T>({ title, id, section, className, aside, children }: {
  title: string; id: string; section: Section<T>; className?: string; aside?: React.ReactNode; children: (data: T) => React.ReactNode;
}) {
  return (
    <section className={`${styles.card} ${className ?? ""}`} aria-labelledby={`${id}-title`} data-testid={id}>
      <div className={styles.cardHead}>
        <h2 id={`${id}-title`}>{title}</h2>
        {aside}
      </div>
      {section.ok ? children(section.data) : <Empty e={section.empty} />}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Verdict 2030 : statut en grand, puis une barre par méthode (conforme si AU MOINS UNE est satisfaite).

/** Barre « consommation / objectif » d'une méthode. Le repère vertical est l'objectif ; la barre, la consommation suivie. */
function MethodBar({ name, result, consumptionKwh }: { name: string; result: MethodResult; consumptionKwh: number | null }) {
  if (!result) {
    return (
      <div className={styles.method} data-testid={`method-${name}`} data-met="NA">
        <div className={styles.methodHead}><strong>{name}</strong><span className={styles.muted}>non calculable</span></div>
      </div>
    );
  }
  const scale = Math.max(result.objectiveKwh, consumptionKwh ?? 0) * 1.08 || 1;
  const used = consumptionKwh === null ? 0 : (consumptionKwh / scale) * 100;
  const target = (result.objectiveKwh / scale) * 100;
  const met = result.met;
  return (
    <div className={styles.method} data-testid={`method-${name}`} data-met={met === null ? "NA" : met ? "OUI" : "NON"}>
      <div className={styles.methodHead}>
        <strong>{name}</strong>
        <span>objectif {fmtKwh(result.objectiveKwh)}</span>
      </div>
      <div className={styles.meter} role="img"
        aria-label={`${name} : consommation ${fmtKwh(consumptionKwh)} pour un objectif de ${fmtKwh(result.objectiveKwh)}`}>
        <span className={`${styles.meterFill} ${met === false ? styles.meterKo : styles.meterOk}`} style={{ width: `${Math.min(100, used)}%` }} />
        <span className={styles.meterTarget} style={{ left: `${Math.min(100, target)}%` }} />
      </div>
      <p className={styles.methodNote}>
        {met === null ? "Pas encore d'année suivie."
          : met ? <>✓ Respecté · marge {fmtKwh(Math.abs(result.gapKwh ?? 0))}</>
          : <>✗ Dépassé de {fmtKwh(result.gapKwh ?? 0)}</>}
      </p>
    </div>
  );
}

export function VerdictHero({ d, consumptionKwh, year }: { d: VerdictSection; consumptionKwh: number | null; year: number | null }) {
  return (
    <>
      <p className={styles.status} data-testid="verdict-status" data-status={d.status}>
        <span className={styles.icon} aria-hidden="true">{d.icon}</span>{d.statusLabel}
      </p>
      <p className={styles.verdictMsg}>{d.message}</p>
      <div className={styles.methods}>
        <MethodBar name="Crelat 2030" result={d.methods.crelat} consumptionKwh={consumptionKwh} />
        <MethodBar name="Cabs" result={d.methods.cabs} consumptionKwh={consumptionKwh} />
      </div>
      <p className={styles.small}>
        Conforme si <strong>au moins une</strong> des deux méthodes est respectée{year ? ` (consommation ${year} : ${fmtKwh(consumptionKwh)})` : ""}.
        Méthode retenue : <strong data-testid="retained">{d.retainedLabel}</strong>. Voie la plus favorable : {d.favorableLabel}.
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Indicateurs clés.

function Tile({ label, value, sub, tone, testId }: { label: string; value: string; sub?: React.ReactNode; tone?: string; testId: string }) {
  return (
    <div className={`${styles.tile} ${tone ?? ""}`} data-testid={testId}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{value}</span>
      {sub && <span className={styles.tileSub}>{sub}</span>}
    </div>
  );
}

export function KpiTiles({ k }: { k: Kpis }) {
  const margin = k.target2030?.marginKwh ?? null;
  return (
    <div className={styles.tiles} data-testid="kpis">
      <Tile testId="kpi-current" label={k.current ? `Consommation ${k.current.year}` : "Consommation suivie"}
        value={k.current ? fmtKwh(k.current.rawKwh) : "—"} sub={k.current ? "brute, toutes énergies" : "aucune année complète"} />
      <Tile testId="kpi-reference" label={k.vsReference ? `Depuis ${k.vsReference.referenceYear}` : "Depuis la référence"}
        value={k.vsReference ? fmtPct(k.vsReference.pct) : "—"}
        tone={k.vsReference ? (k.vsReference.pct <= 0 ? styles.toneOk : styles.toneKo) : undefined}
        sub={k.vsReference ? "évolution de la consommation brute" : "année de référence à choisir"} />
      <Tile testId="kpi-target" label="Objectif 2030 retenu"
        value={k.target2030 ? fmtKwh(k.target2030.kwh) : "—"}
        tone={margin === null ? undefined : margin >= 0 ? styles.toneOk : styles.toneKo}
        sub={k.target2030 ? <>{WAY_SHORT[k.target2030.way]}{margin !== null ? ` · ${margin >= 0 ? "marge" : "dépassement"} ${fmtKwh(Math.abs(margin))}` : ""}</> : "non calculable"} />
      <Tile testId="kpi-intensity" label="Intensité corrigée" value={fmtKwhPerM2(k.correctedKwhPerM2)} sub="corrigée du climat, par m²" />
    </div>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// 7.2 — frise.

export function TimelineView({ t }: { t: Timeline }) {
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
            <span className={styles.muted}>Crelat {fmtKwh(m.crelatKwh)} · Cabs {fmtKwh(m.cabsKwh)}</span>
            {m.status && (
              <span><span className={`${styles.tag} ${STATUS_TAG[m.status].cls}`}>{STATUS_TAG[m.status].icon} {STATUS_LABELS[m.status]}</span></span>
            )}
            <span className={styles.muted}>{m.yearsLeft > 0 ? `dans ${m.yearsLeft} an${m.yearsLeft > 1 ? "s" : ""}` : "échéance atteinte"}</span>
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

// ---------------------------------------------------------------------------------------------------------------
// 7.3 — comparatif N-2 / N-1 / N.

export function ComparisonView({ c }: { c: Comparison }) {
  const cell = (fn: (y: Comparison["years"][number]) => React.ReactNode) => c.years.map((y) => <td key={y.year} className={y.label === "N" ? styles.colN : undefined}>{fn(y)}</td>);
  const trend = (v: number | null) => (v === null ? "—" : <span className={v <= 0 ? styles.down : styles.up}>{v <= 0 ? "↘" : "↗"} {fmtPct(v)}</span>);
  return (
    <>
      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="comparison-table">
          <thead>
            <tr>
              <th scope="col">Indicateur</th>
              {c.years.map((y) => (
                <th key={y.year} scope="col" data-testid={`col-${y.label}`} className={y.label === "N" ? styles.colN : undefined}>
                  {y.label}<span className={styles.sub}>{y.year}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr><th scope="row">État</th>{cell((y) => <span className={styles.sub} data-state={y.state}>{COMPARISON_STATE_LABELS[y.state]}</span>)}</tr>
            <tr><th scope="row">Consommation brute</th>{cell((y) => fmtKwh(y.rawKwh))}</tr>
            <tr><th scope="row">Évolution brute<span className={styles.sub}>par rapport à l&apos;année précédente</span></th>{cell((y) => trend(y.rawChangePct))}</tr>
            <tr><th scope="row">Consommation corrigée du climat</th>{cell((y) => fmtKwh(y.correctedKwh))}</tr>
            <tr><th scope="row">Évolution corrigée<span className={styles.sub}>hors effet du climat</span></th>{cell((y) => trend(y.correctedChangePct))}</tr>
            <tr><th scope="row">kWh corrigés/m²</th>{cell((y) => fmtKwhPerM2(y.correctedKwhPerM2))}</tr>
            <tr>
              <th scope="row">Écart à la référence<span className={styles.sub}>{c.referenceYear ? `Créf ${c.referenceYear} : ${fmtKwh(c.crefKwh)}` : "année de référence non choisie"}</span></th>
              {cell((y) => trend(y.vsCrefPct))}
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
