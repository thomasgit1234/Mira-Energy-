// Tâche 1.2 — zone climatique (H1a… H3) à partir du code postal, via le département.
//
// ⚠️ C'est le SEUL fichier qui connaît le format de la table département → zone. Si le format change, on ne
// réécrit que parseDepartmentZones. Le reste du code ne manipule que des DepartmentZone et des ZoneResult.
//
// Source : pack Mira du 09/10/2026, table dérivée du référentiel des stations météo OPERAT
// (ADEME, « Description Import CSV CONSOMMATIONS » V9.0 du 08/04/2026, onglet 6).
// Fichier : data/referentiels/operat/departement_zone_climatique.csv
//   departement;zone_climatique;remarque
//   02;H1a;
//   34;H2c/H3;plusieurs zones : choisir via la station la plus proche
//   971;Guadeloupe;
// - département : 2 chiffres, 2A / 2B (Corse), 97x (DOM) ;
// - zone : un code H1a… H3, ou plusieurs séparés par « / » ; pour les DOM, le fichier donne le nom du territoire
//   au lieu d'une zone : on le garde comme « zone non définie », sans rien inventer ;
// - séparateur « ; », UTF-8 (BOM possible), lignes vides ignorées.
// La table n'est pas importée en base : elle est lue à la demande (petit fichier, pas de PR schema).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "@/lib/csv";

export const DEPARTMENT_ZONES_FILE = join("data", "referentiels", "operat", "departement_zone_climatique.csv");

const COLUMNS = ["departement", "zone_climatique", "remarque"] as const;
const ZONE_PATTERN = /^H(1[abc]|2[abcd]|3)$/;
const DEPARTMENT_PATTERN = /^(\d{2}|2[AB]|97\d)$/;

export type DepartmentZone = {
  department: string;
  /** Zones climatiques valides ; vide si le fichier n'en définit pas (DOM). */
  zones: string[];
  /** Valeur brute de la colonne zone (ex. « H2c/H3 », « Guadeloupe »). */
  rawZone: string;
  remark: string;
};

export type ParsedDepartmentZones = {
  /** Triées par département. */
  rows: DepartmentZone[];
  /** Problèmes en français ; tous bloquants. */
  issues: string[];
};

export type ZoneErrorCode =
  | "CODE_POSTAL_INVALIDE"
  | "CORSE_AMBIGUE"
  | "DEPARTEMENT_ABSENT"
  | "ZONE_NON_DEFINIE"
  | "PLUSIEURS_ZONES";
export type ZoneError = { ok: false; code: ZoneErrorCode; message: string };
export type ZoneResult = { ok: true; department: string; zone: string } | ZoneError;

export function parseDepartmentZones(text: string): ParsedDepartmentZones {
  const records = parseCsv(text, ";");
  if (records.length === 0) return { rows: [], issues: ["La table département → zone ne contient aucune ligne de données."] };
  const headers = new Set(Object.keys(records[0]));
  const missing = COLUMNS.filter((c) => !headers.has(c));
  if (missing.length > 0) return { rows: [], issues: [`Colonne(s) manquante(s) dans la table département → zone : ${missing.join(", ")}.`] };

  const issues: string[] = [];
  const rows = new Map<string, DepartmentZone>();
  records.forEach((r, i) => {
    const line = `Ligne ${i + 2}`; // ligne 1 = en-tête (les lignes vides sont ignorées par parseCsv)
    const department = r.departement.toUpperCase();
    const rawZone = r.zone_climatique;
    if (!DEPARTMENT_PATTERN.test(department)) return void issues.push(`${line} : département « ${r.departement} » invalide.`);
    if (!rawZone) return void issues.push(`${line} : zone vide pour le département ${department}.`);
    if (rows.has(department)) return void issues.push(`${line} : département ${department} en double.`);
    const parts = rawZone.split("/").map((z) => z.trim());
    const valid = parts.filter((z) => ZONE_PATTERN.test(z));
    // Aucune partie n'est une zone (DOM) → zone non définie ; un mélange (« H1a/H9 ») est une erreur de saisie.
    if (valid.length > 0 && valid.length !== parts.length) return void issues.push(`${line} : zone « ${rawZone} » illisible.`);
    rows.set(department, { department, zones: valid, rawZone, remark: r.remarque });
  });
  return { rows: [...rows.values()].sort((a, b) => a.department.localeCompare(b.department)), issues };
}

/** Lit la table sur disque. Fichier absent → erreur explicite. */
export function readDepartmentZones(path: string): ParsedDepartmentZones {
  if (!existsSync(path)) throw new Error(`Table département → zone introuvable : ${path}`);
  return parseDepartmentZones(readFileSync(path, "utf8"));
}

/** « 02000 » → « 02 » ; DOM « 97100 » → « 971 » ; Corse (20xxx) → erreur, 2A ou 2B ne se déduit pas du code postal. */
export function departmentFromPostcode(postcode: string): { ok: true; department: string } | ZoneError {
  const p = postcode.replace(/\s/g, "");
  if (!/^\d{5}$/.test(p)) return { ok: false, code: "CODE_POSTAL_INVALIDE", message: `Code postal « ${postcode} » invalide (5 chiffres attendus).` };
  if (p.startsWith("20")) {
    return { ok: false, code: "CORSE_AMBIGUE", message: `Code postal ${p} : Corse, département 2A ou 2B ambigu, choisir via la station.` };
  }
  return { ok: true, department: p.startsWith("97") ? p.slice(0, 3) : p.slice(0, 2) };
}

/** Zone climatique unique du code postal, ou erreur explicite (jamais de zone devinée). */
export function climateZoneForPostcode(rows: DepartmentZone[], postcode: string): ZoneResult {
  const dep = departmentFromPostcode(postcode);
  if (!dep.ok) return dep;
  const row = rows.find((r) => r.department === dep.department);
  if (!row) return { ok: false, code: "DEPARTEMENT_ABSENT", message: `Département ${dep.department} absent de la table département → zone.` };
  if (row.zones.length === 0) {
    return { ok: false, code: "ZONE_NON_DEFINIE", message: `Département ${row.department} (${row.rawZone}) : zone non définie dans le référentiel.` };
  }
  if (row.zones.length > 1) {
    return { ok: false, code: "PLUSIEURS_ZONES", message: `Département ${row.department} : plusieurs zones (${row.zones.join(", ")}), choisir via la station.` };
  }
  return { ok: true, department: row.department, zone: row.zones[0] };
}
