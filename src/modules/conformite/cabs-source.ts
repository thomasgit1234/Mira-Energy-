// Tâche 6.2 — lecture de la SOURCE des valeurs Cabs (méthode absolue).
//
// ⚠️ C'est le SEUL fichier qui connaît le format du fichier Cabs. Si le format change, on ne réécrit que
// parseCabsJson. Le reste du code ne manipule que des CabsRow.
//
// Fichier : data/referentiels/operat/cabs_CAP18_restauration.json (catégorie CAP18 Restauration - Débit de boissons) :
//   { categorie, unite, source, note, tranches_altitude: { "<400": …, … },
//     sous_categories: [{ code_sous_categorie, libelle_referentiel, use_etalon_kWh_m2_an, part_use_variable,
//                         cvc_kWh_m2_an: { "<400": { "H1a": 99, … }, … } }] }
// - part_use_variable est ignorée : indicateurs d'usage à leur valeur étalon, aucune modulation ;
// - une case CVC absente = pas de valeur définie pour cette zone et cette altitude : elle reste absente (jamais 0) ;
// - les réserves froid (SCAP1812, SCAP1813) ont un objet CVC vide : traité comme des cases absentes (décision de Léo).
import { existsSync, readFileSync } from "node:fs";

export const CABS_DECREE = "Arrêté du 1er août 2025 dit « valeurs absolues VI »";
export const CABS_SOURCE = "Arrêté du 1er août 2025 dit « arrêté valeurs absolues VI », annexes consolidées, section 47 Restauration - Débit de boisson";
export const CABS_FILE = "data/referentiels/operat/cabs_CAP18_restauration.json";

export const ALTITUDE_BANDS = ["<400", "400-800", "800-1200", "1200-1600", ">=1600"] as const;
export type AltitudeBand = (typeof ALTITUDE_BANDS)[number];

export type CabsRow = {
  /** Code de sous-catégorie OPERAT, ex. « SCAP1803 ». */
  code: string;
  label: string;
  /** USE étalon (kWh/m²/an). */
  use: number;
  /** CVC (kWh/m²/an) par tranche d'altitude puis par zone climatique ; une case absente n'existe pas dans l'objet. */
  cvc: Partial<Record<AltitudeBand, Record<string, number>>>;
};

export type ParsedCabs = { category: string; rows: CabsRow[]; issues: string[] };

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export function parseCabsJson(text: string): ParsedCabs {
  let data: unknown;
  try {
    data = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    return { category: "", rows: [], issues: ["Fichier Cabs illisible : JSON invalide."] };
  }
  if (!isObject(data) || !Array.isArray(data.sous_categories)) {
    return { category: "", rows: [], issues: ["Fichier Cabs : champ « sous_categories » manquant."] };
  }

  const issues: string[] = [];
  const rows: CabsRow[] = [];
  const seen = new Set<string>();
  data.sous_categories.forEach((s: unknown, i: number) => {
    const where = `sous-catégorie n° ${i + 1}`;
    if (!isObject(s)) return void issues.push(`${where} : entrée illisible.`);
    const code = typeof s.code_sous_categorie === "string" ? s.code_sous_categorie.trim() : "";
    if (!code) return void issues.push(`${where} : champ « code_sous_categorie » manquant.`);
    if (seen.has(code)) return void issues.push(`${code} : code en double.`);
    if (!isNumber(s.use_etalon_kWh_m2_an) || s.use_etalon_kWh_m2_an < 0) {
      return void issues.push(`${code} : champ « use_etalon_kWh_m2_an » manquant ou invalide.`);
    }
    if (!isObject(s.cvc_kWh_m2_an)) return void issues.push(`${code} : champ « cvc_kWh_m2_an » manquant.`);

    const cvc: CabsRow["cvc"] = {};
    for (const [band, zones] of Object.entries(s.cvc_kWh_m2_an)) {
      if (!(ALTITUDE_BANDS as readonly string[]).includes(band)) { issues.push(`${code} : tranche d'altitude inconnue « ${band} ».`); continue; }
      if (!isObject(zones)) { issues.push(`${code}, ${band} : valeurs illisibles.`); continue; }
      const values: Record<string, number> = {};
      for (const [zone, v] of Object.entries(zones)) {
        if (!isNumber(v) || v < 0) { issues.push(`${code}, ${band}, ${zone} : valeur CVC invalide.`); continue; }
        values[zone] = v;
      }
      cvc[band as AltitudeBand] = values;
    }
    seen.add(code);
    rows.push({ code, label: typeof s.libelle_referentiel === "string" ? s.libelle_referentiel : code, use: s.use_etalon_kWh_m2_an, cvc });
  });
  return { category: typeof data.categorie === "string" ? data.categorie : "", rows, issues };
}

/** Lit le fichier Cabs sur disque. Fichier absent → erreur explicite. */
export function readCabsFile(path: string): ParsedCabs {
  if (!existsSync(path)) throw new Error(`Fichier Cabs introuvable : ${path}`);
  return parseCabsJson(readFileSync(path, "utf8"));
}
