import Link from "next/link";
import { MODULES } from "@/modules/registry";

// Accueil : entrée de la démonstration (parcours de M. Dupont), puis carte du projet pour l'équipe.
const PARCOURS = [
  { href: "/surfaces", title: "Décrire les surfaces", text: "Surface de l'EFA répartie par activité OPERAT." },
  { href: "/collecte", title: "Collecter les consommations", text: "Saisie manuelle ou import CSV, mois par mois." },
  { href: "/climat", title: "Corriger du climat", text: "Méthode OPERAT, station Saint-Quentin, en arrière-plan." },
  { href: "/comparateur", title: "Choisir l'année de référence", text: "Année complète entre 2010 et 2019." },
  { href: "/conformite", title: "Vérifier la conformité", text: "Crelat et Cabs : conforme si au moins une est respectée." },
  { href: "/dashboard", title: "Suivre la trajectoire", text: "Verdict 2030, frise jusqu'à 2050, comparatif annuel." },
] as const;

export default function Home() {
  return (
    <main className="page page-wide">
      <section className="home-hero">
        <p className="eyebrow">Décret tertiaire · prototype</p>
        <h1>Votre bâtiment est-il en règle pour 2030 ?</h1>
        <p className="home-lead">
          Mira Énergie rassemble les surfaces et les consommations d&apos;une entité fonctionnelle (EFA), corrige l&apos;effet du climat et
          calcule les objectifs Crelat et Cabs du décret tertiaire. Démonstration sur un site <strong>fictif</strong> à Laon.
        </p>
        <p className="home-actions">
          <Link href="/dashboard" className="btn-primary">Ouvrir le tableau de bord</Link>
          <Link href="/surfaces" className="btn-secondary">Commencer le parcours</Link>
        </p>
      </section>

      <h2 className="home-h2">Le parcours en six étapes</h2>
      <ol className="home-steps">
        {PARCOURS.map((p, i) => (
          <li key={p.href}>
            <Link href={p.href} className="card">
              <span className="home-step-num" aria-hidden="true">{i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </Link>
          </li>
        ))}
      </ol>

      <details className="home-team">
        <summary>Carte du projet (équipe) : modules, phases et pistes</summary>
        <p>
          Chaque carte est un module avec sa page, son dossier <code>src/modules/…</code> et sa piste de travail.
          Voir <code>README.md</code> et <code>docs/REPARTITION.md</code>.
        </p>
        <ul className="grid">
          {MODULES.map((m) => (
            <li key={m.slug}>
              <Link href={`/${m.slug}`} className="card">
                <p className="eyebrow">Phase {String(m.phase).padStart(2, "0")} · {m.track}</p>
                <h3>{m.title}</h3>
                <p>{m.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="status">État de la base : <a href="/api/health">/api/health</a></p>
      </details>
    </main>
  );
}
