"use client";
// En-tête commun à toutes les pages : marque Mira Énergie et navigation dans l'ordre du parcours de la démo.
// Composant client uniquement pour surligner la page active (usePathname) ; aucun appel à la base.
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/batiment", label: "Bâtiment" },
  { href: "/surfaces", label: "Surfaces" },
  { href: "/collecte", label: "Consommations" },
  { href: "/climat", label: "Climat" },
  { href: "/comparateur", label: "Année de référence" },
  { href: "/conformite", label: "Conformité" },
] as const;

export function AppHeader() {
  const pathname = usePathname() ?? "/";
  return (
    <header className="app-header">
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      <div className="app-header__inner">
        <Link href="/" className="brand" aria-label="Mira Énergie, accueil">
          <span className="brand__mark" aria-hidden="true">M</span>
          <span className="brand__name">Mira Énergie</span>
          <span className="brand__tag">Décret tertiaire</span>
        </Link>
        <nav aria-label="Navigation principale" className="app-nav">
          {NAV.map((n) => {
            const active = pathname === n.href || pathname.startsWith(`${n.href}/`);
            return (
              <Link key={n.href} href={n.href} className={active ? "app-nav__link is-active" : "app-nav__link"} aria-current={active ? "page" : undefined}>
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
