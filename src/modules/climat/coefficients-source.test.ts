import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLIMATE_FILE, parseClimateCsv, readClimateFile } from "./coefficients-source";

const HEADER = "annee;dju_chauffage;dju_climatisation";
const file = (...lines: string[]) => [HEADER, ...lines].join("\n") + "\n";

describe("parseClimateCsv — format du fichier climatique", () => {
  it("lit point et virgule décimale, trie par année", () => {
    const r = parseClimateCsv(file("2002;2705,9;158,9", "2001;2897.6;196.8"));
    expect(r.issues).toEqual([]);
    expect(r.rows).toEqual([
      { year: 2001, heatingDegreeDays: 2897.6, coolingDegreeDays: 196.8 },
      { year: 2002, heatingDegreeDays: 2705.9, coolingDegreeDays: 158.9 },
    ]);
  });
  it("gère le BOM, les fins de ligne Windows et les lignes vides", () => {
    const r = parseClimateCsv("﻿" + [HEADER, "", "2001;2897.6;196.8", "", ";;", ""].join("\r\n"));
    expect(r.issues).toEqual([]);
    expect(r.rows).toHaveLength(1);
  });
  it("colonne manquante → problème explicite", () => {
    expect(parseClimateCsv("annee;dju_chauffage\n2001;2897.6\n").issues).toEqual([
      "Colonne(s) manquante(s) dans le fichier climatique : dju_climatisation.",
    ]);
  });
  it("valeur illisible, négative, année illisible ou en double → problème par ligne", () => {
    const r = parseClimateCsv(file("2001;abc;196.8", "2002;-1;10", "20x3;1;1", "2004;1;1", "2004;2;2"));
    expect(r.issues).toEqual([
      "Ligne 2 : dju_chauffage « abc » non numérique.",
      "Ligne 3 : dju_chauffage négatif (-1).",
      "Ligne 4 : année « 20x3 » illisible.",
      "Ligne 6 : année 2004 en double.",
    ]);
  });
  it("fichier vide → problème", () => {
    expect(parseClimateCsv("").issues).toHaveLength(1);
  });
});

describe("readClimateFile", () => {
  it("fichier absent → erreur explicite", () => {
    expect(() => readClimateFile(join(tmpdir(), "absent-climat.csv"))).toThrow(/introuvable/);
  });
  it("lit un fichier sur disque", () => {
    const dir = mkdtempSync(join(tmpdir(), "climat-"));
    const path = join(dir, "c.csv");
    writeFileSync(path, file("2001;2897.6;196.8"));
    expect(readClimateFile(path).rows).toHaveLength(1);
  });
  it("le VRAI fichier Saint-Quentin : 2001 à 2025, sans problème", () => {
    const r = readClimateFile(join(process.cwd(), CLIMATE_FILE));
    expect(r.issues).toEqual([]);
    expect(r.rows.map((x) => x.year)).toEqual(Array.from({ length: 25 }, (_, i) => 2001 + i));
    expect(r.rows.find((x) => x.year === 2023)).toEqual({ year: 2023, heatingDegreeDays: 2444.3, coolingDegreeDays: 307.7 });
  });
});
