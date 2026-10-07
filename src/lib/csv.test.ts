import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("lit un CSV ';' avec BOM, guillemets et lignes vides", () => {
    const out = parseCsv('﻿a;b\n1;"x;y"\n\n2;"he said ""hi"""\n');
    expect(out).toEqual([{ a: "1", b: "x;y" }, { a: "2", b: 'he said "hi"' }]);
  });
  it("écrit puis relit sans perte", () => {
    const rows = [{ a: "1", b: "x;y" }, { a: "2", b: 'q"r' }];
    expect(parseCsv(toCsv(rows, ["a", "b"]))).toEqual(rows);
  });
});
