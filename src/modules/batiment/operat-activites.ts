// Référentiel d'activités OPERAT (catégories CAPxx, sous-catégories SCAPxxxx).
//
// ⚠️ C'est le SEUL fichier qui connaît le format du référentiel. Si l'ADEME change le format, on ne réécrit
// que parseOperatActivities. Le reste du code (import en base, formulaire de surfaces) ne manipule que des
// OperatCategory / OperatSubCategory.
//
// Source : ADEME, « Description Import CSV CONSOMMATIONS » V9.0 du 08/04/2026, onglet 5 (pack Mira du 09/10/2026).
// Fichier : data/referentiels/operat/referentiel_activites_OPERAT_v<version>.csv — une ligne par indicateur :
//   code_categorie;categorie;code_sous_categorie;sous_categorie;ajust_clim_chauffage;ajust_clim_refroidissement;
//   ajust_clim_logistique_froid;ajust_clim_froid_commercial;code_indicateur;nom_indicateur;valeur_etalon
// - une sous-catégorie à trois indicateurs occupe trois lignes ; sans indicateur (SCAP0001), les 3 dernières colonnes sont vides ;
// - codes : CAPxx ou CAPxxxx (ex. CAP0502), SCAPxxxx ou SCAPxxxxxx (ex. SCAP050205) ;
// - ajustements climatiques : 0 ou 1 ; valeur étalon : nombre (point ou virgule décimale), ou vide quand l'ADEME
//   n'en fixe pas (ex. NB_COUVERTS, TRANS : valeur déclarée par l'assujetti) → null, jamais 0 ;
// - séparateur « ; », UTF-8 (BOM possible), lignes vides ignorées.
// Mise à jour (ex. v9.1) : remplacer le fichier dans le dossier (UN seul fichier attendu), puis npm run db:import.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "@/lib/csv";

/** Dossier des référentiels OPERAT, relatif à la racine du projet. */
export const OPERAT_DIR = join("data", "referentiels", "operat");

const FILE_PATTERN = /^referentiel_activites_OPERAT_v(\d+(?:\.\d+)*)\.csv$/i;

const COLUMNS = [
  "code_categorie", "categorie", "code_sous_categorie", "sous_categorie",
  "ajust_clim_chauffage", "ajust_clim_refroidissement", "ajust_clim_logistique_froid", "ajust_clim_froid_commercial",
  "code_indicateur", "nom_indicateur", "valeur_etalon",
] as const;

export type OperatCategory = { code: string; label: string };

/** Ajustement climatique appliqué par OPERAT, par usage. */
export type OperatAjustements = {
  chauffage: boolean;
  refroidissement: boolean;
  logistiqueFroid: boolean;
  froidCommercial: boolean;
};

/** Indicateur d'intensité d'usage et sa valeur étalon (ex. NB_H_OUVREES, 2688) ; null si le référentiel n'en donne pas. */
export type OperatIndicateur = { code: string; nom: string; valeurEtalon: number | null };

export type OperatSubCategory = {
  code: string;
  label: string;
  categoryCode: string;
  ajustements: OperatAjustements;
  indicateurs: OperatIndicateur[];
};

export type OperatActivities = {
  /** Version lue dans le nom du fichier (« 9.0 »), "" si illisible. */
  version: string;
  /** Triées par code. */
  categories: OperatCategory[];
  /** Triées par code. */
  subCategories: OperatSubCategory[];
  /** Problèmes en français ; tous bloquants pour l'import. */
  issues: string[];
};

/** « referentiel_activites_OPERAT_v9.0.csv » → « 9.0 » ; null si le nom ne suit pas le modèle. */
export function operatVersionFromFileName(fileName: string): string | null {
  return FILE_PATTERN.exec(fileName)?.[1] ?? null;
}

/** « 2688.00 » ou « 21,5 » → nombre ; NaN sinon. */
function parseNumber(text: string): number {
  const t = text.replace(/\s/g, "").replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : Number.NaN;
}

const AJUSTEMENTS: [keyof OperatAjustements, (typeof COLUMNS)[number]][] = [
  ["chauffage", "ajust_clim_chauffage"],
  ["refroidissement", "ajust_clim_refroidissement"],
  ["logistiqueFroid", "ajust_clim_logistique_froid"],
  ["froidCommercial", "ajust_clim_froid_commercial"],
];

const sameAjustements = (a: OperatAjustements, b: OperatAjustements) => AJUSTEMENTS.every(([k]) => a[k] === b[k]);

