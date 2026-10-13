// Tâches 4.1 à 4.3 — accès base du module « climat ». Lecture seule : aucune écriture.
// Serveur uniquement : ne pas importer ce fichier depuis un composant client.
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { DjuEntry } from "./dju-source";
import { buildYearIndicators, normalizeZone, type YearIndicator } from "./indicators";
import { stationLabel } from "./stations";

/**
 * 4.1 — Table des DJU utilisée par l'application : lue dans la table DjYear, remplie par
 * `npm run db:import` à partir des DJU mensuels Météo-France (data/referentiels/dju/, lus par readDjuFile).
 * climateZone porte provisoirement le code station. Le reste du code ne connaît que des DjuEntry.
 */
export async function loadDjuTable(): Promise<DjuEntry[]> {
  const rows = await db.djYear.findMany({ orderBy: [{ climateZone: "asc" }, { year: "asc" }] });
  return rows.map((r) => ({ zone: r.climateZone, year: r.year, dju: r.dju }));
}

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
  /** Zone du bâtiment (provisoirement : code de la station Météo-France). */
  zone: string;
  stationLabel: string;
  buildingLabel: string;
  /** Vrai si au moins un DJU existe pour la station du bâtiment. */
  hasDju: boolean;
  rows: YearIndicator[];
};

/**
 * 4.3 — Indicateurs kWh/DJU par année pour le bâtiment de l'utilisateur courant.
 * Lecture seule. Même cloisonnement que les surfaces : sans utilisateur → 401, sans bâtiment → 404.
 */
export async function loadClimatIndicators(): Promise<ClimatIndicators> {
  const user = await getCurrentUser();
  if (!user) throw new ClimatError(401, "Aucun utilisateur connecté (lancez `npm run demo` pour créer le compte de démonstration).");
  const efa = await db.eFA.findFirst({
    where: { building: { users: { some: { id: user.id } } } },
    include: { building: true, consumptions: { include: { months: { select: { month: true, kwh: true } } } } },
    orderBy: { id: "asc" },
  });
  if (!efa) throw new ClimatError(404, "Aucun bâtiment rattaché à cet utilisateur (lancez `npm run db:seed`).");

  const zone = efa.building.climateZone;
  const djuTable = await loadDjuTable();
  const rows = buildYearIndicators({
    zone,
    djuTable,
    consumptions: efa.consumptions.map((c) => ({ year: c.year, energyType: c.energyType, months: c.months })),
  });
  return {
    zone,
    stationLabel: stationLabel(zone),
    buildingLabel: `${efa.building.address}, ${efa.building.postcode} ${efa.building.city}`,
    hasDju: djuTable.some((e) => normalizeZone(e.zone) === normalizeZone(zone)),
    rows,
  };
}
