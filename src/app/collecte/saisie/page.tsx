import Link from "next/link";
import { ManualEntryForm } from "@/modules/collecte/ManualEntryForm";
import { CollecteError, loadCollecteContext, loadYear, type CollecteContext, type YearState } from "@/modules/collecte";

export const dynamic = "force-dynamic";

export default async function Page() {
  let context: CollecteContext | null = null;
  let initial: YearState | null = null;
  let problem: string | null = null;
  try {
    context = await loadCollecteContext();
    // Par défaut : la dernière année complète sans électricité en base (sinon l'année dernière).
    const known = new Set(context.collected.filter((c) => c.energyType === "ELECTRICITY").map((c) => c.year));
    let year = context.maxYear - 1;
    for (let y = context.maxYear - 1; y >= context.minYear; y--) {
      if (!known.has(y)) { year = y; break; }
    }
    initial = await loadYear(year, "ELECTRICITY");
  } catch (e) {
    problem = e instanceof CollecteError ? e.message : "Impossible de joindre la base de données : lancez `npm run db:up`, puis rechargez la page.";
    if (!(e instanceof CollecteError)) console.error(e);
  }

  return (
    <main className="page">
      <Link href="/collecte" className="back">← Collecte des données</Link>
      <p className="eyebrow">Tâche 2.2 · Collecte, mode 2</p>
      <h1>Saisie manuelle</h1>
      <p>Saisissez les consommations mensuelles (en kWh) relevées sur vos factures, pour une année et une énergie.</p>
      {context && initial ? (
        <>
          <p style={{ color: "var(--muted)" }}>{context.buildingLabel}</p>
          <ManualEntryForm minYear={context.minYear} maxYear={context.maxYear} initial={initial} />
        </>
      ) : (
        <p role="alert" style={{ color: "#b3261e" }}>{problem}</p>
      )}
    </main>
  );
}
