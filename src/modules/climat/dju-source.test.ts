import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseDjuCsv, readDjuFile } from "./dju-source";

// Petits fichiers construits par les tests (le vrai fichier n'est que lu, dans le dernier bloc).
const HEADER = "code_station;nom_station;annee;mois;DJU_chauffage_base18;DJ_refroid_base18;jours_mesures";
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();

type Opts = { dju?: (m: number) => string; days?: (m: number) => number; skip?: number[] };
function yearLines(station: string, year: number, opts: Opts = {}): string[] {
  const dju = opts.dju ?? (() => "100,5");
  const days = opts.days ?? ((m: number) => daysIn(year, m));
  return Array.from({ length: 12 }, (_, i) => i + 1)
    .filter((m) => !opts.skip?.includes(m))
    .map((m) => `${station};STATION TEST;${year};${m};${dju(m)};0,0;${days(m)}`);
}
const file = (...lines: string[]) => [HEADER, ...lines].join("\n") + "\n";

describe("parseDjuCsv — agrégation annuelle (4.1)", () => {
  it("somme les 12 mois avec virgule décimale : 12 × 100,5 = 1 206", () => {
    const r = parseDjuCsv(file(...yearLines("02037002", 2019)));
    expect(r.issues).toEqual([]);
    expect(r.errorCount).toBe(0);
    expect(r.rows).toEqual([{ zone: "02037002", year: 2019, dju: 1206 }]);
  });

  it("agrège un petit échantillon de valeurs différentes, arrondi au dixième", () => {
    const values = ["555,4", "410,8", "340,4", "245,8", "120,1", "30,0", "0,0", "5,2", "60,3", "180,7", "320,9", "470,6"];
    const r = parseDjuCsv(file(...yearLines("02037002", 2010, { dju: (m) => values[m - 1] })));
    expect(r.rows).toEqual([{ zone: "02037002", year: 2010, dju: 2740.2 }]);
  });

  it("gère le BOM, les fins de ligne Windows et les lignes vides", () => {
    const text = "﻿" + [HEADER, "", ...yearLines("02037002", 2019), "", ";;;;;;", ""].join("\r\n");
    const r = parseDjuCsv(text);
    expect(r.issues).toEqual([]);
    expect(r.rows).toHaveLength(1);
  });

  it("sépare deux stations et plusieurs années, triées", () => {
    const r = parseDjuCsv(file(...yearLines("02320001", 2020), ...yearLines("02037002", 2020), ...yearLines("02037002", 2019)));
    expect(r.rows.map((x) => `${x.zone}-${x.year}`)).toEqual(["02037002-2019", "02037002-2020", "02320001-2020"]);
  });

  it("ignore une année à laquelle il manque un mois, et le signale", () => {
    const r = parseDjuCsv(file(...yearLines("02037002", 2019), ...yearLines("02037002", 2020, { skip: [7] })));
    expect(r.rows.map((x) => x.year)).toEqual([2019]);
    expect(r.errorCount).toBe(0); // non bloquant
    expect(r.issues).toEqual(["Station 02037002, 2020 : 11 mois sur 12, année ignorée."]);
  });

  it("ignore une année dont un mois n'est pas mesuré en entier (jours_mesures)", () => {
    const r = parseDjuCsv(file(...yearLines("02037002", 2019, { days: (m) => (m === 3 ? 30 : daysIn(2019, m)) })));
    expect(r.rows).toEqual([]);
    expect(r.issues[0]).toContain("mois 3 : 30/31 jours");
  });

  it("tient compte des années bissextiles : février 2020 = 29 jours", () => {
    expect(parseDjuCsv(file(...yearLines("02037002", 2020))).rows).toHaveLength(1);
    const feb28 = parseDjuCsv(file(...yearLines("02037002", 2020, { days: (m) => (m === 2 ? 28 : daysIn(2020, m)) })));
    expect(feb28.rows).toEqual([]);
    expect(feb28.issues[0]).toContain("mois 2 : 28/29 jours");
  });

  it("signale un doublon station + année + mois (bloquant)", () => {
    const lines = yearLines("02037002", 2019);
    const r = parseDjuCsv(file(...lines, lines[0]));
    expect(r.errorCount).toBe(1);
    expect(r.issues[0]).toContain("doublon station 02037002, 2019, mois 1");
  });

  it("signale une colonne manquante", () => {
    const r = parseDjuCsv("code_station;annee;mois;jours_mesures\n02037002;2019;1;31\n");
    expect(r.rows).toEqual([]);
    expect(r.errorCount).toBe(1);
    expect(r.issues[0]).toContain("DJU_chauffage_base18");
  });

  it("refuse un DJU non numérique ou négatif (bloquant)", () => {
    const r = parseDjuCsv(file(...yearLines("02037002", 2019, { dju: (m) => (m === 1 ? "abc" : m === 2 ? "-3,0" : "100,5") })));
    expect(r.errorCount).toBe(2);
    expect(r.issues[0]).toContain("« abc » non numérique");
    expect(r.issues[1]).toContain("DJU négatif");
    expect(r.rows).toEqual([]); // l'année n'a plus ses 12 mois
  });

  it("signale un fichier sans données", () => {
    expect(parseDjuCsv(HEADER + "\n").issues[0]).toContain("aucune ligne");
    expect(parseDjuCsv("").errorCount).toBe(1);
  });
});

