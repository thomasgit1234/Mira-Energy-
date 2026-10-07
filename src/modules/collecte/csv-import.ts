// Tâche 2.1 — lecture et contrôle d'un fichier CSV de consommations (mode 1, import de fichier).
// Fonctions PURES (aucun accès base) : testées dans csv-import.test.ts, utilisées par l'écran de
// relecture (contrôle en direct pendant la correction) ET par le serveur (contrôle avant écriture).
//
// Format attendu (une ligne par mois) :     annee;mois;energie;kwh
//                                           2023;1;electricite;3 900,5
// - en-têtes tolérants : majuscules, accents (« année », « énergie »), « consommation » pour kwh ;
// - séparateur « ; » (Excel français) ou « , » / tabulation, détecté sur la ligne d'en-tête ;
// - mois en chiffre (1-12) ou en toutes lettres (« janvier ») ; énergie « électricité » / « gaz ».
// ⚠️ Format de travail défini par l'équipe, à confirmer avec la tutrice (pas un format OPERAT officiel).
import { parseCsv } from "@/lib/csv";
import type { MonthInput } from "@/lib/consumption-writer";
import { MIN_YEAR, maxYear, type EnergyType } from "@/lib/domain";
import { MONTH_LABELS, parseKwh } from "./manual";

/** Une ligne du fichier, telle que lue (texte brut, modifiable dans l'écran de relecture). */
export type RawRow = { year: string; month: string; energy: string; kwh: string };

export const MAX_IMPORT_ROWS = 1000;

export type ParsedFile = { rows: RawRow[]; fileIssues: string[] };

/** Minuscules, sans accents ni espaces : « Énergie » → « energie ». */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[\s_\-()]/g, "");
}

const HEADER_ALIASES: Record<keyof RawRow, string[]> = {
  year: ["annee", "an", "year"],
  month: ["mois", "month"],
  energy: ["energie", "energy", "typedenergie", "fluide"],
  kwh: ["kwh", "consommation", "consommationkwh", "conso", "consokwh", "valeur"],
};

const COLUMN_LABELS: Record<keyof RawRow, string> = { year: "annee", month: "mois", energy: "energie", kwh: "kwh" };

function detectSeparator(headerLine: string): string {
  if (headerLine.includes(";")) return ";";
  if (headerLine.includes("\t")) return "\t";
  return ",";
}

export function parseConsumptionCsv(text: string): ParsedFile {
  const fileIssues: string[] = [];
  if (text.trim() === "") return { rows: [], fileIssues: ["Le fichier est vide."] };

  const headerLine = text.replace(/^﻿/, "").trimStart().split(/\r?\n/, 1)[0];
  const sep = detectSeparator(headerLine);
  const headers = headerLine.split(sep).map((h) => h.replace(/^"|"$/g, "").trim());
  const records = parseCsv(text, sep);
  const columnOf = {} as Record<keyof RawRow, string | undefined>;
  for (const key of Object.keys(HEADER_ALIASES) as (keyof RawRow)[]) {
    columnOf[key] = headers.find((h) => HEADER_ALIASES[key].includes(normalize(h)));
  }
  const missing = (Object.keys(columnOf) as (keyof RawRow)[]).filter((k) => !columnOf[k]);
  if (missing.length > 0) {
    fileIssues.push(
      `Colonne${missing.length > 1 ? "s" : ""} introuvable${missing.length > 1 ? "s" : ""} : ${missing.map((k) => COLUMN_LABELS[k]).join(", ")}. ` +
        `La première ligne doit être : annee;mois;energie;kwh`,
    );
    return { rows: [], fileIssues };
  }
  if (records.length === 0) return { rows: [], fileIssues: ["Le fichier ne contient aucune ligne de données."] };
  if (records.length > MAX_IMPORT_ROWS) {
    return { rows: [], fileIssues: [`Le fichier contient ${records.length} lignes (maximum ${MAX_IMPORT_ROWS}).`] };
  }

  const rows = records.map((r) => ({
    year: r[columnOf.year!] ?? "",
    month: r[columnOf.month!] ?? "",
    energy: r[columnOf.energy!] ?? "",
    kwh: r[columnOf.kwh!] ?? "",
  }));
  return { rows, fileIssues };
}

