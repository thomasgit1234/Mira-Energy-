// API de la synthèse (tâches 7.1 et 7.4). Lecture seule.
//   GET /api/dashboard → { sections: { site, verdict, objectives, followUp }, steps, empties, nextAction }
// Toujours 200 : une donnée manquante ou une source injoignable est un ÉTAT décrit dans le corps (7.4), pas une erreur HTTP.
import { NextResponse } from "next/server";
import { loadDashboard } from "@/modules/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await loadDashboard());
}
