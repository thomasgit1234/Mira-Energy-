// Formats français de la page de synthèse (fonctions PURES, testées dans format.test.ts).
// Séparateur de milliers = espace fine insécable (U+202F, Intl fr-FR), virgule décimale, unité après une espace insécable.
const NBSP = " ";
const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const ratio = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const area = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

const ok = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

/** 40500 → « 40 500 kWh » ; absent → « — ». */
export const fmtKwh = (v: number | null | undefined) => (ok(v) ? `${integer.format(v)}${NBSP}kWh` : "—");
/** 278400 → « 278 400 kWh/an ». */
export const fmtKwhYear = (v: number | null | undefined) => (ok(v) ? `${integer.format(v)}${NBSP}kWh/an` : "—");
/** 1200 → « 1 200 m² » ; 12.5 → « 12,5 m² ». */
export const fmtM2 = (v: number | null | undefined) => (ok(v) ? `${area.format(v)}${NBSP}m²` : "—");
/** 117.5 → « 117,50 kWh/m² » (2 décimales). */
export const fmtKwhPerM2 = (v: number | null | undefined) => (ok(v) ? `${ratio.format(v)}${NBSP}kWh/m²` : "—");

const pct = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** −7.5 → « −7,5 % » ; 3 → « +3,0 % » ; 0 → « 0,0 % » (signe moins typographique). */
export const fmtPct = (v: number | null | undefined) =>
  ok(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${pct.format(Math.abs(v))}${NBSP}%` : "—";
/** Écart signé en kWh : 9000 → « +9 000 kWh » ; −1500 → « −1 500 kWh ». */
export const fmtGapKwh = (v: number | null | undefined) =>
  ok(v) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${integer.format(Math.abs(v))}${NBSP}kWh` : "—";
