// Sélecteur d'EFA : mémorise l'EFA choisie dans un cookie, puis revient à la page d'origine.
//   GET /api/efa?id=<efaId>&back=/conformite → 303 vers back, cookie « mira-efa » posé
//   404 si l'EFA n'est pas à l'utilisateur (cloisonnement 9.3) · 401 sans utilisateur
// Lien simple (pas de JavaScript côté client) : toutes les pages lisent ensuite le cookie via resolveUserEfaId.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { EFA_COOKIE, efaParam, resolveUserEfaId, safeBackPath } from "@/modules/batiment";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requested = efaParam(url.searchParams.get("id"));
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Aucun utilisateur connecté." }, { status: 401 });
    const efaId = requested ? await resolveUserEfaId(user.id, requested) : null;
    if (!efaId) return NextResponse.json({ error: "EFA introuvable." }, { status: 404 });
    const response = NextResponse.redirect(new URL(safeBackPath(url.searchParams.get("back")), url.origin), 303);
    response.cookies.set(EFA_COOKIE, efaId, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur interne (la base de données est-elle démarrée ? `npm run db:up`)." }, { status: 500 });
  }
}
