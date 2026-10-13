// API des indicateurs climatiques (tâches 4.1 à 4.3). Lecture seule.
//   GET /api/climat/indicateurs → { zone, stationLabel, buildingLabel, hasDju, rows: [{ year, consumptionKwh, monthCount, dju, kwhPerDju, status }] }
import { NextResponse } from "next/server";
import { ClimatError, loadClimatIndicators } from "@/modules/climat";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await loadClimatIndicators());
  } catch (e) {
    if (e instanceof ClimatError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Erreur interne (la base de données est-elle démarrée ? `npm run db:up`)." }, { status: 500 });
  }
}
