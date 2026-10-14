// Tâches 7.1 / 7.4 — chargement de la synthèse. LECTURE SEULE : aucune écriture en base. Serveur uniquement.
// Appelle les API publiques des modules en parallèle (Promise.allSettled) : une source en échec devient un état vide,
// les autres s'affichent quand même. Toute la logique d'affichage est dans synthesis.ts (pure).
import { loadUserSite } from "@/modules/batiment";
import { loadClimatIndicators } from "@/modules/climat";
import { loadComparator } from "@/modules/comparateur";
import { loadConformite } from "@/modules/conformite";
import { loadSurfacesContext } from "@/modules/surfaces";
import { buildSynthesis, classifyError, type Source, type Synthesis } from "./synthesis";

function toSource<T>(r: PromiseSettledResult<T>): Source<T> {
  if (r.status === "fulfilled") return { ok: true, data: r.value };
  const error = classifyError(r.reason);
  if (error.kind === "ERROR" || error.kind === "DB") console.error(r.reason); // les 401 / 404 sont des états normaux
  return error;
}

/** Synthèse de la première EFA de l'utilisateur. Ne lève jamais d'erreur. */
export async function loadDashboard(): Promise<Synthesis> {
  const [site, surfaces, climat, comparateur, conformite] = await Promise.allSettled([
    loadUserSite(), loadSurfacesContext(), loadClimatIndicators(), loadComparator(), loadConformite(),
  ]);
  return buildSynthesis({
    site: toSource(site),
    surfaces: toSource(surfaces),
    climat: toSource(climat),
    comparateur: toSource(comparateur),
    conformite: toSource(conformite),
  });
}
