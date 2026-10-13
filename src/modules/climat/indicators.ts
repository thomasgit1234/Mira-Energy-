// Tâches 4.2 et 4.3 — jointure année / zone et calcul kWh/DJU.
// Fonctions PURES (aucun accès base) : testées dans indicators.test.ts.

/** Zone (ici : code station) comparée sans tenir compte de la casse ni des espaces : « 02037002 » ≡ « 0203 7002 ». */
export function normalizeZone(zone: string): string {
  return zone.replace(/\s/g, "").toUpperCase();
}
