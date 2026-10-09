// Tâche 2.2 — règles de la saisie manuelle des consommations (une année, une énergie, 12 cases).
// Fonctions PURES (aucun accès base) : testées dans manual.test.ts, utilisées à la fois par
// le formulaire (contrôle en direct) et par le serveur (contrôle avant saveConsumption).
import type { MonthInput } from "@/lib/consumption-writer";
import { ENERGY_TYPES, MIN_YEAR, maxYear, type EnergyType } from "@/lib/domain";

export const MONTH_LABELS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
] as const;

export const ENERGY_LABELS: Record<EnergyType, string> = { ELECTRICITY: "Électricité", GAS: "Gaz" };

/**
 * Lit un nombre de kWh saisi « à la française » : "1 234,5" → 1234.5.
 * Renvoie null pour une case vide, NaN pour un texte qui n'est pas un nombre.
 */
export function parseKwh(text: string | null | undefined): number | null {
  // \s couvre aussi les espaces insécables (U+00A0, U+202F) produits par Excel et Intl.NumberFormat
  const t = (text ?? "").replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
}

export function isEnergyType(value: string): value is EnergyType {
  return (ENERGY_TYPES as readonly string[]).includes(value);
}

export type EntryIssue = {
  code: "INVALID_YEAR" | "INVALID_ENERGY" | "WRONG_MONTH_COUNT" | "INVALID_KWH" | "NEGATIVE_KWH" | "NO_MONTH";
  message: string;
  /** Mois concerné (1-12) ; absent pour une erreur globale. */
  month?: number;
};

export type ManualEntryInput = { year: number; energyType: string; months: string[] };

export type ManualEntryResult = {
  ok: boolean;
  issues: EntryIssue[];
  /** Mois remplis et valides, prêts pour saveConsumption. */
  months: MonthInput[];
  /** Total des mois valides, en kWh. */
  total: number;
};

export function validateManualEntry(input: ManualEntryInput, now = new Date()): ManualEntryResult {
  const issues: EntryIssue[] = [];
  const months: MonthInput[] = [];
  const last = maxYear(now);

  if (!Number.isInteger(input.year) || input.year < MIN_YEAR || input.year > last) {
    issues.push({ code: "INVALID_YEAR", message: `L'année doit être comprise entre ${MIN_YEAR} et ${last}.` });
  }
  if (!isEnergyType(input.energyType)) {
    issues.push({ code: "INVALID_ENERGY", message: "Choisissez une énergie (électricité ou gaz)." });
  }
  if (input.months.length !== 12) {
    issues.push({ code: "WRONG_MONTH_COUNT", message: "La saisie doit comporter exactement 12 mois." });
    return { ok: false, issues, months, total: 0 };
  }

  input.months.forEach((text, i) => {
    const month = i + 1;
    const kwh = parseKwh(text);
    if (kwh === null) return; // case vide = mois non saisi
    if (Number.isNaN(kwh)) {
      issues.push({ code: "INVALID_KWH", month, message: `${MONTH_LABELS[i]} : « ${text.trim()} » n'est pas un nombre de kWh.` });
    } else if (kwh < 0) {
      issues.push({ code: "NEGATIVE_KWH", month, message: `${MONTH_LABELS[i]} : une consommation ne peut pas être négative.` });
    } else {
      months.push({ month, kwh });
    }
  });

  const hasMonthIssue = issues.some((x) => x.month !== undefined);
  if (months.length === 0 && !hasMonthIssue) {
    issues.push({ code: "NO_MONTH", message: "Renseignez au moins un mois." });
  }

  const total = Math.round(months.reduce((s, m) => s + m.kwh, 0) * 100) / 100;
  return { ok: issues.length === 0, issues, months, total };
}
