/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 5 — Exercice 5.3 : Coupes de couverture — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-05-algorithmes-resolution/module-05-algorithmes-resolution.md (§5)
 *  Lancer : node modules/module-05-algorithmes-resolution/corriges/ex5-3-coupes-couverture.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Contrainte : 30A + 50B + 40C + 20D ≤ 100.
 *
 *  1. Couverture : ensemble C d'objets dont le poids total DÉPASSE
 *     strictement la capacité. On ne peut pas tous les prendre, donc
 *     au moins un vaut 0 :  Σ_{i∈C} x_i ≤ |C| − 1.
 *     Couvertures ici : {A,B,C} (120), {B,C,D} (110), {A,B,C,D} (140).
 *     {A,B,D} pèse exactement 100 : ce n'est PAS une couverture
 *     (100 ≤ 100 est permis).
 *
 *  2. Couverture minimale : retirer n'importe quel objet fait repasser
 *     sous la capacité. {A,B,C} : retirer A → 90, B → 70, C → 80 : OK.
 *     {B,C,D} : retirer B → 60, C → 70, D → 90 : OK.
 *     {A,B,C,D} n'est pas minimale (retirer D donne 120 > 100).
 *     Coupes obtenues :  x_A + x_B + x_C ≤ 2   et   x_B + x_C + x_D ≤ 2.
 *
 *  3. Validité : on vérifie par énumération que les 13 solutions
 *     entières réalisables respectent chaque coupe. C'est vrai par
 *     construction : une solution entière réalisable ne peut pas
 *     contenir toute une couverture.
 *
 *  4. Efficacité : la solution relâchée (A=1, B=0,2, C=1, D=1) donne
 *     2,2 > 2 pour les DEUX coupes : elle est coupée. Le solveur doit
 *     re-résoudre la relaxation avec ces coupes, et la borne baisse.
 *
 *  Réponses aux questions
 *  a) La coupe de {A,B,C,D}, Σ x ≤ 3, est aussi valide et coupe aussi
 *     le point fractionnaire (3,2 > 3), mais elle est DOMINÉE : si
 *     x_A + x_B + x_C ≤ 2 et x_D ≤ 1, alors la somme des quatre est ≤ 3
 *     automatiquement. Elle n'apporte rien de plus : on préfère les
 *     couvertures minimales.
 *  b) La « coupe » x_A + x_B + x_D ≤ 2 serait NON valide : elle
 *     éliminerait (A, B, D), l'optimum entier ! Une coupe doit être
 *     prouvée valide, jamais devinée.
 *
 *  Pièges fréquents
 *  - Utiliser ≥ au lieu de > dans isCover : {A,B,D} (= 100)
 *    deviendrait une couverture, et la « coupe » associée supprimerait
 *    l'optimum.
 *  - Comparer des fractions sans tolérance : 0.2 + 1 + 1 peut valoir
 *    2.2000000000000002. On compare avec EPS.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Product = { id: string; cost: number; value: number };
type IdSet = string[];                  // identifiants de produits
type Decision = Record<string, number>; // id → valeur de x

const PRODUCTS: Product[] = [
  { id: "A", cost: 30, value: 8 },
  { id: "B", cost: 50, value: 12 },
  { id: "C", cost: 40, value: 10 },
  { id: "D", cost: 20, value: 5 }
];
const CAPACITY: number = 100;
const EPS: number = 1e-9;
const RELAXED_DECISION: Decision = { A: 1, B: 0.2, C: 1, D: 1 }; // racine du B&B

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────
const WEIGHT_BY_ID: Record<string, number> = Object.fromEntries(PRODUCTS.map(product => [product.id, product.cost]));

// Tous les sous-ensembles d'identifiants (tableaux), par masque.
function listAllSubsets(): IdSet[] {
  const subsets: IdSet[] = [];
  for (let mask = 0; mask < 2 ** PRODUCTS.length; mask++) {
    subsets.push(PRODUCTS.filter((_, i) => (mask & (1 << i)) !== 0).map(product => product.id));
  }
  return subsets;
}

