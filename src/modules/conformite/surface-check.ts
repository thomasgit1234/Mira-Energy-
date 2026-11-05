// Cohérence des surfaces avant le Cabs. Fonction PURE : testée dans surface-check.test.ts.
// Règle 1.3 (D14) : la somme des lignes de surface doit égaler la surface de l'EFA. Si ce n'est pas le cas,
// le Cabs (seuil × surface) serait calculé sur une surface fausse : on le déclare non calculable plutôt
// que d'afficher un objectif faux (D13). Arrondi au centième de m², comme la validation du module surfaces.
import type { CabsResult } from "./cabs";

const round = (v: number) => Math.round(v * 100) / 100;
const m2 = (v: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v);

/** Renvoie le Cabs tel quel si la somme des lignes = surface de l'EFA, sinon SURFACES_INCOHERENTES. */
export function checkCabsSurface(cabs: CabsResult, efaSurfaceM2: number): CabsResult {
  if (!cabs.ok) return cabs;
  if (round(cabs.surfaceTotal) === round(efaSurfaceM2)) return cabs;
  return {
    ok: false,
    code: "SURFACES_INCOHERENTES",
    message:
      `la somme des lignes de surface (${m2(cabs.surfaceTotal)} m²) ne correspond pas à la surface de l'EFA ` +
      `(${m2(efaSurfaceM2)} m²) : corrigez la décomposition des surfaces.`,
  };
}
