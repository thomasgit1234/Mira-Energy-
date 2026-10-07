"use client";
// Tâche 1.3 — formulaire de décomposition des surfaces (composant client).
// La validation affichée en direct est la MÊME fonction que celle du serveur (validation.ts).
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SurfaceForm.module.css";
import { validateSurfaceLines, type ValidationIssue } from "./validation";
import type { SurfacesContext } from "./repository";

type Row = { key: number; categoryCode: string; subCategoryCode: string; surface: string };

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

function toNumber(text: string): number {
  const t = text.trim().replace(/\s/g, "").replace(",", ".");
  return t === "" ? Number.NaN : Number(t);
}

export function SurfaceForm({ context }: { context: SurfacesContext }) {
  const router = useRouter();
  const { referential, surfaceTotal, efaId } = context;
  const nextKey = useMemo(() => ({ n: 1000 }), []);

  const [rows, setRows] = useState<Row[]>(() =>
    context.lines.map((l, i) => ({
      key: i,
      categoryCode: l.categoryCode,
      subCategoryCode: l.subCategoryCode,
      surface: String(l.surfaceM2).replace(".", ","),
    })),
  );
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverIssues, setServerIssues] = useState<ValidationIssue[]>([]);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const lines = rows.map((r) => ({ categoryCode: r.categoryCode, subCategoryCode: r.subCategoryCode, surfaceM2: toNumber(r.surface) }));
  const result = validateSurfaceLines(lines, surfaceTotal, referential);
  const shown = attempted ? result.issues : [];
  const lineIssue = (i: number) => shown.filter((s) => s.line === i);
  const globalIssues = shown.filter((s) => s.line === undefined);

  function update(key: number, patch: Partial<Row>) {
    setMessage(null);
    setServerIssues([]);
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setMessage(null);
    setRows((rs) => [...rs, { key: nextKey.n++, categoryCode: "", subCategoryCode: "", surface: "" }]);
  }
  function removeRow(key: number) {
    setMessage(null);
    setRows((rs) => rs.filter((r) => r.key !== key));
  }

  async function save() {
    setAttempted(true);
    setMessage(null);
    setServerIssues([]);
    if (!result.ok) {
      setMessage({ kind: "error", text: "Enregistrement refusé : corrigez les points signalés." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/surfaces", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ efaId, lines: lines.map((l) => ({ ...l, surfaceM2: Number.isFinite(l.surfaceM2) ? l.surfaceM2 : null })) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerIssues(data.issues ?? []);
        setMessage({ kind: "error", text: data.error ?? "Enregistrement impossible." });
        return;
      }
      setMessage({ kind: "ok", text: "Surfaces enregistrées." });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Le serveur ne répond pas. Vérifiez que `npm run dev` tourne." });
    } finally {
      setSaving(false);
    }
  }

  const balanced = result.ok;
  const statusClass = rows.length === 0 ? styles.neutral : result.gap === 0 ? styles.okBox : styles.badBox;

  return (
    <section aria-label="Formulaire de surfaces">
      <p className={styles.building}>{context.buildingLabel}</p>

      <div className={styles.summary + " " + statusClass} role="status" data-testid="summary">
        <div><span className={styles.k}>Surface totale déclarée</span><strong data-testid="total">{nf.format(surfaceTotal)} m²</strong></div>
        <div><span className={styles.k}>Somme des lignes</span><strong data-testid="sum">{nf.format(result.sum)} m²</strong></div>
        <div>
          <span className={styles.k}>Écart</span>
          <strong data-testid="gap">
            {result.gap === 0 ? "0 m² — équilibré" : result.gap > 0 ? `${nf.format(result.gap)} m² à répartir` : `${nf.format(-result.gap)} m² en trop`}
          </strong>
        </div>
      </div>

      <div className={styles.table}>
        <div className={styles.head}><span>Catégorie</span><span>Sous-catégorie</span><span>Surface (m²)</span><span /></div>
        {rows.length === 0 && <p className={styles.empty}>Aucune ligne. Cliquez sur « Ajouter une ligne ».</p>}
        {rows.map((r, i) => {
          const subs = referential.subCategories.filter((s) => s.categoryCode === r.categoryCode);
          const issues = lineIssue(i);
          return (
            <div key={r.key} className={styles.row} data-testid="row">
              <select aria-label={`Catégorie, ligne ${i + 1}`} value={r.categoryCode} onChange={(e) => update(r.key, { categoryCode: e.target.value, subCategoryCode: "" })}>
                <option value="">— choisir —</option>
                {referential.categories.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
              <select aria-label={`Sous-catégorie, ligne ${i + 1}`} value={r.subCategoryCode} disabled={!r.categoryCode} onChange={(e) => update(r.key, { subCategoryCode: e.target.value })}>
                <option value="">{r.categoryCode ? "— choisir —" : "Choisir d'abord une catégorie"}</option>
                {subs.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
              </select>
              <input aria-label={`Surface en m², ligne ${i + 1}`} inputMode="decimal" placeholder="ex. 800" value={r.surface} onChange={(e) => update(r.key, { surface: e.target.value })} />
              <button type="button" className={styles.ghost} onClick={() => removeRow(r.key)} aria-label={`Supprimer la ligne ${i + 1}`}>Supprimer</button>
              {issues.length > 0 && <ul className={styles.errors}>{issues.map((s, k) => <li key={k}>{s.message}</li>)}</ul>}
            </div>
          );
        })}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={addRow}>+ Ajouter une ligne</button>
        <button type="button" className={styles.primary} onClick={save} disabled={saving} data-testid="save">
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      {globalIssues.length > 0 && <ul className={styles.errors} role="alert" data-testid="errors">{globalIssues.map((s, k) => <li key={k}>{s.message}</li>)}</ul>}
      {serverIssues.length > 0 && <ul className={styles.errors} role="alert">{serverIssues.map((s, k) => <li key={k}>{s.message}</li>)}</ul>}
      {message && <p role="alert" data-testid="message" className={message.kind === "ok" ? styles.msgOk : styles.msgErr}>{message.text}</p>}
      {balanced && !message && attempted && <p className={styles.msgOk}>Prêt à enregistrer.</p>}
    </section>
  );
}