// Toutes les solutions ENTIÈRES réalisables, sous forme de vecteurs x.
function listFeasibleIntegerSolutions(): Decision[] {
  return listAllSubsets()
    .filter(idSet => idSet.reduce((sum, id) => sum + WEIGHT_BY_ID[id], 0) <= CAPACITY)
    .map(idSet => Object.fromEntries(PRODUCTS.map(product => [product.id, idSet.includes(product.id) ? 1 : 0])));
}

// ─── 3. FONCTIONS ───────────────────────────────────────────────

function computeTotalWeight(idSet: IdSet): number {
  return idSet.reduce((sum, id) => sum + WEIGHT_BY_ID[id], 0);
}

// Couverture : poids STRICTEMENT supérieur à la capacité.
function isCover(idSet: IdSet): boolean {
  return computeTotalWeight(idSet) > CAPACITY;
}

// Minimale : couverture, et plus aucune dès qu'on retire un objet.
function isMinimalCover(idSet: IdSet): boolean {
  return isCover(idSet) &&
    idSet.every(id => !isCover(idSet.filter(otherId => otherId !== id)));
}

function findMinimalCovers(): IdSet[] {
  return listAllSubsets().filter(isMinimalCover);
}

// Coupe de couverture : Σ_{i∈C} x_i ≤ |C| − 1.
function satisfiesCut(cover: IdSet, x: Decision): boolean {
  const lhs = cover.reduce((sum, id) => sum + x[id], 0);
  return lhs <= cover.length - 1 + EPS;
}

// Valide = respectée par TOUTES les solutions entières réalisables.
function isValidCut(cover: IdSet): boolean {
  return listFeasibleIntegerSolutions().every(x => satisfiesCut(cover, x));
}

// Couvertures minimales dont la coupe est violée par x.
function findViolatedCuts(x: Decision): IdSet[] {
  return findMinimalCovers().filter(cover => !satisfiesCut(cover, x));
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Couvertures de 30A + 50B + 40C + 20D ≤ 100");
console.table(listAllSubsets()
  .filter(isCover)
  .map(cover => ({
    set: cover.join(""),
    weight: computeTotalWeight(cover),
    isMinimal: isMinimalCover(cover)
  })));

printTitle("Coupes issues des couvertures minimales");
// `?? []` : tant que le TODO 4 n'est pas fait, findMinimalCovers renvoie undefined.
console.table((findMinimalCovers() ?? []).map(cover => ({
  cut: `${cover.map(id => "x_" + id).join(" + ")} ≤ ${cover.length - 1}`,
  isValid: isValidCut(cover),
  "valeur au point relâché": +cover.reduce((sum, id) => sum + RELAXED_DECISION[id], 0).toFixed(4),
  cutsRelaxedPoint: !satisfiesCut(cover, RELAXED_DECISION)
})));
console.log("Solutions entières réalisables testées :", listFeasibleIntegerSolutions().length);

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("poids de {A,B,D} = 100", () => computeTotalWeight(["A", "B", "D"]), 100);
check("{A,B,D} n'est pas une couverture (100 ≤ 100)", () => isCover(["A", "B", "D"]), false);
check("{B,C,D} est une couverture", () => isCover(["B", "C", "D"]), true);
check("{A,B,C,D} n'est pas minimale", () => isMinimalCover(["A", "B", "C", "D"]), false);
check("couvertures minimales", () => findMinimalCovers(), [["A", "B", "C"], ["B", "C", "D"]]);
check("la coupe ABC est valide", () => isValidCut(["A", "B", "C"]), true);
check("la fausse coupe ABD n'est pas valide", () => isValidCut(["A", "B", "D"]), false);
check("l'optimum entier (A,B,D) respecte la coupe BCD",
  () => satisfiesCut(["B", "C", "D"], { A: 1, B: 1, C: 0, D: 1 }), true);
check("le point relâché est coupé par les deux coupes",
  () => findViolatedCuts(RELAXED_DECISION), [["A", "B", "C"], ["B", "C", "D"]]);
check("13 solutions entières réalisables", () => listFeasibleIntegerSolutions().length, 13);
printSummary();
