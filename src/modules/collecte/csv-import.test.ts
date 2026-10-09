import { describe, expect, it } from "vitest";
import { planMonthWrites } from "@/lib/consumption-writer";
import {
  decodeCsvBytes, parseConsumptionCsv, parseEnergy, parseMonth, summarizeImport, toImportSaveInputs, validateImportRows, type RawRow,
} from "./csv-import";

const NOW = new Date("2026-10-07T12:00:00Z");
const row = (year: string, month: string, energy: string, kwh: string): RawRow => ({ year, month, energy, kwh });

describe("parseConsumptionCsv — lecture du fichier", () => {
  it("lit un fichier propre au format Excel français (;)", () => {
    const f = parseConsumptionCsv("annee;mois;energie;kwh\n2023;1;electricite;3900\n2023;2;electricite;3 800,5\n");
    expect(f.fileIssues).toEqual([]);
    expect(f.rows).toEqual([row("2023", "1", "electricite", "3900"), row("2023", "2", "electricite", "3 800,5")]);
  });

  it("accepte des en-têtes accentués, en majuscules, dans un autre ordre, avec BOM", () => {
    const f = parseConsumptionCsv("﻿Énergie;Année;Mois;Consommation (kWh)\r\nGaz;2022;mars;1200\r\n");
    expect(f.fileIssues).toEqual([]);
    expect(f.rows).toEqual([row("2022", "mars", "Gaz", "1200")]);
  });

  it("détecte la virgule comme séparateur", () => {
    const f = parseConsumptionCsv("annee,mois,energie,kwh\n2023,1,gaz,1200\n");
    expect(f.rows).toEqual([row("2023", "1", "gaz", "1200")]);
  });

  it("signale les colonnes manquantes", () => {
    const f = parseConsumptionCsv("annee;mois;kwh\n2023;1;100\n");
    expect(f.rows).toEqual([]);
    expect(f.fileIssues[0]).toContain("Colonne introuvable : energie");
  });

  it("signale un fichier vide ou sans données", () => {
    expect(parseConsumptionCsv("  \n").fileIssues).toEqual(["Le fichier est vide."]);
    expect(parseConsumptionCsv("annee;mois;energie;kwh\n").fileIssues).toEqual(["Le fichier ne contient aucune ligne de données."]);
  });

  it("décode un CSV Windows-1252 (Excel) aussi bien qu'un UTF-8", () => {
    const cp1252 = new Uint8Array([0x61, 0x6e, 0x6e, 0xe9, 0x65]); // « année » en Windows-1252
    expect(decodeCsvBytes(cp1252)).toBe("année");
    expect(decodeCsvBytes(new TextEncoder().encode("année"))).toBe("année");
  });
});

describe("parseMonth / parseEnergy", () => {
  it("lit les mois en chiffres et en lettres", () => {
    expect(parseMonth("1")).toBe(1);
    expect(parseMonth("12")).toBe(12);
    expect(parseMonth("Février")).toBe(2);
    expect(parseMonth("aout")).toBe(8);
    expect(parseMonth("13")).toBeNull();
    expect(parseMonth("0")).toBeNull();
  });
  it("lit les énergies en français et en anglais", () => {
    expect(parseEnergy("Électricité")).toBe("ELECTRICITY");
    expect(parseEnergy("ELEC")).toBe("ELECTRICITY");
    expect(parseEnergy("gaz naturel")).toBe("GAS");
    expect(parseEnergy("fioul")).toBeNull();
  });
});

