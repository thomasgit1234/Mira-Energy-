// Lecture/écriture CSV minimale (séparateur ";" comme les exports OPERAT, UTF-8, guillemets "").
// Sert aux référentiels (data/referentiels) et à l'export OPERAT (phase 07).
export function parseCsv(text: string, sep = ";"): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

export function toCsv(rows: Record<string, string | number>[], columns: string[], sep = ";"): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return s.includes(sep) || s.includes('"') || /[\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(sep), ...rows.map((r) => columns.map((c) => esc(r[c] ?? "")).join(sep))].join("\n") + "\n";
}
