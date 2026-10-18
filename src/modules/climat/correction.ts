// Correction climatique, méthode OPERAT fournie par Mira (D10). Fonctions PURES : testées dans correction.test.ts.
//
// - Référence = moyenne 2001-2020 des degrés-jours de la station (chauffage et climatisation), CALCULÉE depuis le fichier.
// - Coefficient de l'année = référence / valeur de l'année, BORNÉ entre 0,5 et 2 (chauffage et climatisation séparément).
// - Corrigée = brute × part chauffage × coef chauffage + brute × part clim × coef clim + brute × part autres usages.
// - Application MENSUELLE : chaque mois est corrigé avec le coefficient de son année (le fichier est annuel).
// - Une année absente du fichier est « non corrigeable » : jamais de coefficient 0 ou 1 par défaut.
import type { ClimateYear } from "./coefficients-source";
import { sharesFor } from "./usage-shares";

export const CLIMATE_REFERENCE_PERIOD = { from: 2001, to: 2020 } as const;
export const COEFFICIENT_BOUNDS = { min: 0.5, max: 2 } as const;

export type ReferenceDegreeDays = { heating: number; cooling: number };

/** Moyenne des degrés-jours sur la période ; null si une seule année de la période manque. */
export function referenceDegreeDays(
  rows: ClimateYear[],
  from: number = CLIMATE_REFERENCE_PERIOD.from,
  to: number = CLIMATE_REFERENCE_PERIOD.to,
): ReferenceDegreeDays | null {
  const period = rows.filter((r) => r.year >= from && r.year <= to);
  if (to < from || new Set(period.map((r) => r.year)).size !== to - from + 1) return null;
  const mean = (pick: (r: ClimateYear) => number) => period.reduce((s, r) => s + pick(r), 0) / period.length;
  return { heating: mean((r) => r.heatingDegreeDays), cooling: mean((r) => r.coolingDegreeDays) };
}

export type Coefficient = { value: number; clamped: boolean };

/** référence / valeur de l'année, borné à [0,5 ; 2] ; null si l'une des deux valeurs n'est pas un nombre > 0. */
export function boundedCoefficient(reference: unknown, actual: unknown): Coefficient | null {
  const usable = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
  if (!usable(reference) || !usable(actual)) return null;
  const raw = reference / actual;
  const value = Math.min(COEFFICIENT_BOUNDS.max, Math.max(COEFFICIENT_BOUNDS.min, raw));
  return { value, clamped: value !== raw };
}

/** Coefficients d'une année (null par usage si la valeur de l'année est nulle). */
export type YearCoefficients = { year: number; heating: Coefficient | null; cooling: Coefficient | null };

/** Coefficients de l'année, ou null si l'année n'est pas dans le fichier (année « non corrigeable »). */
export function yearCoefficients(rows: ClimateYear[], reference: ReferenceDegreeDays, year: number): YearCoefficients | null {
  const row = rows.find((r) => r.year === year);
  if (!row) return null;
  return {
    year,
    heating: boundedCoefficient(reference.heating, row.heatingDegreeDays),
    cooling: boundedCoefficient(reference.cooling, row.coolingDegreeDays),
  };
}

/** Parts d'usage, en fractions de 1 : chauffage + climatisation + autres = 1. */
export type UsageShares = { heating: number; cooling: number; other: number };

export function validateShares(s: UsageShares): { ok: true } | { ok: false; message: string } {
  const parts = [s.heating, s.cooling, s.other];
  if (parts.some((p) => typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1)) {
    return { ok: false, message: "chaque part doit être comprise entre 0 et 100 %" };
  }
  const total = parts.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 1) > 1e-9) {
    return { ok: false, message: `les parts totalisent ${Math.round(total * 1000) / 10} % au lieu de 100 %` };
  }
  return { ok: true };
}

/**
 * Consommation corrigée d'une quantité brute. null si les parts sont invalides, ou si un usage présent (part > 0)
 * n'a pas de coefficient. Un usage à part nulle n'a pas besoin de coefficient.
 */
