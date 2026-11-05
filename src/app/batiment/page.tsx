import Link from "next/link";
import { BatimentError, efaParam, formatRnbId, loadBuildingSheet, type BuildingSheet } from "@/modules/batiment";
import { BuildingForm } from "@/modules/batiment/BuildingForm";
import { EfaSelector } from "@/modules/batiment/EfaSelector";
import styles from "@/modules/batiment/BuildingForm.module.css";

// Tâches 1.1 (fiche bâtiment : adresse, ID-RNB) et 1.2 (zone climatique déduite du code postal).
export const dynamic = "force-dynamic";

const ROLE_LABELS: Record<string, string> = { OWNER_OCCUPIER: "propriétaire occupant", LANDLORD: "bailleur", TENANT: "locataire" };
const m2 = (v: number) => `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v)} m²`;

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: PageProps) {
  const efaId = efaParam((await searchParams).efa); // ?efa= explicite, sinon EFA du sélecteur
  let sheet: BuildingSheet | null = null;
  let problem: string | null = null;
  try {
    sheet = await loadBuildingSheet(efaId);
  } catch (e) {
    problem = e instanceof BatimentError ? e.message : "Impossible de joindre la base de données : lancez `npm run db:up`, puis rechargez la page.";
    if (!(e instanceof BatimentError)) console.error(e);
  }

  return (
    <main className="page">
      <Link href="/" className="back">← Carte du projet</Link>
      <p className="eyebrow">Tâches 1.1 et 1.2 · Référentiel bâtiment</p>
      <h1>Fiche bâtiment</h1>
      <EfaSelector back="/batiment" efaId={efaId} />
      {!sheet ? (
        <p role="alert" style={{ color: "#b3261e" }}>{problem}</p>
      ) : (
        <>
          <div className={styles.summary} data-testid="building-summary">
            <div><span className={styles.k}>Adresse</span><span>{sheet.address}, {sheet.postcode} {sheet.city}</span></div>
            <div><span className={styles.k}>ID-RNB</span><span data-testid="rnb-id">{sheet.rnbId ? formatRnbId(sheet.rnbId) : "non renseigné"}</span></div>
            <div><span className={styles.k}>Zone climatique</span><span data-testid="zone-summary">{sheet.zone.ok ? sheet.zone.zone : "non déduite"}</span></div>
            <div><span className={styles.k}>Altitude</span><span>{sheet.altitudeBand === "<400" ? "< 400 m" : sheet.altitudeBand} ({sheet.altitudeNote})</span></div>
            <div><span className={styles.k}>Station climatique</span><span>{sheet.stationCode}</span></div>
          </div>

          <section className={styles.card} aria-labelledby="form-title">
            <h2 id="form-title">Identification du bâtiment</h2>
            <BuildingForm sheet={sheet} canEdit={sheet.canEdit} />
          </section>

          <section className={styles.card} aria-labelledby="efa-title" data-testid="building-efas">
            <h2 id="efa-title">EFA du bâtiment ({sheet.efas.length})</h2>
            <ul className={styles.efas}>
              {sheet.efas.map((e) => (
                <li key={e.id}>
                  <span>
                    {e.label}
                    {e.id === sheet.selectedEfaId && <span className={styles.current}>affichée</span>}
                    <span className={styles.hint} style={{ display: "block" }}>
                      {e.entityType} · {ROLE_LABELS[e.role] ?? e.role} · surface propre {e.ownSurface === null ? "non renseignée (surface du bâtiment)" : m2(e.ownSurface)}
                    </span>
                  </span>
                  <span><Link href={`/surfaces?efa=${encodeURIComponent(e.id)}`}>Surfaces</Link> · <Link href={`/dashboard?efa=${encodeURIComponent(e.id)}`}>Synthèse</Link></span>
                </li>
              ))}
            </ul>
            <p className={styles.hint}>La surface de chaque EFA et sa décomposition par activité OPERAT se saisissent dans la page Surfaces (tâche 1.3).</p>
          </section>

          <p className="hint">
            Le site de démonstration est fictif : n&apos;y rattachez pas l&apos;ID-RNB d&apos;un bâtiment réel pendant la démo, sauf pour montrer la
            recherche. La station climatique (Saint-Quentin, 02320001) et la tranche d&apos;altitude ne se modifient pas ici (voir D15, D16).
          </p>
        </>
      )}
    </main>
  );
}
