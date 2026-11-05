// Tâches 1.1 / 1.2 — fiche bâtiment : lecture et enregistrement. Serveur uniquement.
// Les règles sont dans building-form.ts (pures) ; ici on charge, on contrôle l'accès et on écrit.
// Le bâtiment modifié est TOUJOURS celui de l'EFA choisie (même règle que les autres pages : loadUserSite).
import { join } from "node:path";
import { z } from "zod";
import { db } from "@/lib/db";
import { validateBuildingInput, zoneForPostcode, type BuildingIssue } from "./building-form";
import { BatimentError, SITE_ALTITUDE_BAND, SITE_ALTITUDE_NOTE, loadUserSite } from "./site";
import { DEPARTMENT_ZONES_FILE, readDepartmentZones } from "./zone-climatique";
import type { DepartmentZone, ZoneResult } from "./zone-rules";

export type BuildingSheet = {
  buildingId: string;
  selectedEfaId: string;
  address: string;
  postcode: string;
  city: string;
  rnbId: string | null;
  surfaceTotal: number;
  /** Station de la correction climatique (Building.climateZone, D16). */
  stationCode: string;
  /** Tâche 1.2 : zone déduite du code postal, ou raison. */
  zone: ZoneResult;
  altitudeBand: string;
  altitudeNote: string;
  efas: { id: string; label: string; role: string; entityType: string; ownSurface: number | null }[];
  /** Table département → zone, pour recalculer la zone dans le formulaire ; null si illisible. */
  departmentZones: DepartmentZone[] | null;
  zoneTableProblem: string | null;
};

export class BuildingSaveError extends BatimentError {
  constructor(status: number, message: string, public readonly issues: BuildingIssue[] = []) {
    super(status, message);
  }
}

function loadZoneTable(): { rows: DepartmentZone[] | null; problem: string | null } {
  try {
    const t = readDepartmentZones(join(process.cwd(), DEPARTMENT_ZONES_FILE));
    return t.issues.length > 0 ? { rows: null, problem: `Table département → zone invalide : ${t.issues.join(" ; ")}` } : { rows: t.rows, problem: null };
  } catch (e) {
    return { rows: null, problem: e instanceof Error ? e.message : "Table département → zone illisible." };
  }
}

/** Fiche du bâtiment de l'EFA choisie (efaId, sinon sélecteur, sinon première EFA). */
export async function loadBuildingSheet(efaId?: string): Promise<BuildingSheet> {
  const site = await loadUserSite(efaId);
  const building = await db.building.findUniqueOrThrow({
    where: { id: site.buildingId },
    include: { efAs: { orderBy: { id: "asc" }, select: { id: true, surfaceTotal: true } } },
  });
  const table = loadZoneTable();
  const ownSurface = new Map(building.efAs.map((e) => [e.id, e.surfaceTotal]));
  return {
    buildingId: building.id,
    selectedEfaId: site.selectedEfaId,
    address: building.address,
    postcode: building.postcode,
    city: building.city,
    rnbId: building.rnbId,
    surfaceTotal: building.surfaceTotal,
    stationCode: building.climateZone,
    zone: zoneForPostcode(table.rows, building.postcode, table.problem ?? undefined),
    altitudeBand: SITE_ALTITUDE_BAND,
    altitudeNote: SITE_ALTITUDE_NOTE,
    efas: site.efas.map((e) => ({ id: e.id, label: e.label, role: e.role, entityType: e.entityType, ownSurface: ownSurface.get(e.id) ?? null })),
    departmentZones: table.rows,
    zoneTableProblem: table.problem,
  };
}

export const saveBuildingSchema = z.object({
  efaId: z.string().min(1).optional(),
  address: z.string().max(500),
  postcode: z.string().max(20),
  city: z.string().max(200),
  rnbId: z.string().max(40).nullable().transform((v) => v ?? ""),
  surfaceTotal: z.union([z.string().max(40), z.number()]),
});

/** Enregistre adresse, code postal, ville, ID-RNB et surface du bâtiment de l'EFA choisie. Ne touche ni aux EFA ni à la station. */
export async function saveBuilding(body: unknown): Promise<BuildingSheet> {
  const parsed = saveBuildingSchema.safeParse(body);
  if (!parsed.success) throw new BuildingSaveError(400, "Requête invalide : adresse, code postal, ville, ID-RNB et surface attendus.");
  const { efaId, ...input } = parsed.data;
  const sheet = await loadBuildingSheet(efaId); // 401 / 404 si l'EFA n'est pas à l'utilisateur
  const check = validateBuildingInput(input, { efaSurfaces: sheet.efas.map((e) => e.ownSurface), stationCode: sheet.stationCode });
  if (!check.ok) throw new BuildingSaveError(422, "Enregistrement refusé : corrigez les points signalés.", check.issues);

  const { rnbId } = check.data;
  if (rnbId) {
    const other = await db.building.findFirst({ where: { rnbId, NOT: { id: sheet.buildingId } }, select: { id: true } });
    if (other) {
      throw new BuildingSaveError(409, "Cet ID-RNB est déjà rattaché à un autre bâtiment.", [
        { field: "rnbId", message: "Cet ID-RNB est déjà rattaché à un autre bâtiment de la plateforme." },
      ]);
    }
  }
  await db.building.update({ where: { id: sheet.buildingId }, data: check.data });
  return loadBuildingSheet(sheet.selectedEfaId);
}
