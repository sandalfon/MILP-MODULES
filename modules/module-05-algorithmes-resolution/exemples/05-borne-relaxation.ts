// Module 5 — Exemple commenté : calcul d'une borne de relaxation pour un sac à dos.
// Lancer : npm run tp5   (ou node modules/module-05-algorithmes-resolution/exemples/05-borne-relaxation.ts)
// On autorise temporairement une fraction de produit : c'est la relaxation continue.
// Cette valeur fournit une borne supérieure à l'optimum entier en maximisation.

type Product = {
  id: string;
  cost: number;
  value: number;
};

// Fraction d'un produit prise par la relaxation, entre 0 et 1.
type ProductFraction = {
  id: string;
  fraction: number;
};

// État transporté par reduce pendant le remplissage du sac.
type RelaxationState = {
  remainingCapacity: number;
  bound: number;
  fractions: ProductFraction[];
};

// ─── Données ────────────────────────────────────────────────────
const PRODUCTS: Product[] = [
  { id: "A", cost: 30, value: 8 }, { id: "B", cost: 50, value: 12 },
  { id: "C", cost: 40, value: 10 }, { id: "D", cost: 20, value: 5 }
];
const CAPACITY = 100;

// ─── Calculs (fonctions pures) ──────────────────────────────────
const computeValueCostRatio = (product: Product): number => product.value / product.cost;

// Copie le tableau pour ne pas modifier l'ordre des données d'origine.
// Le tri par valeur/coût décroissant est optimal pour la version fractionnaire du sac à dos.
const sortByDecreasingRatio = (products: Product[]): Product[] =>
  [...products].sort((first, second) => computeValueCostRatio(second) - computeValueCostRatio(first));

// Renvoie la fraction prise de chaque produit et la borne obtenue.
// reduce transporte un état immuable : capacité restante, borne, fractions.
function solveFractionalRelaxation(products: Product[], capacity: number): RelaxationState {
  const initialState: RelaxationState = { remainingCapacity: capacity, bound: 0, fractions: [] };

  return sortByDecreasingRatio(products).reduce((state, product) => {
    // Dès que la capacité est épuisée, les produits suivants ne sont plus examinés.
    if (state.remainingCapacity <= 0) return state;

    // On prend le produit entier si possible, sinon seulement la fraction possible.
    // Math.min(1, ...) garantit qu'on ne prend jamais plus de 100 % du produit.
    const fraction = Math.min(1, state.remainingCapacity / product.cost);

    return {
      remainingCapacity: state.remainingCapacity - fraction * product.cost,
      bound: state.bound + fraction * product.value,
      fractions: [...state.fractions, { id: product.id, fraction }]
    };
  }, initialState);
}

// ─── Affichage ──────────────────────────────────────────────────
// Cette borne ne constitue pas nécessairement une sélection entière réalisable.
const { bound } = solveFractionalRelaxation(PRODUCTS, CAPACITY);
console.log("Borne relaxation :", bound);
