// Tâches 6.1 à 6.3 — lecture des données de conformité. Lecture SEULE : aucune écriture en base.
// Les règles sont dans crelat.ts, cabs.ts et verdict.ts (pures). Serveur uniquement.
import { join } from "node:path";
import { ComparateurError, loadComparator } from "@/modules/comparateur";
import { SurfacesError, loadSurfacesContext } from "@/modules/surfaces";
import { computeCabs, type CabsResult } from "./cabs";
import { CABS_DECREE, CABS_FILE, readCabsFile, type AltitudeBand } from "./cabs-source";
import { computeCrelat, type CrelatResult } from "./crelat";
// ⚠️ Seul endroit où le contexte provisoire est utilisé (voir provisional.ts).
import { DEMO_SITE, DEMO_SUBCATEGORY_TO_OPERAT, PROVISIONAL_NOTE } from "./provisional";
import { evaluateVerdict, pickCurrentYear, type Verdict } from "./verdict";

export class ConformiteError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ConformiteError";
  }
}

export type ConformiteData = {
  buildingLabel: string;
  efaLabel: string;
  reference: { year: number | null; crefKwh: number | null; problem: string | null };
  crelat: CrelatResult;
  cabs: CabsResult & { zone: string; altitudeBand: string; decree: string };
  current: { year: number; consumptionKwh: number } | null;
  verdict: Verdict;
  provisionalContext: { zone: string; altitudeBand: string; subCategoryToOperat: Record<string, string>; note: string };
};

/** Erreurs des autres modules → même code HTTP (401 non connecté, 404 sans bâtiment…). */
async function from<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (e) {
    if (e instanceof ComparateurError || e instanceof SurfacesError) throw new ConformiteError(e.status, e.message);
    throw e;
  }
}

function loadCabs(lines: { subCategoryCode: string; surfaceM2: number }[], zone: string, band: AltitudeBand): CabsResult {
  let parsed;
  try {
    parsed = readCabsFile(join(process.cwd(), CABS_FILE));
  } catch (e) {
    return { ok: false, code: "FICHIER_INDISPONIBLE", message: e instanceof Error ? e.message : "Fichier Cabs illisible." };
  }
  if (parsed.issues.length > 0) {
    return { ok: false, code: "FICHIER_INDISPONIBLE", message: `Fichier Cabs invalide : ${parsed.issues.join(" ; ")}` };
  }
  const operatLines = lines.map((l) => ({ code: DEMO_SUBCATEGORY_TO_OPERAT[l.subCategoryCode] ?? l.subCategoryCode, surfaceM2: l.surfaceM2 }));
  return computeCabs(parsed.rows, operatLines, zone, band);
}

export async function loadConformite(): Promise<ConformiteData> {
  const comparator = await from(loadComparator);
  const surfaces = await from(loadSurfacesContext);

  // Créf = consommation brute de l'année de référence choisie (tâche 5), seulement si elle est toujours éligible.
  const chosen = comparator.chosenYear;
  const chosenRow = chosen === null ? undefined : comparator.rows.find((r) => r.year === chosen);
  let problem: string | null = null;
  if (chosen === null) problem = "Aucune année de référence choisie.";
  else if (!chosenRow?.eligible) problem = `L'année de référence enregistrée (${chosen}) n'est plus éligible : ${chosenRow?.ineligibleReason ?? "pas de données"}.`;
  const crefKwh = problem === null ? chosenRow!.consumptionKwh : null;
  const crelat: CrelatResult = problem === null ? computeCrelat(crefKwh) : { ok: false, reason: problem };

  const zone = DEMO_SITE.zone;
  const band = DEMO_SITE.altitudeBand;
  const cabs = loadCabs(surfaces.lines, zone, band);

  const current = pickCurrentYear(comparator.rows);
  const verdict = evaluateVerdict({ crelat, cabs, currentKwh: current?.consumptionKwh ?? null, currentYear: current?.year ?? null, referenceYear: chosen });

  return {
    buildingLabel: comparator.buildingLabel,
    efaLabel: comparator.efaLabel,
    reference: { year: chosen, crefKwh, problem },
    crelat,
    cabs: { ...cabs, zone, altitudeBand: band, decree: CABS_DECREE },
    current,
    verdict,
    provisionalContext: { zone, altitudeBand: band, subCategoryToOperat: { ...DEMO_SUBCATEGORY_TO_OPERAT }, note: PROVISIONAL_NOTE },
  };
}
