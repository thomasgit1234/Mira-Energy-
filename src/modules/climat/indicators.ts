// Tâches 4.2 et 4.3 — jointure année / zone et calcul kWh/DJU.
// Fonctions PURES (aucun accès base) : testées dans indicators.test.ts.
//
// Hypothèses (détaillées dans README.md) :
// - consommation annuelle = somme de tous les mois et de toutes les énergies de l'EFA pour l'année ;
// - année complète = chaque énergie présente a ses 12 mois ;
// - mois validés ou non pris tels quels ;
// - kWh/DJU calculé sur la consommation TOTALE : indicateur de suivi, pas une correction climatique rigoureuse.
import type { DjuEntry } from "./dju-source";

/** Zone (ici : code station) comparée sans tenir compte de la casse ni des espaces : « 02037002 » ≡ « 0203 7002 ». */
export function normalizeZone(zone: string): string {
  return zone.replace(/\s/g, "").toUpperCase();
}

/** Un DJU utilisable est un nombre fini strictement positif (on ne divise jamais par 0, un négatif ou NaN). */
export function isValidDju(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** 4.2 — DJU de la zone pour l'année, ou null s'il est absent. */
export function findDju(table: DjuEntry[], zone: string, year: number): number | null {
  const key = normalizeZone(zone);
  return table.find((e) => e.year === year && normalizeZone(e.zone) === key)?.dju ?? null;
}

/** 4.3 — kWh/DJU arrondi à 2 décimales ; null si le DJU n'est pas utilisable ou si la consommation est invalide. */
export function computeKwhPerDju(consumptionKwh: number, dju: unknown): number | null {
  if (!isValidDju(dju)) return null;
  if (typeof consumptionKwh !== "number" || !Number.isFinite(consumptionKwh) || consumptionKwh < 0) return null;
  return Math.round((consumptionKwh / dju) * 100) / 100;
}

export const YEAR_STATUSES = ["OK", "DJU_MANQUANT", "ANNEE_INCOMPLETE", "PAS_DE_CONSOMMATION"] as const;
export type YearStatus = (typeof YEAR_STATUSES)[number];

export const STATUS_LABELS: Record<YearStatus, string> = {
  OK: "OK",
  DJU_MANQUANT: "DJU manquant",
  ANNEE_INCOMPLETE: "Année incomplète (non comparable)",
  PAS_DE_CONSOMMATION: "Pas de consommation",
};

export type ConsumptionInput = { year: number; energyType: string; months: { month: number; kwh: number }[] };

export type YearIndicator = {
  year: number;
  /** Somme de tous les mois et énergies (kWh) ; null si aucune consommation. */
  consumptionKwh: number | null;
  /** Nombre de mois distincts renseignés (toutes énergies confondues). */
  monthCount: number;
  /** DJU utilisé ; null s'il est absent ou invalide. */
  dju: number | null;
  kwhPerDju: number | null;
  status: YearStatus;
};

export type BuildInput = { zone: string; djuTable: DjuEntry[]; consumptions: ConsumptionInput[] };

/** 4.3 — Indicateurs par année, pour l'union des années avec consommation et des années avec DJU de la zone. */
export function buildYearIndicators({ zone, djuTable, consumptions }: BuildInput): YearIndicator[] {
  const key = normalizeZone(zone);
  const byYear = new Map<number, ConsumptionInput[]>();
  for (const c of consumptions) {
    if (c.months.length === 0) continue;
    byYear.set(c.year, [...(byYear.get(c.year) ?? []), c]);
  }
  const years = new Set<number>([...byYear.keys(), ...djuTable.filter((e) => normalizeZone(e.zone) === key).map((e) => e.year)]);

  return [...years].sort((a, b) => a - b).map((year) => {
    const found = findDju(djuTable, zone, year);
    const dju = isValidDju(found) ? found : null;
    const entries = byYear.get(year) ?? [];
    if (entries.length === 0) {
      return { year, consumptionKwh: null, monthCount: 0, dju, kwhPerDju: null, status: "PAS_DE_CONSOMMATION" as const };
    }
    const total = Math.round(entries.reduce((s, c) => s + c.months.reduce((t, m) => t + m.kwh, 0), 0) * 100) / 100;
    const monthCount = new Set(entries.flatMap((c) => c.months.map((m) => m.month))).size;
    if (dju === null) {
      return { year, consumptionKwh: total, monthCount, dju: null, kwhPerDju: null, status: "DJU_MANQUANT" as const };
    }
    const complete = entries.every((c) => new Set(c.months.map((m) => m.month)).size === 12);
    return {
      year,
      consumptionKwh: total,
      monthCount,
      dju,
      kwhPerDju: computeKwhPerDju(total, dju),
      status: complete ? ("OK" as const) : ("ANNEE_INCOMPLETE" as const),
    };
  });
}
