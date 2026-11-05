// Tâche 1.1 — lecteur UNIQUE de l'API du Référentiel National des Bâtiments (RNB, https://rnb.beta.gouv.fr).
// C'est le seul fichier qui connaît le format des réponses RNB (règle d'architecture, comme cabs-source.ts) : si l'API
// change, on ne modifie que lui. Le reste du projet manipule des RnbBuilding.
//
// Points d'accès utilisés (vérifiés le 5 novembre 2026, sans clé d'API) :
//   GET {RNB_API}/buildings/{rnb_id}/          → un bâtiment, ou 404 { detail }
//   GET {RNB_API}/buildings/address/?q=…       → { status, cle_interop_ban, results: [bâtiment…] | null }
//      status = "ok" ou "geocoding_no_result" (adresse inconnue de la Base Adresse Nationale).
// Un bâtiment = { rnb_id, status, addresses: [{ street_number, street_rep, street, city_zipcode, city_name, city_insee_code }],
//                 ext_ids: [{ id, source: "bdnb" | "bdtopo" | … }], is_active }.
//
// La démonstration doit pouvoir tourner HORS LIGNE (tâche 10.2) : toute erreur réseau devient un résultat
// { ok: false, code: "RNB_INJOIGNABLE" } et l'utilisateur peut toujours saisir l'ID-RNB à la main.

export const RNB_API = "https://rnb-api.beta.gouv.fr/api/alpha";
export const RNB_SITE = "https://rnb.beta.gouv.fr";
/** Délai maximal d'une requête RNB : au-delà, on considère le service injoignable. */
export const RNB_TIMEOUT_MS = 6000;

export type RnbAddress = { label: string; postcode: string | null; city: string | null; inseeCode: string | null };

export type RnbBuilding = {
  rnbId: string;
  /** Statut RNB (« constructed », « demolished »…). */
  status: string;
  active: boolean;
  addresses: RnbAddress[];
  /** Identifiant du bâtiment dans la BDNB (« bdnb-bc-… »), s'il est connu du RNB. */
  bdnbId: string | null;
};

export type RnbErrorCode = "RNB_INJOIGNABLE" | "INTROUVABLE" | "ADRESSE_INCONNUE" | "REPONSE_INVALIDE" | "ID_INVALIDE";
export type RnbError = { ok: false; code: RnbErrorCode; message: string };
export type RnbLookup = { ok: true; building: RnbBuilding } | RnbError;
export type RnbSearch = { ok: true; buildings: RnbBuilding[] } | RnbError;

export const RNB_STATUS_LABELS: Record<string, string> = {
  constructed: "construit",
  ongoingConstruction: "en construction",
  constructionProject: "projet de construction",
  canceledConstructionProject: "projet abandonné",
  demolished: "démoli",
  notUsable: "inutilisable",
};

// ---------------------------------------------------------------------------------------------------------------
// Identifiant RNB : 12 caractères (chiffres et lettres majuscules), souvent affiché en groupes « XXXX-XXXX-XXXX ».

/** Retire espaces et tirets, passe en majuscules : « eznS-vn9p-d1h5 » → « EZNSVN9PD1H5 ». */
export function normalizeRnbId(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}

/** Vide → null (champ facultatif) ; sinon l'identifiant normalisé, ou une erreur de format. */
export function checkRnbId(raw: string | null | undefined): { ok: true; rnbId: string | null } | RnbError {
  const id = normalizeRnbId(raw ?? "");
  if (id === "") return { ok: true, rnbId: null };
  if (!/^[0-9A-Z]{12}$/.test(id)) {
    return { ok: false, code: "ID_INVALIDE", message: `ID-RNB invalide : 12 caractères (chiffres et lettres) attendus, ${id.length} reçus.` };
  }
  return { ok: true, rnbId: id };
}

/** « EZNSVN9PD1H5 » → « EZNS-VN9P-D1H5 » (affichage). */
export function formatRnbId(id: string): string {
  return id.match(/.{1,4}/g)?.join("-") ?? id;
}

// ---------------------------------------------------------------------------------------------------------------
// Lecture des réponses (PURES, testées sur des réponses réelles réduites dans rnb-source.test.ts).

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

function parseAddress(a: unknown): RnbAddress | null {
  if (typeof a !== "object" || a === null) return null;
  const o = a as Record<string, unknown>;
  const street = [str(o.street_number), str(o.street_rep), str(o.street)].filter(Boolean).join(" ");
  const postcode = str(o.city_zipcode);
  const city = str(o.city_name);
  const label = [street, [postcode, city].filter(Boolean).join(" ")].filter((s) => s !== "").join(", ");
  return label === "" ? null : { label, postcode, city, inseeCode: str(o.city_insee_code) };
}

