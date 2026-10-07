// Tâches 2.2 et 2.1 — accès base du module « collecte » (lecture de l'existant, saisie manuelle, import).
// Les règles sont dans manual.ts (pures) ; l'écriture passe UNIQUEMENT par saveConsumption.
// Serveur uniquement : ne pas importer ce fichier depuis un composant client (types seulement).
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { saveConsumption, type SkippedMonth } from "@/lib/consumption-writer";
import { MIN_YEAR, maxYear, type EnergyType } from "@/lib/domain";
import { isEnergyType, validateManualEntry, type EntryIssue } from "./manual";
import { MAX_IMPORT_ROWS, validateImportRows } from "./csv-import";

export class CollecteError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly issues: unknown[] = [],
  ) {
    super(message);
    this.name = "CollecteError";
  }
}

/** Une ligne du tableau « données déjà collectées ». */
export type CollectedYear = {
  year: number;
  energyType: EnergyType;
  monthCount: number;
  validatedCount: number;
  totalKwh: number;
  sources: string[];
};

export type CollecteContext = {
  efaId: string;
  buildingLabel: string;
  minYear: number;
  maxYear: number;
  collected: CollectedYear[];
};

export type MonthState = { kwh: number; source: string; validated: boolean };

export type YearState = {
  efaId: string;
  year: number;
  energyType: EnergyType;
  /** 12 cases (janvier → décembre) ; null = mois absent en base. */
  months: (MonthState | null)[];
};

export type SaveReport = {
  year: number;
  energyType: EnergyType;
  writtenMonths: number[];
  skipped: SkippedMonth[];
};

async function requireUserEfa() {
  const user = await getCurrentUser();
  if (!user) throw new CollecteError(401, "Aucun utilisateur connecté (lancez `npm run demo` pour créer le compte de démonstration).");
  const efa = await db.eFA.findFirst({
    where: { building: { users: { some: { id: user.id } } } },
    include: { building: true },
    orderBy: { id: "asc" },
  });
  if (!efa) throw new CollecteError(404, "Aucun bâtiment rattaché à cet utilisateur (lancez `npm run db:seed`).");
  return { user, efa };
}

/** Vérifie que l'EFA appartient à l'utilisateur courant (cloisonnement, cf. 9.3). */
export async function assertEfaOwnedByCurrentUser(efaId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new CollecteError(401, "Aucun utilisateur connecté.");
  const efa = await db.eFA.findUnique({ where: { id: efaId }, include: { building: { include: { users: { select: { id: true } } } } } });
  // On ne distingue pas « inexistante » et « pas la vôtre ».
  if (!efa || !efa.building.users.some((u) => u.id === user.id)) throw new CollecteError(404, "EFA introuvable.");
}

export async function loadCollecteContext(): Promise<CollecteContext> {
  const { efa } = await requireUserEfa();
  const consumptions = await db.consumption.findMany({
    where: { efaId: efa.id },
    include: { months: { select: { kwh: true, validated: true, source: true } } },
    orderBy: [{ year: "desc" }, { energyType: "asc" }],
  });
  return {
    efaId: efa.id,
    buildingLabel: `${efa.building.address}, ${efa.building.postcode} ${efa.building.city}`,
    minYear: MIN_YEAR,
    maxYear: maxYear(),
    collected: consumptions
      .filter((c) => isEnergyType(c.energyType))
      .map((c) => ({
        year: c.year,
        energyType: c.energyType as EnergyType,
        monthCount: c.months.length,
        validatedCount: c.months.filter((m) => m.validated).length,
        totalKwh: Math.round(c.months.reduce((s, m) => s + m.kwh, 0) * 100) / 100,
        sources: [...new Set(c.months.map((m) => m.source))].sort(),
      })),
  };
}

export async function loadYear(year: number, energyType: string): Promise<YearState> {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > maxYear()) throw new CollecteError(400, "Année invalide.");
  if (!isEnergyType(energyType)) throw new CollecteError(400, "Énergie invalide.");
  const { efa } = await requireUserEfa();
  const consumption = await db.consumption.findUnique({
    where: { efaId_year_energyType: { efaId: efa.id, year, energyType } },
    include: { months: true },
  });
  const months: (MonthState | null)[] = Array.from({ length: 12 }, () => null);
  for (const m of consumption?.months ?? []) {
    if (m.month >= 1 && m.month <= 12) months[m.month - 1] = { kwh: m.kwh, source: m.source, validated: m.validated };
  }
  return { efaId: efa.id, year, energyType, months };
}

export const manualEntrySchema = z.object({
  efaId: z.string().min(1),
  year: z.number().int(),
  energyType: z.string(),
  months: z.array(z.string().max(40)).length(12),
  validated: z.boolean(),
});

/**
 * Saisie manuelle (mode 2) : contrôle, puis écriture via saveConsumption (source MANUAL).
 * Un mois déjà validé n'est remplacé que si `validated` est vrai (règle D4, dans saveConsumption).
 */
export async function saveManualEntry(rawInput: unknown): Promise<SaveReport> {
  const parsed = manualEntrySchema.safeParse(rawInput);
  if (!parsed.success) throw new CollecteError(400, "Requête invalide.");
  const { efaId, year, energyType, months, validated } = parsed.data;

  await assertEfaOwnedByCurrentUser(efaId);

  const result = validateManualEntry({ year, energyType, months });
  if (!result.ok) throw new CollecteError(422, "La saisie est refusée.", result.issues satisfies EntryIssue[]);

  const saved = await saveConsumption({
    efaId,
    year,
    energyType: energyType as EnergyType,
    source: "MANUAL",
    months: result.months,
    validated,
  });
  return { year, energyType: energyType as EnergyType, writtenMonths: saved.writtenMonths, skipped: saved.skipped };
}

export const importSchema = z.object({
  efaId: z.string().min(1),
  rows: z
    .array(z.object({ year: z.string().max(40), month: z.string().max(40), energy: z.string().max(40), kwh: z.string().max(40) }))
    .min(1)
    .max(MAX_IMPORT_ROWS),
  validated: z.boolean(),
});

/**
 * Import de fichier (mode 1, tâche 2.1) : les lignes relues et corrigées par l'utilisateur sont
 * recontrôlées ici, puis écrites lot par lot (une année × une énergie) via saveConsumption.
 * Source « PDF » = mode 1 « import PDF/Excel » (src/lib/domain.ts).
 */
export async function importRows(rawInput: unknown): Promise<SaveReport[]> {
  const parsed = importSchema.safeParse(rawInput);
  if (!parsed.success) throw new CollecteError(400, "Requête invalide.");
  const { efaId, rows, validated } = parsed.data;

  await assertEfaOwnedByCurrentUser(efaId);

  const check = validateImportRows(rows);
  if (!check.ok) {
    const issues = check.rows.flatMap((r, i) => r.issues.map((x) => ({ line: i + 1, ...x })));
    throw new CollecteError(422, `Import refusé : ${check.errorCount} ligne(s) en erreur.`, issues);
  }

  const reports: SaveReport[] = [];
  for (const batch of check.batches) {
    const saved = await saveConsumption({ efaId, year: batch.year, energyType: batch.energyType, source: "PDF", months: batch.months, validated });
    reports.push({ year: batch.year, energyType: batch.energyType, writtenMonths: saved.writtenMonths, skipped: saved.skipped });
  }
  return reports;
}
