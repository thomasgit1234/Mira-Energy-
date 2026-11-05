import { efaParam } from "@/modules/batiment";
import { EfaSelector } from "@/modules/batiment/EfaSelector";
import Link from "next/link";
import { SurfaceForm } from "@/modules/surfaces/SurfaceForm";
import { loadSurfacesContext, SurfacesError, type SurfacesContext } from "@/modules/surfaces";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: PageProps) {
  const efaId = efaParam((await searchParams).efa); // ?efa= explicite, sinon EFA du sélecteur
  let context: SurfacesContext | null = null;
  let problem: string | null = null;
  try {
    context = await loadSurfacesContext(efaId);
  } catch (e) {
    problem = e instanceof SurfacesError ? e.message : "Impossible de joindre la base de données : lancez `npm run db:up`, puis rechargez la page.";
    if (!(e instanceof SurfacesError)) console.error(e);
  }

  return (
    <main className="page">
      <Link href="/" className="back">← Carte du projet</Link>
      <p className="eyebrow">Tâche 1.3 · Référentiel bâtiment</p>
      <h1>Décomposition des surfaces</h1>
      <EfaSelector back="/surfaces" efaId={efaId} />
      <p>Répartissez la surface totale déclarée du bâtiment par catégorie et sous-catégorie d&apos;activité. La somme des lignes doit être égale à la surface totale.</p>
      {context ? <SurfaceForm context={context} /> : <p role="alert" style={{ color: "#b3261e" }}>{problem}</p>}
    </main>
  );
}
