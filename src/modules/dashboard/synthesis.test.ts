import { describe, expect, it } from "vitest";
import { computeCrelat, evaluateVerdict, type CabsResult, type CrelatResult } from "@/modules/conformite";
import {
  EMPTY_PRIORITY, buildSynthesis, classifyError, sourceEmpty,
  type ClimatInput, type ConformiteInput, type DashboardInputs, type EmptyCode, type SourceError, type SurfacesInput,
} from "./synthesis";

// Jeu de Laon (valeurs de contrôle de CLAUDE.md) construit avec les VRAIES fonctions de la conformité.
const REFERENTIAL = {
  categories: [{ code: "CAP18", label: "Restauration - Débit de boissons" }],
  subCategories: [{ code: "SCAP1803", label: "Restaurant traditionnel ou Brasserie", categoryCode: "CAP18" }],
};
const SURFACES: SurfacesInput = {
  efaId: "resto",
  buildingLabel: "Site de démonstration (fictif), 02000 Laon",
  surfaceTotal: 1200,
  lines: [{ categoryCode: "CAP18", subCategoryCode: "SCAP1803", surfaceM2: 1200 }],
  referential: REFERENTIAL,
};
type ClimatRow = ClimatInput["rows"][number];
/** Ligne d'année ; corrected = null → année non corrigeable. */
const row = (year: number, consumptionKwh: number | null, corrected: number | null, status: ClimatRow["status"] = "OK"): ClimatRow => ({
  year, consumptionKwh, status,
  correctedKwh: corrected, correctedKwhPerM2: corrected === null ? null : Math.round((corrected / 1200) * 100) / 100,
  correction: corrected === null ? "NON_CORRIGEABLE" : "CORRIGEE",
  correctionProblem: corrected === null ? `${year} est absente du fichier climatique de la station : année non corrigeable.` : null,
  unknownShares: [],
});
const CLIMAT: ClimatInput = {
  stationLabel: "Saint-Quentin (02320001)",
  correctionAvailable: true,
  problem: null,
  rows: [row(2013, 52800, 49500), row(2019, 43200, 44100), row(2025, 40500, 41700)],
};
const CABS_OK: CabsResult = { ok: true, objectiveKwh: 278400, surfaceTotal: 1200, perLine: [] };

function conformite(opts: { crelat?: CrelatResult; cabs?: CabsResult; referenceYear?: number | null; problem?: string | null; currentKwh?: number | null; zone?: string | null } = {}): ConformiteInput {
  const referenceYear = opts.referenceYear === undefined ? 2013 : opts.referenceYear;
  const crelat = opts.crelat ?? (referenceYear === null ? { ok: false, reason: "Aucune année de référence choisie." } : computeCrelat(52800));
  const cabs = opts.cabs ?? CABS_OK;
  const currentKwh = opts.currentKwh === undefined ? 40500 : opts.currentKwh;
  const zone = opts.zone === undefined ? "H1a" : opts.zone;
  return {
    reference: { year: referenceYear, crefKwh: crelat.ok ? 52800 : null, problem: opts.problem ?? null },
    crelat,
    cabs: { ...cabs, zone, altitudeBand: "<400", decree: "Arrêté du 1er août 2025" },
    current: currentKwh === null ? null : { year: 2025, consumptionKwh: currentKwh },
    site: { zone, sources: { zone: zone ? "déduite du code postal 02000" : "Code postal 20000 : Corse, département 2A ou 2B ambigu, choisir via la station.", altitude: "altitude à confirmer (IGN)" } },
    verdict: evaluateVerdict({ crelat, cabs, currentKwh, currentYear: currentKwh === null ? null : 2025, referenceYear }),
  };
}

