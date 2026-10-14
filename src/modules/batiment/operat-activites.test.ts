import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OPERAT_DIR, operatVersionFromFileName, parseOperatActivities, readOperatActivities } from "./operat-activites";

// Petits fichiers construits par les tests (le vrai fichier n'est que lu, dans le dernier bloc).
const HEADER = "code_categorie;categorie;code_sous_categorie;sous_categorie;ajust_clim_chauffage;ajust_clim_refroidissement;ajust_clim_logistique_froid;ajust_clim_froid_commercial;code_indicateur;nom_indicateur;valeur_etalon";
const NAME = "referentiel_activites_OPERAT_v9.0.csv";
const file = (...lines: string[]) => [HEADER, ...lines].join("\n") + "\n";
const VACANT = "CAP00;Local vacant;SCAP0001;Local vacant;1;0;0;0;;;";
const RESTO_H = "CAP18;Restauration;SCAP1803;Restaurant traditionnel ;1;1;0;0;NB_H_OUVREES;Amplitude horaire;2688.00";
const RESTO_C = "CAP18;Restauration;SCAP1803;Restaurant traditionnel ;1;1;0;0;SURF_CUISINE;Part cuisine;21,5";

describe("parseOperatActivities — format", () => {
  it("regroupe les lignes par sous-catégorie et lit version, ajustements, indicateurs", () => {
    const r = parseOperatActivities(file(VACANT, RESTO_H, RESTO_C), NAME);
    expect(r.issues).toEqual([]);
    expect(r.version).toBe("9.0");
    expect(r.categories).toEqual([{ code: "CAP00", label: "Local vacant" }, { code: "CAP18", label: "Restauration" }]);
    expect(r.subCategories).toEqual([
      { code: "SCAP0001", label: "Local vacant", categoryCode: "CAP00", indicateurs: [],
        ajustements: { chauffage: true, refroidissement: false, logistiqueFroid: false, froidCommercial: false } },
      { code: "SCAP1803", label: "Restaurant traditionnel", categoryCode: "CAP18",
        ajustements: { chauffage: true, refroidissement: true, logistiqueFroid: false, froidCommercial: false },
        indicateurs: [{ code: "NB_H_OUVREES", nom: "Amplitude horaire", valeurEtalon: 2688 }, { code: "SURF_CUISINE", nom: "Part cuisine", valeurEtalon: 21.5 }] },
    ]);
  });

  it("ignore BOM, fins de ligne Windows et lignes vides", () => {
    const r = parseOperatActivities("﻿" + [HEADER, "", VACANT, "", RESTO_H, ";;;;;;;;;;", ""].join("\r\n"), NAME);
    expect(r.issues).toEqual([]);
    expect(r.subCategories).toHaveLength(2);
  });

  it("signale une colonne manquante", () => {
    const r = parseOperatActivities(HEADER.replace(";valeur_etalon", "") + "\n" + VACANT.slice(0, -1) + "\n", NAME);
    expect(r.issues).toEqual(["Colonne(s) manquante(s) dans le référentiel : valeur_etalon."]);
    expect(r.subCategories).toEqual([]);
  });

  it("signale un fichier vide", () => {
    expect(parseOperatActivities(HEADER + "\n", NAME).issues).toEqual(["Le référentiel ne contient aucune ligne de données."]);
  });

  it("signale un nom de fichier sans version", () => {
    const r = parseOperatActivities(file(VACANT), "referentiel.csv");
    expect(r.version).toBe("");
    expect(r.issues[0]).toMatch(/version introuvable/);
  });
});

