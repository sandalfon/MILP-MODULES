// Module 1 — Exemple commenté : énumération exhaustive d'un petit problème de sélection.
// Lancer : npm run tp1

// Chaque produit est une donnée : son identifiant, son coût et sa valeur.
type Product = {
  id: string;
  cost: number;
  value: number;
};

// Solution évaluée : identifiants retenus, coût total et valeur totale.
type Solution = {
  selectedIds: string[];
  cost: number;
  value: number;
};

const PRODUCTS: Product[] = [
  { id: "A", cost: 30, value: 8 },
  { id: "B", cost: 50, value: 12 },
  { id: "C", cost: 40, value: 10 },
  { id: "D", cost: 20, value: 5 }
];

// La capacité maximale disponible : toute solution plus chère sera rejetée.
const BUDGET = 100;

// Le test binaire (mask & (1 << index)) vérifie si l'élément d'indice donné est sélectionné.
const isSelectedInMask = (mask: number, index: number): boolean =>
  (mask & (1 << index)) !== 0;

// Avec n éléments binaires, 2^n masques représentent toutes les sélections possibles.
// Ici n=4 : les masques vont de 0 à 15, soit 16 combinaisons.
// filter conserve uniquement les éléments dont le bit correspondant vaut 1.
const enumerateSelections = <T>(elements: T[]): T[][] =>
  Array.from({ length: 2 ** elements.length }, (_, mask) =>
    elements.filter((_, index) => isSelectedInMask(mask, index))
  );

// reduce additionne la propriété demandée (coût ou valeur) des produits sélectionnés.
const sumOf = (products: Product[], property: "cost" | "value"): number =>
  products.reduce((total, product) => total + product[property], 0);

const evaluateSelection = (selectedProducts: Product[]): Solution => ({
  selectedIds: selectedProducts.map(product => product.id),
  cost: sumOf(selectedProducts, "cost"),
  value: sumOf(selectedProducts, "value")
});

// Première condition : la sélection respecte le budget.
// Deuxième condition : aucune solution n'existe encore, ou celle-ci est strictement meilleure.
// En cas d'égalité, on conserve donc la première solution rencontrée.
// Renvoie null si aucune sélection ne respecte le budget.
function findBestSolution(products: Product[], budget: number): Solution | null {
  return enumerateSelections(products)
    .map(evaluateSelection)
    .filter(solution => solution.cost <= budget)
    .reduce<Solution | null>((best, solution) =>
      best === null || solution.value > best.value
        ? solution
        : best,
      null
    );
}

// Affiche la meilleure solution trouvée.
console.log(findBestSolution(PRODUCTS, BUDGET));
