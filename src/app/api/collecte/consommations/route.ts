// API de la saisie manuelle (tâche 2.2).
//   GET /api/collecte/consommations                       → données déjà collectées (contexte)
//   GET /api/collecte/consommations?year=2023&energy=GAS  → les 12 mois d'une année / énergie
//   PUT /api/collecte/consommations → { efaId, year, energyType, months: string[12], validated }
import { NextResponse } from "next/server";
import { CollecteError, loadCollecteContext, loadYear, saveManualEntry } from "@/modules/collecte";

export const dynamic = "force-dynamic";

function fail(e: unknown) {
  if (e instanceof CollecteError) {
    return NextResponse.json({ error: e.message, issues: e.issues }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Erreur interne (la base de données est-elle démarrée ? `npm run db:up`)." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const year = params.get("year");
    const energy = params.get("energy");
    if (year === null && energy === null) return NextResponse.json(await loadCollecteContext());
    return NextResponse.json(await loadYear(Number(year), energy ?? ""));
  } catch (e) {
    return fail(e);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json({ ok: true, report: await saveManualEntry(body) });
  } catch (e) {
    return fail(e);
  }
}
