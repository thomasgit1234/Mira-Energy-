// Tâches 4.1 à 4.3 — accès base du module « climat ». Lecture seule : aucune écriture.
// Serveur uniquement : ne pas importer ce fichier depuis un composant client.
import { db } from "@/lib/db";
import type { DjuEntry } from "./dju-source";

/**
 * 4.1 — Table des DJU utilisée par l'application : lue dans la table DjYear, remplie par
 * `npm run db:import` à partir des DJU mensuels Météo-France (data/referentiels/dju/, lus par readDjuFile).
 * climateZone porte provisoirement le code station. Le reste du code ne connaît que des DjuEntry.
 */
export async function loadDjuTable(): Promise<DjuEntry[]> {
  const rows = await db.djYear.findMany({ orderBy: [{ climateZone: "asc" }, { year: "asc" }] });
  return rows.map((r) => ({ zone: r.climateZone, year: r.year, dju: r.dju }));
}
