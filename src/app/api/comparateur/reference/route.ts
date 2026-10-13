// API du choix de l'année de référence (tâche 5.3).
//   PUT /api/comparateur/reference → { year, efaId? }
//   200 { ok, chosenYear } · 400 requête invalide · 401 non connecté · 404 EFA d'un autre utilisateur
//   422 { error, issues: [{ code: HORS_PERIODE | PAS_DE_DONNEES | ANNEE_INCOMPLETE, message }] } — rien n'est écrit
//   501 tant que le stockage de l'année de référence n'est pas décidé (aucun champ dans le schéma)
import { NextResponse } from "next/server";
import { ComparateurError, chooseReferenceYear } from "@/modules/comparateur";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json(await chooseReferenceYear(body));
  } catch (e) {
    if (e instanceof ComparateurError) return NextResponse.json({ error: e.message, issues: e.issues }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Erreur interne (la base de données est-elle démarrée ? `npm run db:up`)." }, { status: 500 });
  }
}
