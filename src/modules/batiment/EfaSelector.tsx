// Sélecteur d'EFA, commun à toutes les pages (composant serveur, sans JavaScript côté client).
// Chaque option est un lien vers /api/efa qui mémorise le choix (cookie) puis revient sur la page `back`.
// Si le site ne peut pas être lu (base arrêtée, pas de bâtiment), le sélecteur ne s'affiche pas : la page gère déjà l'erreur.
import styles from "./EfaSelector.module.css";
import { loadUserSite, type UserSite } from "./site";

type Props = { back: string; efaId?: string };

export async function EfaSelector({ back, efaId }: Props) {
  let site: UserSite;
  try {
    site = await loadUserSite(efaId);
  } catch {
    return null;
  }
  return (
    <>
    <p className={styles.user} data-testid="current-user" data-role={site.user.role}>
      Utilisateur : <strong>{site.user.email}</strong> ({site.user.roleLabel}) · <a href="/securite">changer</a>
    </p>
    <nav className={styles.selector} aria-label="Choix de l'EFA" data-testid="efa-selector">
      <span className={styles.label}>EFA :</span>
      {site.efas.map((e) => {
        const current = e.id === site.selectedEfaId;
        return (
          <a
            key={e.id}
            href={`/api/efa?id=${encodeURIComponent(e.id)}&back=${encodeURIComponent(back)}`}
            className={`${styles.option} ${current ? styles.current : ""}`}
            aria-current={current ? "page" : undefined}
            data-efa-id={e.id}
          >
            {e.label}
          </a>
        );
      })}
    </nav>
    </>
  );
}
