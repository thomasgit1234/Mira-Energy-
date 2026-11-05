// API des surfaces (tâche 1.3).
//   GET /api/surfaces  → contexte (total déclaré, lignes enregistrées, référentiel)
//   PUT /api/surfaces  → { efaId, lines: [{ categoryCode, subCategoryCode, surfaceM2 }] }
import { efaParam } from "@/modules/batiment";
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

// ?efa=<id> : EFA explicite (404 si elle n'est pas à l'utilisateur) ; sans paramètre, EFA du sélecteur (cookie).
export async function GET(request: Request) {
  try {
    return NextResponse.json(await loadSurfacesContext(efaParam(new URL(request.url).searchParams.get("efa"))));
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
