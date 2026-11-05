import { describe, expect, it } from "vitest";
import { fmtGapKwh, fmtKwh, fmtKwhPerM2, fmtKwhYear, fmtM2, fmtPct } from "./format";

const NNBSP = " "; // espace fine insécable (milliers)
const NBSP = " "; // espace insécable (avant l'unité)

describe("formats français", () => {
  it("milliers séparés par une espace fine insécable, unité après une espace insécable", () => {
    expect(fmtKwh(40500)).toBe(`40${NNBSP}500${NBSP}kWh`);
    expect(fmtKwhYear(278400)).toBe(`278${NNBSP}400${NBSP}kWh/an`);
    expect(fmtM2(1200)).toBe(`1${NNBSP}200${NBSP}m²`);
  });
  it("virgule décimale", () => {
    expect(fmtKwhPerM2(117.5)).toBe(`117,50${NBSP}kWh/m²`);
    expect(fmtKwhPerM2(1281.954)).toBe(`1${NNBSP}281,95${NBSP}kWh/m²`);
    expect(fmtM2(12.5)).toBe(`12,5${NBSP}m²`);
  });
  it("valeur absente ou illisible → tiret", () => {
    for (const f of [fmtKwh, fmtKwhYear, fmtM2, fmtKwhPerM2, fmtPct, fmtGapKwh]) {
      expect(f(null)).toBe("—");
      expect(f(Number.NaN)).toBe("—");
    }
  });
  it("pourcentages et écarts signés (7.3) : + ou − typographique, une décimale", () => {
    expect(fmtPct(-7.5)).toBe(`−7,5${NBSP}%`);
    expect(fmtPct(3)).toBe(`+3,0${NBSP}%`);
    expect(fmtPct(0)).toBe(`0,0${NBSP}%`);
    expect(fmtGapKwh(8820)).toBe(`+8${NNBSP}820${NBSP}kWh`);
    expect(fmtGapKwh(-1500)).toBe(`−1${NNBSP}500${NBSP}kWh`);
  });
});
