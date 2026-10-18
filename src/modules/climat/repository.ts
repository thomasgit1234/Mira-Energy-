// Accès base du module « climat ». Lecture seule : aucune écriture.
// Serveur uniquement : ne pas importer ce fichier depuis un composant client.
import { join } from "node:path";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { CLIMATE_FILE, CLIMATE_STATION, readClimateFile, type ClimateYear } from "./coefficients-source";
import { buildYearIndicators, type YearIndicator } from "./indicators";
import { ACTIVITY_LABELS, efaCategory } from "./usage-shares";

export class ClimatError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ClimatError";
  }
}

export type ClimatIndicators = {
  /** Code de la station portée par le bâtiment (Building.climateZone, voir D16). */
  zone: string;
  /** « Saint-Quentin (02320001) ». */
  stationLabel: string;
  buildingLabel: string;
  /** Activité de l'EFA (« Restauration », « Bureaux ») ou null si inconnue. */
  activityLabel: string | null;
  /** Surface de l'EFA utilisée pour les kWh/m² (EFA.surfaceTotal, repli sur la surface du bâtiment). */
  surfaceM2: number | null;
  /** Faux si aucune année ne peut être corrigée (fichier absent, autre station) ; la raison est dans `problem`. */
  correctionAvailable: boolean;
  problem: string | null;
  rows: YearIndicator[];
};

/** Fichier climatique de la station : lignes, ou raison de l'indisponibilité. */
export function loadClimateRows(): { rows: ClimateYear[] } | { problem: string } {
  try {
    const parsed = readClimateFile(join(process.cwd(), CLIMATE_FILE));
    if (parsed.issues.length > 0) return { problem: `Fichier climatique invalide (${CLIMATE_FILE}) : ${parsed.issues.join(" ")}` };
    return { rows: parsed.rows };
  } catch (e) {
    return { problem: e instanceof Error ? e.message : `Fichier climatique illisible : ${CLIMATE_FILE}` };
  }
}

/**
 * Consommation brute et corrigée du climat, par année et par mois, pour la première EFA du bâtiment de l'utilisateur
 * courant (D18). Même cloisonnement que les surfaces : sans utilisateur → 401, sans bâtiment → 404.
 */
export async function loadClimatIndicators(): Promise<ClimatIndicators> {
  const user = await getCurrentUser();
  if (!user) throw new ClimatError(401, "Aucun utilisateur connecté (lancez `npm run demo` pour créer le compte de démonstration).");
  const efa = await db.eFA.findFirst({
    where: { building: { users: { some: { id: user.id } } } },
    include: {
      building: true,
      surfaces: { select: { categoryCode: true } },
      consumptions: { include: { months: { select: { month: true, kwh: true } } } },
    },
    orderBy: { id: "asc" },
  });
  if (!efa) throw new ClimatError(404, "Aucun bâtiment rattaché à cet utilisateur (lancez `npm run db:seed`).");

  const zone = efa.building.climateZone.trim();
  const file = loadClimateRows();
  let problem = "problem" in file ? file.problem : null;
  if (!problem && zone !== CLIMATE_STATION.code) {
    problem = `Le bâtiment est rattaché à la station ${zone}, or seule la station ${CLIMATE_STATION.name} (${CLIMATE_STATION.code}) `
      + "a un fichier de correction climatique : lancez `npm run db:seed` pour mettre à jour le site de démonstration.";
  }
  const category = efaCategory(efa.surfaces);
  const surfaceM2 = efa.surfaceTotal ?? efa.building.surfaceTotal ?? null;
  const rows = buildYearIndicators({
    climateRows: "rows" in file ? file.rows : null,
    unavailableReason: problem ?? undefined,
    consumptions: efa.consumptions.map((c) => ({ year: c.year, energyType: c.energyType, months: c.months })),
    category,
    surfaceM2,
  });
  return {
    zone,
    stationLabel: `${CLIMATE_STATION.name} (${CLIMATE_STATION.code})`,
    buildingLabel: `${efa.building.address}, ${efa.building.postcode} ${efa.building.city}`,
    activityLabel: category ? ACTIVITY_LABELS[category] ?? category : null,
    surfaceM2,
    correctionAvailable: problem === null,
    problem,
    rows,
  };
}
