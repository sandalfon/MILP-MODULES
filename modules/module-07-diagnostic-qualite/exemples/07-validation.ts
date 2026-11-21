// Module 7 — Exemple commenté : tester automatiquement une sélection contre des règles métier.
// Lancer : npm run tp7   (ou node modules/module-07-diagnostic-qualite/exemples/07-validation.ts)
// ITEMS contient les métadonnées de référence ; RULES décrit les contraintes.

type Item = {
  id: string;
  domain: string;
};

type Rules = {
  // Nombre exact d'items attendus.
  testLength: number;
  // Quota minimum par domaine.
  minimums?: Record<string, number>;
};

// ─── Données ────────────────────────────────────────────────────
const ITEMS: Item[] = [
  { id: "a1", domain: "A" }, { id: "a2", domain: "A" },
  { id: "b1", domain: "B" }, { id: "b2", domain: "B" },
  { id: "c1", domain: "C" }
];
const RULES: Rules = { testLength: 3, minimums: { A: 1, B: 1, C: 1 } };

// ─── Contrôles (fonctions pures) ────────────────────────────────

// Contrôle du nombre d'items sélectionnés.
const validateLength = (selectedIds: string[], { testLength }: Rules): string[] =>
  selectedIds.length === testLength ? [] : [`longueur incorrecte : ${selectedIds.length} ≠ ${testLength}`];

// Un identifiant absent de la banque est une erreur de données.
// Map permet de retrouver rapidement les métadonnées d'un item à partir de son id.
const validateKnownIds = (selectedIds: string[], itemsById: Map<string, Item>): string[] =>
  selectedIds
    .filter(id => !itemsById.has(id))
    .map(id => `item inconnu : ${id}`);

// Compte le nombre d'items retenus par domaine (les identifiants inconnus sont ignorés).
const countItemsByDomain = (
  selectedIds: string[],
  itemsById: Map<string, Item>
): Record<string, number> =>
  selectedIds
    .flatMap(id => itemsById.get(id)?.domain ?? [])
    .reduce<Record<string, number>>(
      (countByDomain, domain) => ({ ...countByDomain, [domain]: (countByDomain[domain] ?? 0) + 1 }),
      {}
    );

// Pour chaque quota minimum, compare le nombre observé au minimum requis.
const validateMinimums = (
  countByDomain: Record<string, number>,
  { minimums = {} }: Rules
): string[] =>
  Object.entries(minimums)
    .filter(([domain, minimum]) => (countByDomain[domain] ?? 0) < minimum)
    .map(([domain, minimum]) => `quota min ${domain} : ${countByDomain[domain] ?? 0} < ${minimum}`);

// Tableau vide = aucune violation détectée par ces règles.
function validateSelection(selectedIds: string[], items: Item[], rules: Rules): string[] {
  const itemsById = new Map(items.map(item => [item.id, item]));
  return [
    ...validateLength(selectedIds, rules),
    ...validateKnownIds(selectedIds, itemsById),
    ...validateMinimums(countItemsByDomain(selectedIds, itemsById), rules)
  ];
}

// ─── Affichage ──────────────────────────────────────────────────

// Cas valide : trois items, un par domaine.
console.log(validateSelection(["a1", "b1", "c1"], ITEMS, RULES));

// Cas invalide : identifiant inconnu et quota C non atteint.
console.log(validateSelection(["a1", "b1", "zz"], ITEMS, RULES));
