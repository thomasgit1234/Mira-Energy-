// API des surfaces (tâche 1.3).
//   GET /api/surfaces  → contexte (total déclaré, lignes enregistrées, référentiel)
//   PUT /api/surfaces  → { efaId, lines: [{ categoryCode, subCategoryCode, surfaceM2 }] }
import { NextResponse } from "next/server";
import { loadSurfacesContext, saveSurfaceLines, SurfacesError } from "@/modules/surfaces";

export const dynamic = "force-dynamic";

function fail(e: unknown) {
  if (e instanceof SurfacesError) {
    return NextResponse.json({ error: e.message, issues: e.issues }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Erreur interne (la base de données est-elle démarrée ? `npm run db:up`)." }, { status: 500 });
}

export async function GET() {
  try {
    return NextResponse.json(await loadSurfacesContext());
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const lines = await saveSurfaceLines(body);
    return NextResponse.json({ ok: true, lines });
  } catch (e) {
    return fail(e);
  }
}
