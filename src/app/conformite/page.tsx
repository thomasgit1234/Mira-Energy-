import Link from "next/link";
import { RAW_NOTICE } from "@/modules/comparateur";
import {
  ConformiteError, STATUS_LABELS, WAY_LABELS, loadConformite, type ConformiteData, type MethodOutcome, type VerdictStatus,
} from "@/modules/conformite";
import styles from "@/modules/conformite/Conformite.module.css";

export const dynamic = "force-dynamic";

/** Bandeau de démonstration : à retirer quand les données et le site seront réels. */
const DEMO_BANNER = "Données de consommation fictives. Site de démonstration fictif (Laon).";

const kwh = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const m2 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const fmt = (v: number | null | undefined) => (v === null || v === undefined || !Number.isFinite(v) ? "—" : kwh.format(v));
const signed = (v: number | null) => (v === null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${kwh.format(Math.abs(v))}`);

const VERDICT_STYLE: Record<VerdictStatus, { box: string; icon: string }> = {
  CONFORME: { box: styles.ok, icon: "✓" },
  NON_CONFORME: { box: styles.ko, icon: "✗" },
  INDETERMINE: { box: styles.unknown, icon: "?" },
};

function Met({ o }: { o: MethodOutcome }) {
  if (!o.calculable) return <span className={`${styles.pill} ${styles.pillNa}`}>non calculable</span>;
  if (o.met === null) return <span className={`${styles.pill} ${styles.pillNa}`}>pas de consommation</span>;
  return o.met ? <span className={`${styles.pill} ${styles.pillOk}`}>✓ atteint</span> : <span className={`${styles.pill} ${styles.pillKo}`}>✗ non atteint</span>;
}

export default async function Page() {
  let data: ConformiteData | null = null;
  let problem: string | null = null;
  try {
    data = await loadConformite();
  } catch (e) {
    problem = e instanceof ConformiteError ? e.message : "Impossible de joindre la base de données : lancez `npm run db:up`, puis rechargez la page.";
    if (!(e instanceof ConformiteError)) console.error(e);
  }

  return (
    <main className="page">
      <Link href="/" className="back">← Carte du projet</Link>
      <p className="eyebrow">Tâches 6.1 à 6.3 · Conformité au décret tertiaire</p>
      <h1>Conformité de l&apos;EFA</h1>
      <p className={styles.banner} role="note" data-testid="demo-banner">{DEMO_BANNER}</p>
      <p>L&apos;EFA est <strong>conforme si au moins une</strong> des deux méthodes est satisfaite : l&apos;objectif relatif (Crelat) ou
        l&apos;objectif en valeur absolue (Cabs). Le décret permet de retenir la plus favorable.</p>
      <p className={styles.hint} data-testid="raw-notice">{RAW_NOTICE} Consommations en kWh d&apos;énergie finale (électricité PRM et gaz PCE).</p>

      {problem && <p role="alert" className={styles.error} data-testid="problem">{problem}</p>}
      {data && <Content data={data} />}
    </main>
  );
}

function Content({ data }: { data: ConformiteData }) {
  const { verdict, crelat, cabs, current, reference } = data;
  const main = verdict.main;
  const style = VERDICT_STYLE[main.status];
  const favorableText = main.favorable === null ? "aucune (aucune méthode calculable)"
    : main.favorable === "EGALITE" ? "les deux objectifs sont égaux" : WAY_LABELS[main.favorable];
  const crelatMain = main.crelat;
  const cabsMain = main.cabs;

  return (
    <>
      <p className={styles.meta}>{data.buildingLabel} — {data.efaLabel}</p>

      <section className={`${styles.verdict} ${style.box}`} aria-labelledby="verdict-title" data-testid="verdict" data-status={main.status}>
        <span className={styles.label} id="verdict-title">Verdict 2030</span>
        <span className={styles.status}><span className={styles.icon} aria-hidden="true">{style.icon}</span>{STATUS_LABELS[main.status]}</span>
        <p>{main.message}</p>
        <p className={styles.favorable} data-testid="favorable">Voie la plus favorable : {favorableText}.</p>
        <p className={styles.hint}>
          Consommation suivie : {current ? <>année {current.year}, <strong>{fmt(current.consumptionKwh)} kWh</strong></> : "aucune année complète hors 2020 et 2021"}.
        </p>
      </section>

      {!current && (
        <p className={styles.notice} role="status">Pas de consommation complète à comparer : renseignez la <Link href="/collecte">collecte des données</Link>.</p>
      )}
      {reference.year === null && (
        <p className={styles.notice} role="status" data-testid="no-reference">
          Objectif relatif non calculable : choisissez une année de référence dans le <Link href="/comparateur">comparateur d&apos;années</Link>.
        </p>
      )}
      {reference.year !== null && reference.problem && <p className={styles.notice} role="status">{reference.problem} <Link href="/comparateur">Comparateur</Link></p>}
      {!cabs.ok && cabs.code === "SURFACE_MANQUANTE" && (
        <p className={styles.notice} role="status">Objectif Cabs non calculable : renseignez la <Link href="/surfaces">décomposition des surfaces</Link>.</p>
      )}
      {!cabs.ok && cabs.code !== "SURFACE_MANQUANTE" && <p className={styles.notice} role="status" data-testid="cabs-problem">Objectif Cabs non calculable : {cabs.message}</p>}

      <div className={styles.columns}>
        <section className={`${styles.card} ${main.favorable === "CRELAT" ? styles.cardBest : ""}`} aria-labelledby="crelat-title" data-testid="crelat">
          <h2 id="crelat-title">Objectif relatif (Crelat)</h2>
          <dl>
            <dt>Année de référence</dt><dd>{reference.year ?? <span className={styles.missing}>non choisie</span>}</dd>
            <dt>Créf (kWh)</dt><dd>{fmt(reference.crefKwh)}</dd>
            {crelat.ok ? (
              <>
                <dt>Objectif 2030 (−40 %)</dt><dd data-testid="crelat-2030">{fmt(crelat.objectives[2030])}</dd>
                <dt>Objectif 2040 (−50 %)</dt><dd data-testid="crelat-2040">{fmt(crelat.objectives[2040])}</dd>
                <dt>Objectif 2050 (−60 %)</dt><dd data-testid="crelat-2050">{fmt(crelat.objectives[2050])}</dd>
              </>
            ) : (
              <><dt>Objectifs</dt><dd className={styles.missing}>{crelatMain.calculable ? "" : crelatMain.reason}</dd></>
            )}
            <dt>Consommation {current ? current.year : "actuelle"} (kWh)</dt><dd>{fmt(current?.consumptionKwh)}</dd>
            <dt>Écart à l&apos;objectif 2030 (kWh)</dt><dd>{crelatMain.calculable ? signed(crelatMain.gapKwh) : "—"}</dd>
            <dt>2030</dt><dd><Met o={crelatMain} /></dd>
          </dl>
        </section>

        <section className={`${styles.card} ${main.favorable === "CABS" ? styles.cardBest : ""}`} aria-labelledby="cabs-title" data-testid="cabs">
          <h2 id="cabs-title">Objectif en valeur absolue (Cabs)</h2>
          <dl>
            <dt>Zone · altitude</dt><dd data-testid="cabs-zone">{cabs.zone ?? <span className={styles.missing}>inconnue</span>} · {cabs.altitudeBand} m ({data.site.sources.altitude})</dd>
            {cabs.ok ? (
              <>
                {cabs.perLine.map((l, i) => (
                  <span key={i} style={{ display: "contents" }}>
                    <dt>Seuil {l.code} · {m2.format(l.surfaceM2)} m² (kWh/m²/an)</dt><dd data-testid="cabs-threshold">{fmt(l.threshold)} <span className={styles.hint}>({l.cvc} CVC + {l.use} USE)</span></dd>
                  </span>
                ))}
                <dt>Surface (m²)</dt><dd data-testid="cabs-surface">{m2.format(cabs.surfaceTotal)}</dd>
                <dt>Objectif (kWh/an)</dt><dd data-testid="cabs-objective">{fmt(cabs.objectiveKwh)}</dd>
              </>
            ) : (
              <><dt>Objectif</dt><dd className={styles.missing}>non calculable</dd></>
            )}
            <dt>Consommation {current ? current.year : "actuelle"} (kWh)</dt><dd>{fmt(current?.consumptionKwh)}</dd>
            <dt>Écart à l&apos;objectif (kWh)</dt><dd>{cabsMain.calculable ? signed(cabsMain.gapKwh) : "—"}</dd>
            <dt>2030</dt><dd><Met o={cabsMain} /></dd>
          </dl>
          <p className={styles.hint}>Source : {cabs.decree} — indicateurs d&apos;usage à leur valeur étalon.</p>
        </section>
      </div>

      <div className={styles.scroll}>
        <table className={styles.table} data-testid="milestones">
          <caption>Jalons 2030 (verdict), 2040 et 2050 (pour information) — écart = consommation − objectif</caption>
          <thead>
            <tr>
              <th scope="col">Jalon</th><th scope="col" className={styles.num}>Objectif Crelat</th><th scope="col">Crelat</th>
              <th scope="col" className={styles.num}>Objectif Cabs</th><th scope="col">Cabs</th><th scope="col">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {verdict.milestones.map((m) => (
              <tr key={m.milestone} data-testid={`milestone-${m.milestone}`}>
                <th scope="row">{m.milestone}</th>
                <td className={styles.num}>{m.crelat.calculable ? fmt(m.crelat.objectiveKwh) : "—"}</td>
                <td><Met o={m.crelat} />{m.crelat.calculable && m.crelat.gapKwh !== null && <span className={styles.hint}> ({signed(m.crelat.gapKwh)})</span>}</td>
                <td className={styles.num}>{m.cabs.calculable ? fmt(m.cabs.objectiveKwh) : "—"}</td>
                <td><Met o={m.cabs} />{m.cabs.calculable && m.cabs.gapKwh !== null && <span className={styles.hint}> ({signed(m.cabs.gapKwh)})</span>}</td>
                <td><strong>{STATUS_LABELS[m.status]}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.otherEfas.length > 0 && (
        <section className={styles.card} aria-labelledby="other-efas-title" data-testid="other-efas">
          <h2 id="other-efas-title">Autres EFA du site</h2>
          <p className={styles.hint}>Objectif Cabs seulement. Crelat et verdict : à venir avec le sélecteur d&apos;EFA.</p>
          <dl>
            {data.otherEfas.map((e) => (
              <span key={e.id} style={{ display: "contents" }}>
                <dt>EFA {e.codes.join(", ") || "sans ligne de surface"} · {m2.format(e.surfaceTotal)} m²</dt>
                <dd data-testid="other-efa-cabs" data-ok={e.cabs.ok}>
                  {e.cabs.ok ? <>{fmt(e.cabs.objectiveKwh)} kWh/an</> : (
                    <span className={styles.missing}>
                      Cabs non calculable : {e.cabs.message}{e.cabs.code === "SOUS_CATEGORIE_INCONNUE" ? ` ${data.cabsCoverageNote}` : ""}
                    </span>
                  )}
                </dd>
              </span>
            ))}
          </dl>
        </section>
      )}

      <p className={styles.hint} data-testid="site">
        Site : {data.site.postcode} {data.site.city} — zone {data.site.zone ?? "inconnue"} ({data.site.sources.zone}) ; tranche
        d&apos;altitude {data.site.altitudeBand} m ({data.site.sources.altitude}). Codes d&apos;activité : référentiel OPERAT v9.0.
      </p>
    </>
  );
}
