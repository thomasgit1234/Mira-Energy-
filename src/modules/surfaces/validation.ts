// Tâche 1.3 — règles de validation du formulaire de décomposition des surfaces.
// Fonctions PURES (aucun accès base) : testées dans validation.test.ts.
//
// Règles (plan des tâches, 1.3) :
//   - chaque ligne = catégorie → sous-catégorie → surface (m²), listes issues du référentiel OPERAT ;
//   - la sous-catégorie doit appartenir à la catégorie choisie ;
//   - la SOMME des lignes doit être égale à la surface totale déclarée du bâtiment.

export type SurfaceLineInput = {
  categoryCode: string;
  subCategoryCode: string;
  surfaceM2: number;
};

export type ReferentialOption = { code: string; label: string };
export type SubCategoryOption = ReferentialOption & { categoryCode: string };
export type Referential = { categories: ReferentialOption[]; subCategories: SubCategoryOption[] };

export type ValidationIssue = {
  code:
    | "NO_LINES"
    | "MISSING_CATEGORY"
    | "UNKNOWN_CATEGORY"
    | "MISSING_SUBCATEGORY"
    | "UNKNOWN_SUBCATEGORY"
    | "SUBCATEGORY_NOT_IN_CATEGORY"
    | "INVALID_SURFACE"
    | "DUPLICATE_LINE"
    | "SUM_MISMATCH";
  message: string;
  /** Index (0-based) de la ligne concernée ; absent pour une erreur globale. */
  line?: number;
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
  /** Somme des surfaces valides saisies, en m² (arrondie au centième). */
  sum: number;
  /** total déclaré − somme (positif = il manque de la surface ; négatif = dépassement). */
  gap: number;
};

/** Arrondi au centième de m² : évite les faux écarts type 0.1 + 0.2 ≠ 0.3. */
export function roundM2(value: number): number {
  return Math.round(value * 100) / 100;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
}

export function validateSurfaceLines(
  lines: SurfaceLineInput[],
  surfaceTotal: number,
  referential: Referential,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const categories = new Set(referential.categories.map((c) => c.code));
  const subs = new Map(referential.subCategories.map((s) => [s.code, s.categoryCode]));
  const seen = new Set<string>();
  let sumCents = 0;

  if (lines.length === 0) {
    issues.push({ code: "NO_LINES", message: "Ajoutez au moins une ligne de surface." });
  }

  lines.forEach((l, i) => {
    const n = i + 1;
    const cat = (l.categoryCode ?? "").trim();
    const sub = (l.subCategoryCode ?? "").trim();

    if (!cat) issues.push({ code: "MISSING_CATEGORY", line: i, message: `Ligne ${n} : choisissez une catégorie.` });
    else if (!categories.has(cat)) issues.push({ code: "UNKNOWN_CATEGORY", line: i, message: `Ligne ${n} : catégorie inconnue (${cat}).` });

    if (!sub) issues.push({ code: "MISSING_SUBCATEGORY", line: i, message: `Ligne ${n} : choisissez une sous-catégorie.` });
    else if (!subs.has(sub)) issues.push({ code: "UNKNOWN_SUBCATEGORY", line: i, message: `Ligne ${n} : sous-catégorie inconnue (${sub}).` });
    else if (cat && categories.has(cat) && subs.get(sub) !== cat) {
      issues.push({ code: "SUBCATEGORY_NOT_IN_CATEGORY", line: i, message: `Ligne ${n} : cette sous-catégorie n'appartient pas à la catégorie choisie.` });
    }

    const s = l.surfaceM2;
    if (typeof s !== "number" || !Number.isFinite(s) || s <= 0) {
      issues.push({ code: "INVALID_SURFACE", line: i, message: `Ligne ${n} : la surface doit être un nombre supérieur à 0.` });
    } else {
      sumCents += Math.round(s * 100);
    }

    if (cat && sub) {
      const key = `${cat}|${sub}`;
      if (seen.has(key)) issues.push({ code: "DUPLICATE_LINE", line: i, message: `Ligne ${n} : cette sous-catégorie est déjà saisie (regroupez les surfaces sur une seule ligne).` });
      seen.add(key);
    }
  });

  const sum = sumCents / 100;
  const gap = roundM2(surfaceTotal - sum);
  if (lines.length > 0 && Math.round(surfaceTotal * 100) !== sumCents) {
    issues.push({
      code: "SUM_MISMATCH",
      message:
        gap > 0
          ? `La somme des lignes (${fmt(sum)} m²) est inférieure de ${fmt(gap)} m² à la surface totale déclarée (${fmt(surfaceTotal)} m²).`
          : `La somme des lignes (${fmt(sum)} m²) dépasse de ${fmt(-gap)} m² la surface totale déclarée (${fmt(surfaceTotal)} m²).`,
    });
  }

  return { ok: issues.length === 0, issues, sum, gap };
}
