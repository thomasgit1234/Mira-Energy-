// Tâche 4.1 — lecture de la SOURCE des DJU (degrés-jours unifiés).
//
// ⚠️ C'est le SEUL fichier qui connaît le format du fichier DJU. Si le format change, on ne réécrit que
// parseDjuCsv. Le reste du code (import en base, calcul kWh/DJU, page) ne manipule que des
// DjuEntry { zone, year, dju }, où zone = code de la station Météo-France.
//
// Source : Météo-France, Licence Ouverte 2.0 (données climatologiques quotidiennes, département 02).
// Fichier : data/referentiels/dju/dju_mensuel_2010_2025.csv — une ligne par station et par mois :
//   code_station;nom_station;annee;mois;DJU_chauffage_base18;DJ_refroid_base18;jours_mesures
//   02037002;AULNOIS-SOUS-LAON (...);2010;1;555,4;0,0;31
// - DJU chauffage, méthode « Météo » base 18 : max(0 ; 18 − (TN + TX) / 2) par jour, sommé par mois ;
// - séparateur « ; », virgule décimale, UTF-8 (BOM possible), lignes vides ignorées ;
// - nom_station et DJ_refroid_base18 ne sont pas utilisés.
// DJU annuel = somme des 12 mois, produit seulement si les 12 mois sont présents et complets
// (jours_mesures = nombre réel de jours du mois, années bissextiles comprises).
import { existsSync, readFileSync } from "node:fs";
import { parseCsv } from "@/lib/csv";
import { normalizeZone } from "./indicators";

export type DjuEntry = { zone: string; year: number; dju: number };

export type ParsedDju = {
  /** DJU annuels, triés par station puis par année. */
  rows: DjuEntry[];
  /** Tous les problèmes, en français : erreurs bloquantes puis années incomplètes ignorées. */
  issues: string[];
  /** Nombre d'erreurs BLOQUANTES dans `issues` (colonne manquante, valeur illisible, doublon…). Les années incomplètes ne bloquent pas. */
  errorCount: number;
};

/** Minuscules, sans accents, espaces ni « _ » : « DJU_chauffage_base18 » → « djuchauffagebase18 ». */
function normalizeHeader(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s_\-()]/g, "");
}

const COLUMNS = {
  station: { label: "code_station", aliases: ["codestation"] },
  year: { label: "annee", aliases: ["annee", "year"] },
  month: { label: "mois", aliases: ["mois", "month"] },
  dju: { label: "DJU_chauffage_base18", aliases: ["djuchauffagebase18"] },
  days: { label: "jours_mesures", aliases: ["joursmesures"] },
} as const;

/** « 1 234,5 » → 1234.5 ; NaN si ce n'est pas un nombre. */
function parseNumber(text: string): number {
  const t = text.replace(/\s/g, "").replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

type MonthData = { dju: number; days: number };

export function parseDjuCsv(text: string): ParsedDju {
  const records = parseCsv(text, ";");
  if (records.length === 0) {
    return { rows: [], issues: ["Le fichier DJU ne contient aucune ligne de données."], errorCount: 1 };
  }

  const headers = Object.keys(records[0]);
  const col = {} as Record<keyof typeof COLUMNS, string | undefined>;
  for (const key of Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]) {
    col[key] = headers.find((h) => (COLUMNS[key].aliases as readonly string[]).includes(normalizeHeader(h)));
  }
  const missing = (Object.keys(COLUMNS) as (keyof typeof COLUMNS)[]).filter((k) => !col[k]).map((k) => COLUMNS[k].label);
  if (missing.length > 0) {
    return { rows: [], issues: [`Colonne(s) manquante(s) dans le fichier DJU : ${missing.join(", ")}.`], errorCount: 1 };
  }

  const errors: string[] = [];
  // station normalisée → { libellé, année → mois → données }
  const stations = new Map<string, { zone: string; years: Map<number, Map<number, MonthData>> }>();

  records.forEach((r, i) => {
    const line = `Ligne ${i + 2}`; // ligne 1 = en-tête (les lignes vides sont ignorées par parseCsv)
    const zone = (r[col.station!] ?? "").trim();
    const yearText = (r[col.year!] ?? "").trim();
    const monthText = (r[col.month!] ?? "").trim();
    const djuText = (r[col.dju!] ?? "").trim();
    const daysText = (r[col.days!] ?? "").trim();
    const year = /^\d{4}$/.test(yearText) ? Number(yearText) : Number.NaN;
    const month = /^\d{1,2}$/.test(monthText) ? Number(monthText) : Number.NaN;
    const dju = parseNumber(djuText);
    const days = /^\d{1,2}$/.test(daysText) ? Number(daysText) : Number.NaN;

    if (!zone) return void errors.push(`${line} : code station vide.`);
    if (Number.isNaN(year)) return void errors.push(`${line} : année « ${yearText} » illisible.`);
    if (Number.isNaN(month) || month < 1 || month > 12) return void errors.push(`${line} : mois « ${monthText} » illisible (1 à 12).`);
    if (Number.isNaN(dju)) return void errors.push(`${line} : DJU « ${djuText} » non numérique.`);
    if (dju < 0) return void errors.push(`${line} : DJU négatif (${djuText}).`);
    if (Number.isNaN(days)) return void errors.push(`${line} : jours_mesures « ${daysText} » illisible.`);

    const key = normalizeZone(zone);
    const station = stations.get(key) ?? { zone, years: new Map() };
    stations.set(key, station);
    const months = station.years.get(year) ?? new Map<number, MonthData>();
    station.years.set(year, months);
    if (months.has(month)) return void errors.push(`${line} : doublon station ${zone}, ${year}, mois ${month}.`);
    months.set(month, { dju, days });
  });

  const rows: DjuEntry[] = [];
  const incomplete: string[] = [];
  for (const { zone, years } of stations.values()) {
    for (const [year, months] of years) {
      if (months.size !== 12) {
        incomplete.push(`Station ${zone}, ${year} : ${months.size} mois sur 12, année ignorée.`);
        continue;
      }
      const partial = [...months].filter(([m, d]) => d.days !== daysInMonth(year, m)).map(([m, d]) => `mois ${m} : ${d.days}/${daysInMonth(year, m)} jours`);
      if (partial.length > 0) {
        incomplete.push(`Station ${zone}, ${year} : mesures incomplètes (${partial.join(", ")}), année ignorée.`);
        continue;
      }
      const sum = [...months.values()].reduce((s, d) => s + d.dju, 0);
      rows.push({ zone, year, dju: Math.round(sum * 10) / 10 }); // les DJU mensuels ont une décimale
    }
  }
  rows.sort((a, b) => a.zone.localeCompare(b.zone) || a.year - b.year);
  return { rows, issues: [...errors, ...incomplete], errorCount: errors.length };
}

/** Lit un fichier DJU sur disque. Fichier absent → erreur explicite. */
export function readDjuFile(path: string): ParsedDju {
  if (!existsSync(path)) throw new Error(`Fichier DJU introuvable : ${path}`);
  return parseDjuCsv(readFileSync(path, "utf8"));
}
