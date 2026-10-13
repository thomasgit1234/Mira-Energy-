"use client";
// Tâche 5.3 — choix de l'année de référence. La suggestion vient du serveur (jamais recalculée ici) ;
// le serveur revalide le choix (validateReferenceChoice) avant d'écrire EFA.referenceYear.
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Comparateur.module.css";
import { formatKwh, type ComparatorRow } from "./reference";

type Props = {
  efaId: string;
  rows: ComparatorRow[];
  suggested: { year: number; consumptionKwh: number } | null;
  chosenYear: number | null;
};

export function ReferenceChooser({ efaId, rows, suggested, chosenYear }: Props) {
  const router = useRouter();
  const eligible = rows.filter((r) => r.eligible);
  const [selected, setSelected] = useState<number | "">(chosenYear ?? suggested?.year ?? eligible[0]?.year ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function choose(year: number) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/comparateur/reference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ efaId, year }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail = (data.issues ?? []).map((i: { message: string }) => i.message).join(" ");
        setMessage({ kind: "error", text: `${data.error ?? "Enregistrement impossible."} ${detail}`.trim() });
        return;
      }
      setMessage({ kind: "ok", text: `${data.chosenYear} est enregistrée comme année de référence.` });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Le serveur ne répond pas. Vérifiez que `npm run dev` tourne." });
    } finally {
      setBusy(false);
    }
  }

  if (eligible.length === 0) return null;

  return (
    <section className={styles.notice} aria-labelledby="choice-title" data-testid="chooser">
      <h2 id="choice-title" className={styles.choiceTitle}>Année de référence</h2>
      {chosenYear !== null ? (
        <p data-testid="chosen">
          <span className={`${styles.badge} ${styles.badgeChosen}`}>Référence choisie</span> <strong>{chosenYear}</strong>
          {rows.find((r) => r.year === chosenYear)?.consumptionKwh != null && <> — {formatKwh(rows.find((r) => r.year === chosenYear)!.consumptionKwh)} kWh</>}
        </p>
      ) : (
        <p className={styles.hint}>Aucune année de référence n&apos;est encore choisie.</p>
      )}

      {chosenYear === null && suggested && (
        <p>
          <button type="button" className={styles.primary} disabled={busy} onClick={() => choose(suggested.year)} data-testid="keep-suggestion">
            Retenir cette année ({suggested.year})
          </button>
        </p>
      )}

      <div className={styles.choiceRow}>
        <label>
          {chosenYear === null ? "Ou choisir une autre année éligible" : "Changer d'année de référence"}{" "}
          <select aria-label="Année de référence" value={selected} disabled={busy} onChange={(e) => setSelected(Number(e.target.value))} data-testid="year-select">
            {eligible.map((r) => (
              <option key={r.year} value={r.year}>
                {r.year} — {formatKwh(r.consumptionKwh)} kWh{r.isSuggested ? " (suggérée)" : ""}{r.year === chosenYear ? " (actuelle)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.secondary}
          disabled={busy || selected === "" || selected === chosenYear}
          onClick={() => selected !== "" && choose(selected)}
          data-testid="save-choice"
        >
          {busy ? "Patientez…" : "Enregistrer ce choix"}
        </button>
      </div>
      <p className={styles.hint}>Seules les années éligibles (2010 à 2019, complètes) sont proposées.</p>
      {message && <p role="alert" data-testid="choice-message" className={message.kind === "ok" ? styles.msgOk : styles.error}>{message.text}</p>}
    </section>
  );
}
