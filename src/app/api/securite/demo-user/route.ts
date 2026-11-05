// Tâche 9.3 — démonstration du cloisonnement : « se connecter en tant que » un compte de démo (mode dev-stub uniquement).
//   GET /api/securite/demo-user?email=locataire.demo@example.com&back=/dashboard → 303 vers back, cookie « mira-demo-user »
// Seules les adresses de DEMO_USERS sont acceptées (400 sinon) ; le cookie du sélecteur d'EFA est effacé (nouvel utilisateur).
// Hors mode dev-stub (vraie authentification) : 404, la route n'existe pas.
import { NextResponse } from "next/server";
import { DEMO_USERS, DEMO_USER_COOKIE } from "@/lib/session";
import { EFA_COOKIE, safeBackPath } from "@/modules/batiment";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if ((process.env.AUTH_MODE ?? "dev-stub") !== "dev-stub") return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  const url = new URL(request.url);
  const email = url.searchParams.get("email");
  if (!DEMO_USERS.some((u) => u.email === email)) {
    return NextResponse.json({ error: "Compte de démonstration inconnu." }, { status: 400 });
  }
  const response = NextResponse.redirect(new URL(safeBackPath(url.searchParams.get("back") ?? "/securite"), url.origin), 303);
  response.cookies.set(DEMO_USER_COOKIE, email!, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 });
  response.cookies.delete(EFA_COOKIE);
  return response;
}