export function parseOperatActivities(text: string, fileName: string): OperatActivities {
  const issues: string[] = [];
  const version = operatVersionFromFileName(fileName) ?? "";
  if (!version) issues.push(`Nom de fichier « ${fileName} » : version introuvable (attendu referentiel_activites_OPERAT_v<X>.csv).`);

  const records = parseCsv(text, ";");
  if (records.length === 0) return { version, categories: [], subCategories: [], issues: [...issues, "Le référentiel ne contient aucune ligne de données."] };
  const headers = new Set(Object.keys(records[0]));
  const missing = COLUMNS.filter((c) => !headers.has(c));
  if (missing.length > 0) {
    return { version, categories: [], subCategories: [], issues: [...issues, `Colonne(s) manquante(s) dans le référentiel : ${missing.join(", ")}.`] };
  }

  const categories = new Map<string, OperatCategory>();
  const subCategories = new Map<string, OperatSubCategory>();

  records.forEach((r, i) => {
    const line = `Ligne ${i + 2}`; // ligne 1 = en-tête (les lignes vides sont ignorées par parseCsv)
    const catCode = r.code_categorie;
    const subCode = r.code_sous_categorie;
    if (!/^CAP\d{2}(\d{2})?$/.test(catCode)) return void issues.push(`${line} : code catégorie « ${catCode} » invalide (attendu CAPxx ou CAPxxxx).`);
    if (!/^SCAP\d{4}(\d{2})?$/.test(subCode)) return void issues.push(`${line} : code sous-catégorie « ${subCode} » invalide (attendu SCAPxxxx ou SCAPxxxxxx).`);
    if (!r.categorie || !r.sous_categorie) return void issues.push(`${line} : libellé de catégorie ou de sous-catégorie vide.`);

    const ajustements = {} as OperatAjustements;
    for (const [key, column] of AJUSTEMENTS) {
      if (r[column] !== "0" && r[column] !== "1") return void issues.push(`${line} : ${column} « ${r[column]} » invalide (0 ou 1).`);
      ajustements[key] = r[column] === "1";
    }

    const category = categories.get(catCode);
    if (!category) categories.set(catCode, { code: catCode, label: r.categorie });
    else if (category.label !== r.categorie) issues.push(`${line} : catégorie ${catCode} avec deux libellés (« ${category.label} », « ${r.categorie} »).`);

    let sub = subCategories.get(subCode);
    if (!sub) {
      sub = { code: subCode, label: r.sous_categorie, categoryCode: catCode, ajustements, indicateurs: [] };
      subCategories.set(subCode, sub);
    } else {
      if (sub.categoryCode !== catCode) return void issues.push(`${line} : sous-catégorie ${subCode} rattachée à deux catégories (${sub.categoryCode}, ${catCode}).`);
      if (sub.label !== r.sous_categorie) issues.push(`${line} : sous-catégorie ${subCode} avec deux libellés.`);
      if (!sameAjustements(sub.ajustements, ajustements)) issues.push(`${line} : sous-catégorie ${subCode} avec deux jeux d'ajustements climatiques.`);
    }

    const indicCode = r.code_indicateur;
    if (!indicCode) {
      if (r.nom_indicateur || r.valeur_etalon) issues.push(`${line} : indicateur sans code.`);
      return;
    }
    const valeurEtalon = r.valeur_etalon === "" ? null : parseNumber(r.valeur_etalon);
    if (valeurEtalon !== null && Number.isNaN(valeurEtalon)) return void issues.push(`${line} : valeur étalon « ${r.valeur_etalon} » non numérique.`);
    if (sub.indicateurs.some((x) => x.code === indicCode)) return void issues.push(`${line} : doublon (${subCode}, ${indicCode}).`);
    sub.indicateurs.push({ code: indicCode, nom: r.nom_indicateur, valeurEtalon });
  });

  const byCode = <T extends { code: string }>(a: T, b: T) => a.code.localeCompare(b.code);
  return {
    version,
    categories: [...categories.values()].sort(byCode),
    subCategories: [...subCategories.values()].sort(byCode),
    issues,
  };
}

/**
 * Lit LE référentiel du dossier (un seul fichier referentiel_activites_OPERAT_v<X>.csv attendu).
 * Dossier absent, aucun fichier ou plusieurs versions → erreur explicite.
 */
export function readOperatActivities(dir: string): OperatActivities & { fileName: string } {
  if (!existsSync(dir)) throw new Error(`Dossier du référentiel OPERAT introuvable : ${dir}`);
  const files = readdirSync(dir).filter((f) => FILE_PATTERN.test(f)).sort();
  if (files.length === 0) throw new Error(`Aucun fichier referentiel_activites_OPERAT_v<X>.csv dans ${dir}.`);
  if (files.length > 1) {
    throw new Error(`Plusieurs versions du référentiel OPERAT dans ${dir} (${files.join(", ")}) : n'en garder qu'une.`);
  }
  const fileName = files[0];
  return { ...parseOperatActivities(readFileSync(join(dir, fileName), "utf8"), fileName), fileName };
}