export function correctKwh(kwh: number, shares: UsageShares, coefficients: Pick<YearCoefficients, "heating" | "cooling">): number | null {
  if (typeof kwh !== "number" || !Number.isFinite(kwh) || kwh < 0) return null;
  if (!validateShares(shares).ok) return null;
  if (shares.heating > 0 && !coefficients.heating) return null;
  if (shares.cooling > 0 && !coefficients.cooling) return null;
  const heating = shares.heating > 0 ? kwh * shares.heating * coefficients.heating!.value : 0;
  const cooling = shares.cooling > 0 ? kwh * shares.cooling * coefficients.cooling!.value : 0;
  return heating + cooling + kwh * shares.other;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Pas de part connue : rien n'est corrigé (corrigée = brute), et c'est signalé. */
const NO_CORRECTION: UsageShares = { heating: 0, cooling: 0, other: 1 };

export type CorrectionStatus = "CORRIGEE" | "NON_CORRIGEABLE";
export type EnergyMonths = { energyType: string; months: { month: number; kwh: number }[] };
export type CorrectedMonth = { month: number; rawKwh: number; correctedKwh: number | null };
export type CorrectedEnergy = { energyType: string; rawKwh: number; correctedKwh: number | null; sharesKnown: boolean };

export type YearCorrection = {
  year: number;
  rawKwh: number;
  /** null si l'année n'est pas corrigeable. */
  correctedKwh: number | null;
  status: CorrectionStatus;
  /** Mois de l'année, toutes énergies additionnées, triés. */
  months: CorrectedMonth[];
  energies: CorrectedEnergy[];
  /** Énergies sans part connue : comptées sans correction (corrigée = brute). */
  unknownShares: string[];
  /** Raison, en français, quand l'année n'est pas corrigeable. */
  problem: string | null;
};

export type CorrectYearInput = {
  year: number;
  energies: EnergyMonths[];
  /** Catégorie OPERAT de l'EFA (CAP18, CAP04…), ou null si inconnue. */
  category: string | null;
  /** Coefficients de l'année, ou null si l'année n'est pas corrigeable. */
  coefficients: YearCoefficients | null;
  /** Raison à afficher si coefficients est null (fichier absent, station différente…). */
  unavailableReason?: string;
};

/** Corrige chaque mois de chaque énergie avec le coefficient de l'année, puis additionne. */
export function correctYear({ year, energies, category, coefficients, unavailableReason }: CorrectYearInput): YearCorrection {
  const unknownShares: string[] = [];
  let problem: string | null = coefficients
    ? null
    : unavailableReason ?? `${year} est absente du fichier climatique de la station : année non corrigeable.`;
  const monthly = new Map<number, { raw: number; corrected: number }>();
  const corrected: CorrectedEnergy[] = energies.map((e) => {
    const known = sharesFor(category, e.energyType);
    if (!known) unknownShares.push(e.energyType);
    const shares = known ?? NO_CORRECTION;
    const valid = validateShares(shares);
    if (coefficients && !valid.ok && problem === null) problem = `${e.energyType} : parts d'usage invalides (${valid.message}).`;
    let raw = 0;
    let fixed: number | null = 0;
    for (const m of e.months) {
      const c = coefficients ? correctKwh(m.kwh, shares, coefficients) : null;
      if (coefficients && c === null && problem === null) problem = `${year} : coefficient climatique non calculable pour ${e.energyType}.`;
      raw += m.kwh;
      fixed = fixed === null || c === null ? null : fixed + c;
      const slot = monthly.get(m.month) ?? { raw: 0, corrected: 0 };
      slot.raw += m.kwh;
      slot.corrected = c === null ? Number.NaN : slot.corrected + c;
      monthly.set(m.month, slot);
    }
    return { energyType: e.energyType, rawKwh: round2(raw), correctedKwh: fixed === null ? null : round2(fixed), sharesKnown: known !== null };
  });

  const ok = problem === null;
  const rawKwh = round2(corrected.reduce((s, e) => s + e.rawKwh, 0));
  const total = [...monthly.values()].reduce((s, m) => s + m.corrected, 0);
  return {
    year,
    rawKwh,
    correctedKwh: ok ? round2(total) : null,
    status: ok ? "CORRIGEE" : "NON_CORRIGEABLE",
    months: [...monthly]
      .sort(([a], [b]) => a - b)
      .map(([month, m]) => ({ month, rawKwh: round2(m.raw), correctedKwh: ok ? round2(m.corrected) : null })),
    energies: ok ? corrected : corrected.map((e) => ({ ...e, correctedKwh: null })),
    unknownShares,
    problem,
  };
}

/** kWh/m², 2 décimales ; null si la surface n'est pas un nombre > 0 ou si la consommation manque. */
export function kwhPerM2(kwh: number | null, surfaceM2: number | null | undefined): number | null {
  if (kwh === null || !Number.isFinite(kwh)) return null;
  if (typeof surfaceM2 !== "number" || !Number.isFinite(surfaceM2) || surfaceM2 <= 0) return null;
  return round2(kwh / surfaceM2);
}
