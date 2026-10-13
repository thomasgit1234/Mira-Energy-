// API du comparateur d'années (tâches 5.1 et 5.2). Lecture seule.
//   GET /api/comparateur → { buildingLabel, efaLabel, efaId, rows, suggested, chosenYear }
import { NextResponse } from "next/server";
import { ComparateurError, loadComparator } from "@/modules/comparateur";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadComparator());
  } catch (e) {
    if (e instanceof ComparateurError) return NextResponse.json({ error: e.message, issues: e.issues }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Erreur interne (la base de données est-elle démarrée ? `npm run db:up`)." }, { status: 500 });
  }
}
