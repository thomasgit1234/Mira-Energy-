// Recherche dans le Référentiel National des Bâtiments (tâche 1.1), faite par le SERVEUR (le navigateur n'appelle pas le RNB).
//   GET /api/batiment/rnb?id=EZNSVN9PD1H5     → { ok, building } : vérifie un ID-RNB
//   GET /api/batiment/rnb?q=1 rue … 02000 Laon → { ok, buildings } : bâtiments à une adresse
// Réservé à un utilisateur connecté (pas de relais ouvert). Toujours 200 : une panne du RNB est un résultat
// { ok: false, code: "RNB_INJOIGNABLE" } que la page affiche (démonstration hors ligne : saisie manuelle).
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { fetchRnbBuilding, searchRnbByAddress } from "@/modules/batiment";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await getCurrentUser())) return NextResponse.json({ error: "Aucun utilisateur connecté." }, { status: 401 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur interne (la base de données est-elle démarrée ? `npm run db:up`)." }, { status: 500 });
  }
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const q = params.get("q");
  if (id) return NextResponse.json(await fetchRnbBuilding(id.slice(0, 40)));
  if (q) return NextResponse.json(await searchRnbByAddress(q.slice(0, 300)));
  return NextResponse.json({ error: "Paramètre attendu : id (ID-RNB) ou q (adresse)." }, { status: 400 });
}