function inputs(over: Partial<DashboardInputs> = {}): DashboardInputs {
  return {
    site: { ok: true, data: { postcode: "02000", city: "Laon", efas: [{ id: "resto", surfaceTotal: 1200 }, { id: "resto-bureaux", surfaceTotal: 500 }] } },
    surfaces: { ok: true, data: SURFACES },
    climat: { ok: true, data: CLIMAT },
    comparateur: { ok: true, data: { efaLabel: "EFA SASU · propriétaire occupant", chosenYear: 2013 } },
    conformite: { ok: true, data: conformite() },
    ...over,
  };
}
const codes = (s: ReturnType<typeof buildSynthesis>) => s.empties.map((e) => e.code);
const stateOf = (s: ReturnType<typeof buildSynthesis>, id: string) => s.steps.find((x) => x.id === id)?.state;
const DB: SourceError = { ok: false, kind: "DB", message: "base de données injoignable" };
const AUTH: SourceError = { ok: false, kind: "AUTH", message: "Aucun utilisateur connecté" };
const NOT_FOUND: SourceError = { ok: false, kind: "NOT_FOUND", message: "Aucun bâtiment rattaché" };

describe("7.1 — cas nominal (site de Laon, référence 2013)", () => {
  const s = buildSynthesis(inputs());

  it("aucun manque, toutes les étapes faites, prochaine action = détail de la conformité", () => {
    expect(s.empties).toEqual([]);
    expect(s.steps.map((x) => x.state)).toEqual(["FAIT", "FAIT", "FAIT", "FAIT", "FAIT", "FAIT"]);
    expect(s.nextAction).toMatchObject({ code: null, action: { href: "/conformite" } });
  });

  it("site et EFA", () => {
    expect(s.sections.site).toEqual({ ok: true, data: {
      buildingLabel: "Site de démonstration (fictif), 02000 Laon", postcode: "02000", city: "Laon",
      efaLabel: "EFA SASU · propriétaire occupant", surfaceM2: 1200, zone: "H1a", efaCount: 2,
    } });
  });

  it("verdict CONFORME par Cabs, en texte et icône, voie la plus favorable = Cabs", () => {
    expect(s.sections.verdict).toEqual({ ok: true, data: {
      status: "CONFORME", statusLabel: "CONFORME", icon: "✓", message: "Conforme par l'objectif en valeur absolue (Cabs).",
      retained: "CABS", retainedLabel: "objectif en valeur absolue (Cabs)", favorableLabel: "objectif en valeur absolue (Cabs)",
    } });
  });

  it("objectifs : Créf 52 800 → 31 680 / 26 400 / 21 120 ; Cabs 278 400", () => {
    expect(s.sections.objectives).toEqual({ ok: true, data: {
      referenceYear: 2013, crefKwh: 52800, crelat: { 2030: 31680, 2040: 26400, 2050: 21120 }, cabsKwh: 278400, empties: [],
    } });
  });

  it("suivi : 2025, brute 40 500 kWh, corrigée 41 700 kWh, 34,75 kWh corrigés/m² (année suivie = règle de la conformité)", () => {
    expect(s.sections.followUp).toEqual({ ok: true, data: {
      year: 2025, consumptionKwh: 40500, correctedKwh: 41700, correctedKwhPerM2: 34.75, unknownShares: [], stationLabel: "Saint-Quentin (02320001)",
    } });
  });

  it("chaîne : l'étape bâtiment n'a pas de lien, les cinq autres en ont un ; plus d'étape DJU", () => {
    expect(s.steps.map((x) => [x.id, x.href])).toEqual([
      ["batiment", null], ["surfaces", "/surfaces"], ["consommations", "/collecte"], ["correction", "/climat"], ["reference", "/comparateur"], ["conformite", "/conformite"],
    ]);
    expect(s.steps.find((x) => x.id === "correction")?.label).toBe("Correction climatique");
    expect(JSON.stringify(s)).not.toMatch(/DJU/);
  });

  it("méthode retenue : les deux quand Crelat et Cabs sont atteints", () => {
    const v = buildSynthesis(inputs({ conformite: { ok: true, data: conformite({ currentKwh: 30000 }) } })).sections.verdict;
    expect(v.ok && v.data).toMatchObject({ retained: "LES_DEUX", retainedLabel: "les deux méthodes", favorableLabel: "objectif en valeur absolue (Cabs)" });
  });

  it("NON CONFORME : icône ✗, aucune méthode retenue", () => {
    const v = buildSynthesis(inputs({ conformite: { ok: true, data: conformite({ cabs: { ...CABS_OK, objectiveKwh: 30000 } }) } })).sections.verdict;
    expect(v.ok && v.data).toMatchObject({ status: "NON_CONFORME", statusLabel: "NON CONFORME", icon: "✗", retained: null });
  });
});

