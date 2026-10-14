// Tâches 6.1 à 6.3 — lecture des données de conformité. Lecture SEULE : aucune écriture en base.
// Les règles sont dans crelat.ts, cabs.ts, verdict.ts et site-efas.ts (pures). Serveur uniquement.
// Contexte du site : zone déduite du code postal du bâtiment (tâche 1.2), tranche d'altitude = constante isolée
// SITE_ALTITUDE_BAND (D15), codes OPERAT = sous-catégories des lignes de surface (référentiel v9.0).
import { join } from "node:path";
import {
  BatimentError, DEPARTMENT_ZONES_FILE, SITE_ALTITUDE_BAND, SITE_ALTITUDE_NOTE, climateZoneForPostcode, loadUserSite, readDepartmentZones,
  type ZoneResult,
} from "@/modules/batiment";
import { ComparateurError, loadComparator } from "@/modules/comparateur";
import { SurfacesError, loadSurfacesContext } from "@/modules/surfaces";
import { computeCabs, type CabsResult } from "./cabs";
import { CABS_DECREE, CABS_FILE, readCabsFile, type AltitudeBand, type CabsRow } from "./cabs-source";
import { computeCrelat, type CrelatResult } from "./crelat";
import { CABS_COVERAGE_NOTE, cabsForEfas, type EfaCabs } from "./site-efas";
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

export type SiteContext = {
  postcode: string;
  city: string;
  /** null si le code postal ne donne pas de département (ex. Corse). */
  department: string | null;
  /** null si la zone n'a pas pu être déduite (le Cabs est alors non calculable). */
  zone: string | null;
  altitudeBand: string;
  sources: { zone: string; altitude: string };
};

export type ConformiteData = {
  buildingLabel: string;
  efaLabel: string;
  reference: { year: number | null; crefKwh: number | null; problem: string | null };
  crelat: CrelatResult;
  cabs: CabsResult & { zone: string | null; altitudeBand: string; decree: string };
  current: { year: number; consumptionKwh: number } | null;
  verdict: Verdict;
  site: SiteContext;
  /** Cabs des autres EFA du site (sans verdict : sélecteur d'EFA à venir, D18). */
  otherEfas: EfaCabs[];
  cabsCoverageNote: string;
};

/** Erreurs des autres modules → même code HTTP (401 non connecté, 404 sans bâtiment…). */
async function from<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (e) {
    if (e instanceof ComparateurError || e instanceof SurfacesError || e instanceof BatimentError) throw new ConformiteError(e.status, e.message);
    throw e;
  }
}

function readZone(postcode: string): ZoneResult {
  try {
    const table = readDepartmentZones(join(process.cwd(), DEPARTMENT_ZONES_FILE));
    if (table.issues.length > 0) return { ok: false, code: "DEPARTEMENT_ABSENT", message: `Table département → zone invalide : ${table.issues.join(" ; ")}` };
    return climateZoneForPostcode(table.rows, postcode);
  } catch (e) {
    return { ok: false, code: "DEPARTEMENT_ABSENT", message: e instanceof Error ? e.message : "Table département → zone illisible." };
  }
}

function readCabsRows(): { ok: true; rows: CabsRow[] } | { ok: false; message: string } {
  try {
    const parsed = readCabsFile(join(process.cwd(), CABS_FILE));
    if (parsed.issues.length > 0) return { ok: false, message: `Fichier Cabs invalide : ${parsed.issues.join(" ; ")}` };
    return { ok: true, rows: parsed.rows };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Fichier Cabs illisible." };
  }
}

export async function loadConformite(): Promise<ConformiteData> {
  const comparator = await from(loadComparator);
  const surfaces = await from(loadSurfacesContext);
  const userSite = await from(loadUserSite);

  // Créf = consommation brute de l'année de référence choisie (tâche 5), seulement si elle est toujours éligible.
  const chosen = comparator.chosenYear;
  const chosenRow = chosen === null ? undefined : comparator.rows.find((r) => r.year === chosen);
  let problem: string | null = null;
  if (chosen === null) problem = "Aucune année de référence choisie.";
  else if (!chosenRow?.eligible) problem = `L'année de référence enregistrée (${chosen}) n'est plus éligible : ${chosenRow?.ineligibleReason ?? "pas de données"}.`;
  const crefKwh = problem === null ? chosenRow!.consumptionKwh : null;
  const crelat: CrelatResult = problem === null ? computeCrelat(crefKwh) : { ok: false, reason: problem };

  // Contexte du site : zone depuis le code postal, altitude en constante, codes OPERAT des lignes de surface.
  const zoneResult = readZone(userSite.postcode);
  const zone = zoneResult.ok ? zoneResult.zone : null;
  const band: AltitudeBand = SITE_ALTITUDE_BAND;
  const site: SiteContext = {
    postcode: userSite.postcode,
    city: userSite.city,
    department: zoneResult.ok ? zoneResult.department : null,
    zone,
    altitudeBand: band,
    sources: {
      zone: zoneResult.ok
        ? `déduite du code postal ${userSite.postcode} (département ${zoneResult.department}, table département → zone OPERAT v9.0)`
        : zoneResult.message,
      altitude: SITE_ALTITUDE_NOTE,
    },
  };

  const cabsRows = readCabsRows();
  let cabs: CabsResult;
  let otherEfas: EfaCabs[] = [];
  if (!cabsRows.ok) cabs = { ok: false, code: "FICHIER_INDISPONIBLE", message: cabsRows.message };
  // Zone inconnue : aucune valeur Cabs ne peut être lue pour ce site (jamais de zone devinée).
  else if (zone === null) cabs = { ok: false, code: "VALEUR_ABSENTE", message: `zone climatique inconnue : ${zoneResult.ok ? "" : zoneResult.message}` };
  else {
    cabs = computeCabs(cabsRows.rows, surfaces.lines.map((l) => ({ code: l.subCategoryCode, surfaceM2: l.surfaceM2 })), zone, band);
    otherEfas = cabsForEfas(cabsRows.rows, userSite.efas.filter((e) => e.id !== surfaces.efaId), zone, band);
  }

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
    site,
    otherEfas,
    cabsCoverageNote: CABS_COVERAGE_NOTE,
  };
}
