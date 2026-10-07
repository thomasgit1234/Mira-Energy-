// API de l'import de fichier (tâche 2.1).
//   POST /api/collecte/import → { efaId, rows: [{ year, month, energy, kwh }] (texte relu/corrigé), validated }
import { NextResponse } from "next/server";
import { CollecteError, importRows } from "@/modules/collecte";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    return NextResponse.json({ ok: true, reports: await importRows(body) });
  } catch (e) {
    if (e instanceof CollecteError) {
      return NextResponse.json({ error: e.message, issues: e.issues }, { status: e.status });
    }
    console.error(e);
    return NextResponse.json({ error: "Erreur interne (la base de données est-elle démarrée ? `npm run db:up`)." }, { status: 500 });
  }
}
