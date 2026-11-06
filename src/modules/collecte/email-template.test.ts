
import { describe, expect, it } from "vitest";
import { generateEmail } from "./email-template";

const demande = {
  nom: "Jean Dupont",
  fournisseur: "EDF",
  referenceClient: "CLIENT-123",
  energie: "electricite" as const,
  dateDebut: "2025-01-01",
  dateFin: "2025-12-31",
};

describe("Génération du modèle d'e-mail", () => {
  it("génère un objet et un message", () => {
    const resultat = generateEmail(demande);

    expect(resultat.subject).toContain("électricité");
    expect(resultat.body).toContain("Jean Dupont");
    expect(resultat.body).toContain("EDF");
    expect(resultat.body).toContain("CLIENT-123");
    expect(resultat.body).toContain("2025-01-01");
    expect(resultat.body).toContain("2025-12-31");
  });

  it("accepte une demande pour le gaz", () => {
    const resultat = generateEmail({
      ...demande,
      energie: "gaz",
    });

    expect(resultat.subject).toContain("gaz naturel");
  });

  it("refuse un nom vide", () => {
    expect(() =>
      generateEmail({ ...demande, nom: "" })
    ).toThrow();
  });

  it("refuse une période inversée", () => {
    expect(() =>
      generateEmail({
        ...demande,
        dateDebut: "2025-12-31",
        dateFin: "2025-01-01",
      })
    ).toThrow();
  });
});
