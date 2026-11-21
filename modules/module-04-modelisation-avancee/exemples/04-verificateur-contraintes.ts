// Module 4 — Exemple commenté : vérificateur indépendant de contraintes.
// Lancer : npm run tp4
// Il ne résout pas une MILP : il contrôle une sélection déjà proposée.
// Les règles sont des données : le vérificateur ne contient aucun identifiant en dur.

type Rules = {
  // Nombre exact d'éléments attendus.
  exactCardinality: number;
  // Deux éléments qui ne peuvent coexister.
  incompatiblePair: [string, string];
  // Si `ifId` est choisi, `thenId` doit l'être aussi.
  dependency: { ifId: string; thenId: string };
};

const RULES: Rules = {
  exactCardinality: 2,
  incompatiblePair: ["A", "B"],
  dependency: { ifId: "C", thenId: "A" }
};

// Règle de cardinalité : le nombre d'éléments doit être exactement exactCardinality.
const findCardinalityErrors = (selectedIds: string[], { exactCardinality }: Rules): string[] =>
  selectedIds.length === exactCardinality ? [] : ["cardinalité exacte violée"];

// Règle d'exclusion : les deux éléments ne doivent jamais être présents ensemble.
// En MILP : x_A + x_B <= 1.
function findIncompatibilityErrors(
  selectedSet: Set<string>,
  { incompatiblePair: [first, second] }: Rules
): string[] {
  return selectedSet.has(first) && selectedSet.has(second)
    ? [`${first} et ${second} sont incompatibles`]
    : [];
}

// Règle de dépendance : si `ifId` est choisi, `thenId` doit aussi être choisi.
// En MILP, cette implication s'écrit x_C <= x_A.
function findDependencyErrors(
  selectedSet: Set<string>,
  { dependency: { ifId, thenId } }: Rules
): string[] {
  return selectedSet.has(ifId) && !selectedSet.has(thenId)
    ? [`${ifId} exige ${thenId}`]
    : [];
}

// Retourne toutes les erreurs plutôt que de s'arrêter à la première.
// Set rend les tests d'appartenance explicites.
// Tableau vide = sélection valide.
function validateSelection(selectedIds: string[], rules: Rules): string[] {
  const selectedSet = new Set(selectedIds);
  return [
    ...findCardinalityErrors(selectedIds, rules),
    ...findIncompatibilityErrors(selectedSet, rules),
    ...findDependencyErrors(selectedSet, rules)
  ];
}

// Cas valide : deux éléments, A est présent avec C.
console.log(validateSelection(["A", "C"], RULES));

// Cas invalide : A et B sont incompatibles.
console.log(validateSelection(["A", "B"], RULES));

// Cas invalide : C est choisi sans A.
console.log(validateSelection(["B", "C"], RULES));
