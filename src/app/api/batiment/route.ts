// API de la fiche bâtiment (tâches 1.1 et 1.2).
//   GET /api/batiment[?efa=<id>]  → fiche du bâtiment de l'EFA choisie (adresse, ID-RNB, surface, zone déduite, EFA)
//   PUT /api/batiment             → { efaId?, address, postcode, city, rnbId, surfaceTotal } ; 422 avec `issues` si refusé
import { NextResponse } from "next/server";
import { BatimentError, BuildingSaveError, efaParam, loadBuildingSheet, saveBuilding } from "@/modules/batiment";

export const dynamic = "force-dynamic";

function fail(e: unknown) {
  if (e instanceof BuildingSaveError) return NextResponse.json({ error: e.message, issues: e.issues }, { status: e.status });
  if (e instanceof BatimentError) return NextResponse.json({ error: e.message }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: "Erreur interne (la base de données est-elle démarrée ? `npm run db:up`)." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    return NextResponse.json(await loadBuildingSheet(efaParam(new URL(request.url).searchParams.get("efa"))));
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(request: Request) {
  try {
    return NextResponse.json({ ok: true, sheet: await saveBuilding(await request.json().catch(() => null)) });
  } catch (e) {
    return fail(e);
  }
}
