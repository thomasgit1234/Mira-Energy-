import Link from "next/link";
import { MODULES } from "@/modules/registry";

export default function Home() {
  return (
    <main className="page">
      <p className="eyebrow">Projet de fin d&apos;études · socle commun (phase 00)</p>
      <h1>Mira Énergie</h1>
      <p>
        Carte du projet : chaque carte est un module avec sa page, son dossier <code>src/modules/…</code> et sa piste de travail.
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
    </main>
  );
}
