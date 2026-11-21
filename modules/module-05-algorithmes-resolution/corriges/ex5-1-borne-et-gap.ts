/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 5 — Exercice 5.1 : Borne, incumbent et gap — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-05-algorithmes-resolution/module-05-algorithmes-resolution.md (§2 et §4)
 *  Lancer : node modules/module-05-algorithmes-resolution/corriges/ex5-1-borne-et-gap.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  1. Borne fractionnaire
 *     On trie une COPIE des produits ([...products]) par ratio valeur/coût
 *     décroissant, puis on remplit. Chaque produit est pris en entier si
 *     possible ; sinon on prend la fraction restante / coût. On renvoie
 *     la borne ET les fractions : voir B = 0,2 rend concret le fait que
 *     la relaxation n'est pas une décision applicable.
 *     Pour le sac à dos, ce glouton est l'optimum EXACT de la relaxation
 *     continue (résultat classique de Dantzig).
 *
 *  2. Optimum entier
 *     Énumération des 2⁴ décisions comme au module 1 : 25 avec (A, B, D).
 *     Le type de retour Incumbent | null est honnête : si la capacité est
 *     négative, même la sélection vide ne tient pas et il n'y a pas
 *     d'optimum. Le programme principal et les tests traitent ce cas.
 *
 *  3. Gaps
 *     absolu                : 25,4 − 25 = 0,4
 *     relatif à la borne    : 0,4 / 25,4 ≈ 1,575 %  (convention du cours)
 *     relatif à l'incumbent : 0,4 / 25   = 1,600 %  (convention GLPK, CPLEX…)
 *     On protège le dénominateur nul : si la référence vaut 0, on
 *     renvoie 0 quand le gap absolu est nul, et Infinity sinon.
 *
 *  Réponses aux questions
 *  a) Pourquoi borne ≥ optimum ? Toute solution entière est aussi une
 *     solution de la relaxation (0 et 1 sont dans [0,1]). Le maximum sur
 *     un ensemble plus grand ne peut qu'être plus grand ou égal.
 *  b) Avec une capacité de 90, la borne (23) et l'optimum entier (23)
 *     coïncident : gap nul. Le glouton remplit EXACTEMENT la capacité
 *     avec des produits entiers (A + C + D = 90) : aucune fraction
 *     n'apparaît, la relaxation est déjà entière, donc optimale.
 *     Avec 110, la borne vaut 27,8 pour un optimum de 27 : gap ≈ 2,88 %.
 *     Le gap n'est pas monotone en la capacité : il dépend de la
 *     « fraction » laissée par le dernier produit.
 *
 *  Pièges fréquents
 *  - Trier `products` directement avec sort() : cela modifie l'ordre du
 *    tableau d'origine pour le reste du programme.
 *  - Oublier Math.min(1, …) : on prendrait plus de 100 % d'un produit.
 *  - Comparer les conventions de gap de deux solveurs sans vérifier
 *    leur définition.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Product = { id: string; cost: number; value: number };
type Relaxation = { bound: number; fractions: Record<string, number> };
type Incumbent = { selectedIds: string[]; value: number };

const PRODUCTS: Product[] = [
  { id: "A", cost: 30, value: 8 },
  { id: "B", cost: 50, value: 12 },
  { id: "C", cost: 40, value: 10 },
  { id: "D", cost: 20, value: 5 }
];
const CAPACITY: number = 100;

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────

// Arrondi à `decimals` chiffres pour l'affichage (NaN reste NaN).
const roundTo = (quantity: number, decimals: number): number =>
  Math.round(quantity * 10 ** decimals) / 10 ** decimals;

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Relaxation continue du sac à dos : renvoie { bound, fractions }.
function computeFractionalBound(products: Product[], capacity: number): Relaxation {
  const sortedProducts = [...products].sort((first, second) =>
    second.value / second.cost - first.value / first.cost);
  const fractions = Object.fromEntries(products.map(product => [product.id, 0]));
  let remainingCapacity = capacity;
  let bound = 0;
  for (const product of sortedProducts) {
    if (remainingCapacity <= 0) break;
    const fraction = Math.min(1, remainingCapacity / product.cost); // 1 = produit entier
    fractions[product.id] = fraction;
    bound += fraction * product.value;
    remainingCapacity -= fraction * product.cost;
  }
  return { bound, fractions };
}

