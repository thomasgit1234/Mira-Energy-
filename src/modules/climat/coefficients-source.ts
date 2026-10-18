// Lecture de la SOURCE de la correction climatique (méthode OPERAT, fournie par Mira).
//
// ⚠️ C'est le SEUL fichier qui connaît le format du fichier climatique (D9). Si le format change, on ne réécrit que
// parseClimateCsv. Le reste du code (correction.ts, indicators.ts, page) ne manipule que des ClimateYear.
//
// Fichier : data/referentiels/climat/coefficients_saint_quentin_02320001.csv — une ligne par année :
//   annee;dju_chauffage;dju_climatisation
//   2001;2897.6;196.8
// - station Saint-Quentin 02320001 (station OPERAT de l'Aisne), degrés-jours « professionnels de l'énergie »,
//   seuil 18 °C, chauffage et climatisation ;
// - séparateur « ; », point ou virgule décimale, UTF-8 (BOM possible), lignes vides ignorées.
// Ces valeurs ne sont jamais affichées : elles servent seulement à calculer les coefficients (correction.ts).
import { existsSync, readFileSync } from "node:fs";
import { parseCsv } from "@/lib/csv";

/** Station dont le fichier donne les valeurs. Le bâtiment doit porter ce code dans climateZone (D16). */
export const CLIMATE_STATION = { code: "02320001", name: "Saint-Quentin" } as const;
export const CLIMATE_FILE = "data/referentiels/climat/coefficients_saint_quentin_02320001.csv";

/** Degrés-jours annuels de la station (chauffage et climatisation). */
export type ClimateYear = { year: number; heatingDegreeDays: number; coolingDegreeDays: number };

export type ParsedClimate = {
  /** Années lues, triées. */
  rows: ClimateYear[];
  /** Problèmes en français ; un seul problème rend le fichier inutilisable. */
  issues: string[];
};

/** Minuscules, sans accents, espaces ni « _ » : « DJU_Chauffage » → « djuchauffage ». */
function normalizeHeader(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s_\-()]/g, "");
}

const COLUMNS = {
  year: { label: "annee", aliases: ["annee", "year"] },
  heating: { label: "dju_chauffage", aliases: ["djuchauffage"] },
  cooling: { label: "dju_climatisation", aliases: ["djuclimatisation"] },
} as const;
type Column = keyof typeof COLUMNS;

/** « 2 897,6 » ou « 2897.6 » → 2897.6 ; NaN si ce n'est pas un nombre. */
function parseNumber(text: string): number {
  const t = text.replace(/\s/g, "").replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
}

export function parseClimateCsv(text: string): ParsedClimate {
  const records = parseCsv(text, ";");
  if (records.length === 0) return { rows: [], issues: ["Le fichier climatique ne contient aucune ligne de données."] };

  const headers = Object.keys(records[0]);
  const col = {} as Record<Column, string | undefined>;
  for (const key of Object.keys(COLUMNS) as Column[]) {
    col[key] = headers.find((h) => (COLUMNS[key].aliases as readonly string[]).includes(normalizeHeader(h)));
  }
  const missing = (Object.keys(COLUMNS) as Column[]).filter((k) => !col[k]).map((k) => COLUMNS[k].label);
  if (missing.length > 0) return { rows: [], issues: [`Colonne(s) manquante(s) dans le fichier climatique : ${missing.join(", ")}.`] };

  const issues: string[] = [];
  const byYear = new Map<number, ClimateYear>();
  records.forEach((r, i) => {
    const line = `Ligne ${i + 2}`; // ligne 1 = en-tête (les lignes vides sont ignorées par parseCsv)
    const yearText = (r[col.year!] ?? "").trim();
    const year = /^\d{4}$/.test(yearText) ? Number(yearText) : Number.NaN;
    if (Number.isNaN(year)) return void issues.push(`${line} : année « ${yearText} » illisible.`);
    const values: number[] = [];
    for (const key of ["heating", "cooling"] as const) {
      const raw = (r[col[key]!] ?? "").trim();
      const value = parseNumber(raw);
      if (Number.isNaN(value)) return void issues.push(`${line} : ${COLUMNS[key].label} « ${raw} » non numérique.`);
      if (value < 0) return void issues.push(`${line} : ${COLUMNS[key].label} négatif (${raw}).`);
      values.push(value);
    }
    if (byYear.has(year)) return void issues.push(`${line} : année ${year} en double.`);
    byYear.set(year, { year, heatingDegreeDays: values[0], coolingDegreeDays: values[1] });
  });
  return { rows: [...byYear.values()].sort((a, b) => a.year - b.year), issues };
}

/** Lit le fichier climatique sur disque. Fichier absent → erreur explicite. */
export function readClimateFile(path: string): ParsedClimate {
  if (!existsSync(path)) throw new Error(`Fichier climatique introuvable : ${path}`);
  return parseClimateCsv(readFileSync(path, "utf8"));
}
