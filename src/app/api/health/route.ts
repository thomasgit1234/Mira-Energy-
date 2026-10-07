import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vérifie que l'appli joint la base. Utile pour contrôler son installation : /api/health
export async function GET() {
  try {
    const [users, buildings, consumptions] = await Promise.all([db.user.count(), db.building.count(), db.consumption.count()]);
    return Response.json({ ok: true, database: "up", counts: { users, buildings, consumptions } });
  } catch (e) {
    return Response.json({ ok: false, database: "down", error: e instanceof Error ? e.message : String(e) }, { status: 503 });
  }
}
