
export type EmailRequest = {
  nom: string;
  fournisseur: string;
  referenceClient: string;
  energie: "electricite" | "gaz";
  dateDebut: string;
  dateFin: string;
};

export function generateEmail(request: EmailRequest) {
  const {
    nom,
    fournisseur,
    referenceClient,
    energie,
    dateDebut,
    dateFin,
  } = request;

  if (!nom.trim() || !fournisseur.trim()) {
    throw new Error("Le nom et le fournisseur sont obligatoires.");
  }

  if (!dateDebut || !dateFin || dateDebut > dateFin) {
    throw new Error("La période demandée est invalide.");
  }

  const typeEnergie = energie === "electricite"
    ? "électricité"
    : "gaz naturel";

  const subject = `Demande d'historique de consommation - ${typeEnergie}`;

  const body = `Bonjour,

Je souhaite obtenir l'historique de mes consommations de ${typeEnergie} auprès de ${fournisseur}.

Informations relatives à mon contrat :
- Titulaire : ${nom}
- Référence client : ${referenceClient || "Non renseignée"}
- Période demandée : du ${dateDebut} au ${dateFin}

Dans la mesure du possible, je souhaiterais recevoir les consommations détaillées par mois, exprimées en kWh, au format CSV ou Excel.

Je vous remercie par avance pour votre aide.

Cordialement,
${nom}`;

  return { subject, body };
}
