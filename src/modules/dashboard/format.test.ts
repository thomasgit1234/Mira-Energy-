import { describe, expect, it } from "vitest";
import { fmtKwh, fmtKwhPerM2, fmtKwhYear, fmtM2 } from "./format";

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
    for (const f of [fmtKwh, fmtKwhYear, fmtM2, fmtKwhPerM2]) {
      expect(f(null)).toBe("—");
      expect(f(Number.NaN)).toBe("—");
    }
  });
});
