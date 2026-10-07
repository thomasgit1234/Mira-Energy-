"use client";
// Tâche 2.1 — import d'un fichier CSV avec relecture et correction avant enregistrement.
// Le fichier est lu dans le navigateur ; le contrôle affiché en direct est la MÊME fonction que
// celle du serveur (csv-import.ts), qui recontrôle tout avant d'écrire.
// Les mois importés sont TOUJOURS enregistrés non validés : un mois déjà validé n'est jamais écrasé.
import { useRef, useState } from "react";
import styles from "./Collecte.module.css";
import { decodeCsvBytes, parseConsumptionCsv, validateImportRows, type RawRow } from "./csv-import";
import { ENERGY_LABELS, MONTH_LABELS } from "./manual";
import type { ImportResult } from "./repository";

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
  const [result, setResult] = useState<ImportResult | null>(null);

  const check = validateImportRows(rows);

  async function onFile(file: File | undefined) {
    setMessage(null);
    setResult(null);
    if (!file) return;
    setFileName(file.name);
    const parsed = parseConsumptionCsv(decodeCsvBytes(await file.arrayBuffer()));
    setRows(parsed.rows);
    setFileIssues(parsed.fileIssues);
  }

  function edit(index: number, key: keyof RawRow, value: string) {
    setMessage(null);
    setResult(null);
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }

  function remove(index: number) {
    setMessage(null);
    setResult(null);
    setRows((rs) => rs.filter((_, i) => i !== index));
  }

  function reset() {
    setRows([]);
    setFileIssues([]);
    setFileName(null);
    setMessage(null);
    setResult(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function save() {
    setMessage(null);
    setResult(null);
    if (!check.ok) {
      setMessage({ kind: "error", text: "Corrigez d'abord les lignes en rouge." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/collecte/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Jamais de « validated » : un import est toujours enregistré non validé (voir importRows).
        body: JSON.stringify({ efaId, rows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: "error", text: data.error ?? "Import impossible." });
        return;
      }
      setResult({ reports: data.reports, summary: data.summary });
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
            <button type="button" className={styles.primary} disabled={busy || !check.ok} onClick={save} data-testid="save">
              {busy ? "Patientez…" : "Importer"}
            </button>
          </div>
          <p className={styles.hintSmall}>
            {check.ok ? "" : "Le bouton s'active quand toutes les lignes sont correctes. "}
            Les mois importés sont enregistrés <strong>non validés</strong> : un mois déjà validé n&apos;est jamais remplacé.
            Vous les validerez ensuite dans la <a href="/collecte/saisie">saisie manuelle</a>.
          </p>
        </>
      )}

      {message && <p role="alert" data-testid="message" className={message.kind === "ok" ? styles.msgOk : styles.msgErr}>{message.text}</p>}

      {result && (
        <div className={`${styles.report} ${result.summary.skippedCount > 0 ? styles.reportWarn : ""}`} role="status" data-testid="report">
          <p className={styles.msgOk}>Import terminé.</p>
          <p data-testid="written-count">
            <strong>{result.summary.writtenCount}</strong> mois enregistré{result.summary.writtenCount > 1 ? "s" : ""} (non validé{result.summary.writtenCount > 1 ? "s" : ""}).
          </p>
          <p data-testid="skipped-count">
            <strong>{result.summary.skippedCount}</strong> mois ignoré{result.summary.skippedCount > 1 ? "s" : ""} car déjà validé{result.summary.skippedCount > 1 ? "s" : ""}
            {result.summary.skippedCount > 0 ? " :" : "."}
          </p>
          {result.summary.skippedCount > 0 && (
            <ul data-testid="skipped-list">
              {result.reports
                .map((r) => ({ r, months: result.summary.skipped.filter((s) => s.year === r.year && s.energyType === r.energyType).map((s) => s.month) }))
                .filter(({ months }) => months.length > 0)
                .map(({ r, months }) => (
                  <li key={`${r.year}-${r.energyType}`}>{r.year} · {ENERGY_LABELS[r.energyType].toLowerCase()} : {monthList(months)}</li>
                ))}
            </ul>
          )}
          <p className={styles.hintSmall}>Voir le résultat dans <a href="/collecte">Données déjà collectées</a>.</p>
        </div>
      )}
    </section>
  );
}