describe("7.4 — un état vide par cas, avec UNE action", () => {
  it("base injoignable : commande npm run db:up, aucune page", () => {
    const s = buildSynthesis(inputs({ site: DB, surfaces: DB, climat: DB, comparateur: DB, conformite: DB }));
    expect(codes(s)).toEqual(["BASE_INJOIGNABLE"]);
    expect(s.nextAction.action).toEqual({ label: "Démarrer la base", href: null, command: "npm run db:up" });
    expect(s.steps.every((x) => x.state === "INDISPONIBLE")).toBe(true);
    expect(s.sections.verdict).toMatchObject({ ok: false, empty: { code: "BASE_INJOIGNABLE" } });
  });

  it("utilisateur non connecté : npm run demo + retour à la carte du projet", () => {
    const s = buildSynthesis(inputs({ site: AUTH, surfaces: AUTH, climat: AUTH, comparateur: AUTH, conformite: AUTH }));
    expect(codes(s)).toEqual(["NON_CONNECTE"]);
    expect(s.nextAction.action).toEqual({ label: "Retour à la carte du projet", href: "/", command: "npm run demo" });
  });

  it("pas de bâtiment ni d'EFA : npm run db:seed + retour à la carte du projet", () => {
    const s = buildSynthesis(inputs({ site: NOT_FOUND, surfaces: NOT_FOUND, climat: NOT_FOUND, comparateur: NOT_FOUND, conformite: NOT_FOUND }));
    expect(codes(s)).toEqual(["PAS_DE_BATIMENT"]);
    expect(s.nextAction.action).toEqual({ label: "Retour à la carte du projet", href: "/", command: "npm run db:seed" });
    expect(s.sections.site).toMatchObject({ ok: false, empty: { code: "PAS_DE_BATIMENT" } });
  });

  it("aucune ligne de surface → /surfaces", () => {
    const s = buildSynthesis(inputs({ surfaces: { ok: true, data: { ...SURFACES, lines: [] } } }));
    expect(codes(s)).toEqual(["SURFACES_ABSENTES"]);
    expect(s.nextAction.action.href).toBe("/surfaces");
    expect(stateOf(s, "surfaces")).toBe("A_FAIRE");
  });

  it("somme des lignes ≠ surface de l'EFA → /surfaces, avec le message du contrôle des surfaces", () => {
    const s = buildSynthesis(inputs({ surfaces: { ok: true, data: { ...SURFACES, lines: [{ ...SURFACES.lines[0], surfaceM2: 1100 }] } } }));
    expect(codes(s)).toEqual(["SURFACES_INCOHERENTES"]);
    expect(s.nextAction.reason).toMatch(/inférieure de 100 m²/);
    expect(s.nextAction.action).toEqual({ label: "Corriger les surfaces", href: "/surfaces" });
  });

  it("pas de consommation → /collecte ; le suivi est vide", () => {
    const rows = CLIMAT.rows.map((r) => row(r.year, null, null, "PAS_DE_CONSOMMATION"));
    const s = buildSynthesis(inputs({ climat: { ok: true, data: { ...CLIMAT, rows } }, conformite: { ok: true, data: conformite({ currentKwh: null }) } }));
    expect(codes(s)[0]).toBe("PAS_DE_CONSOMMATION");
    expect(s.nextAction.action.href).toBe("/collecte");
    expect(s.sections.followUp).toMatchObject({ ok: false, empty: { code: "PAS_DE_CONSOMMATION" } });
    expect(stateOf(s, "consommations")).toBe("A_FAIRE");
  });

  it("année suivie non corrigeable (absente du fichier climatique) → /climat ; le brut reste affiché, la section ne disparaît pas", () => {
    const rows = [CLIMAT.rows[0], row(2026, 40500, null)];
    const s = buildSynthesis(inputs({ climat: { ok: true, data: { ...CLIMAT, rows } } }));
    expect(codes(s)).toEqual(["ANNEE_NON_CORRIGEABLE"]);
    expect(s.nextAction.action).toEqual({ label: "Voir la correction climatique", href: "/climat" });
    expect(s.nextAction.reason).toMatch(/Année 2026 non corrigeable/);
    expect(s.sections.followUp).toEqual({ ok: true, data: {
      year: 2026, consumptionKwh: 40500, correctedKwh: null, correctedKwhPerM2: null, unknownShares: [], stationLabel: "Saint-Quentin (02320001)",
    } });
    expect(stateOf(s, "correction")).toBe("A_FAIRE");
    expect(stateOf(s, "consommations")).toBe("FAIT");
    expect(EMPTY_PRIORITY).not.toContain("DJU_MANQUANT");
  });

  it("autre station / fichier indisponible : la raison du module climat est reprise", () => {
    const problem = "Le bâtiment est rattaché à la station 02037002, or seule la station Saint-Quentin (02320001) a un fichier de correction climatique.";
    const rows = CLIMAT.rows.map((r) => ({ ...row(r.year, r.consumptionKwh, null), correctionProblem: problem }));
    const s = buildSynthesis(inputs({ climat: { ok: true, data: { ...CLIMAT, correctionAvailable: false, problem, rows } } }));
    expect(codes(s)).toEqual(["ANNEE_NON_CORRIGEABLE"]);
    expect(s.nextAction.reason).toContain("02037002");
  });

  it("énergie sans part chauffage connue : transmise à la section de suivi, pas de manque bloquant", () => {
    const rows = [{ ...row(2025, 40500, 40500), unknownShares: ["GAS"] }];
    const s = buildSynthesis(inputs({ climat: { ok: true, data: { ...CLIMAT, rows } } }));
    expect(s.empties).toEqual([]);
    expect(s.sections.followUp).toMatchObject({ ok: true, data: { unknownShares: ["GAS"], correctedKwh: 40500 } });
  });

  it("année incomplète → /collecte", () => {
    const only = [row(2025, 9000, 9100, "ANNEE_INCOMPLETE")];
    const s = buildSynthesis(inputs({ climat: { ok: true, data: { ...CLIMAT, rows: only } } }));
    expect(codes(s)).toEqual(["ANNEE_INCOMPLETE"]);
    expect(s.nextAction.action.href).toBe("/collecte");
  });

  it("seulement 2020 et 2021 → aucune année suivie → /collecte", () => {
    const only = [2020, 2021].map((year) => row(year, 40000, 40500));
    const s = buildSynthesis(inputs({ climat: { ok: true, data: { ...CLIMAT, rows: only } } }));
    expect(codes(s)).toEqual(["AUCUNE_ANNEE_SUIVIE"]);
  });

  it("année de référence non choisie → /comparateur ; Cabs toujours affiché", () => {
    const s = buildSynthesis(inputs({ comparateur: { ok: true, data: { efaLabel: "EFA", chosenYear: null } }, conformite: { ok: true, data: conformite({ referenceYear: null }) } }));
    expect(codes(s)).toEqual(["REFERENCE_NON_CHOISIE"]);
    expect(s.nextAction.action).toEqual({ label: "Choisir l'année de référence", href: "/comparateur" });
    expect(s.sections.objectives).toMatchObject({ ok: true, data: { referenceYear: null, crelat: null, cabsKwh: 278400 } });
    expect(s.sections.verdict).toMatchObject({ ok: true, data: { status: "CONFORME", retained: "CABS" } });
  });

  it("année de référence plus éligible → /comparateur avec la raison", () => {
    const problem = "L'année de référence enregistrée (2013) n'est plus éligible : année incomplète.";
    const s = buildSynthesis(inputs({ conformite: { ok: true, data: conformite({ crelat: { ok: false, reason: problem }, problem }) } }));
    expect(codes(s)).toEqual(["REFERENCE_INELIGIBLE"]);
    expect(s.nextAction.reason).toBe(problem);
  });

  it("fichier Cabs introuvable → /conformite ; Crelat reste affiché", () => {
    const cabs: CabsResult = { ok: false, code: "FICHIER_INDISPONIBLE", message: "Fichier Cabs introuvable : data/…/cabs_CAP18_restauration.json" };
    const s = buildSynthesis(inputs({ conformite: { ok: true, data: conformite({ cabs }) } }));
    expect(codes(s)).toEqual(["CABS_INDISPONIBLE"]);
    expect(s.nextAction.action.href).toBe("/conformite");
    expect(s.sections.objectives).toMatchObject({ ok: true, data: { cabsKwh: null, crelat: { 2030: 31680 } } });
  });

  it("zone introuvable → /conformite avec la raison de la zone", () => {
    const cabs: CabsResult = { ok: false, code: "VALEUR_ABSENTE", message: "zone climatique inconnue" };
    const s = buildSynthesis(inputs({ conformite: { ok: true, data: conformite({ cabs, zone: null }) } }));
    expect(codes(s)).toEqual(["ZONE_INTROUVABLE"]);
    expect(s.nextAction.reason).toMatch(/Corse/);
  });

  it("Cabs non calculable pour une autre raison (ex. sous-catégorie hors CAP18)", () => {
    const cabs: CabsResult = { ok: false, code: "SOUS_CATEGORIE_INCONNUE", message: "Sous-catégorie SCAP0401 absente du référentiel Cabs." };
    const s = buildSynthesis(inputs({ conformite: { ok: true, data: conformite({ cabs }) } }));
    expect(codes(s)).toEqual(["CABS_NON_CALCULABLE"]);
  });
});

