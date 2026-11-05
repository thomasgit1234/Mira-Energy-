// API de la conformité (tâches 6.1 à 6.3). Lecture seule.
//   GET /api/conformite → { buildingLabel, efaLabel, reference, crelat, cabs, current, verdict, site, otherEfas, cabsCoverageNote }
import { efaParam } from "@/modules/batiment";
import { NextResponse } from "next/server";
import { ConformiteError, loadConformite } from "@/modules/conformite";

export const dynamic = "force-dynamic";

// ?efa=<id> : EFA explicite (404 si elle n'est pas à l'utilisateur) ; sans paramètre, EFA du sélecteur (cookie).
export async function GET(request: Request) {
  try {
    return NextResponse.json(await loadConformite(efaParam(new URL(request.url).searchParams.get("efa"))));
  } catch (e) {
    if (e instanceof ConformiteError) return NextResponse.json({ error: e.message, issues: [] }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Erreur interne (la base de données est-elle démarrée ? `npm run db:up`)." }, { status: 500 });
  }
}
