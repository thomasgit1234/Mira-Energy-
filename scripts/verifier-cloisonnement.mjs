// Tâche 9.3 — vérification de bout en bout du cloisonnement propriétaire / locataire (D22), sur un serveur qui tourne.
// Usage : npm run db:seed (crée le locataire fictif), npm run dev, puis dans un autre terminal :
//   node scripts/verifier-cloisonnement.mjs              (serveur http://localhost:3000)
//   BASE_URL=http://localhost:3001 node scripts/verifier-cloisonnement.mjs
// N'écrit RIEN en base : les seules requêtes d'écriture testées doivent être refusées (403 / 404).
// Sortie : une ligne OK / ÉCHEC par contrôle ; code de sortie 1 si un contrôle échoue (preuve pour le document B).
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(`${BASE}/api/health`)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 1000));
}

async function as(email) {
  const r = await fetch(`${BASE}/api/securite/demo-user?email=${encodeURIComponent(email)}&back=/securite`, { redirect: "manual" });
  const cookie = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).filter((c) => c.startsWith("mira-demo-user=")).join("; ");
  return { status: r.status, cookie };
}
const get = (path, cookie) => fetch(`${BASE}${path}`, { headers: { cookie } });
const put = (path, cookie, body) => fetch(`${BASE}${path}`, { method: "PUT", headers: { cookie, "Content-Type": "application/json" }, body: JSON.stringify(body) });

const results = [];
const check = (label, ok, detail = "") => results.push(`${ok ? "OK  " : "ÉCHEC"} ${label}${detail ? ` — ${detail}` : ""}`);

const owner = await as("demo.dupont@example.com");
const tenant = await as("locataire.demo@example.com");
check("changement d'utilisateur de démo (303 + cookie)", owner.status === 303 && tenant.status === 303 && tenant.cookie !== "");
const bad = await fetch(`${BASE}/api/securite/demo-user?email=pirate@example.com`, { redirect: "manual" });
check("compte hors liste refusé", bad.status === 400, `HTTP ${bad.status}`);

const ownerSheet = await (await get("/api/batiment", owner.cookie)).json();
const tenantSheet = await (await get("/api/batiment", tenant.cookie)).json();
const resto = ownerSheet.efas?.[0]?.id;
const bureaux = ownerSheet.efas?.[1]?.id;
check("propriétaire : 2 EFA visibles", ownerSheet.efas?.length === 2, ownerSheet.efas?.map((e) => e.label).join(" | "));
check("locataire : seulement les bureaux", tenantSheet.efas?.length === 1 && tenantSheet.efas[0].id === bureaux, tenantSheet.efas?.map((e) => e.label).join(" | "));
check("locataire : fiche bâtiment en lecture seule", tenantSheet.canEdit === false && ownerSheet.canEdit === true);

const r1 = await get(`/api/conformite?efa=${encodeURIComponent(resto)}`, tenant.cookie);
check("locataire → conformité du restaurant : 404", r1.status === 404, `HTTP ${r1.status}`);
const r2 = await get(`/api/collecte/consommations?efa=${encodeURIComponent(resto)}`, tenant.cookie);
check("locataire → consommations du restaurant : 404", r2.status === 404, `HTTP ${r2.status}`);
const r3 = await put("/api/surfaces", tenant.cookie, { efaId: resto, lines: [{ categoryCode: "CAP18", subCategoryCode: "SCAP1803", surfaceM2: 1200 }] });
check("locataire → écrire les surfaces du restaurant : 404", r3.status === 404, `HTTP ${r3.status}`);
const r4 = await put("/api/batiment", tenant.cookie, { efaId: bureaux, address: "x", postcode: "02000", city: "Laon", rnbId: "", surfaceTotal: "1700" });
check("locataire → modifier la fiche bâtiment : 403", r4.status === 403, `HTTP ${r4.status} ${(await r4.json()).error}`);
const r5 = await get(`/api/surfaces?efa=${encodeURIComponent(bureaux)}`, tenant.cookie);
check("locataire → ses bureaux : 200", r5.status === 200, `HTTP ${r5.status}`);
const r6 = await get(`/api/conformite?efa=${encodeURIComponent(bureaux)}`, owner.cookie);
check("propriétaire → bureaux du locataire : 200", r6.status === 200, `HTTP ${r6.status}`);
const conf = await (await get(`/api/conformite?efa=${encodeURIComponent(bureaux)}`, tenant.cookie)).json();
check("locataire : « Autres EFA du site » vide", Array.isArray(conf.otherEfas) && conf.otherEfas.length === 0, `otherEfas=${conf.otherEfas?.length}`);
const efaSwitch = await fetch(`${BASE}/api/efa?id=${encodeURIComponent(resto)}&back=/dashboard`, { headers: { cookie: tenant.cookie }, redirect: "manual" });
check("locataire → choisir le restaurant dans le sélecteur : 404", efaSwitch.status === 404, `HTTP ${efaSwitch.status}`);
const page = await (await get("/dashboard", tenant.cookie)).text();
check("tableau de bord du locataire : utilisateur affiché, restaurant absent du sélecteur",
  page.includes("locataire.demo@example.com") && !page.includes(`data-efa-id="${resto}"`));

console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("ÉCHEC")) ? 1 : 0);
