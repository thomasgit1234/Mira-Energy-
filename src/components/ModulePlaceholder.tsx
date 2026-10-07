import Link from "next/link";
import type { ModuleInfo } from "@/modules/registry";

export function ModulePlaceholder({ module }: { module: ModuleInfo }) {
  return (
    <main className="page">
      <Link href="/" className="back">← Carte du projet</Link>
      <p className="eyebrow">Phase {String(module.phase).padStart(2, "0")} · piste {module.track}</p>
      <h1>{module.title}</h1>
      <p>{module.summary}</p>
      <h2>À construire ici</h2>
      <ul>{module.todo.map((t) => <li key={t}>{t}</li>)}</ul>
      <p className="hint">
        Page squelette : remplacez ce fichier. Le code métier va dans <code>src/modules/{module.slug}/</code>.
      </p>
    </main>
  );
}
