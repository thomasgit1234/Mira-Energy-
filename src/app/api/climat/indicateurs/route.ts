// API de la correction climatique (phase 04). Lecture seule.
//   GET /api/climat/indicateurs → { zone, stationLabel, buildingLabel, activityLabel, surfaceM2, correctionAvailable, problem,
//     rows: [{ year, consumptionKwh, correctedKwh, correctedKwhPerM2, monthCount, status, correction, correctionProblem, unknownShares,
//              months: [{ month, rawKwh, correctedKwh }] }] }
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
