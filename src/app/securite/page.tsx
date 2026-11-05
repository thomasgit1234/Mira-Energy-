import Link from "next/link";
import { DEMO_USERS, getCurrentUser } from "@/lib/session";
import { BatimentError, USER_ROLE_LABELS, isUserRole, loadUserSite, type UserSite } from "@/modules/batiment";
import styles from "@/modules/batiment/BuildingForm.module.css";

// Tâche 9.3 — cloisonnement propriétaire / locataire (D22) : démonstration avec deux comptes fictifs.
export const dynamic = "force-dynamic";

const RULES = [
  { role: "Propriétaire (OWNER) ou administrateur", sees: "toutes les EFA des bâtiments auxquels il est rattaché", edits: "fiche bâtiment, et sur chaque EFA : surfaces, consommations, année de référence" },
  { role: "Locataire (TENANT)", sees: "uniquement les EFA dont il est occupant", edits: "sur son EFA : surfaces, consommations, année de référence ; pas la fiche bâtiment (403)" },
];

export default async function Page() {
  let email: string | null = null;
  let roleLabel = "—";
  let site: UserSite | null = null;
  let problem: string | null = null;
  try {
    const user = await getCurrentUser();
    if (!user) problem = "Aucun utilisateur de démonstration en base : lancez `npm run db:seed`.";
    else {
      email = user.email;
      roleLabel = isUserRole(user.role) ? USER_ROLE_LABELS[user.role] : user.role;
      site = await loadUserSite();
    }
  } catch (e) {
    problem = e instanceof BatimentError ? e.message : "Impossible de joindre la base de données : lancez `npm run db:up`, puis rechargez la page.";
    if (!(e instanceof BatimentError)) console.error(e);
  }

  return (
    <main className="page">
      <Link href="/" className="back">← Carte du projet</Link>
      <p className="eyebrow">Tâche 9.3 · RGPD &amp; sécurité</p>
      <h1>Cloisonnement propriétaire / locataire</h1>
      <p>
        Chaque utilisateur ne voit que les EFA de son périmètre. La règle est appliquée par le serveur, au même endroit pour toutes
        les pages et toutes les API : une EFA hors périmètre répond « introuvable » (404), comme une EFA qui n&apos;existe pas.
      </p>

      <section className={styles.card} aria-labelledby="who-title" data-testid="demo-users">
        <h2 id="who-title">Utilisateur de démonstration</h2>
        <p>Connecté : <strong data-testid="securite-user">{email ?? "aucun"}</strong> ({roleLabel})</p>
        <ul className={styles.efas}>
          {DEMO_USERS.map((u) => (
            <li key={u.email}>
              <span>{u.label}<span className={styles.hint} style={{ display: "block" }}>{u.email}</span></span>
              {u.email === email ? (
                <span className={styles.current}>connecté</span>
              ) : (
                <a href={`/api/securite/demo-user?email=${encodeURIComponent(u.email)}&back=/securite`} data-testid={`switch-${u.email}`}>
                  Se connecter en tant que
                </a>
              )}
            </li>
          ))}
        </ul>
        <p className={styles.hint}>
          Mode démonstration (AUTH_MODE=dev-stub) : ce choix remplace la connexion, qui viendra avec la vraie authentification
          (phase 09). Comptes et données fictifs.
        </p>
      </section>

      <section className={styles.card} aria-labelledby="sees-title" data-testid="visible-efas">
        <h2 id="sees-title">Ce que voit cet utilisateur</h2>
        {site ? (
          <>
            <p>Bâtiment : {site.postcode} {site.city} · {site.efas.length} EFA visible{site.efas.length > 1 ? "s" : ""}</p>
            <ul className={styles.efas}>
              {site.efas.map((e) => (
                <li key={e.id} data-efa-id={e.id}><span>{e.label}</span><Link href={`/dashboard?efa=${encodeURIComponent(e.id)}`}>Synthèse</Link></li>
              ))}
            </ul>
            <p className={styles.hint}>Fiche bâtiment : {site.user.canEditBuilding ? "modifiable" : "lecture seule"}.</p>
          </>
        ) : (
          <p role="alert" style={{ color: "#b3261e" }}>{problem}</p>
        )}
      </section>

      <section className={styles.card} aria-labelledby="rule-title">
        <h2 id="rule-title">Règle (décision D22)</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr><th scope="col" style={{ textAlign: "left" }}>Rôle</th><th scope="col" style={{ textAlign: "left" }}>Voit</th><th scope="col" style={{ textAlign: "left" }}>Peut modifier</th></tr></thead>
            <tbody>
              {RULES.map((r) => (
                <tr key={r.role} style={{ borderTop: "1px solid var(--rule)" }}><td>{r.role}</td><td>{r.sees}</td><td>{r.edits}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.hint}>
          Hypothèse à confirmer avec Mira : le décret prévoit un échange de données entre bailleur et preneur ; ici le propriétaire voit
          les EFA de ses locataires.
        </p>
      </section>

      <p className="hint">
        Prévu, hors démonstration : consentement (9.1), chiffrement des données sensibles (9.2), suppression et export des données
        (9.4), authentification réelle.
      </p>
    </main>
  );
}
