import Link from "next/link";
import { ImportForm } from "@/modules/collecte/ImportForm";
import { CollecteError, loadCollecteContext, type CollecteContext } from "@/modules/collecte";

export const dynamic = "force-dynamic";

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
      <Link href="/collecte" className="back">← Collecte des données</Link>
      <p className="eyebrow">Tâche 2.1 · Collecte, mode 1</p>
      <h1>Import d&apos;un fichier</h1>
      <p>Importez un fichier CSV de consommations mensuelles (exporté depuis Excel), relisez et corrigez les valeurs, puis enregistrez-les.</p>
      {context ? (
        <>
          <p style={{ color: "var(--muted)" }}>{context.buildingLabel}</p>
          <ImportForm efaId={context.efaId} />
        </>
      ) : (
        <p role="alert" style={{ color: "#b3261e" }}>{problem}</p>
      )}
      <p className="hint">Import PDF (lecture automatique de factures) : prévu, hors démo.</p>
    </main>
  );
}
