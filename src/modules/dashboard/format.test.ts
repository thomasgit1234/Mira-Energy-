import { describe, expect, it } from "vitest";
import { fmtDju, fmtKwh, fmtKwhPerDju, fmtKwhYear, fmtM2 } from "./format";

const NNBSP = " "; // espace fine insécable (milliers)
const NBSP = " "; // espace insécable (avant l'unité)

describe("formats français", () => {
  it("milliers séparés par une espace fine insécable, unité après une espace insécable", () => {
    expect(fmtKwh(40500)).toBe(`40${NNBSP}500${NBSP}kWh`);
    expect(fmtKwhYear(278400)).toBe(`278${NNBSP}400${NBSP}kWh/an`);
    expect(fmtM2(1200)).toBe(`1${NNBSP}200${NBSP}m²`);
  });
  it("virgule décimale", () => {
    expect(fmtKwhPerDju(16.2)).toBe(`16,20${NBSP}kWh/DJU`);
    expect(fmtDju(2500)).toBe(`2${NNBSP}500,0${NBSP}DJU`);
    expect(fmtM2(12.5)).toBe(`12,5${NBSP}m²`);
  });
  it("valeur absente ou illisible → tiret", () => {
    for (const f of [fmtKwh, fmtKwhYear, fmtM2, fmtKwhPerDju, fmtDju]) {
      expect(f(null)).toBe("—");
      expect(f(Number.NaN)).toBe("—");
    }
  });
});
