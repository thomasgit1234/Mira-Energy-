"use client";
// Tâche 2.1 — import d'un fichier CSV avec relecture et correction avant enregistrement.
// Le fichier est lu dans le navigateur ; le contrôle affiché en direct est la MÊME fonction que
// celle du serveur (csv-import.ts), qui recontrôle tout avant d'écrire.
import { useRef, useState } from "react";
import styles from "./Collecte.module.css";
import { decodeCsvBytes, parseConsumptionCsv, validateImportRows, type RawRow } from "./csv-import";
import { ENERGY_LABELS, MONTH_LABELS } from "./manual";
import type { SaveReport } from "./repository";

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const FIELDS: { key: keyof RawRow; label: string; width: string }[] = [
  { key: "year", label: "Année", width: "80px" },
  { key: "month", label: "Mois", width: "100px" },
  { key: "energy", label: "Énergie", width: "130px" },
  { key: "kwh", label: "kWh", width: "120px" },
];

function monthList(months: number[]): string {
  return months.map((m) => MONTH_LABELS[m - 1].toLowerCase()).join(", ");
}

export function ImportForm({ efaId }: { efaId: string }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [fileIssues, setFileIssues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [reports, setReports] = useState<SaveReport[] | null>(null);

  const check = validateImportRows(rows);

  async function onFile(file: File | undefined) {
    setMessage(null);
    setReports(null);
    if (!file) return;
    setFileName(file.name);
    const parsed = parseConsumptionCsv(decodeCsvBytes(await file.arrayBuffer()));
    setRows(parsed.rows);
    setFileIssues(parsed.fileIssues);
  }

  function edit(index: number, key: keyof RawRow, value: string) {
    setMessage(null);
    setReports(null);
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  function remove(index: number) {
    setMessage(null);
    setReports(null);
    setRows((rs) => rs.filter((_, i) => i !== index));
  }

  function reset() {
    setRows([]);
    setFileIssues([]);
    setFileName(null);
    setMessage(null);
    setReports(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function save(validated: boolean) {
    setMessage(null);
    setReports(null);
    if (!check.ok) {
      setMessage({ kind: "error", text: "Corrigez d'abord les lignes en rouge." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/collecte/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ efaId, rows, validated }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? "Import impossible." });
        return;
      }
      setReports(data.reports);
    } catch {
      setMessage({ kind: "error", text: "Le serveur ne répond pas. Vérifiez que `npm run dev` tourne." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Import de fichier">
      <div className={styles.toolbar}>
        <label>
          Fichier CSV
          <input ref={fileInput} type="file" accept=".csv,text/csv" aria-label="Fichier CSV" data-testid="file" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {fileName && <button type="button" className={styles.secondary} onClick={reset}>Recommencer</button>}
      </div>
      <p className={styles.hintSmall}>
        Format : une ligne par mois, première ligne <code>annee;mois;energie;kwh</code>. Depuis Excel : « Enregistrer sous » → « CSV (séparateur : point-virgule) ».
        Fichiers d&apos;exemple fictifs : <a href="/exemples/consommations-demo.csv" download>consommations-demo.csv</a> ·{" "}
        <a href="/exemples/consommations-avec-erreurs.csv" download>consommations-avec-erreurs.csv</a>
      </p>

      {fileIssues.length > 0 && <ul className={styles.errors} role="alert" data-testid="file-issues">{fileIssues.map((s, k) => <li key={k}>{s}</li>)}</ul>}

      {rows.length > 0 && (
        <>
          <div className={styles.summary} role="status" data-testid="summary">
            <div><span className={styles.k}>Lignes lues</span><strong data-testid="row-count">{rows.length}</strong></div>
            <div><span className={styles.k}>Lignes en erreur</span><strong data-testid="error-count" style={{ color: check.errorCount ? "#b3261e" : "#1f7a5a" }}>{check.errorCount}</strong></div>
            <div>
              <span className={styles.k}>À enregistrer</span>
              <strong data-testid="batches">
                {check.batches.length === 0 ? "—" : check.batches.map((b) => `${b.year} ${ENERGY_LABELS[b.energyType].toLowerCase()} (${b.months.length} mois)`).join(" · ")}
              </strong>
            </div>
          </div>

          <h2>Relecture</h2>
          <p className={styles.hintSmall}>Vérifiez les valeurs lues ; corrigez directement dans le tableau ou supprimez une ligne. Rien n&apos;est enregistré avant votre clic.</p>
          <div className={styles.scroll}>
          <table className={styles.table} data-testid="review">
            <thead>
              <tr><th>#</th>{FIELDS.map((f) => <th key={f.key}>{f.label}</th>)}<th /><th>Contrôle</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const issues = check.rows[i]?.issues ?? [];
                const bad = new Set(issues.map((x) => x.field));
                const value = check.rows[i]?.value;
                return (
                  <tr key={i} data-testid="review-row">
                    <td>{i + 1}</td>
                    {FIELDS.map((f) => (
                      <td key={f.key}>
                        <input
                          aria-label={`${f.label}, ligne ${i + 1}`}
                          value={r[f.key]}
                          style={{ maxWidth: f.width }}
                          className={bad.has(f.key) || bad.has("row") ? styles.bad : undefined}
                          onChange={(e) => edit(i, f.key, e.target.value)}
                        />
                      </td>
                    ))}
                    <td>
                      <button type="button" className={styles.secondary} style={{ padding: "4px 10px" }} onClick={() => remove(i)} aria-label={`Supprimer la ligne ${i + 1}`}>✕</button>
                    </td>
                    {issues.length > 0 && (
                      <td className={styles.cellError} data-testid="row-error">{issues.map((x) => x.message).join(" ")}</td>
                    )}
                    {issues.length === 0 && value && (
                      <td className={styles.hintSmall}>{MONTH_LABELS[value.month - 1]} {value.year} · {nf.format(value.kwh)} kWh</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.secondary} disabled={busy || !check.ok} onClick={() => save(false)} data-testid="save-draft">
              Enregistrer en brouillon
            </button>
            <button type="button" className={styles.primary} disabled={busy || !check.ok} onClick={() => save(true)} data-testid="save-validated">
              {busy ? "Patientez…" : "Valider et enregistrer"}
            </button>
          </div>
          {!check.ok && <p className={styles.hintSmall}>Les boutons s&apos;activent quand toutes les lignes sont correctes.</p>}
        </>
      )}

      {message && <p role="alert" data-testid="message" className={message.kind === "ok" ? styles.msgOk : styles.msgErr}>{message.text}</p>}

      {reports && (
        <div className={styles.report} role="status" data-testid="report">
          <p className={styles.msgOk}>Import terminé.</p>
          {reports.map((r) => {
            const blocked = r.skipped.filter((s) => s.reason === "ALREADY_VALIDATED").map((s) => s.month);
            return (
              <p key={`${r.year}-${r.energyType}`} data-testid="report-line">
                <strong>{r.year} · {ENERGY_LABELS[r.energyType]}</strong> : {r.writtenMonths.length} mois enregistré{r.writtenMonths.length > 1 ? "s" : ""}
                {blocked.length > 0 && (
                  <span className={styles.msgErr}> — non écrasé{blocked.length > 1 ? "s" : ""} car déjà validé{blocked.length > 1 ? "s" : ""} : {monthList(blocked)}</span>
                )}
              </p>
            );
          })}
          <p className={styles.hintSmall}>Voir le résultat dans <a href="/collecte">Données déjà collectées</a>.</p>
        </div>
      )}
    </section>
  );
}
