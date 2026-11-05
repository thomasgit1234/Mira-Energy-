// Tâche 2.3 — mode 3 : e-mail de demande d'historique de consommations au gestionnaire de réseau.
// Fonctions PURES (partagées par l'écran) : testées dans history-request.test.ts.
//
// Règles (dossier V7.3 §2.1, cadrage Mira du 9 octobre) :
//  - l'e-mail part de la messagerie de l'utilisateur (lien mailto:), JAMAIS d'une adresse Mira ;
//  - objet standard, adresse du site, identifiant du point de livraison (PRM pour l'électricité, PCE pour le gaz),
//    plage de dates (par défaut 2010-2019, la période de l'année de référence) ;
//  - Enedis et GRDF sont des gestionnaires de réseau, pas des fournisseurs ;
//  - ce mode ne produit aucune donnée : le fichier reçu arrive ensuite par l'import (mode 1).
// Aucune adresse de destinataire n'est inventée : l'utilisateur saisit celle de son interlocuteur (ou la laisse vide
// et la choisit dans sa messagerie). L'identifiant du compteur n'est PAS enregistré en base (il ne sert qu'à l'e-mail).
import { MIN_YEAR, maxYear } from "@/lib/domain";

/** Énergies ayant un gestionnaire de réseau (le propane en citerne n'en a pas : voir PROPANE_NOTE). */
export type NetworkEnergy = "ELECTRICITY" | "GAS";

export const NETWORKS: Record<NetworkEnergy, { energyLabel: string; operator: string; idCode: string; idLabel: string }> = {
  ELECTRICITY: { energyLabel: "électricité", operator: "Enedis", idCode: "PRM", idLabel: "PRM (point de référence mesure)" },
  GAS: { energyLabel: "gaz naturel", operator: "GRDF", idCode: "PCE", idLabel: "PCE (point de comptage et d'estimation)" },
};

export const PROPANE_NOTE =
  "Propane en citerne : pas de gestionnaire de réseau. Demandez l'historique de livraisons à votre fournisseur, puis importez-le (mode 1).";

/** Plage par défaut : la période où se choisit l'année de référence (décret tertiaire). */
export const DEFAULT_RANGE = { fromYear: 2010, toYear: 2019 } as const;

export type HistoryRequestInput = {
  energy: NetworkEnergy;
  /** PRM ou PCE, tel que saisi (espaces tolérés). */
  meterId: string;
  /** Adresse du site (bâtiment de l'utilisateur). */
  siteAddress: string;
  /** Titulaire du contrat (nom ou raison sociale) ; vide → champ à compléter dans l'e-mail. */
  holderName?: string;
  /** Destinataire facultatif ; vide → choisi dans la messagerie. */
  recipient?: string;
  fromYear: number;
  toYear: number;
};

export type RequestIssue = { field: "meterId" | "recipient" | "years" | "siteAddress"; message: string };

export type HistoryRequest =
  | { ok: true; subject: string; body: string; mailto: string; warnings: string[] }
  | { ok: false; issues: RequestIssue[]; warnings: string[] };

/** Retire espaces, points et tirets : « 1234 5678 9012 34 » → « 12345678901234 ». */
export function normalizeMeterId(raw: string): string {
  return raw.replace(/[\s.\-]/g, "").toUpperCase();
}

/**
 * Contrôle de l'identifiant. Format courant : PRM = 14 chiffres ; PCE = 14 chiffres, ou « GI » + 6 chiffres
 * (anciens compteurs). À confirmer avec Mira (question 13 au mentor) : un format inhabituel n'est qu'un AVERTISSEMENT,
 * seuls un identifiant vide ou contenant autre chose que des chiffres / lettres sont refusés.
 */
export function checkMeterId(energy: NetworkEnergy, raw: string): { id: string; error: string | null; warning: string | null } {
  const id = normalizeMeterId(raw);
  const code = NETWORKS[energy].idCode;
  if (id === "") return { id, error: `Indiquez le ${code} du compteur (il figure sur la facture).`, warning: null };
  if (!/^[0-9A-Z]+$/.test(id)) return { id, error: `Le ${code} ne contient que des chiffres (et éventuellement « GI » pour un ancien PCE).`, warning: null };
  const usual = energy === "ELECTRICITY" ? /^\d{14}$/.test(id) : /^(\d{14}|GI\d{6})$/.test(id);
  return {
    id,
    error: null,
    warning: usual ? null : `Format inhabituel pour un ${code} (${id.length} caractères) : vérifiez-le sur la facture.`,
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Jamais une adresse Mira : la demande part de l'utilisateur, au nom du titulaire du contrat. */
export const MIRA_DOMAINS = ["miraenergie.com"];

export function buildHistoryRequest(input: HistoryRequestInput, now = new Date()): HistoryRequest {
  const issues: RequestIssue[] = [];
  const warnings: string[] = [];
  const network = NETWORKS[input.energy];

  const meter = checkMeterId(input.energy, input.meterId);
  if (meter.error) issues.push({ field: "meterId", message: meter.error });
  if (meter.warning) warnings.push(meter.warning);

  const recipient = (input.recipient ?? "").trim();
  if (recipient !== "") {
    if (!EMAIL.test(recipient)) issues.push({ field: "recipient", message: "Adresse du destinataire invalide." });
    else if (MIRA_DOMAINS.some((d) => recipient.toLowerCase().endsWith(`@${d}`))) {
      issues.push({ field: "recipient", message: "La demande s'adresse au gestionnaire de réseau, jamais à une adresse Mira Énergie." });
    }
  }

  const { fromYear, toYear } = input;
  if (!Number.isInteger(fromYear) || !Number.isInteger(toYear) || fromYear < MIN_YEAR || toYear > maxYear(now) || fromYear > toYear) {
    issues.push({ field: "years", message: `Période invalide : de ${MIN_YEAR} à ${maxYear(now)}, l'année de début avant l'année de fin.` });
  }

  const address = input.siteAddress.trim();
  if (address === "") issues.push({ field: "siteAddress", message: "Adresse du site inconnue : renseignez d'abord le bâtiment." });

  if (issues.length > 0) return { ok: false, issues, warnings };

  const holder = (input.holderName ?? "").trim() || "[nom ou raison sociale du titulaire du contrat]";
  const subject = `Demande d'historique de consommations ${network.energyLabel} ${fromYear}-${toYear} – ${network.idCode} ${meter.id}`;
  const body = [
    "Madame, Monsieur,",
    "",
    `En tant que titulaire du contrat (${holder}), je vous demande l'historique des consommations d'${network.energyLabel} ` +
      `du point de livraison suivant, du 1er janvier ${fromYear} au 31 décembre ${toYear} :`,
    "",
    `- ${network.idLabel} : ${meter.id}`,
    `- Adresse du site : ${address}`,
    "",
    "Je souhaite, si possible, des consommations mensuelles (ou par période de facturation) en kWh, " +
      "dans un fichier exploitable (tableur ou CSV), avec la nature de chaque relevé (réel ou estimé).",
    "",
    "Ces données servent à ma déclaration sur la plateforme OPERAT (dispositif Éco Énergie Tertiaire, " +
      "choix de l'année de référence).",
    "",
    "Je vous remercie par avance.",
    "",
    "Cordialement,",
    holder,
  ].join("\n");

  // mailto: RFC 6068 — sauts de ligne en CRLF, objet et corps encodés.
  const mailto = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replace(/\n/g, "\r\n"))}`;
  return { ok: true, subject, body, mailto, warnings };
}