describe("parseOperatActivities — contrôles", () => {
  it("doublon (sous-catégorie, indicateur)", () => {
    const r = parseOperatActivities(file(RESTO_H, RESTO_H), NAME);
    expect(r.issues).toEqual(["Ligne 3 : doublon (SCAP1803, NB_H_OUVREES)."]);
  });

  it("sous-catégorie rattachée à deux catégories", () => {
    const r = parseOperatActivities(file(RESTO_H, RESTO_C.replace("CAP18;Restauration", "CAP04;Bureaux")), NAME);
    expect(r.issues).toEqual(["Ligne 3 : sous-catégorie SCAP1803 rattachée à deux catégories (CAP18, CAP04)."]);
  });

  it("accepte les codes à 4 et 6 chiffres et une valeur étalon vide (null, jamais 0)", () => {
    const r = parseOperatActivities(file("CAP0502;GSA - Supérette;SCAP050205;Supérette - Froid;1;0;0;1;L_POS;Mètres linéaires (ml) ;"), NAME);
    expect(r.issues).toEqual([]);
    expect(r.subCategories[0]).toMatchObject({ code: "SCAP050205", categoryCode: "CAP0502" });
    expect(r.subCategories[0].indicateurs).toEqual([{ code: "L_POS", nom: "Mètres linéaires (ml)", valeurEtalon: null }]);
  });

  it("codes, ajustements et valeur étalon invalides", () => {
    const r = parseOperatActivities(file(
      "C18;Restauration;SCAP1803;Resto;1;1;0;0;;;",
      "CAP18;Restauration;S1803;Resto;1;1;0;0;;;",
      "CAP18;Restauration;SCAP1803;Resto;2;1;0;0;;;",
      "CAP18;Restauration;SCAP1803;Resto;1;1;0;0;NB_H_OUVREES;Amplitude;n/a",
    ), NAME);
    expect(r.issues).toHaveLength(4);
    expect(r.issues[0]).toMatch(/code catégorie « C18 »/);
    expect(r.issues[1]).toMatch(/code sous-catégorie « S1803 »/);
    expect(r.issues[2]).toMatch(/ajust_clim_chauffage « 2 »/);
    expect(r.issues[3]).toMatch(/valeur étalon « n\/a »/);
  });

  it("libellés ou ajustements divergents pour une même sous-catégorie", () => {
    const r = parseOperatActivities(file(RESTO_H, RESTO_C.replace("Restaurant traditionnel", "Brasserie").replace(";1;1;0;0;", ";1;0;0;0;")), NAME);
    expect(r.issues).toEqual([
      "Ligne 3 : sous-catégorie SCAP1803 avec deux libellés.",
      "Ligne 3 : sous-catégorie SCAP1803 avec deux jeux d'ajustements climatiques.",
    ]);
  });
});

describe("readOperatActivities — un seul fichier par dossier", () => {
  const dirWith = (...names: string[]) => {
    const dir = mkdtempSync(join(tmpdir(), "operat-"));
    for (const n of names) writeFileSync(join(dir, n), file(VACANT));
    return dir;
  };

  it("lit le seul fichier présent et ignore les autres fichiers du dossier", () => {
    const r = readOperatActivities(dirWith("referentiel_activites_OPERAT_v9.1.csv", "cabs.json"));
    expect(r.fileName).toBe("referentiel_activites_OPERAT_v9.1.csv");
    expect(r.version).toBe("9.1");
    expect(r.issues).toEqual([]);
  });

  it("aucun fichier → erreur claire", () => {
    expect(() => readOperatActivities(dirWith("cabs.json"))).toThrow(/Aucun fichier referentiel_activites_OPERAT/);
  });

  it("deux versions → erreur claire", () => {
    expect(() => readOperatActivities(dirWith(NAME, "referentiel_activites_OPERAT_v9.1.csv"))).toThrow(/Plusieurs versions/);
  });

  it("dossier absent → erreur claire", () => {
    expect(() => readOperatActivities(join(tmpdir(), "operat-absent-xyz"))).toThrow(/introuvable/);
  });

  it("version lue dans le nom", () => {
    expect(operatVersionFromFileName(NAME)).toBe("9.0");
    expect(operatVersionFromFileName("referentiel_activites_OPERAT.csv")).toBeNull();
  });
});

describe("vrai référentiel ADEME v9.0 (data/referentiels/operat)", () => {
  const r = readOperatActivities(join(process.cwd(), OPERAT_DIR));

  it("64 catégories, 491 sous-catégories, aucun problème", () => {
    expect(r.issues).toEqual([]);
    expect(r.version).toBe("9.0");
    expect(r.categories).toHaveLength(64);
    expect(r.subCategories).toHaveLength(491);
  });

  it("contient les sous-catégories du site de démo (SCAP1803 restaurant, SCAP0401 bureaux)", () => {
    const resto = r.subCategories.find((s) => s.code === "SCAP1803");
    const bureaux = r.subCategories.find((s) => s.code === "SCAP0401");
    expect(resto?.categoryCode).toBe("CAP18");
    expect(resto?.label).toBe("Restaurant traditionnel ou Brasserie");
    expect(resto?.indicateurs.find((i) => i.code === "NB_H_OUVREES")?.valeurEtalon).toBe(2688);
    expect(bureaux?.categoryCode).toBe("CAP04");
    expect(bureaux?.indicateurs.map((i) => i.code)).toEqual(["NB_H_OUVREES", "SURF_POSTE", "T_OCC"]);
  });
});
