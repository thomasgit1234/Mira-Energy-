import { describe, expect, it } from "vitest";
import { efaLabel, efaParam, pickEfaId, safeBackPath } from "./efa-choice";

const OWNED = ["resto", "resto-bureaux"];

describe("pickEfaId — quelle EFA afficher", () => {
  it("sans choix : la première EFA (comportement d'avant, D18)", () => {
    expect(pickEfaId(OWNED)).toBe("resto");
  });
  it("EFA mémorisée dans le cookie et toujours à l'utilisateur : elle", () => {
    expect(pickEfaId(OWNED, undefined, "resto-bureaux")).toBe("resto-bureaux");
  });
  it("cookie périmé (EFA supprimée par un db:reset) : ignoré, première EFA", () => {
    expect(pickEfaId(OWNED, undefined, "ancienne")).toBe("resto");
  });
  it("EFA demandée explicitement : elle, prioritaire sur le cookie", () => {
    expect(pickEfaId(OWNED, "resto-bureaux", "resto")).toBe("resto-bureaux");
  });
  it("EFA demandée qui n'est pas à l'utilisateur : null (→ 404, cloisonnement), jamais de repli silencieux", () => {
    expect(pickEfaId(OWNED, "efa-d-un-autre", "resto")).toBeNull();
  });
  it("utilisateur sans EFA : null", () => {
    expect(pickEfaId([], undefined, "resto")).toBeNull();
  });
});

describe("safeBackPath — retour après changement d'EFA", () => {
  it("page interne conservée", () => {
    expect(safeBackPath("/conformite")).toBe("/conformite");
    expect(safeBackPath("/collecte/saisie")).toBe("/collecte/saisie");
  });
  it("adresse externe ou vide refusée → /dashboard", () => {
    for (const b of ["https://exemple.org", "//exemple.org", "/\\exemple.org", "", null, undefined, "conformite"]) {
      expect(safeBackPath(b)).toBe("/dashboard");
    }
  });
});

describe("efaLabel — libellé lisible", () => {
  const labels = { CAP18: "Restauration - Débit de boissons", CAP04: "Bureaux" };
  it("restauration du site de Laon", () => {
    expect(efaLabel({ role: "OWNER_OCCUPIER", surfaceTotal: 1200, lines: [{ categoryCode: "CAP18" }] }, labels))
      .toMatch(/^Restauration - Débit de boissons · 1\s200 m² · propriétaire occupant$/u);
  });
  it("bureaux en location", () => {
    expect(efaLabel({ role: "LANDLORD", surfaceTotal: 500, lines: [{ categoryCode: "CAP04" }] }, labels)).toBe("Bureaux · 500 m² · bailleur");
  });
  it("aucune ligne, plusieurs catégories, code sans libellé", () => {
    expect(efaLabel({ role: "TENANT", surfaceTotal: 10, lines: [] }, labels)).toBe("activité non renseignée · 10 m² · locataire");
    expect(efaLabel({ role: "TENANT", surfaceTotal: 10, lines: [{ categoryCode: "CAP18" }, { categoryCode: "CAP04" }] }, labels)).toContain("activités mixtes");
    expect(efaLabel({ role: "X", surfaceTotal: 10, lines: [{ categoryCode: "CAP99" }] }, labels)).toBe("CAP99 · 10 m² · X");
  });
});

describe("efaParam — paramètre ?efa=", () => {
  it("valeur simple, liste, vide, absente", () => {
    expect(efaParam("resto-bureaux")).toBe("resto-bureaux");
    expect(efaParam(["a", "b"])).toBe("a");
    expect(efaParam("  ")).toBeUndefined();
    expect(efaParam(null)).toBeUndefined();
    expect(efaParam(undefined)).toBeUndefined();
  });
});
