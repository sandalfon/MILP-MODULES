// Module 3 — Exemple commenté : formuler des règles de sélection avec des variables binaires.
// Lancer : npm run tp3
// Chaque item est soit sélectionné (x_i=1), soit écarté (x_i=0).

type Item = {
  id: string;
  domain: string;
  score: number;
};

// Sélection valide retenue : identifiants choisis et score total (value).
type Solution = {
  selectedIds: string[];
  value: number;
};

const ITEMS: Item[] = [
  { id: "i1", domain: "A", score: 8 },
  { id: "i2", domain: "A", score: 7 },
  { id: "i3", domain: "B", score: 9 },
  { id: "i4", domain: "B", score: 6 },
  { id: "i5", domain: "C", score: 5 }
];

const FORM_SIZE = 3;
const REQUIRED_DOMAINS: string[] = ["A", "B", "C"];
const INCOMPATIBLE_PAIR: [string, string] = ["i1", "i2"];

// Énumère les 2^n sélections possibles. C'est uniquement adapté à ce petit TP.
// Filtre les éléments dont le bit de sélection est égal à 1.
const enumerateSelections = <T>(elements: T[]): T[][] =>
  Array.from({ length: 2 ** elements.length }, (_, mask) =>
    elements.filter((_, i) => (mask & (1 << i)) !== 0)
  );

// Règle 1 : exactement FORM_SIZE items doivent être sélectionnés.
const hasRequiredItemCount = (selectedItems: Item[]): boolean =>
  selectedItems.length === FORM_SIZE;

// Règle 2 : tous les domaines requis doivent être représentés.
// Set évite de compter plusieurs fois le même domaine.
function hasAllRequiredDomains(selectedItems: Item[]): boolean {
  const selectedDomains = new Set(selectedItems.map(item => item.domain));
  return REQUIRED_DOMAINS.every(domain => selectedDomains.has(domain));
}

// Règle 3 : les deux items incompatibles ne peuvent coexister.
function satisfiesIncompatibility(selectedItems: Item[]): boolean {
  const selectedIds = selectedItems.map(item => item.id);
  return !INCOMPATIBLE_PAIR.every(id => selectedIds.includes(id));
}

const satisfiesAllRules = (selectedItems: Item[]): boolean =>
  hasRequiredItemCount(selectedItems) &&
  hasAllRequiredDomains(selectedItems) &&
  satisfiesIncompatibility(selectedItems);

// On conserve les identifiants retenus et la somme des scores.
const summarizeSelection = (selectedItems: Item[]): Solution => ({
  selectedIds: selectedItems.map(item => item.id),
  value: selectedItems.reduce((total, item) => total + item.score, 0)
});

const findValidSelections = (items: Item[]): Solution[] =>
  enumerateSelections(items).filter(satisfiesAllRules).map(summarizeSelection);

// Affiche toutes les sélections qui respectent les règles.
console.table(findValidSelections(ITEMS));
