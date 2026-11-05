import { describe, expect, it } from "vitest";
import {
  RNB_API, checkRnbId, fetchRnbBuilding, formatRnbId, normalizeRnbId, parseRnbAddressSearch, parseRnbBuilding, searchRnbByAddress,
} from "./rnb-source";

// Réponses RÉELLES de l'API RNB (5 novembre 2026), réduites (géométrie retirée). Données publiques ouvertes du RNB :
// un bâtiment public de Laon, sans lien avec le site de démonstration (fictif).
const BUILDING = {
  rnb_id: "EZNSVN9PD1H5",
  status: "constructed",
  point: { type: "Point", coordinates: [3.6245, 49.5642] },
  addresses: [
    { id: "02408_0500_00001", source: "BAN", street_number: "1", street_rep: null, street: "Rue du Cloître", city_name: "Laon", city_zipcode: "02000", city_insee_code: "02408" },
  ],
  ext_ids: [
    { id: "bdnb-bc-UD2H-GAP4-J69S", source: "bdnb", created_at: "2023-12-07T13:21:19Z", source_version: "2023_01" },
    { id: "BATIMENT0000000311606606", source: "bdtopo", created_at: "2023-12-21T11:36:00Z", source_version: "bdtopo_2023_09" },
  ],
  is_active: true,
  validated_by: [],
};
const SEARCH_OK = { next: null, previous: null, status: "ok", cle_interop_ban: "02408_0500_00001", score_ban: 0.96, results: [BUILDING] };
const SEARCH_NO_GEOCODING = { next: null, previous: null, status: "geocoding_no_result", cle_interop_ban: null, score_ban: null, results: null };
const NOT_FOUND = { detail: "Aucun objet Building ne correspond à cette requête." };

/** Faux fetch : enregistre l'URL appelée et renvoie la réponse donnée (aucun appel réseau). */
function fakeFetch(status: number, body: unknown) {
  const calls: string[] = [];
  const impl = async (url: string) => {
    calls.push(url);
    return { ok: status < 400, status, json: async () => body };
  };
  return { impl, calls };
}
const offline = async () => {
  throw new TypeError("fetch failed");
};

describe("ID-RNB", () => {
  it("normalisé : espaces et tirets retirés, majuscules", () => {
    expect(normalizeRnbId(" eznS-vn9p d1h5 ")).toBe("EZNSVN9PD1H5");
    expect(formatRnbId("EZNSVN9PD1H5")).toBe("EZNS-VN9P-D1H5");
  });
  it("vide → aucun ID (champ facultatif) ; 12 caractères → accepté ; sinon refusé", () => {
    expect(checkRnbId("")).toEqual({ ok: true, rnbId: null });
    expect(checkRnbId(null)).toEqual({ ok: true, rnbId: null });
    expect(checkRnbId("EZNS-VN9P-D1H5")).toEqual({ ok: true, rnbId: "EZNSVN9PD1H5" });
    expect(checkRnbId("EZNS")).toMatchObject({ ok: false, code: "ID_INVALIDE" });
    expect(checkRnbId("EZNSVN9PD1H5/")).toMatchObject({ ok: false, code: "ID_INVALIDE" });
  });
});

describe("lecture des réponses RNB", () => {
  it("bâtiment : identifiant, statut, adresse BAN lisible, identifiant BDNB", () => {
    expect(parseRnbBuilding(BUILDING)).toEqual({
      rnbId: "EZNSVN9PD1H5",
      status: "constructed",
      active: true,
      addresses: [{ label: "1 Rue du Cloître, 02000 Laon", postcode: "02000", city: "Laon", inseeCode: "02408" }],
      bdnbId: "bdnb-bc-UD2H-GAP4-J69S",
    });
  });
  it("champs absents tolérés, objet sans rnb_id ignoré", () => {
    expect(parseRnbBuilding({ rnb_id: "AAAABBBBCCCC" })).toEqual({ rnbId: "AAAABBBBCCCC", status: "inconnu", active: true, addresses: [], bdnbId: null });
    expect(parseRnbBuilding({ status: "constructed" })).toBeNull();
    expect(parseRnbBuilding("texte")).toBeNull();
  });
  it("recherche par adresse : liste, adresse inconnue de la BAN, aucun bâtiment, réponse illisible", () => {
    expect(parseRnbAddressSearch(SEARCH_OK)).toMatchObject({ ok: true, buildings: [{ rnbId: "EZNSVN9PD1H5" }] });
    expect(parseRnbAddressSearch(SEARCH_NO_GEOCODING)).toMatchObject({ ok: false, code: "ADRESSE_INCONNUE" });
    expect(parseRnbAddressSearch({ ...SEARCH_OK, results: [] })).toMatchObject({ ok: false, code: "INTROUVABLE" });
    expect(parseRnbAddressSearch({ ...SEARCH_OK, results: [{ ...BUILDING, is_active: false }] })).toMatchObject({ ok: false, code: "INTROUVABLE" });
    expect(parseRnbAddressSearch(null)).toMatchObject({ ok: false, code: "REPONSE_INVALIDE" });
  });
});

describe("appels RNB (faux fetch, aucun réseau)", () => {
  it("vérification d'un ID : URL du point d'accès, bâtiment renvoyé", async () => {
    const f = fakeFetch(200, BUILDING);
    expect(await fetchRnbBuilding("ezns-vn9p-d1h5", f.impl)).toMatchObject({ ok: true, building: { rnbId: "EZNSVN9PD1H5" } });
    expect(f.calls).toEqual([`${RNB_API}/buildings/EZNSVN9PD1H5/`]);
  });
  it("ID inconnu → INTROUVABLE ; ID mal formé → refusé sans appel", async () => {
    expect(await fetchRnbBuilding("ZZZZZZZZZZZZ", fakeFetch(404, NOT_FOUND).impl)).toMatchObject({ ok: false, code: "INTROUVABLE" });
    const f = fakeFetch(200, BUILDING);
    expect(await fetchRnbBuilding("ABC", f.impl)).toMatchObject({ ok: false, code: "ID_INVALIDE" });
    expect(f.calls).toEqual([]);
  });
  it("hors ligne ou erreur serveur → RNB_INJOIGNABLE, avec la saisie manuelle proposée", async () => {
    const r = await fetchRnbBuilding("EZNSVN9PD1H5", offline);
    expect(r).toMatchObject({ ok: false, code: "RNB_INJOIGNABLE" });
    expect(!r.ok && r.message).toContain("à la main");
    expect(await searchRnbByAddress("1 rue du Cloître 02000 Laon", fakeFetch(503, null).impl)).toMatchObject({ ok: false, code: "RNB_INJOIGNABLE" });
  });
  it("recherche par adresse : requête encodée", async () => {
    const f = fakeFetch(200, SEARCH_OK);
    expect(await searchRnbByAddress("1 rue du Cloître 02000 Laon", f.impl)).toMatchObject({ ok: true });
    expect(f.calls).toEqual([`${RNB_API}/buildings/address/?q=1%20rue%20du%20Clo%C3%AEtre%2002000%20Laon`]);
    expect(await searchRnbByAddress("abc", f.impl)).toMatchObject({ ok: false, code: "ADRESSE_INCONNUE" });
  });
});
