import { describe, expect, it } from "vitest";
import { buildHistoryRequest, checkMeterId, normalizeMeterId, type HistoryRequestInput } from "./history-request";

const NOW = new Date("2026-11-05T12:00:00Z");
// Identifiants FICTIFS (aucun vrai PRM / PCE dans le dépôt).
const base: HistoryRequestInput = {
  energy: "ELECTRICITY",
  meterId: "0000 0000 0000 01",
  siteAddress: "Site de démonstration (fictif), 02000 Laon",
  holderName: "SASU Dupont (fictif)",
  fromYear: 2010,
  toYear: 2019,
};

describe("checkMeterId — PRM / PCE", () => {
  it("espaces, points et tirets retirés", () => {
    expect(normalizeMeterId(" 0000.0000-0000 01 ")).toBe("00000000000001");
  });
  it("PRM de 14 chiffres : accepté sans avertissement", () => {
    expect(checkMeterId("ELECTRICITY", "00000000000001")).toEqual({ id: "00000000000001", error: null, warning: null });
  });
  it("PCE : 14 chiffres ou GI + 6 chiffres", () => {
    expect(checkMeterId("GAS", "00000000000002").warning).toBeNull();
    expect(checkMeterId("GAS", "gi000003")).toEqual({ id: "GI000003", error: null, warning: null });
  });
  it("longueur inhabituelle : avertissement seulement (format à confirmer avec Mira)", () => {
    const r = checkMeterId("ELECTRICITY", "123456");
    expect(r.error).toBeNull();
    expect(r.warning).toContain("Format inhabituel");
  });
  it("vide ou caractères interdits : refusé", () => {
    expect(checkMeterId("GAS", "  ").error).toContain("PCE");
    expect(checkMeterId("ELECTRICITY", "1234/5678").error).toContain("PRM");
  });
});

describe("buildHistoryRequest — e-mail de demande d'historique (2.3)", () => {
  it("électricité : objet standard, PRM, adresse, plage 2010-2019, gestionnaire Enedis non nommé destinataire", () => {
    const r = buildHistoryRequest(base, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.subject).toBe("Demande d'historique de consommations électricité 2010-2019 – PRM 00000000000001");
    expect(r.body).toContain("PRM (point de référence mesure) : 00000000000001");
    expect(r.body).toContain("Site de démonstration (fictif), 02000 Laon");
    expect(r.body).toContain("du 1er janvier 2010 au 31 décembre 2019");
    expect(r.body).toContain("SASU Dupont (fictif)");
    expect(r.mailto.startsWith("mailto:?subject=")).toBe(true); // aucun destinataire inventé
  });

  it("gaz : PCE et libellés gaz naturel", () => {
    const r = buildHistoryRequest({ ...base, energy: "GAS", meterId: "GI000003" }, NOW);
    expect(r.ok && r.subject).toBe("Demande d'historique de consommations gaz naturel 2010-2019 – PCE GI000003");
  });

  it("mailto : objet et corps encodés, sauts de ligne CRLF, décodage = texte d'origine", () => {
    const r = buildHistoryRequest({ ...base, recipient: "service@exemple.org" }, NOW);
    if (!r.ok) throw new Error("attendu ok");
    const url = new URL(r.mailto);
    expect(url.protocol).toBe("mailto:");
    expect(decodeURIComponent(url.pathname)).toBe("service@exemple.org");
    expect(r.mailto).toContain("%0D%0A");
    expect(url.searchParams.get("subject")).toBe(r.subject);
    expect(url.searchParams.get("body")).toBe(r.body.replace(/\n/g, "\r\n"));
  });

  it("titulaire non renseigné : champ à compléter, jamais inventé", () => {
    const r = buildHistoryRequest({ ...base, holderName: " " }, NOW);
    expect(r.ok && r.body).toContain("[nom ou raison sociale du titulaire du contrat]");
  });

  it("jamais une adresse Mira comme destinataire", () => {
    const r = buildHistoryRequest({ ...base, recipient: "Contact@MiraEnergie.com" }, NOW);
    expect(r).toMatchObject({ ok: false, issues: [{ field: "recipient" }] });
  });

  it("destinataire mal formé, période invalide, adresse vide, PRM vide : tous signalés", () => {
    const r = buildHistoryRequest({ ...base, recipient: "pas-une-adresse", fromYear: 2019, toYear: 2010, siteAddress: "", meterId: "" }, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.map((i) => i.field).sort()).toEqual(["meterId", "recipient", "siteAddress", "years"]);
  });

  it("période : avant 2010 ou après l'année en cours refusée ; 2020-2026 acceptée (années de suivi)", () => {
    expect(buildHistoryRequest({ ...base, fromYear: 2009 }, NOW).ok).toBe(false);
    expect(buildHistoryRequest({ ...base, toYear: 2027 }, NOW).ok).toBe(false);
    expect(buildHistoryRequest({ ...base, fromYear: 2020, toYear: 2026 }, NOW).ok).toBe(true);
  });

  it("PRM au format inhabituel : e-mail généré, avertissement conservé", () => {
    const r = buildHistoryRequest({ ...base, meterId: "123" }, NOW);
    expect(r.ok).toBe(true);
    expect(r.warnings).toHaveLength(1);
  });
});
