// Tâche 1.2 — règles PURES de la zone climatique : code postal → département → zone (H1a… H3).
// Aucun accès disque : utilisable par le serveur ET par un composant client (formulaire bâtiment).
// Le format du fichier (colonnes, séparateur) reste connu du seul zone-climatique.ts, qui produit des DepartmentZone.

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
