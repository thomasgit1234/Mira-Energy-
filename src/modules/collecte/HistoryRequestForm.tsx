"use client";
// Tâche 2.3 — formulaire de demande d'historique (mode 3). Rien n'est envoyé ni enregistré par l'application :
// le bouton ouvre la messagerie de l'utilisateur (mailto:) avec un e-mail prérempli, qu'il relit et envoie lui-même.
import { useMemo, useState } from "react";
import styles from "./Collecte.module.css";
import { DEFAULT_RANGE, NETWORKS, PROPANE_NOTE, buildHistoryRequest, type NetworkEnergy } from "./history-request";

type Props = { siteAddress: string; minYear: number; maxYear: number };

export function HistoryRequestForm({ siteAddress, minYear, maxYear }: Props) {
  const [energy, setEnergy] = useState<NetworkEnergy>("ELECTRICITY");
  const [meterId, setMeterId] = useState("");
  const [holderName, setHolderName] = useState("");
  const [recipient, setRecipient] = useState("");
  const [fromYear, setFromYear] = useState<number>(DEFAULT_RANGE.fromYear);
  const [toYear, setToYear] = useState<number>(DEFAULT_RANGE.toYear);
  const [copied, setCopied] = useState<string | null>(null);

  const request = useMemo(
    () => buildHistoryRequest({ energy, meterId, siteAddress, holderName, recipient, fromYear, toYear }),
    [energy, meterId, siteAddress, holderName, recipient, fromYear, toYear],
  );
  const network = NETWORKS[energy];
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  const issueFor = (field: string) => (request.ok ? undefined : request.issues.find((i) => i.field === field)?.message);
  // Tant que le PRM / PCE n'est pas saisi, on ne crie pas : le message apparaît dans la liste sous le formulaire.
  const showIssues = meterId.trim() !== "" || recipient.trim() !== "";

  async function copy() {
    if (!request.ok) return;
    try {
      await navigator.clipboard.writeText(`${request.subject}\n\n${request.body}`);
      setCopied("Objet et texte copiés : collez-les dans votre messagerie.");
    } catch {
      setCopied("Copie impossible dans ce navigateur : sélectionnez le texte de l'aperçu.");
    }
  }

  return (
    <div data-testid="history-request">
      <div className={styles.toolbar}>
        <label>
          Énergie
          <select value={energy} onChange={(e) => setEnergy(e.target.value as NetworkEnergy)}>
            {(Object.keys(NETWORKS) as NetworkEnergy[]).map((k) => (
              <option key={k} value={k}>{NETWORKS[k].energyLabel} ({NETWORKS[k].operator})</option>
            ))}
          </select>
        </label>
        <label>
          Du
          <select value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label>
          Au
          <select value={toYear} onChange={(e) => setToYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
      </div>

      <table className={styles.table}>
        <tbody>
          <tr>
            <th scope="row"><label htmlFor="meter">{network.idCode}</label></th>
            <td>
              <input id="meter" value={meterId} onChange={(e) => setMeterId(e.target.value)} placeholder="14 chiffres, sur la facture"
                className={showIssues && issueFor("meterId") ? styles.bad : undefined} autoComplete="off" style={{ maxWidth: 260 }} />
              <p className={styles.hintSmall}>{network.idLabel}. Il n&apos;est pas enregistré : il sert seulement à remplir l&apos;e-mail.</p>
            </td>
          </tr>
          <tr>
            <th scope="row"><label htmlFor="holder">Titulaire</label></th>
            <td>
              <input id="holder" value={holderName} onChange={(e) => setHolderName(e.target.value)} placeholder="Nom ou raison sociale" style={{ maxWidth: 260 }} />
            </td>
          </tr>
          <tr>
            <th scope="row"><label htmlFor="to">Destinataire</label></th>
            <td>
              <input id="to" type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="facultatif"
                className={showIssues && issueFor("recipient") ? styles.bad : undefined} style={{ maxWidth: 260 }} />
              <p className={styles.hintSmall}>
                Adresse du service client {network.operator} indiquée sur votre facture ou son site. Laissez vide pour la choisir dans votre messagerie.
              </p>
            </td>
          </tr>
          <tr>
            <th scope="row">Site</th>
            <td>{siteAddress}</td>
          </tr>
        </tbody>
      </table>

      {!request.ok && showIssues && (
        <ul className={styles.errors} role="alert">{request.issues.map((i) => <li key={i.field}>{i.message}</li>)}</ul>
      )}
      {request.warnings.length > 0 && <p className={styles.hintSmall} role="status">⚠ {request.warnings.join(" ")}</p>}

      <div className={styles.actions}>
        {request.ok ? (
          <a href={request.mailto} className={styles.primary} data-testid="mailto">Ouvrir dans ma messagerie</a>
        ) : (
          <button type="button" className={styles.primary} disabled>Ouvrir dans ma messagerie</button>
        )}
        <button type="button" className={styles.secondary} onClick={copy} disabled={!request.ok}>Copier le texte</button>
      </div>
      {copied && <p className={styles.msgOk} role="status">{copied}</p>}

      {request.ok && (
        <div className={styles.report} data-testid="preview">
          <p><strong>Objet :</strong> {request.subject}</p>
          <pre style={{ whiteSpace: "pre-wrap", font: "inherit", margin: "8px 0 0" }}>{request.body}</pre>
        </div>
      )}
      <p className={styles.hintSmall}>{PROPANE_NOTE}</p>
    </div>
  );
}