describe("7.4 — sections indépendantes et priorité de la prochaine action", () => {
  it("une source en panne n'efface pas les autres (conformité seule en erreur)", () => {
    const s = buildSynthesis(inputs({ conformite: { ok: false, kind: "ERROR", message: "boom" } }));
    expect(s.sections.verdict).toMatchObject({ ok: false, empty: { code: "ERREUR" } });
    expect(s.sections.site.ok).toBe(true);
    expect(s.sections.followUp).toMatchObject({ ok: true, data: { consumptionKwh: 40500 } });
    expect(stateOf(s, "reference")).toBe("FAIT"); // connue par le comparateur
    expect(stateOf(s, "conformite")).toBe("INDISPONIBLE");
  });

  it("climat seul en erreur : verdict et objectifs restent affichés", () => {
    const s = buildSynthesis(inputs({ climat: DB }));
    expect(s.sections.verdict.ok).toBe(true);
    expect(s.sections.objectives.ok).toBe(true);
    expect(s.sections.followUp).toMatchObject({ ok: false, empty: { code: "BASE_INJOIGNABLE" } });
    expect(s.nextAction.code).toBe("BASE_INJOIGNABLE");
  });

  it("plusieurs manques : tous listés, dans l'ordre de la chaîne ; la prochaine action est le premier", () => {
    const s = buildSynthesis(inputs({
      surfaces: { ok: true, data: { ...SURFACES, lines: [] } },
      comparateur: { ok: true, data: { efaLabel: "EFA", chosenYear: null } },
      conformite: { ok: true, data: conformite({ referenceYear: null, cabs: { ok: false, code: "SURFACE_MANQUANTE", message: "Aucune ligne de surface" } }) },
    }));
    expect(codes(s)).toEqual(["SURFACES_ABSENTES", "REFERENCE_NON_CHOISIE"]); // SURFACE_MANQUANTE du Cabs n'est pas répété
    expect(s.nextAction.action.href).toBe("/surfaces");
    expect(s.sections.verdict).toMatchObject({ ok: true, data: { status: "INDETERMINE", icon: "?", statusLabel: "INDÉTERMINÉ" } });
    expect(stateOf(s, "conformite")).toBe("A_FAIRE");
  });

  it("l'ordre de priorité suit la chaîne de la démo", () => {
    expect(EMPTY_PRIORITY.indexOf("SURFACES_ABSENTES")).toBeLessThan(EMPTY_PRIORITY.indexOf("PAS_DE_CONSOMMATION"));
    expect(EMPTY_PRIORITY.indexOf("PAS_DE_CONSOMMATION")).toBeLessThan(EMPTY_PRIORITY.indexOf("ANNEE_NON_CORRIGEABLE"));
    expect(EMPTY_PRIORITY.indexOf("ANNEE_NON_CORRIGEABLE")).toBeLessThan(EMPTY_PRIORITY.indexOf("REFERENCE_NON_CHOISIE"));
    expect(EMPTY_PRIORITY.indexOf("REFERENCE_NON_CHOISIE")).toBeLessThan(EMPTY_PRIORITY.indexOf("CABS_INDISPONIBLE"));
    expect(EMPTY_PRIORITY[0]).toBe("BASE_INJOIGNABLE");
  });

  it("chaque état vide a un message et exactement une action (lien ou commande)", () => {
    const all: EmptyCode[] = [];
    for (const kind of ["DB", "AUTH", "NOT_FOUND", "ERROR"] as const) {
      const e = sourceEmpty({ ok: false, kind, message: "x" });
      all.push(e.code);
      expect(e.message.length).toBeGreaterThan(10);
      expect(e.action.href !== null || e.action.command !== undefined).toBe(true);
    }
    expect(all).toEqual(["BASE_INJOIGNABLE", "NON_CONNECTE", "PAS_DE_BATIMENT", "ERREUR"]);
  });
});

