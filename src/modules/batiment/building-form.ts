// Tâches 1.1 (fiche bâtiment : adresse, ID-RNB) et 1.2 (zone climatique déduite du code postal).
// Fonctions PURES, partagées par le formulaire (contrôle en direct) et le serveur (contrôle avant écriture) :
// testées dans building-form.test.ts.
//
// Règles :
// - adresse, code postal (5 chiffres), ville et surface totale obligatoires ; ID-RNB facultatif (12 caractères) ;
// - la surface du bâtiment ne peut pas être inférieure à la somme des surfaces propres de ses EFA ;
// - la zone climatique n'est JAMAIS saisie : elle se déduit du code postal (table département → zone, 1.2), ou reste
//   « non déduite » avec la raison (Corse, Hérault, DOM) ;
// - la station de la correction climatique (Building.climateZone, D16) n'est pas modifiée ici ; si elle n'est pas dans le
//   département du code postal, un AVERTISSEMENT le signale (la correction climatique ne serait plus pertinente).
import { checkRnbId } from "./rnb-source";
import { climateZoneForPostcode, departmentFromPostcode, type DepartmentZone, type ZoneResult } from "./zone-rules";

export type BuildingInput = {
  address: string;
  postcode: string;
  city: string;
  /** Facultatif ; vide = pas d'ID-RNB. */
  rnbId: string;
  /** Texte saisi (« 1 700 », « 1700,5 ») ou nombre. */
  surfaceTotal: string | number;
};

export type BuildingData = { address: string; postcode: string; city: string; rnbId: string | null; surfaceTotal: number };

export type BuildingField = "address" | "postcode" | "city" | "rnbId" | "surfaceTotal";
export type BuildingIssue = { field: BuildingField; message: string };

export type BuildingCheck =
  | { ok: true; data: BuildingData; warnings: string[] }
  | { ok: false; issues: BuildingIssue[]; warnings: string[] };

/** Contexte du contrôle : surfaces propres des EFA du bâtiment et station de la correction climatique. */
export type BuildingContext = { efaSurfaces: (number | null)[]; stationCode: string | null };

const m2 = (v: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v);

/** « 1 700,5 » → 1700.5 ; vide ou illisible → NaN. */
export function parseSurface(v: string | number): number {
  if (typeof v === "number") return v;
  const t = v.replace(/[\s  ]/g, "").replace(",", ".");
  return t === "" ? Number.NaN : Number(t);
}

/** Département de la station (codes Météo-France à 8 chiffres : les 2 premiers = département, ex. 02320001 → 02). */
export function stationDepartment(stationCode: string | null): string | null {
  return stationCode && /^\d{8}$/.test(stationCode) ? stationCode.slice(0, 2) : null;
}

export function validateBuildingInput(input: BuildingInput, ctx: BuildingContext): BuildingCheck {
  const issues: BuildingIssue[] = [];
  const warnings: string[] = [];
  const address = input.address.trim();
  const city = input.city.trim();
  const postcode = input.postcode.replace(/\s/g, "");

  if (address === "") issues.push({ field: "address", message: "Indiquez l'adresse du bâtiment (numéro et rue)." });
  if (address.length > 200) issues.push({ field: "address", message: "Adresse trop longue (200 caractères au plus)." });
  if (!/^\d{5}$/.test(postcode)) issues.push({ field: "postcode", message: "Code postal invalide : 5 chiffres attendus." });
  if (city === "") issues.push({ field: "city", message: "Indiquez la ville." });
  if (city.length > 100) issues.push({ field: "city", message: "Nom de ville trop long (100 caractères au plus)." });

  const rnb = checkRnbId(input.rnbId);
  if (!rnb.ok) issues.push({ field: "rnbId", message: rnb.message });

  const surfaceTotal = parseSurface(input.surfaceTotal);
  const efaSum = ctx.efaSurfaces.reduce<number>((s, v) => s + (v ?? 0), 0);
  if (!Number.isFinite(surfaceTotal) || surfaceTotal <= 0) {
    issues.push({ field: "surfaceTotal", message: "Surface totale invalide : un nombre de m² supérieur à 0." });
  } else if (surfaceTotal > 10_000_000) {
    issues.push({ field: "surfaceTotal", message: "Surface totale invraisemblable (plus de 10 millions de m²)." });
  } else if (surfaceTotal + 1e-9 < efaSum) {
    issues.push({
      field: "surfaceTotal",
      message: `La surface du bâtiment (${m2(surfaceTotal)} m²) est inférieure à la somme des surfaces de ses EFA (${m2(efaSum)} m²).`,
    });
  }

  const dep = /^\d{5}$/.test(postcode) ? departmentFromPostcode(postcode) : null;
  const stationDep = stationDepartment(ctx.stationCode);
  if (dep?.ok && stationDep && dep.department !== stationDep) {
    warnings.push(
      `La station de la correction climatique (${ctx.stationCode}, département ${stationDep}) n'est pas dans le département du code ` +
        `postal (${dep.department}) : la correction climatique ne serait plus pertinente. Faites changer la station (seed ou PR dédiée).`,
    );
  }

  if (issues.length > 0) return { ok: false, issues, warnings };
  return { ok: true, data: { address, postcode, city, rnbId: rnb.ok ? rnb.rnbId : null, surfaceTotal }, warnings };
}

/** Tâche 1.2 — zone climatique du code postal, à partir de la table département → zone (null : table indisponible). */
export function zoneForPostcode(rows: DepartmentZone[] | null, postcode: string, tableProblem?: string): ZoneResult {
  if (!rows) return { ok: false, code: "DEPARTEMENT_ABSENT", message: tableProblem ?? "Table département → zone indisponible." };
  return climateZoneForPostcode(rows, postcode.replace(/\s/g, ""));
}
