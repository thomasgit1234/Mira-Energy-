// Tâches 7.1 (synthèse) et 7.4 (états vides). Fonctions PURES : testées dans synthesis.test.ts.
//
// buildSynthesis reçoit les résultats DÉJÀ chargés par les autres modules (ou leur erreur, déjà classée) et décide :
// - ce que montre chaque section (site, verdict, objectifs, suivi), chacune indépendamment des autres ;
// - l'état de chaque étape de la chaîne de la démo (fait / à faire / indisponible) ;
// - la « prochaine action » : le premier manque dans l'ordre de la chaîne.
// Aucun calcul réglementaire ici : Crelat, Cabs, verdict, kWh/DJU et année suivie viennent des modules
// (conformite, climat) ; le contrôle des surfaces réutilise validateSurfaceLines (surfaces).
import type { ClimatIndicators } from "@/modules/climat";
import { EXCLUDED_YEARS, type ComparatorData } from "@/modules/comparateur";
import { STATUS_LABELS, WAY_LABELS, pickCurrentYear, type ConformiteData, type VerdictStatus } from "@/modules/conformite";
import type { SurfacesContext } from "@/modules/surfaces";
import { validateSurfaceLines } from "@/modules/surfaces";
import type { UserSite } from "@/modules/batiment";
import { fmtM2 } from "./format";

// ---------------------------------------------------------------------------------------------------------------
// Entrées : chaque source vaut { ok: true, data } ou une erreur déjà classée.

/** AUTH = utilisateur inconnu (401) ; NOT_FOUND = pas de bâtiment / d'EFA (404) ; DB = base injoignable ; ERROR = autre. */
export type SourceErrorKind = "AUTH" | "NOT_FOUND" | "DB" | "ERROR";
export type SourceError = { ok: false; kind: SourceErrorKind; message: string };
export type Source<T> = { ok: true; data: T } | SourceError;

// Formes minimales lues dans chaque source (les types complets des modules y sont assignables).
export type SiteInput = Pick<UserSite, "postcode" | "city"> & { efas: Pick<UserSite["efas"][number], "id" | "surfaceTotal">[] };
export type SurfacesInput = Pick<SurfacesContext, "efaId" | "buildingLabel" | "surfaceTotal" | "lines" | "referential">;
export type ClimatInput = Pick<ClimatIndicators, "hasDju" | "stationLabel"> & {
  rows: Pick<ClimatIndicators["rows"][number], "year" | "consumptionKwh" | "dju" | "kwhPerDju" | "status">[];
};
export type ComparateurInput = Pick<ComparatorData, "efaLabel" | "chosenYear">;
export type ConformiteInput = Pick<ConformiteData, "reference" | "crelat" | "current"> & {
  cabs: ConformiteData["cabs"];
  site: Pick<ConformiteData["site"], "zone" | "sources">;
  verdict: { main: Pick<ConformiteData["verdict"]["main"], "status" | "message" | "favorable" | "crelat" | "cabs"> };
};

export type DashboardInputs = {
  site: Source<SiteInput>;
  surfaces: Source<SurfacesInput>;
  climat: Source<ClimatInput>;
  comparateur: Source<ComparateurInput>;
  conformite: Source<ConformiteInput>;
};

// ---------------------------------------------------------------------------------------------------------------
// États vides (7.4) : un code, un message clair, UNE action.

export type EmptyCode =
  | "BASE_INJOIGNABLE"
  | "NON_CONNECTE"
  | "PAS_DE_BATIMENT"
  | "SURFACES_ABSENTES"
  | "SURFACES_INCOHERENTES"
  | "PAS_DE_CONSOMMATION"
  | "AUCUNE_ANNEE_SUIVIE"
  | "DJU_MANQUANT"
  | "ANNEE_INCOMPLETE"
  | "REFERENCE_NON_CHOISIE"
  | "REFERENCE_INELIGIBLE"
  | "ZONE_INTROUVABLE"
  | "CABS_INDISPONIBLE"
  | "CABS_NON_CALCULABLE"
  | "ERREUR";

/** Ordre de la chaîne de la démo : la « prochaine action » est le premier manque de cette liste. */
export const EMPTY_PRIORITY: readonly EmptyCode[] = [
  "BASE_INJOIGNABLE", "NON_CONNECTE", "PAS_DE_BATIMENT",
  "SURFACES_ABSENTES", "SURFACES_INCOHERENTES",
  "PAS_DE_CONSOMMATION", "AUCUNE_ANNEE_SUIVIE",
  "DJU_MANQUANT", "ANNEE_INCOMPLETE",
  "REFERENCE_NON_CHOISIE", "REFERENCE_INELIGIBLE",
  "ZONE_INTROUVABLE", "CABS_INDISPONIBLE", "CABS_NON_CALCULABLE",
  "ERREUR",
];