describe("classifyError — erreurs des chargeurs", () => {
  const moduleError = (name: string, status: number) => Object.assign(new Error("message du module"), { name, status });

  it("erreurs typées des modules, par code HTTP", () => {
    expect(classifyError(moduleError("ComparateurError", 401))).toMatchObject({ kind: "AUTH" });
    expect(classifyError(moduleError("SurfacesError", 404))).toMatchObject({ kind: "NOT_FOUND", message: "message du module" });
    expect(classifyError(moduleError("ConformiteError", 409))).toMatchObject({ kind: "ERROR" });
    for (const n of ["BatimentError", "ClimatError"]) expect(classifyError(moduleError(n, 401)).kind).toBe("AUTH");
  });

  it("base injoignable : forme réelle observée (PrismaClientKnownRequestError, code ECONNREFUSED)", () => {
    const e = Object.assign(new Error("\nInvalid `db.user.findUnique()` invocation in\nC:\\…\\session.ts:15:30\n"), { name: "PrismaClientKnownRequestError", code: "ECONNREFUSED" });
    expect(classifyError(e)).toEqual({ ok: false, kind: "DB", message: "base de données injoignable" });
  });

  it("base injoignable : autres formes (P1001, erreur d'initialisation, DATABASE_URL manquant, cause réseau)", () => {
    expect(classifyError(Object.assign(new Error("x"), { name: "PrismaClientKnownRequestError", code: "P1001" })).kind).toBe("DB");
    expect(classifyError(Object.assign(new Error("Can't reach database server at localhost:5432"), { name: "PrismaClientInitializationError" })).kind).toBe("DB");
    expect(classifyError(new Error("DATABASE_URL manquant : copiez .env.example en .env")).kind).toBe("DB");
    expect(classifyError(Object.assign(new Error("x"), { cause: { code: "ETIMEDOUT" } })).kind).toBe("DB");
  });

  it("autre erreur : ERROR avec un message court, sans chemin de fichier", () => {
    expect(classifyError(new Error("Invalid invocation\nC:\\src\\x.ts:1:2\nboom"))).toEqual({ ok: false, kind: "ERROR", message: "Invalid invocation" });
    expect(classifyError("texte")).toEqual({ ok: false, kind: "ERROR", message: "erreur inconnue" });
  });
});