describe("readDjuFile", () => {
  it("lit un petit fichier écrit sur disque", () => {
    const path = join(mkdtempSync(join(tmpdir(), "dju-")), "dju.csv");
    writeFileSync(path, file(...yearLines("02037002", 2019)), "utf8");
    expect(readDjuFile(path).rows).toEqual([{ zone: "02037002", year: 2019, dju: 1206 }]);
  });

  it("lève une erreur claire si le fichier est absent", () => {
    expect(() => readDjuFile(join(tmpdir(), "nexiste-pas-dju.csv"))).toThrow("Fichier DJU introuvable");
  });
});

describe("contrôle d'ensemble sur le vrai fichier Météo-France", () => {
  const real = readDjuFile(join(process.cwd(), "data", "referentiels", "dju", "dju_mensuel_2010_2025.csv"));
  const dju = (zone: string, year: number) => real.rows.find((r) => r.zone === zone && r.year === year)?.dju;

  it("produit 2 stations × 16 ans (2010–2025), sans aucun problème", () => {
    expect(real.issues).toEqual([]);
    expect(real.rows).toHaveLength(32);
    expect(new Set(real.rows.map((r) => r.zone))).toEqual(new Set(["02037002", "02320001"]));
    expect(Math.min(...real.rows.map((r) => r.year))).toBe(2010);
    expect(Math.max(...real.rows.map((r) => r.year))).toBe(2025);
  });

  // Référence : sommes annuelles du fichier mensuel (tolérance ±0,05).
  it.each([
    ["02037002", 2013, 2949.2], ["02037002", 2019, 2485.9], ["02037002", 2023, 2229.5], ["02037002", 2025, 2353.7],
    ["02320001", 2013, 3002.5], ["02320001", 2019, 2569.5],
  ])("station %s, %i = %f DJU (±0,05)", (zone, year, expected) => {
    expect(Math.abs(dju(zone, year)! - expected)).toBeLessThanOrEqual(0.05);
  });

  // Garde-fou de cohérence avec les valeurs annoncées par Mira (tolérance ±0,5).
  it.each([
    ["02037002", 2013, 2949.3], ["02037002", 2019, 2485.7], ["02037002", 2025, 2353.7],
    ["02320001", 2013, 3002.6], ["02320001", 2019, 2569.4],
  ])("cohérent avec la valeur Mira : station %s, %i ≈ %f (±0,5)", (zone, year, expected) => {
    expect(Math.abs(dju(zone, year)! - expected)).toBeLessThanOrEqual(0.5);
  });
});
