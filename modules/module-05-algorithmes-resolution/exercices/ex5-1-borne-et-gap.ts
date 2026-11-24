/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 5 — Exercice 5.1 : Borne, incumbent et gap
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-05-algorithmes-resolution/module-05-algorithmes-resolution.md (§2 et §4)
 *  Niveau : ★★☆   Durée indicative : 40 min
 *  Lancer : node modules/module-05-algorithmes-resolution/exercices/ex5-1-borne-et-gap.ts
 *
 *  OBJECTIF
 *  Encadrer l'optimum d'un sac à dos entre une borne et une solution
 *  entière, puis mesurer l'écart qui les sépare, en trois étapes :
 *  - calculer la borne SUPÉRIEURE donnée par la relaxation continue, et
 *    la part de chaque produit qu'elle prend (TODO 1) ;
 *  - trouver l'optimum ENTIER par énumération : c'est l'incumbent
 *    (TODO 2) ;
 *  - mesurer le gap entre les deux : en absolu (TODO 3), puis en
 *    relatif, rapporté à la borne OU à l'incumbent (TODO 4).
 *
 *  PRÉREQUIS
 *  - Module 1 : énumération (exercice 1.2).
 *  - Module 2 : relaxation continue x ∈ [0,1].
 *  - TypeScript : copie de tableau [...tableau], sort avec comparateur,
 *    Object.fromEntries, Math.min, Math.abs ; Record<string, number>.
 *
 *  CONSIGNE
 *  Complète les 4 fonctions de la section 3 (chaque bloc TODO détaille
 *  l'entrée, la sortie et un exemple), puis lance le fichier :
 *    1. computeFractionalBound : borne de la relaxation continue et
 *       fraction prise de chaque produit ;
 *    2. findIntegerOptimum : meilleure sélection entière réalisable ;
 *    3. computeAbsoluteGap : écart borne − incumbent ;
 *    4. computeRelativeGap : écart rapporté à une référence.
 *  Si tu bloques, la section INDICES en fin de fichier donne des pistes.
 *
 *  RÉSULTAT ATTENDU
 *  Borne 25,4 (B pris à 0,2), optimum 25 (A, B, D), gap 0,4,
 *  soit ≈ 1,575 % (relatif à la borne) ou 1,6 % (relatif à l'incumbent).
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Borne de la relaxation continue du sac à dos.
// Objectif : résoudre la relaxation continue (chaque x_i ∈ [0,1] au lieu de {0,1},
//            §2 du cours) et en tirer deux résultats :
//            - la borne : la valeur de la relaxation, borne SUPÉRIEURE de
//              l'optimum entier ;
//            - les fractions : la part (entre 0 et 1) que la relaxation
//              prend de CHAQUE produit.
// Entrée   : products, les produits { id, cost, value }, ex. PRODUCTS (A, B, C, D) ;
//            capacity, le budget à ne pas dépasser, ex. 100.
// Sortie   : un objet Relaxation { bound, fractions } :
//            bound, la valeur de la relaxation ;
//            fractions, associe à CHAQUE id la part prise, entre 0 et 1
//              (0 pour un produit non pris).
// Exemple  : computeFractionalBound(PRODUCTS, 100)
//            → { bound: 25.4, fractions: { A: 1, B: 0.2, C: 1, D: 1 } } ;
//            avec capacity = 90 → bound = 23 (aucune fraction).
// Attention: le tableau products ne doit PAS être réordonné (un test vérifie
//            qu'il reste dans l'ordre A, B, C, D) ; on ne prend jamais plus
//            de 100 % d'un produit.
// (Indice 1 en fin de fichier.)
function computeFractionalBound(products: Product[], capacity: number): Relaxation {
  return { bound: undefined, fractions: {} }; // ← à remplacer
}

// TODO 2 — Optimum entier par énumération.
// Objectif : trouver la meilleure sélection ENTIÈRE réalisable, comme au
//            module 1 : c'est l'incumbent qu'on comparera à la borne.
//            - examiner chacune des 2ⁿ sélections de produits ;
//            - écarter celles dont le coût total dépasse capacity ;
//            - parmi les autres, garder celle de plus grande valeur.
// Entrée   : products, ex. PRODUCTS ;
//            capacity, ex. 100.
// Sortie   : un Incumbent { selectedIds, value } :
//            selectedIds, les ids des produits retenus (dans l'ordre de products) ;
//            value, la valeur totale ;
//            null si aucune sélection n'est réalisable.
// Exemple  : findIntegerOptimum(PRODUCTS, 100) → { selectedIds: ["A", "B", "D"], value: 25 } ;
//            findIntegerOptimum(PRODUCTS, 90) → valeur 23.
// Attention: en cas d'égalité de valeur, garde la PREMIÈRE sélection trouvée ;
//            avec une capacité négative, même la sélection vide ne tient pas → null.
// (Indice 2 en fin de fichier.)
function findIntegerOptimum(products: Product[], capacity: number): Incumbent | null {
  return undefined; // ← à remplacer
}

// TODO 3 — Gap absolu.
// Objectif : mesurer l'écart entre la borne (ce qu'on ne peut pas dépasser)
//            et l'incumbent (ce qu'on a déjà), §4 du cours.
// Entrée   : bound, la borne, ex. 25.4 ;
//            incumbent, la valeur de la meilleure solution entière connue, ex. 25.
// Sortie   : un nombre, l'écart borne − incumbent (≥ 0 en maximisation).
// Exemple  : computeAbsoluteGap(25.4, 25) → 0.4 (à l'arrondi flottant près).
// (Indice 3 en fin de fichier.)
function computeAbsoluteGap(bound: number, incumbent: number): number {
  return undefined; // ← à remplacer
}

// TODO 4 — Gap relatif.
// Objectif : exprimer l'écart |bound − incumbent| en proportion d'une
//            `reference`, qui est la borne (convention du cours) OU
//            l'incumbent (convention de GLPK, CPLEX…). Deux cas :
//            - reference non nulle : l'écart divisé par |reference| ;
//            - reference nulle : pas de division (voir Attention).
// Entrée   : bound, ex. 25.4 ;
//            incumbent, ex. 25 ;
//            reference, ex. 25.4 ou 25.
// Sortie   : un nombre sans unité (0.016 signifie 1,6 %).
// Exemple  : computeRelativeGap(25.4, 25, 25.4) → 0.4 / 25.4 ≈ 0.01575 ;
//            computeRelativeGap(25.4, 25, 25) → 0.016.
// Attention: si reference vaut 0, pas de division : renvoie 0 quand l'écart
//            est nul (computeRelativeGap(0, 0, 0) → 0), Infinity sinon.
// (Indice 4 en fin de fichier.)
function computeRelativeGap(bound: number, incumbent: number, reference: number): number {
  return undefined; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Pourquoi la borne de la relaxation est-elle TOUJOURS ≥ l'optimum
//     entier (en maximisation) ?
//  b) Pour quelle capacité du tableau le gap est-il nul ? Explique
//     pourquoi en regardant ce que fait le glouton.

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (computeFractionalBound) — Méthode gloutonne du §2 :
//   const sortedProducts = [...products].sort((first, second) => <ratio de second> - <ratio de first>);
//   (ratio = value / cost ; [...products] trie une COPIE)
//   const fractions = Object.fromEntries(products.map(product => [product.id, 0]));
//   let remainingCapacity = capacity, bound = 0;
//   pour chaque product de sortedProducts :
//     si remainingCapacity <= 0 → break
//     fraction = Math.min(1, remainingCapacity / product.cost)
//     fractions[product.id] = fraction ; bound += fraction * product.value ;
//     remainingCapacity -= fraction * product.cost
//
// Indice 2 (findIntegerOptimum) — Boucle sur mask de 0 à 2 ** products.length − 1 ;
//   products.filter((_, i) => (mask & (1 << i)) !== 0) donne la sélection ;
//   calcule son coût et sa valeur avec reduce ; remplace le meilleur seulement
//   si value > best.value (strictement), en partant de best = null.
//
// Indice 3 (computeAbsoluteGap) — Une simple soustraction.
//
// Indice 4 (computeRelativeGap) — Calcule d'abord difference = Math.abs(bound − incumbent) ;
//   traite le cas reference === 0 AVANT de diviser par Math.abs(reference).
