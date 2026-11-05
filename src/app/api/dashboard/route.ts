// API de la synthèse (tâches 7.1 et 7.4). Lecture seule.
//   GET /api/dashboard → { sections: { site, verdict, objectives, followUp }, steps, empties, nextAction }
// Toujours 200 : une donnée manquante ou une source injoignable est un ÉTAT décrit dans le corps (7.4), pas une erreur HTTP.
import { efaParam } from "@/modules/batiment";
import { NextResponse } from "next/server";
import { loadDashboard } from "@/modules/dashboard";

export const dynamic = "force-dynamic";

// ?efa=<id> : EFA explicite (404 si elle n'est pas à l'utilisateur) ; sans paramètre, EFA du sélecteur (cookie).
export async function GET(request: Request) {
  return NextResponse.json(await loadDashboard(efaParam(new URL(request.url).searchParams.get("efa"))));
}