/** Un objet bâtiment de l'API → RnbBuilding, ou null s'il n'a pas d'identifiant lisible. */
export function parseRnbBuilding(json: unknown): RnbBuilding | null {
  if (typeof json !== "object" || json === null) return null;
  const o = json as Record<string, unknown>;
  const rnbId = str(o.rnb_id);
  if (!rnbId) return null;
  const addresses = (Array.isArray(o.addresses) ? o.addresses : []).map(parseAddress).filter((a): a is RnbAddress => a !== null);
  const ext = Array.isArray(o.ext_ids) ? o.ext_ids : [];
  const bdnb = ext.find((e) => typeof e === "object" && e !== null && (e as Record<string, unknown>).source === "bdnb") as Record<string, unknown> | undefined;
  return {
    rnbId: normalizeRnbId(rnbId),
    status: str(o.status) ?? "inconnu",
    active: o.is_active !== false,
    addresses,
    bdnbId: bdnb ? str(bdnb.id) : null,
  };
}

/** Réponse de la recherche par adresse → bâtiments (au plus `limit`), ou erreur. */
export function parseRnbAddressSearch(json: unknown, limit = 10): RnbSearch {
  if (typeof json !== "object" || json === null) return { ok: false, code: "REPONSE_INVALIDE", message: "Réponse du RNB illisible." };
  const o = json as Record<string, unknown>;
  if (o.status === "geocoding_no_result") {
    return { ok: false, code: "ADRESSE_INCONNUE", message: "Adresse introuvable dans la Base Adresse Nationale : vérifiez la saisie (numéro, rue, code postal, ville)." };
  }
  if (!Array.isArray(o.results)) return { ok: false, code: "REPONSE_INVALIDE", message: "Réponse du RNB illisible (pas de liste de bâtiments)." };
  const buildings = o.results.map(parseRnbBuilding).filter((b): b is RnbBuilding => b !== null && b.active).slice(0, limit);
  if (buildings.length === 0) return { ok: false, code: "INTROUVABLE", message: "Aucun bâtiment du RNB à cette adresse." };
  return { ok: true, buildings };
}

// ---------------------------------------------------------------------------------------------------------------
// Appels réseau (serveur). `fetchImpl` est injectable pour les tests (aucun appel réseau dans npm test).

type FetchLike = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

const UNREACHABLE: RnbError = {
  ok: false,
  code: "RNB_INJOIGNABLE",
  message: "Le RNB ne répond pas (pas de connexion Internet ?). Vous pouvez saisir l'ID-RNB à la main, ou réessayer plus tard.",
};

async function getJson(url: string, fetchImpl: FetchLike): Promise<{ status: number; body: unknown } | null> {
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(RNB_TIMEOUT_MS), headers: { Accept: "application/json" } });
    return { status: res.status, body: await res.json().catch(() => null) };
  } catch {
    return null;
  }
}

/** Vérifie un ID-RNB auprès du RNB et renvoie le bâtiment (adresses, identifiant BDNB). */
export async function fetchRnbBuilding(rawId: string, fetchImpl: FetchLike = fetch): Promise<RnbLookup> {
  const check = checkRnbId(rawId);
  if (!check.ok) return check;
  if (!check.rnbId) return { ok: false, code: "ID_INVALIDE", message: "Indiquez un ID-RNB." };
  const r = await getJson(`${RNB_API}/buildings/${encodeURIComponent(check.rnbId)}/`, fetchImpl);
  if (!r) return UNREACHABLE;
  if (r.status === 404) return { ok: false, code: "INTROUVABLE", message: `L'ID-RNB ${formatRnbId(check.rnbId)} n'existe pas dans le RNB.` };
  if (r.status !== 200) return { ...UNREACHABLE, message: `Le RNB a répondu par une erreur (${r.status}). Réessayez plus tard ou saisissez l'ID-RNB à la main.` };
  const building = parseRnbBuilding(r.body);
  return building ? { ok: true, building } : { ok: false, code: "REPONSE_INVALIDE", message: "Réponse du RNB illisible." };
}

/** Bâtiments du RNB à une adresse (géocodée par la Base Adresse Nationale). */
export async function searchRnbByAddress(address: string, fetchImpl: FetchLike = fetch): Promise<RnbSearch> {
  const q = address.trim();
  if (q.length < 5) return { ok: false, code: "ADRESSE_INCONNUE", message: "Adresse trop courte pour une recherche." };
  const r = await getJson(`${RNB_API}/buildings/address/?q=${encodeURIComponent(q)}`, fetchImpl);
  if (!r) return UNREACHABLE;
  if (r.status !== 200) return { ...UNREACHABLE, message: `Le RNB a répondu par une erreur (${r.status}). Réessayez plus tard ou saisissez l'ID-RNB à la main.` };
  return parseRnbAddressSearch(r.body);
}
