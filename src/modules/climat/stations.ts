// Stations Météo-France présentes dans data/referentiels/dju/ (libellés d'affichage).
export const STATION_LABELS: Record<string, string> = {
  "02037002": "Aulnois-sous-Laon",
  "02320001": "Saint-Quentin",
};

/** « Aulnois-sous-Laon (02037002) » ; le code seul si la station n'est pas connue. */
export function stationLabel(code: string): string {
  const name = STATION_LABELS[code.trim()];
  return name ? `${name} (${code.trim()})` : code.trim();
}
