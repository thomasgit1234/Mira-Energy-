// Utilisateur courant. En phase 00 : mode « dev-stub » (AUTH_MODE=dev-stub) qui renvoie
// toujours l'utilisateur de démonstration. La vraie authentification (phase 09, module
// `securite`) remplacera le CORPS de getCurrentUser sans changer sa signature :
// tous les autres modules l'appellent déjà, rien d'autre à modifier.
import { db } from "@/lib/db";

export type CurrentUser = { id: string; email: string; role: string };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const mode = process.env.AUTH_MODE ?? "dev-stub";
  if (mode !== "dev-stub") {
    throw new Error(`AUTH_MODE=${mode} : l'authentification réelle n'est pas encore branchée (phase 09).`);
  }
  const email = process.env.DEV_USER_EMAIL ?? "demo.dupont@example.com";
  const user = await db.user.findUnique({ where: { email }, select: { id: true, email: true, role: true } });
  return user;
}
