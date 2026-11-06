
"use client";

import { useState } from "react";
import { generateEmail, type EmailRequest } from "./email-template";
import styles from "./Collecte.module.css";

const initialRequest: EmailRequest = {
  nom: "",
  fournisseur: "",
  referenceClient: "",
  energie: "electricite",
  dateDebut: "",
  dateFin: "",
};

export default function EmailRequestForm() {
  const [request, setRequest] = useState<EmailRequest>(initialRequest);
  const [email, setEmail] = useState<{
    subject: string;
    body: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  function update<K extends keyof EmailRequest>(
    field: K,
    value: EmailRequest[K]
  ) {
    setRequest((previous) => ({
      ...previous,
      [field]: value,
    }));
    setEmail(null);
    setError("");
    setCopied(false);
  }

  function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setEmail(generateEmail(request));
      setError("");
      setCopied(false);
    } catch (err) {
      setEmail(null);
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    }
  }

  async function handleCopy() {
    if (!email) return;

    try {
      await navigator.clipboard.writeText(
        `Objet : ${email.subject}\n\n${email.body}`
      );
      setCopied(true);
      setError("");
    } catch {
      setError("Copie impossible. Sélectionnez le texte manuellement.");
    }
  }

  const mailto = email
    ? `mailto:?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`
    : "";

  return (
    <section>
      <h2>Demander un historique de consommation</h2>

      <p>
        Renseignez vos informations pour préparer un e-mail
        à destination de votre fournisseur d&apos;énergie.
      </p>

      <form onSubmit={handleGenerate}>
        <div className={styles.toolbar}>
          <label>
            Nom du titulaire
            <input
              type="text"
              value={request.nom}
              onChange={(e) => update("nom", e.target.value)}
              required
            />
          </label>

          <label>
            Fournisseur
            <input
              type="text"
              value={request.fournisseur}
              onChange={(e) => update("fournisseur", e.target.value)}
              required
            />
          </label>

          <label>
            Référence client
            <input
              type="text"
              value={request.referenceClient}
              onChange={(e) =>
                update("referenceClient", e.target.value)
              }
            />
          </label>

          <label>
            Énergie
            <select
              value={request.energie}
              onChange={(e) =>
                update(
                  "energie",
                  e.target.value as EmailRequest["energie"]
                )
              }
            >
              <option value="electricite">Électricité</option>
              <option value="gaz">Gaz naturel</option>
            </select>
          </label>

          <label>
            Date de début
            <input
              type="date"
              value={request.dateDebut}
              onChange={(e) => update("dateDebut", e.target.value)}
              required
            />
          </label>

          <label>
            Date de fin
            <input
              type="date"
              value={request.dateFin}
              onChange={(e) => update("dateFin", e.target.value)}
              required
            />
          </label>
        </div>

        <button type="submit" className={styles.primary}>
          Générer l&apos;e-mail
        </button>
      </form>

      {error && (
        <p role="alert" className={styles.msgErr}>
          {error}
        </p>
      )}

      {email && (
        <div className={styles.report}>
          <h2>E-mail généré</h2>

          <p>
            <strong>Objet :</strong> {email.subject}
          </p>

          <pre style={{
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontFamily: "inherit",
          }}>
            {email.body}
          </pre>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              onClick={handleCopy}
            >
              {copied ? "Copié !" : "Copier l&apos;e-mail"}
            </button>

            <a href={mailto} className={styles.secondary}>
              Ouvrir dans ma messagerie
            </a>
          </div>

          <p className={styles.hintSmall}>
            Aucun e-mail n&apos;est envoyé automatiquement.
            Vérifiez le destinataire avant l&apos;envoi.
          </p>
        </div>
      )}
    </section>
  );
}

