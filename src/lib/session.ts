// Utilisateur courant. En phase 00 : mode « dev-stub » (AUTH_MODE=dev-stub) qui renvoie
// toujours un utilisateur de démonstration. La vraie authentification (phase 09, module
// `securite`) remplacera le CORPS de getCurrentUser sans changer sa signature :
// tous les autres modules l'appellent déjà, rien d'autre à modifier.
//
// Tâche 9.3 (démonstration du cloisonnement) : en mode dev-stub UNIQUEMENT, le cookie « mira-demo-user » choisit
// l'utilisateur de démo parmi une liste FERMÉE de comptes fictifs (DEMO_USERS). Toute autre valeur est ignorée.
// Ce n'est pas une authentification : c'est l'équivalent d'un « se connecter en tant que » pour la démo.
import { db } from "@/lib/db";

export type CurrentUser = { id: string; email: string; role: string };

/** Comptes de démonstration (créés par npm run db:seed ; adresses fictives en example.com). */
export const DEMO_USERS = [
  { email: "demo.dupont@example.com", label: "M. Dupont, propriétaire (restaurant et bureaux)" },
  { email: "locataire.demo@example.com", label: "Locataire des bureaux (fictif)" },
] as const;
export const DEMO_USER_COOKIE = "mira-demo-user";

/** Adresse de démo choisie par le cookie, si elle fait partie de DEMO_USERS ; undefined sinon (ou hors requête HTTP). */
export async function chosenDemoEmail(): Promise<string | undefined> {
  try {
    const { cookies } = await import("next/headers");
    const value = (await cookies()).get(DEMO_USER_COOKIE)?.value;
    return DEMO_USERS.some((u) => u.email === value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const mode = process.env.AUTH_MODE ?? "dev-stub";
  if (mode !== "dev-stub") {
    throw new Error(`AUTH_MODE=${mode} : l'authentification réelle n'est pas encore branchée (phase 09).`);
  }
  const email = (await chosenDemoEmail()) ?? process.env.DEV_USER_EMAIL ?? "demo.dupont@example.com";
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } });
  return user;
}
