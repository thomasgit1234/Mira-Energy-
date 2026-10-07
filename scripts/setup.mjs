// Installation en une commande :  npm run setup   (ou  npm run demo  pour tout charger)
import { copyFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const full = process.argv.includes("--full");
const run = (cmd, args) => {
  console.log(`\n▶ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (r.status !== 0) { console.error(`\n✖ Échec de : ${cmd} ${args.join(" ")}`); process.exit(r.status ?? 1); }
};

if (!existsSync(".env")) { copyFileSync(".env.example", ".env"); console.log("✔ .env créé depuis .env.example"); }
else console.log("• .env déjà présent, conservé");

run("npm", ["run", "db:up"]);
run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["prisma", "generate"]);
if (full) { run("npm", ["run", "db:import"]); run("npm", ["run", "db:seed"]); }
console.log("\n✔ Prêt. Lancez :  npm run dev   puis ouvrez http://localhost:3000");