/** Action proposée : un lien (href) ou, faute de page, une commande à lancer et un retour à l'accueil. */
export type Action = { label: string; href: string | null; command?: string };
export type EmptyState = { code: EmptyCode; message: string; action: Action };

const HOME: Action = { label: "Retour à la carte du projet", href: "/" };

function empty(code: EmptyCode, message: string, action: Action): EmptyState {
  return { code, message, action };
}

/** État vide d'une source en erreur (même traduction partout, quel que soit le module). */
export function sourceEmpty(e: SourceError): EmptyState {
  switch (e.kind) {
    case "DB":
      return empty("BASE_INJOIGNABLE", "Impossible de joindre la base de données. Démarrez Docker Desktop puis la base, et rechargez la page.",
        { label: "Démarrer la base", href: null, command: "npm run db:up" });
    case "AUTH":
      return empty("NON_CONNECTE", "Aucun utilisateur connecté : le compte de démonstration n'existe pas encore.",
        { ...HOME, command: "npm run demo" });
    case "NOT_FOUND":
      return empty("PAS_DE_BATIMENT", "Aucun bâtiment ni EFA rattaché à cet utilisateur : chargez le site de démonstration.",
        { ...HOME, command: "npm run db:seed" });
    default:
      return empty("ERREUR", `Cette partie n'a pas pu être chargée : ${e.message}`, HOME);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Sorties.

export type Section<T> = { ok: true; data: T } | { ok: false; empty: EmptyState };

export type SiteSection = {
  buildingLabel: string | null;
  postcode: string;
  city: string;
  efaLabel: string | null;
  surfaceM2: number | null;
  zone: string | null;
  efaCount: number;
};

export type RetainedMethod = "CRELAT" | "CABS" | "LES_DEUX" | null;
export type VerdictSection = {
  status: VerdictStatus;
  statusLabel: string;
  icon: "✓" | "✗" | "?";
  message: string;
  retained: RetainedMethod;
  retainedLabel: string;
  favorableLabel: string;
};

export type ObjectivesSection = {
  referenceYear: number | null;
  crefKwh: number | null;
  crelat: { 2030: number; 2040: number; 2050: number } | null;
  cabsKwh: number | null;
  /** Manques propres aux objectifs (référence, Cabs), affichés à côté des valeurs disponibles. */
  empties: EmptyState[];
};

export type FollowUpSection = { year: number; consumptionKwh: number; dju: number | null; kwhPerDju: number | null; stationLabel: string | null };

export type StepId = "batiment" | "surfaces" | "consommations" | "dju" | "reference" | "conformite";
export type StepState = "FAIT" | "A_FAIRE" | "INDISPONIBLE";
export type Step = { id: StepId; label: string; state: StepState; detail: string; href: string | null };

export type Synthesis = {
  sections: { site: Section<SiteSection>; verdict: Section<VerdictSection>; objectives: Section<ObjectivesSection>; followUp: Section<FollowUpSection> };
  steps: Step[];
  /** Tous les manques détectés, triés par priorité (sans doublon de code). */
  empties: EmptyState[];
  nextAction: { action: Action; reason: string; code: EmptyCode | null };
};

export const STATE_LABELS: Record<StepState, string> = { FAIT: "Fait", A_FAIRE: "À faire", INDISPONIBLE: "Indisponible" };

export const DASHBOARD_BANNER = "Données de consommation fictives. Site de démonstration fictif (Laon).";
export const DATA_ORIGIN = {
  real: [
    "DJU mensuels Météo-France (stations Aulnois-sous-Laon et Saint-Quentin, Licence Ouverte 2.0)",
    "Valeurs Cabs de l'arrêté du 1er août 2025 « valeurs absolues VI » (catégorie CAP18 Restauration)",
    "Référentiel d'activités OPERAT v9.0 et table département → zone climatique (ADEME)",
  ],
  fictive: [
    "Consommations d'électricité et de gaz (répartition mensuelle forfaitaire)",
    "Nom, adresse et propriétaire du site de démonstration (seuls la ville et le code postal sont réels)",
  ],
} as const;

const ICONS: Record<VerdictStatus, "✓" | "✗" | "?"> = { CONFORME: "✓", NON_CONFORME: "✗", INDETERMINE: "?" };
const RETAINED_LABELS: Record<Exclude<RetainedMethod, null>, string> = {
  CRELAT: WAY_LABELS.CRELAT,
  CABS: WAY_LABELS.CABS,
  LES_DEUX: "les deux méthodes",
};

// ---------------------------------------------------------------------------------------------------------------
// Décisions par domaine (chacune ne lit que ses sources).

function surfacesEmpty(s: SurfacesInput): EmptyState | null {
  if (s.lines.length === 0) {
    return empty("SURFACES_ABSENTES", "Aucune ligne de surface pour cette EFA : décomposez sa surface par activité OPERAT.",
      { label: "Renseigner les surfaces", href: "/surfaces" });
  }
  const check = validateSurfaceLines(s.lines, s.surfaceTotal, s.referential);
  if (!check.ok) {
    return empty("SURFACES_INCOHERENTES", `Les lignes de surface sont à corriger : ${check.issues[0]?.message ?? "contrôle refusé."}`,
      { label: "Corriger les surfaces", href: "/surfaces" });
  }
  return null;
}

/** Année suivie (règle du module conformité) et, à défaut, la raison de son absence. */
function followUpOf(c: ClimatInput): { current: FollowUpSection } | { empty: EmptyState } {
  const withConsumption = c.rows.filter((r) => r.consumptionKwh !== null);
  if (withConsumption.length === 0) {
    return { empty: empty("PAS_DE_CONSOMMATION", "Aucune consommation enregistrée pour cette EFA.",
      { label: "Saisir ou importer les consommations", href: "/collecte" }) };
  }
  const current = pickCurrentYear(c.rows);
  if (current) {
    const row = c.rows.find((r) => r.year === current.year);
    return { current: { ...current, dju: row?.dju ?? null, kwhPerDju: row?.kwhPerDju ?? null, stationLabel: c.stationLabel } };
  }
  // Pas d'année suivie : on explique à partir de la dernière année avec consommation (hors 2020 et 2021).
  const last = withConsumption.filter((r) => !EXCLUDED_YEARS.includes(r.year)).sort((a, b) => b.year - a.year)[0];
  if (!last) {
    return { empty: empty("AUCUNE_ANNEE_SUIVIE", "Seules 2020 et 2021 ont des consommations, or elles sont exclues du suivi : ajoutez une autre année.",
      { label: "Ajouter des consommations", href: "/collecte" }) };
  }
  if (last.status === "DJU_MANQUANT") {
    return { empty: empty("DJU_MANQUANT", `DJU manquant pour ${last.year} : importez les DJU de la station du bâtiment.`,
      { label: "Voir les DJU", href: "/climat", command: "npm run db:import" }) };
  }
  return { empty: empty("ANNEE_INCOMPLETE", `Aucune année complète (12 mois) hors 2020 et 2021 : ${last.year} est incomplète.`,
    { label: "Compléter les consommations", href: "/collecte" }) };
}

function referenceEmpty(chosenYear: number | null, problem: string | null): EmptyState | null {
  if (chosenYear === null) {
    return empty("REFERENCE_NON_CHOISIE", "Aucune année de référence choisie : l'objectif relatif (Crelat) n'est pas calculable.",
      { label: "Choisir l'année de référence", href: "/comparateur" });
  }
  if (problem) {
    return empty("REFERENCE_INELIGIBLE", problem, { label: "Choisir une autre année", href: "/comparateur" });
  }
  return null;
}

function cabsEmpty(c: ConformiteInput): EmptyState | null {
  if (c.cabs.ok || c.cabs.code === "SURFACE_MANQUANTE") return null; // surfaces : déjà signalées par leur propre état
  if (c.cabs.code === "FICHIER_INDISPONIBLE") {
    return empty("CABS_INDISPONIBLE", `Fichier des valeurs Cabs introuvable ou invalide : ${c.cabs.message}`,
      { label: "Voir le détail de la conformité", href: "/conformite" });
  }
  if (c.site.zone === null) {
    return empty("ZONE_INTROUVABLE", `Zone climatique introuvable : ${c.site.sources.zone}`,
      { label: "Voir le détail de la conformité", href: "/conformite" });
  }
  return empty("CABS_NON_CALCULABLE", `Objectif Cabs non calculable : ${c.cabs.message}`,
    { label: "Voir le détail de la conformité", href: "/conformite" });
}

function retainedOf(main: ConformiteInput["verdict"]["main"]): RetainedMethod {
  if (main.status !== "CONFORME") return null;
  const crelat = main.crelat.calculable && main.crelat.met === true;
  const cabs = main.cabs.calculable && main.cabs.met === true;
  return crelat && cabs ? "LES_DEUX" : crelat ? "CRELAT" : cabs ? "CABS" : null;
}

function favorableLabel(f: ConformiteInput["verdict"]["main"]["favorable"]): string {
  if (f === null) return "aucune (aucune méthode calculable)";
  if (f === "EGALITE") return "les deux objectifs sont égaux";
  return WAY_LABELS[f];
}

function sortEmpties(list: EmptyState[]): EmptyState[] {
  const seen = new Set<EmptyCode>();
  return [...list]
    .sort((a, b) => EMPTY_PRIORITY.indexOf(a.code) - EMPTY_PRIORITY.indexOf(b.code))
    .filter((e) => (seen.has(e.code) ? false : (seen.add(e.code), true)));
}

// ---------------------------------------------------------------------------------------------------------------

export function buildSynthesis(inputs: DashboardInputs): Synthesis {
  const { site, surfaces, climat, comparateur, conformite } = inputs;
  const all: EmptyState[] = [];
  const fail = (s: SourceError) => {
    const e = sourceEmpty(s);
    all.push(e);
    return e;
  };

  // Site et EFA.
  let siteSection: Section<SiteSection>;
  if (!site.ok) siteSection = { ok: false, empty: fail(site) };
  else {
    const first = site.data.efas[0];
    siteSection = {
      ok: true,
      data: {
        buildingLabel: surfaces.ok ? surfaces.data.buildingLabel : null,
        postcode: site.data.postcode,
        city: site.data.city,
        efaLabel: comparateur.ok ? comparateur.data.efaLabel : null,
        surfaceM2: surfaces.ok ? surfaces.data.surfaceTotal : first?.surfaceTotal ?? null,
        zone: conformite.ok ? conformite.data.site.zone : null,
        efaCount: site.data.efas.length,
      },
    };
  }

  // Surfaces.
  const surfaceProblem = surfaces.ok ? surfacesEmpty(surfaces.data) : fail(surfaces);
  if (surfaces.ok && surfaceProblem) all.push(surfaceProblem);

  // Consommations, DJU, année suivie.
  const follow = climat.ok ? followUpOf(climat.data) : { empty: fail(climat) };
  if (climat.ok && "empty" in follow) all.push(follow.empty);
  const followUp: Section<FollowUpSection> = "current" in follow ? { ok: true, data: follow.current } : { ok: false, empty: follow.empty };

  // Année de référence : la conformité dit si elle est encore éligible ; à défaut, le comparateur dit si elle est choisie.
  const chosenYear = conformite.ok ? conformite.data.reference.year : comparateur.ok ? comparateur.data.chosenYear : null;
  const referenceKnown = conformite.ok || comparateur.ok;
  const refProblem = referenceKnown ? referenceEmpty(chosenYear, conformite.ok ? conformite.data.reference.problem : null) : null;
  if (refProblem) all.push(refProblem);
  if (!comparateur.ok) fail(comparateur);

  // Conformité : verdict et objectifs.
  let verdict: Section<VerdictSection>;
  let objectives: Section<ObjectivesSection>;
  let cabsProblem: EmptyState | null = null;
  if (!conformite.ok) {
    const e = fail(conformite);
    verdict = { ok: false, empty: e };
    objectives = { ok: false, empty: e };
  } else {
    const c = conformite.data;
    cabsProblem = cabsEmpty(c);
    if (cabsProblem) all.push(cabsProblem);
    const main = c.verdict.main;
    const retained = retainedOf(main);
    verdict = {
      ok: true,
      data: {
        status: main.status,
        statusLabel: STATUS_LABELS[main.status],
        icon: ICONS[main.status],
        message: main.message,
        retained,
        retainedLabel: retained ? RETAINED_LABELS[retained] : "aucune (verdict non conforme ou indéterminé)",
        favorableLabel: favorableLabel(main.favorable),
      },
    };
    objectives = {
      ok: true,
      data: {
        referenceYear: c.reference.year,
        crefKwh: c.reference.crefKwh,
        crelat: c.crelat.ok ? c.crelat.objectives : null,
        cabsKwh: c.cabs.ok ? c.cabs.objectiveKwh : null,
        empties: [refProblem, cabsProblem].filter((e): e is EmptyState => e !== null),
      },
    };
  }

  // Chaîne de la démo.
  const unavailable = (s: { ok: boolean }) => !s.ok;
  const consumptionCodes: EmptyCode[] = ["PAS_DE_CONSOMMATION", "AUCUNE_ANNEE_SUIVIE", "ANNEE_INCOMPLETE"];
  const djuCodes: EmptyCode[] = ["DJU_MANQUANT"];
  const followCode = "empty" in follow ? follow.empty.code : null;
  const stepOf = (id: StepId, label: string, href: string | null, isUnavailable: boolean, problem: EmptyState | null, done: string): Step => ({
    id, label, href,
    state: isUnavailable ? "INDISPONIBLE" : problem ? "A_FAIRE" : "FAIT",
    detail: isUnavailable ? "Données indisponibles." : problem ? problem.message : done,
  });
  const followEmpty = "empty" in follow ? follow.empty : null;
  const steps: Step[] = [
    // Pas de lien : le module bâtiment n'est encore qu'un squelette.
    stepOf("batiment", "Bâtiment et EFA", null, unavailable(site), null,
      site.ok ? `${site.data.postcode} ${site.data.city}, ${site.data.efas.length} EFA.` : ""),
    stepOf("surfaces", "Surfaces", "/surfaces", unavailable(surfaces), surfaces.ok ? surfaceProblem : null,
      surfaces.ok ? `Somme des lignes = surface de l'EFA (${fmtM2(surfaces.data.surfaceTotal)}).` : ""),
    stepOf("consommations", "Consommations", "/collecte", unavailable(climat),
      followCode && consumptionCodes.includes(followCode) ? followEmpty : null,
      "Au moins une année complète hors 2020 et 2021."),
    stepOf("dju", "DJU (kWh/DJU)", "/climat", unavailable(climat),
      followCode && djuCodes.includes(followCode) ? followEmpty : followCode ? { ...followEmpty!, message: "En attente d'une année complète." } : null,
      "kWh/DJU calculé pour l'année suivie."),
    stepOf("reference", "Année de référence", "/comparateur", !referenceKnown, refProblem,
      chosenYear !== null ? `Année ${chosenYear} retenue.` : ""),
    stepOf("conformite", "Conformité", "/conformite", unavailable(conformite),
      conformite.ok && conformite.data.verdict.main.status === "INDETERMINE"
        ? empty("ERREUR", conformite.data.verdict.main.message, HOME) : null,
      conformite.ok ? `Verdict 2030 : ${STATUS_LABELS[conformite.data.verdict.main.status]}.` : ""),
  ];

  const empties = sortEmpties(all);
  const first = empties[0];
  const nextAction = first
    ? { action: first.action, reason: first.message, code: first.code }
    : { action: { label: "Voir le détail de la conformité", href: "/conformite" }, reason: "Toutes les étapes sont faites.", code: null };

  return { sections: { site: siteSection, verdict, objectives, followUp }, steps, empties, nextAction };
}

// ---------------------------------------------------------------------------------------------------------------
// Classement des erreurs des chargeurs (utilisé par repository.ts, testé ici sans base).

const MODULE_ERRORS = ["BatimentError", "SurfacesError", "ClimatError", "ComparateurError", "ConformiteError"];
const DB_CODES = ["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EHOSTUNREACH", "P1001", "P1002", "P1017"];

/** Erreur d'un chargeur → état de la source. Erreurs typées des modules par leur code HTTP ; base injoignable reconnue. */
export function classifyError(e: unknown): SourceError {
  const err = (typeof e === "object" && e !== null ? e : {}) as { name?: unknown; status?: unknown; code?: unknown; errorCode?: unknown; message?: unknown; cause?: unknown };
  const message = typeof err.message === "string" && err.message.trim() ? err.message.trim() : "erreur inconnue";
  if (typeof err.name === "string" && MODULE_ERRORS.includes(err.name) && typeof err.status === "number") {
    if (err.status === 401) return { ok: false, kind: "AUTH", message };
    if (err.status === 404) return { ok: false, kind: "NOT_FOUND", message };
    return { ok: false, kind: "ERROR", message };
  }
  const codes = [err.code, err.errorCode, (err.cause as { code?: unknown } | undefined)?.code].filter((c): c is string => typeof c === "string");
  const isDb = err.name === "PrismaClientInitializationError"
    || codes.some((c) => DB_CODES.includes(c))
    || /Can't reach database server|DATABASE_URL manquant/.test(message);
  if (isDb) return { ok: false, kind: "DB", message: "base de données injoignable" };
  // Message court : la première ligne utile, sans pile ni chemin de fichier.
  const short = message.split("\n").map((l) => l.trim()).find((l) => l && !/[\\/].*:\d+:\d+/.test(l)) ?? "erreur inconnue";
  return { ok: false, kind: "ERROR", message: short };
}
