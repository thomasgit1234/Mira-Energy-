// COUCHE D'ÉCRITURE COMMUNE DES CONSOMMATIONS (phase 02).
//
// Les 5 modes de collecte (import PDF, saisie manuelle, export espace client, API simulée…)
// écrivent TOUS par `saveConsumption`. Chaque mode n'a donc qu'à produire une liste de
// mois { month, kwh } : il ne touche jamais directement aux tables Consumption / ConsumptionMonth.
// C'est ce qui permet de développer les modes en parallèle sans se marcher dessus.
//
// Règles (décision D4 dans docs/DECISIONS.md) :
//  - une seule ligne Consumption par (EFA, année, énergie) ;
//  - chaque mois garde sa propre `source` ;
//  - une valeur DÉJÀ VALIDÉE par l'utilisateur n'est jamais écrasée par une valeur non validée.
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { CONSUMPTION_SOURCES, ENERGY_TYPES, MIN_YEAR, maxYear } from "@/lib/domain";

export const monthInputSchema = z.object({
  month: z.number().int().min(1).max(12),
  kwh: z.number().finite().min(0),
  confidence: z.number().min(0).max(1).nullable().optional(), // score OCR, si le mode en fournit un
});

export const saveConsumptionSchema = z.object({
  efaId: z.string().min(1),
  year: z.number().int().min(MIN_YEAR).max(maxYear()),
  energyType: z.enum(ENERGY_TYPES),
  source: z.enum(CONSUMPTION_SOURCES),
  months: z.array(monthInputSchema).min(1).max(12),
  validated: z.boolean().default(false), // true = l'utilisateur a relu et validé ces valeurs
  rawData: z.unknown().optional(), // métadonnées brutes (facture, export) — stockées dans Consumption.data
});

export type SaveConsumptionInput = z.input<typeof saveConsumptionSchema>;
export type MonthInput = z.infer<typeof monthInputSchema>;

export type ExistingMonth = { month: number; kwh: number; validated: boolean };
export type SkippedMonth = { month: number; reason: "ALREADY_VALIDATED" | "DUPLICATE_IN_INPUT" };
export type MonthWritePlan = { toWrite: MonthInput[]; skipped: SkippedMonth[] };

/**
 * Décide quels mois écrire (fonction pure, testée dans consumption-writer.test.ts).
 * - un mois présent deux fois dans la saisie : le premier est gardé, les suivants sont ignorés ;
 * - un mois déjà validé en base n'est écrasé que si la nouvelle valeur est elle aussi validée.
 */
export function planMonthWrites(existing: ExistingMonth[], incoming: MonthInput[], incomingValidated: boolean): MonthWritePlan {
  const existingByMonth = new Map(existing.map((m) => [m.month, m]));
  const seen = new Set<number>();
  const toWrite: MonthInput[] = [];
  const skipped: SkippedMonth[] = [];

  for (const m of incoming) {
    if (seen.has(m.month)) {
      skipped.push({ month: m.month, reason: "DUPLICATE_IN_INPUT" });
      continue;
    }
    seen.add(m.month);
    const current = existingByMonth.get(m.month);
    if (current?.validated && !incomingValidated) {
      skipped.push({ month: m.month, reason: "ALREADY_VALIDATED" });
      continue;
    }
    toWrite.push(m);
  }
  return { toWrite, skipped };
}

export type SaveConsumptionResult = {
  consumptionId: string;
  writtenMonths: number[];
  skipped: SkippedMonth[];
};

export async function saveConsumption(rawInput: SaveConsumptionInput): Promise<SaveConsumptionResult> {
  const input = saveConsumptionSchema.parse(rawInput);

  return db.$transaction(async (tx) => {
    const consumption = await tx.consumption.upsert({
      where: { efaId_year_energyType: { efaId: input.efaId, year: input.year, energyType: input.energyType } },
      create: {
        efaId: input.efaId,
        year: input.year,
        energyType: input.energyType,
        source: input.source,
        data: (input.rawData ?? {}) as Prisma.InputJsonValue,
        validated: input.validated,
      },
      update: {
        source: input.source, // dernière source utilisée ; la vérité reste ConsumptionMonth.source
        ...(input.rawData !== undefined ? { data: input.rawData as Prisma.InputJsonValue } : {}),
        ...(input.validated ? { validated: true } : {}),
      },
    });

    const existing = await tx.consumptionMonth.findMany({
      where: { consumptionId: consumption.id },
      select: { month: true, kwh: true, validated: true },
    });
    const plan = planMonthWrites(existing, input.months, input.validated);

    for (const m of plan.toWrite) {
      await tx.consumptionMonth.upsert({
        where: { consumptionId_year_month: { consumptionId: consumption.id, year: input.year, month: m.month } },
        create: {
          consumptionId: consumption.id,
          year: input.year,
          month: m.month,
          kwh: m.kwh,
          source: input.source,
          confidence: m.confidence ?? null,
          validated: input.validated,
        },
        update: { kwh: m.kwh, source: input.source, confidence: m.confidence ?? null, validated: input.validated },
      });
    }

    return { consumptionId: consumption.id, writtenMonths: plan.toWrite.map((m) => m.month), skipped: plan.skipped };
  });
}