const ENERGY_ALIASES: Record<string, EnergyType> = {
  electricity: "ELECTRICITY", electricite: "ELECTRICITY", elec: "ELECTRICITY", electrique: "ELECTRICITY",
  gas: "GAS", gaz: "GAS", gaznaturel: "GAS",
};

export function parseEnergy(text: string): EnergyType | null {
  return ENERGY_ALIASES[normalize(text)] ?? null;
}

const MONTH_NAMES = MONTH_LABELS.map((m) => normalize(m));

export function parseMonth(text: string): number | null {
  const t = normalize(text);
  if (/^\d{1,2}$/.test(t)) {
    const n = Number(t);
    return n >= 1 && n <= 12 ? n : null;
  }
  const i = MONTH_NAMES.indexOf(t);
  return i >= 0 ? i + 1 : null;
}

export type RowIssue = { field: keyof RawRow | "row"; message: string };

export type RowValue = { year: number; month: number; energyType: EnergyType; kwh: number };

export type CheckedRow = { issues: RowIssue[]; value: RowValue | null };

export type ImportBatch = { year: number; energyType: EnergyType; months: MonthInput[] };

export type ImportCheck = {
  ok: boolean;
  rows: CheckedRow[];
  errorCount: number;
  batches: ImportBatch[];
};

/** Contrôle chaque ligne, repère les doublons (même année, énergie et mois) et prépare les lots. */
export function validateImportRows(rows: RawRow[], now = new Date()): ImportCheck {
  const last = maxYear(now);
  const seen = new Map<string, number>();

  const checked: CheckedRow[] = rows.map((r, i) => {
    const issues: RowIssue[] = [];
    const yearText = r.year.trim();
    const year = /^\d{4}$/.test(yearText) ? Number(yearText) : null;
    if (year === null || year < MIN_YEAR || year > last) {
      issues.push({ field: "year", message: `Année « ${yearText} » invalide (attendu : ${MIN_YEAR} à ${last}).` });
    }
    const month = parseMonth(r.month);
    if (month === null) issues.push({ field: "month", message: `Mois « ${r.month.trim()} » invalide (1 à 12 ou « janvier »…).` });
    const energyType = parseEnergy(r.energy);
    if (energyType === null) issues.push({ field: "energy", message: `Énergie « ${r.energy.trim()} » inconnue (électricité ou gaz).` });
    const kwh = parseKwh(r.kwh);
    if (kwh === null) issues.push({ field: "kwh", message: "Consommation manquante." });
    else if (Number.isNaN(kwh)) issues.push({ field: "kwh", message: `« ${r.kwh.trim()} » n'est pas un nombre de kWh.` });
    else if (kwh < 0) issues.push({ field: "kwh", message: "Une consommation ne peut pas être négative." });

    if (issues.length > 0 || year === null || month === null || energyType === null || kwh === null) return { issues, value: null };

    const key = `${year}|${energyType}|${month}`;
    const first = seen.get(key);
    if (first !== undefined) {
      return { issues: [{ field: "row", message: `Doublon de la ligne ${first + 1} (même année, mois et énergie).` }], value: null };
    }
    seen.set(key, i);
    return { issues, value: { year, month, energyType, kwh } };
  });

  const errorCount = checked.filter((c) => c.issues.length > 0).length;
  return { ok: rows.length > 0 && errorCount === 0, rows: checked, errorCount, batches: groupForSave(checked) };
}

/** Un lot par (année, énergie), mois triés : c'est la forme attendue par saveConsumption. */
export function groupForSave(rows: CheckedRow[]): ImportBatch[] {
  const batches = new Map<string, ImportBatch>();
  for (const { value } of rows) {
    if (!value) continue;
    const key = `${value.year}|${value.energyType}`;
    const batch = batches.get(key) ?? { year: value.year, energyType: value.energyType, months: [] };
    batch.months.push({ month: value.month, kwh: value.kwh });
    batches.set(key, batch);
  }
  return [...batches.values()]
    .map((b) => ({ ...b, months: [...b.months].sort((x, y) => x.month - y.month) }))
    .sort((a, b) => a.year - b.year || a.energyType.localeCompare(b.energyType));
}

/**
 * Décode le contenu d'un fichier : UTF-8 d'abord ; s'il contient des caractères illisibles (U+FFFD),
 * c'est un CSV enregistré par Excel sous Windows → Windows-1252.
 */
export function decodeCsvBytes(bytes: ArrayBuffer | Uint8Array): string {
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(bytes) : utf8;
}
