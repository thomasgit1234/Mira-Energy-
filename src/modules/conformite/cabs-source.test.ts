import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CABS_FILE, parseCabsJson, readCabsFile } from "./cabs-source";

// Petit fichier fabriqué par le test (le vrai fichier n'est que lu, dans le dernier bloc).
const sample = (sousCategories: unknown[]) => JSON.stringify({ categorie: "TEST", sous_categories: sousCategories });
const sub = (code: string, cvc: unknown, use: unknown = 100) => ({ code_sous_categorie: code, libelle_referentiel: `Libellé ${code}`, use_etalon_kWh_m2_an: use, part_use_variable: 0.5, cvc_kWh_m2_an: cvc });

describe("parseCabsJson — lecture du format (6.2)", () => {
  it("lit les sous-catégories, l'USE et le CVC par tranche et par zone", () => {
    const r = parseCabsJson(sample([sub("SCAPX1", { "<400": { H1a: 10, H2b: 12 }, "400-800": { H1a: 15 } })]));
    expect(r.issues).toEqual([]);
    expect(r.rows).toEqual([{ code: "SCAPX1", label: "Libellé SCAPX1", use: 100, cvc: { "<400": { H1a: 10, H2b: 12 }, "400-800": { H1a: 15 } } }]);
  });

  it("garde une case absente absente (jamais 0), et un objet CVC vide tel quel", () => {
    const r = parseCabsJson(sample([sub("SCAPX1", { "<400": { H2b: 12 } }), sub("SCAPFROID", {})]));
    expect(r.issues).toEqual([]);
    expect(r.rows[0].cvc["<400"]?.H1a).toBeUndefined();
    expect(r.rows[1].cvc).toEqual({});
  });

  it("JSON invalide → erreur claire", () => {
    expect(parseCabsJson("{ pas du json").issues).toEqual(["Fichier Cabs illisible : JSON invalide."]);
  });

  it("champ manquant → erreur claire", () => {
    expect(parseCabsJson(JSON.stringify({ categorie: "X" })).issues[0]).toContain("sous_categories");
    const r = parseCabsJson(sample([{ libelle_referentiel: "sans code", use_etalon_kWh_m2_an: 1, cvc_kWh_m2_an: {} }, sub("SCAPX2", undefined), sub("SCAPX3", {}, "beaucoup")]));
    expect(r.rows).toEqual([]);
    expect(r.issues).toEqual([
      "sous-catégorie n° 1 : champ « code_sous_categorie » manquant.",
      "SCAPX2 : champ « cvc_kWh_m2_an » manquant.",
      "SCAPX3 : champ « use_etalon_kWh_m2_an » manquant ou invalide.",
    ]);
  });

  it("valeur CVC invalide, tranche inconnue, code en double", () => {
    const r = parseCabsJson(sample([sub("SCAPX1", { "<400": { H1a: "99" }, "<200": { H1a: 1 } }), sub("SCAPX1", {})]));
    expect(r.issues).toEqual([
      "SCAPX1, <400, H1a : valeur CVC invalide.",
      "SCAPX1 : tranche d'altitude inconnue « <200 ».",
      "SCAPX1 : code en double.",
    ]);
  });
});

describe("readCabsFile", () => {
  it("lit un petit fichier écrit sur disque", () => {
    const path = join(mkdtempSync(join(tmpdir(), "cabs-")), "cabs.json");
    writeFileSync(path, sample([sub("SCAPX1", { "<400": { H1a: 10 } })]), "utf8");
    expect(readCabsFile(path).rows).toHaveLength(1);
  });

  it("fichier absent → erreur claire", () => {
    expect(() => readCabsFile(join(tmpdir(), "nexiste-pas-cabs.json"))).toThrow("Fichier Cabs introuvable");
  });
});

describe("vrai fichier cabs_CAP18_restauration.json", () => {
  const real = readCabsFile(join(process.cwd(), CABS_FILE));
  it("16 sous-catégories, aucune erreur", () => {
    expect(real.issues).toEqual([]);
    expect(real.rows).toHaveLength(16);
    expect(real.category).toContain("CAP18");
  });
  it("valeurs de contrôle : SCAP1803 et SCAP1801 en H1a < 400 m ; réserves froid sans CVC", () => {
    const get = (code: string) => real.rows.find((r) => r.code === code)!;
    expect([get("SCAP1803").cvc["<400"]?.H1a, get("SCAP1803").use]).toEqual([99, 133]);
    expect([get("SCAP1801").cvc["<400"]?.H1a, get("SCAP1801").use]).toEqual([57, 50]);
    expect(get("SCAP1812").cvc).toEqual({});
    expect(get("SCAP1813").cvc).toEqual({});
  });
});
