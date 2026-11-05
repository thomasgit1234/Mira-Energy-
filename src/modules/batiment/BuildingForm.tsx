"use client";
// Tâches 1.1 / 1.2 — formulaire de la fiche bâtiment (composant client).
// Le contrôle affiché en direct est la MÊME fonction que celle du serveur (validateBuildingInput) ; la zone climatique
// est recalculée à chaque frappe du code postal avec la même règle (climateZoneForPostcode).
// La recherche RNB passe par /api/batiment/rnb (le serveur appelle le RNB) : en cas de panne, la saisie manuelle reste possible.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./BuildingForm.module.css";
import { validateBuildingInput, zoneForPostcode, type BuildingField, type BuildingIssue } from "./building-form";
import { RNB_STATUS_LABELS, formatRnbId, normalizeRnbId, type RnbBuilding } from "./rnb-source";
import type { BuildingSheet } from "./building";

type Form = { address: string; postcode: string; city: string; rnbId: string; surfaceTotal: string };
type RnbState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "results"; title: string; buildings: RnbBuilding[] };

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function BuildingForm({ sheet, canEdit }: { sheet: BuildingSheet; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>({
    address: sheet.address,
    postcode: sheet.postcode,
    city: sheet.city,
    rnbId: sheet.rnbId ? formatRnbId(sheet.rnbId) : "",
    surfaceTotal: nf.format(sheet.surfaceTotal),
  });
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverIssues, setServerIssues] = useState<BuildingIssue[]>([]);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [rnb, setRnb] = useState<RnbState>({ kind: "idle" });

  const ctx = { efaSurfaces: sheet.efas.map((e) => e.ownSurface), stationCode: sheet.stationCode };
  const check = useMemo(() => validateBuildingInput(form, ctx), [form]); // eslint-disable-line react-hooks/exhaustive-deps
  const zone = zoneForPostcode(sheet.departmentZones, form.postcode, sheet.zoneTableProblem ?? undefined);
  const issues = [...(attempted && !check.ok ? check.issues : []), ...serverIssues];
  const issueFor = (f: BuildingField) => issues.filter((i) => i.field === f);

  function set(patch: Partial<Form>) {
    setMessage(null);
    setServerIssues([]);
    setForm((f) => ({ ...f, ...patch }));
  }

  async function askRnb(params: string, title: string) {
    setRnb({ kind: "loading" });
    try {
      const res = await fetch(`/api/batiment/rnb?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) return setRnb({ kind: "error", message: data.message ?? data.error ?? "Recherche RNB impossible." });
      setRnb({ kind: "results", title, buildings: data.building ? [data.building] : data.buildings ?? [] });
    } catch {
      setRnb({ kind: "error", message: "Recherche RNB impossible (serveur injoignable). Vous pouvez saisir l'ID-RNB à la main." });
    }
  }
  const searchByAddress = () =>
    askRnb(`q=${encodeURIComponent(`${form.address} ${form.postcode} ${form.city}`)}`, "Bâtiments du RNB à cette adresse");
  const verifyId = () => askRnb(`id=${encodeURIComponent(normalizeRnbId(form.rnbId))}`, "Bâtiment correspondant à l'ID-RNB");

  async function save() {
    setAttempted(true);
    setMessage(null);
    setServerIssues([]);
    if (!check.ok) return setMessage({ kind: "error", text: "Enregistrement refusé : corrigez les points signalés." });
    setSaving(true);
    try {
      const res = await fetch("/api/batiment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ efaId: sheet.selectedEfaId, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setServerIssues(data.issues ?? []);
        return setMessage({ kind: "error", text: data.error ?? "Enregistrement impossible." });
      }
      setMessage({ kind: "ok", text: "Fiche bâtiment enregistrée." });
      router.refresh();
    } catch {
      setMessage({ kind: "error", text: "Enregistrement impossible : serveur injoignable." });
    } finally {
      setSaving(false);
    }
  }

  const field = (f: BuildingField, label: string, input: React.ReactNode, hint?: React.ReactNode) => (
    <div className={styles.field}>
      <label htmlFor={`b-${f}`}>{label}</label>
      {input}
      {hint && <p className={styles.hint}>{hint}</p>}
      {issueFor(f).map((i) => <p key={i.message} className={styles.error} role="alert">{i.message}</p>)}
    </div>
  );
  const bad = (f: BuildingField) => (issueFor(f).length > 0 ? styles.bad : undefined);

  return (
    <div data-testid="building-form">
      <fieldset disabled={!canEdit} className={styles.fieldset}>
        <div className={styles.grid}>
          {field("address", "Adresse", <input id="b-address" value={form.address} onChange={(e) => set({ address: e.target.value })} className={bad("address")} autoComplete="street-address" />, "Numéro et rue.")}
          {field("postcode", "Code postal", <input id="b-postcode" value={form.postcode} onChange={(e) => set({ postcode: e.target.value })} className={bad("postcode")} inputMode="numeric" maxLength={5} autoComplete="postal-code" />)}
          {field("city", "Ville", <input id="b-city" value={form.city} onChange={(e) => set({ city: e.target.value })} className={bad("city")} autoComplete="address-level2" />)}
          {field("surfaceTotal", "Surface totale du bâtiment (m²)", <input id="b-surfaceTotal" value={form.surfaceTotal} onChange={(e) => set({ surfaceTotal: e.target.value })} className={bad("surfaceTotal")} inputMode="decimal" />,
            "Surface de plancher de tout le bâtiment ; chaque EFA garde sa propre surface.")}
        </div>

        <div className={`${styles.zone} ${zone.ok ? styles.zoneOk : styles.zoneKo}`} data-testid="zone" data-zone={zone.ok ? zone.zone : zone.code} aria-live="polite">
          <span className={styles.k}>Zone climatique (déduite du code postal, tâche 1.2)</span>
          {zone.ok ? <strong>{zone.zone} <span className={styles.muted}>· département {zone.department}</span></strong> : <span>{zone.message}</span>}
        </div>

        {field("rnbId", "ID-RNB (facultatif)",
          <div className={styles.inline}>
            <input id="b-rnbId" value={form.rnbId} onChange={(e) => set({ rnbId: e.target.value })} className={bad("rnbId")} placeholder="ex. XXXX-XXXX-XXXX" autoComplete="off" style={{ maxWidth: 220 }} />
            <button type="button" className={styles.secondary} onClick={verifyId} disabled={form.rnbId.trim() === "" || rnb.kind === "loading"}>Vérifier</button>
            <button type="button" className={styles.secondary} onClick={searchByAddress} disabled={rnb.kind === "loading"}>Chercher par l&apos;adresse</button>
          </div>,
          <>Identifiant du bâtiment dans le Référentiel National des Bâtiments (12 caractères). Sans connexion Internet, saisissez-le à la main.</>,
        )}
      </fieldset>

      {rnb.kind === "loading" && <p className={styles.hint} role="status">Recherche dans le RNB…</p>}
      {rnb.kind === "error" && <p className={styles.warn} role="status" data-testid="rnb-error">{rnb.message}</p>}
      {rnb.kind === "results" && (
        <div className={styles.results} data-testid="rnb-results">
          <p className={styles.k}>{rnb.title} ({rnb.buildings.length})</p>
          <ul>
            {rnb.buildings.map((b) => (
              <li key={b.rnbId}>
                <div>
                  <strong>{formatRnbId(b.rnbId)}</strong> <span className={styles.muted}>· {RNB_STATUS_LABELS[b.status] ?? b.status}</span>
                  <p className={styles.hint}>{b.addresses.length > 0 ? b.addresses.map((a) => a.label).join(" ; ") : "Aucune adresse rattachée"}</p>
                  {b.bdnbId && <p className={styles.hint}>BDNB : {b.bdnbId}</p>}
                </div>
                {canEdit && (
                  <button type="button" className={styles.secondary} onClick={() => { set({ rnbId: formatRnbId(b.rnbId) }); setRnb({ kind: "idle" }); }}>
                    Utiliser cet ID
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className={styles.hint}>Plusieurs bâtiments peuvent partager une adresse : choisissez celui qui correspond à votre site (vérifiable sur la carte du RNB).</p>
        </div>
      )}

      {check.warnings.length > 0 && <ul className={styles.warn} role="status">{check.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}

      {canEdit ? (
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer la fiche"}</button>
          {message && <span className={message.kind === "ok" ? styles.msgOk : styles.msgErr} role="status">{message.text}</span>}
        </div>
      ) : (
        <p className={styles.hint} data-testid="read-only">Lecture seule : seul le propriétaire du bâtiment peut modifier sa fiche.</p>
      )}
    </div>
  );
}
