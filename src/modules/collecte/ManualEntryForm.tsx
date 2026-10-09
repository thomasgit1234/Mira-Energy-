"use client";
// Tâche 2.2 — formulaire de saisie manuelle (12 mois d'une année, pour une énergie).
// Le contrôle affiché en direct est la MÊME fonction que celle du serveur (manual.ts).
import { useState } from "react";
import styles from "./Collecte.module.css";
import { ENERGY_LABELS, MONTH_LABELS, SOURCE_LABELS, parseKwh, validateManualEntry, type EntryIssue } from "./manual";
import { ENERGY_TYPES, type EnergyType } from "@/lib/domain";
import type { SaveReport, YearState } from "./repository";

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function toText(state: YearState): string[] {
  return state.months.map((m) => (m ? String(m.kwh).replace(".", ",") : ""));
}

function monthList(months: number[]): string {
  return months.map((m) => MONTH_LABELS[m - 1].toLowerCase()).join(", ");
}

type Props = { minYear: number; maxYear: number; initial: YearState };

export function ManualEntryForm({ minYear, maxYear, initial }: Props) {
  const [state, setState] = useState<YearState>(initial);
  const [values, setValues] = useState<string[]>(() => toText(initial));
  const [validate, setValidate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [serverIssues, setServerIssues] = useState<EntryIssue[]>([]);
  const [report, setReport] = useState<SaveReport | null>(null);

  const original = toText(state);
  const result = validateManualEntry({ year: state.year, energyType: state.energyType, months: values });
  const issueFor = (month: number) => result.issues.find((x) => x.month === month);
  const changed = values.map((v, i) => v.trim() !== original[i]);
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i);

  async function load(year: number, energyType: EnergyType) {
    setBusy(true);
    setReport(null);
    setMessage(null);
    setServerIssues([]);
    try {
      const res = await fetch(`/api/collecte/consommations?year=${year}&energy=${energyType}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Chargement impossible.");
      setState(data);
      setValues(toText(data));
      setValidate(false);
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Le serveur ne répond pas." });
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setMessage(null);
    setServerIssues([]);
    setReport(null);
    if (!result.ok) {
      setMessage({ kind: "error", text: "Enregistrement refusé : corrigez les cases en rouge." });
      return;
    }
    // Brouillon : on n'envoie que les cases modifiées. Validation : toutes les cases remplies
    // (l'utilisateur confirme l'année entière).
    const months = values.map((v, i) => (validate || changed[i] ? v : ""));
    if (months.every((v) => parseKwh(v) === null)) {
      setMessage({ kind: "error", text: "Aucune modification à enregistrer." });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/collecte/consommations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ efaId: state.efaId, year: state.year, energyType: state.energyType, months, validated: validate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerIssues(data.issues ?? []);
        setMessage({ kind: "error", text: data.error ?? "Enregistrement impossible." });
        return;
      }
      // On relit la base AVANT d'afficher le compte rendu : la grille montre alors les vraies valeurs
      // (un mois refusé reprend sa valeur validée).
      await load(state.year, state.energyType);
      setReport(data.report);
    } catch {
      setMessage({ kind: "error", text: "Le serveur ne répond pas. Vérifiez que `npm run dev` tourne." });
    } finally {
      setBusy(false);
    }
  }

  const blocked = report?.skipped.filter((s) => s.reason === "ALREADY_VALIDATED").map((s) => s.month) ?? [];

  return (
    <section aria-label="Saisie manuelle des consommations">
      <div className={styles.toolbar}>
        <label>
          Année
          <select aria-label="Année" value={state.year} disabled={busy} onChange={(e) => load(Number(e.target.value), state.energyType)}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label>
          Énergie
          <select aria-label="Énergie" value={state.energyType} disabled={busy} onChange={(e) => load(state.year, e.target.value as EnergyType)}>
            {ENERGY_TYPES.map((t) => <option key={t} value={t}>{ENERGY_LABELS[t]}</option>)}
          </select>
        </label>
      </div>

      <div className={styles.summary} role="status" data-testid="summary">
        <div><span className={styles.k}>Mois renseignés</span><strong data-testid="filled">{result.months.length} / 12</strong></div>
        <div><span className={styles.k}>Total de l&apos;année</span><strong data-testid="total">{nf.format(result.total)} kWh</strong></div>
        <div><span className={styles.k}>Déjà validés en base</span><strong>{state.months.filter((m) => m?.validated).length} / 12</strong></div>
      </div>

      <table className={styles.table}>
        <thead>
          <tr><th>Mois</th><th>Consommation (kWh)</th><th className={styles.optional}>En base</th></tr>
        </thead>
        <tbody>
          {MONTH_LABELS.map((label, i) => {
            const issue = issueFor(i + 1);
            const inBase = state.months[i];
            return (
              <tr key={label} data-testid="month-row">
                <td>{label}</td>
                <td>
                  <input
                    aria-label={`kWh ${label}`}
                    inputMode="decimal"
                    placeholder="—"
                    value={values[i]}
                    className={issue ? styles.bad : changed[i] ? styles.changed : undefined}
                    onChange={(e) => {
                      const next = [...values];
                      next[i] = e.target.value;
                      setValues(next);
                      setMessage(null);
                    }}
                  />
                  {issue && <div className={styles.cellError}>{issue.message}</div>}
                </td>
                <td className={styles.optional}>
                  {inBase ? (
                    <span className={`${styles.badge} ${inBase.validated ? styles.locked : styles.draft}`}>
                      {inBase.validated ? "🔒 validé" : "non validé"} · {SOURCE_LABELS[inBase.source] ?? inBase.source}
                    </span>
                  ) : (
                    <span className={styles.empty}>vide</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <label className={styles.confirm}>
        <input type="checkbox" checked={validate} onChange={(e) => setValidate(e.target.checked)} data-testid="validate" />
        <span>
          <strong>J&apos;ai relu et je valide ces valeurs.</strong>
          <p className={styles.hintSmall}>
            Sans cette case, seules les cases modifiées sont enregistrées « en brouillon » et un mois 🔒 validé n&apos;est jamais remplacé.
            Avec cette case, toute l&apos;année est enregistrée comme validée. Vider une case ne supprime pas la valeur en base.
          </p>
        </span>
      </label>

      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={save} disabled={busy} data-testid="save">
          {busy ? "Patientez…" : validate ? "Valider et enregistrer" : "Enregistrer en brouillon"}
        </button>
      </div>

      {serverIssues.length > 0 && <ul className={styles.errors} role="alert">{serverIssues.map((s, k) => <li key={k}>{s.message}</li>)}</ul>}
      {message && <p role="alert" data-testid="message" className={message.kind === "ok" ? styles.msgOk : styles.msgErr}>{message.text}</p>}

      {report && (
        <div className={`${styles.report} ${blocked.length > 0 ? styles.reportWarn : ""}`} role="status" data-testid="report">
          <p className={styles.msgOk}>
            {report.writtenMonths.length > 0
              ? `Enregistré : ${report.writtenMonths.length} mois (${monthList(report.writtenMonths)}).`
              : "Aucun mois n'a été modifié."}
          </p>
          {blocked.length > 0 && (
            <p data-testid="blocked">
              <strong>Non écrasé{blocked.length > 1 ? "s" : ""} car déjà validé{blocked.length > 1 ? "s" : ""} :</strong> {monthList(blocked)}.
              {" "}Pour les remplacer, cochez « J&apos;ai relu et je valide ces valeurs ».
            </p>
          )}
        </div>
      )}
    </section>
  );
}
