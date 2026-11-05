import Link from "next/link";
import { HistoryRequestForm } from "@/modules/collecte/HistoryRequestForm";
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
      <p className="eyebrow">Tâche 2.3 · Collecte, mode 3</p>
      <h1>Demander son historique au gestionnaire de réseau</h1>
      <p>
        Pour reconstituer les années 2010 à 2019, demandez l&apos;historique de consommations à Enedis (électricité) ou GRDF (gaz).
        L&apos;e-mail part de <strong>votre</strong> messagerie, au nom du titulaire du contrat : Mira Énergie n&apos;envoie rien et ne garde rien.
        Le fichier reçu s&apos;importe ensuite avec l&apos;<Link href="/collecte/import">import de fichier</Link>.
      </p>
      {context ? (
        <HistoryRequestForm siteAddress={context.buildingLabel} minYear={context.minYear} maxYear={context.maxYear} />
      ) : (
        <p role="alert" style={{ color: "#b3261e" }}>{problem}</p>
      )}
    </main>
  );
}
