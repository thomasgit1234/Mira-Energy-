// API de la conformité (tâches 6.1 à 6.3). Lecture seule.
//   GET /api/conformite → { buildingLabel, efaLabel, reference, crelat, cabs, current, verdict, provisionalContext }
import { NextResponse } from "next/server";
import { ConformiteError, loadConformite } from "@/modules/conformite";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadConformite());
  } catch (e) {
    if (e instanceof ConformiteError) return NextResponse.json({ error: e.message, issues: [] }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Erreur interne (la base de données est-elle démarrée ? `npm run db:up`)." }, { status: 500 });
  }
}