// Optimum entier par énumération (module 1).
// null si aucune sélection n'est réalisable (capacité négative).
function findIntegerOptimum(products: Product[], capacity: number): Incumbent | null {
  let best: Incumbent | null = null;
  for (let mask = 0; mask < 2 ** products.length; mask++) {
    const selectedProducts = products.filter((_, i) => (mask & (1 << i)) !== 0);
    const cost = selectedProducts.reduce((sum, product) => sum + product.cost, 0);
    const value = selectedProducts.reduce((sum, product) => sum + product.value, 0);
    if (cost <= capacity && (best === null || value > best.value)) {
      best = { selectedIds: selectedProducts.map(product => product.id), value };
    }
  }
  return best;
}

function computeAbsoluteGap(bound: number, incumbent: number): number {
  return bound - incumbent;
}

// Division protégée : référence nulle → 0 si pas d'écart, Infinity sinon.
function computeRelativeGap(bound: number, incumbent: number, reference: number): number {
  const difference = Math.abs(bound - incumbent);
  if (reference === 0) return difference === 0 ? 0 : Infinity;
  return difference / Math.abs(reference);
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Relaxation, optimum entier et gap");
const { bound, fractions } = computeFractionalBound(PRODUCTS, CAPACITY);
const incumbent = findIntegerOptimum(PRODUCTS, CAPACITY);
console.log("Fractions de la relaxation :", fractions);
console.log("Borne supérieure :", bound);
console.log("Optimum entier   :", incumbent);
// `!incumbent` couvre null (aucune sélection réalisable) et undefined (TODO 2 pas encore fait).
if (!incumbent) {
  console.log("Pas d'optimum entier : gap non calculé.");
} else {
  console.table([{
    absoluteGap: roundTo(computeAbsoluteGap(bound, incumbent.value), 4),
    "gap / borne (%)": roundTo(100 * computeRelativeGap(bound, incumbent.value, bound), 3),
    "gap / incumbent (%)": roundTo(100 * computeRelativeGap(bound, incumbent.value, incumbent.value), 3)
  }]);
}

printTitle("Effet de la capacité");
console.table([80, 90, 100, 110, 120].map(capacity => {
  const capacityBound = computeFractionalBound(PRODUCTS, capacity).bound;
  const optimum = findIntegerOptimum(PRODUCTS, capacity);
  if (!optimum) return { capacity, bound: roundTo(capacityBound, 4) };
  return {
    capacity,
    bound: roundTo(capacityBound, 4),
    optimum: optimum.value,
    "gap / borne (%)": roundTo(100 * computeRelativeGap(capacityBound, optimum.value, capacityBound), 3)
  };
}));

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("borne fractionnaire = 25.4", () => computeFractionalBound(PRODUCTS, CAPACITY).bound, 25.4);
check("fractions : B pris à 0.2", () => computeFractionalBound(PRODUCTS, CAPACITY).fractions,
  { A: 1, B: 0.2, C: 1, D: 1 }, 1e-9);
check("le tableau d'origine n'est pas trié",
  () => (computeFractionalBound(PRODUCTS, CAPACITY), PRODUCTS.map(product => product.id)),
  ["A", "B", "C", "D"]);
check("optimum entier = 25 avec (A, B, D)", () => findIntegerOptimum(PRODUCTS, CAPACITY),
  { selectedIds: ["A", "B", "D"], value: 25 });
check("gap absolu = 0.4", () => computeAbsoluteGap(25.4, 25), 0.4, 1e-9);
check("gap relatif à la borne ≈ 1.575 %", () => computeRelativeGap(25.4, 25, 25.4), 0.4 / 25.4, 1e-9);
check("gap relatif à l'incumbent = 1.6 %", () => computeRelativeGap(25.4, 25, 25), 0.016, 1e-9);
check("gap avec référence nulle et écart nul = 0", () => computeRelativeGap(0, 0, 0), 0);
check("borne ≥ optimum pour capacité 90", () => {
  const optimum = findIntegerOptimum(PRODUCTS, 90);
  if (!optimum) throw new Error("aucun optimum entier pour la capacité 90 (la sélection vide est pourtant réalisable)");
  return computeFractionalBound(PRODUCTS, 90).bound >= optimum.value;
}, true);
check("capacité 90 : borne = optimum = 23 (gap nul)", () => computeFractionalBound(PRODUCTS, 90).bound, 23, 1e-9);
printSummary();