describe("validateImportRows — relecture", () => {
  it("accepte des lignes valides et les regroupe par année et énergie, mois triés", () => {
    const r = validateImportRows([
      row("2023", "2", "elec", "200"),
      row("2023", "1", "elec", "100"),
      row("2022", "1", "gaz", "50,5"),
    ], NOW);
    expect(r.ok).toBe(true);
    expect(r.batches).toEqual([
      { year: 2022, energyType: "GAS", months: [{ month: 1, kwh: 50.5 }] },
      { year: 2023, energyType: "ELECTRICITY", months: [{ month: 1, kwh: 100 }, { month: 2, kwh: 200 }] },
    ]);
  });

  it("signale chaque erreur sur sa ligne, avec le champ concerné", () => {
    const r = validateImportRows([
      row("2023", "13", "elec", "100"),
      row("2023", "1", "fioul", "100"),
      row("2023", "1", "elec", "abc"),
      row("2023", "2", "elec", "-5"),
      row("2023", "3", "elec", ""),
      row("1999", "4", "elec", "100"),
    ], NOW);
    expect(r.ok).toBe(false);
    expect(r.errorCount).toBe(6);
    expect(r.rows.map((x) => x.issues.map((i) => i.field))).toEqual([["month"], ["energy"], ["kwh"], ["kwh"], ["kwh"], ["year"]]);
    expect(r.batches).toEqual([]);
  });

  it("refuse une année future", () => {
    const r = validateImportRows([row("2027", "1", "gaz", "1")], NOW);
    expect(r.rows[0].issues[0].field).toBe("year");
  });

  it("repère un doublon (même année, mois, énergie) et indique la première ligne", () => {
    const r = validateImportRows([row("2023", "1", "elec", "100"), row("2023", "janvier", "électricité", "110")], NOW);
    expect(r.ok).toBe(false);
    expect(r.rows[1].issues[0].message).toContain("Doublon de la ligne 1");
  });

  it("ne confond pas le même mois sur deux énergies", () => {
    const r = validateImportRows([row("2023", "1", "elec", "100"), row("2023", "1", "gaz", "100")], NOW);
    expect(r.ok).toBe(true);
    expect(r.batches).toHaveLength(2);
  });

  it("une liste vide n'est pas valide", () => {
    expect(validateImportRows([], NOW).ok).toBe(false);
  });

  it("après correction d'une cellule, la ligne redevient valide", () => {
    const rows = [row("2023", "1", "elec", "abc")];
    expect(validateImportRows(rows, NOW).ok).toBe(false);
    rows[0] = { ...rows[0], kwh: "3900" };
    expect(validateImportRows(rows, NOW).ok).toBe(true);
  });
});

describe("import → saveConsumption : jamais de validation forcée", () => {
  const batches = validateImportRows([
    row("2019", "1", "elec", "4400"),
    row("2019", "2", "elec", "4300"),
    row("2023", "1", "gaz", "2600"),
  ], NOW).batches;

  it("prépare des entrées toujours non validées, source PDF (mode 1)", () => {
    const inputs = toImportSaveInputs("efa-1", batches);
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      expect(input.validated).toBe(false);
      expect(input.source).toBe("PDF");
      expect(input.efaId).toBe("efa-1");
    }
  });

  it("un import non validé n'écrase pas un mois validé (règle de saveConsumption appliquée aux entrées de l'import)", () => {
    // Janvier 2019 est validé à 4 500 en base ; février 2019 n'existe pas encore.
    const [input2019] = toImportSaveInputs("efa-1", batches);
    const plan = planMonthWrites([{ month: 1, kwh: 4500, validated: true }], input2019.months, input2019.validated ?? false);
    expect(plan.skipped).toEqual([{ month: 1, reason: "ALREADY_VALIDATED" }]);
    expect(plan.toWrite).toEqual([{ month: 2, kwh: 4300 }]);
  });

  it("résume l'import : mois enregistrés et mois ignorés car déjà validés, avec la liste", () => {
    const summary = summarizeImport([
      { year: 2019, energyType: "ELECTRICITY", writtenMonths: [2], skipped: [{ month: 1, reason: "ALREADY_VALIDATED" }] },
      { year: 2023, energyType: "GAS", writtenMonths: [1], skipped: [{ month: 1, reason: "DUPLICATE_IN_INPUT" }] },
    ]);
    expect(summary).toEqual({
      writtenCount: 2,
      skippedCount: 1,
      skipped: [{ year: 2019, energyType: "ELECTRICITY", month: 1 }],
    });
  });
});
