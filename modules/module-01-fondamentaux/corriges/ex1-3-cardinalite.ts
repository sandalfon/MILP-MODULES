/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 1 — Exercice 1.3 : Contrainte de cardinalité — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-01-fondamentaux/module-01-fondamentaux.md (§7)
 *  Lancer : node modules/module-01-fondamentaux/corriges/ex1-3-cardinalite.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  La règle « au plus deux produits » s'écrit :
 *        x_A + x_B + x_C + x_D ≤ 2
 *  Comme chaque x vaut 0 ou 1, la somme des x COMPTE les produits
 *  choisis. C'est encore une expression linéaire Σ coef·x, avec tous
 *  les coefficients égaux à 1 : on réutilise le même reduce que pour
 *  le coût.
 *
 *  Une décision est réalisable dans le nouveau modèle si elle respecte
 *  le budget ET la cardinalité. On COMBINE les contraintes avec &&.
 *  Chaque contrainte ajoutée réduit (ou laisse inchangé) l'ensemble
 *  des décisions réalisables.
 *
 *  Comparaison des deux modèles
 *    - Budget seul      : 13 réalisables, optimum (A, B, D) = 25
 *    - Budget + card ≤ 2 : 11 réalisables, optimum (B, C)    = 22
 *  (A, B, D) contient 3 produits : la nouvelle règle l'élimine.
 *
 *  Réponses aux questions
 *  a) L'optimum se dégrade de 25 à 22. Il ne pouvait pas s'améliorer,
 *  puisque tout ce qui est réalisable dans le modèle avec cardinalité
 *  l'était déjà dans le modèle sans cardinalité.
 *
 *  b) À l'optimum (B, C), le coût vaut 90 < 100 : le budget n'est PLUS
 *  saturé. C'est désormais la cardinalité qui « bloque » (2 = 2).
 *  Repérer la contrainte qui bloque l'optimum est un réflexe utile :
 *  c'est elle qu'il faudrait assouplir pour faire mieux.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Product = { id: string; cost: number; value: number };
// Décision : identifiant du produit → valeur de sa variable (0 ou 1).
type Decision = Record<string, number>;
type Solution = { selectedIds: string[]; cost: number; value: number };
type FeasibilityTest = (x: Decision) => boolean;
type ComparisonRow = {
  model: string;
  feasibleCount: number;
  selectedIds: string;
  cost: number | undefined;
  value: number | undefined;
};

const PRODUCTS: Product[] = [
  { id: "A", cost: 30, value: 8 },
  { id: "B", cost: 50, value: 12 },
  { id: "C", cost: 40, value: 10 },
  { id: "D", cost: 20, value: 5 }
];
const BUDGET: number = 100;
const MAX_PRODUCTS: number = 2;

// ─── 2. OUTILS FOURNIS (solutions des exercices 1.1 et 1.2) ─────
const totalCost = (x: Decision): number => PRODUCTS.reduce((sum, product) => sum + product.cost * x[product.id], 0);
const totalValue = (x: Decision): number => PRODUCTS.reduce((sum, product) => sum + product.value * x[product.id], 0);
const listSelectedIds = (x: Decision): string[] => PRODUCTS.filter(product => x[product.id] === 1).map(product => product.id);

function generateAllDecisions(): Decision[] {
  const decisions: Decision[] = [];
  for (let mask = 0; mask < 2 ** PRODUCTS.length; mask++) {
    const x: Decision = {};
    PRODUCTS.forEach((product, i) => { x[product.id] = (mask & (1 << i)) !== 0 ? 1 : 0; });
    decisions.push(x);
  }
  return decisions;
}

function findBestSolution(decisions: Decision[], isFeasible: FeasibilityTest): Solution | null {
  let best: Solution | null = null;
  for (const x of decisions) {
    if (!isFeasible(x)) continue;
    const value = totalValue(x);
    if (best === null || value > best.value) {
      best = { selectedIds: listSelectedIds(x), cost: totalCost(x), value };
    }
  }
  return best;
}

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Σ 1 · x_i : nombre de produits choisis.
function countSelected(x: Decision): number {
  return PRODUCTS.reduce((sum, product) => sum + x[product.id], 0);
}

// Modèle de base : budget seul.
function isFeasibleBaseModel(x: Decision): boolean {
  return totalCost(x) <= BUDGET;
}

// Modèle enrichi : budget ET cardinalité.
function isFeasibleWithCardinality(x: Decision): boolean {
  return totalCost(x) <= BUDGET && countSelected(x) <= MAX_PRODUCTS;
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
const decisions: Decision[] = generateAllDecisions();

printTitle("Comparaison des deux modèles");
const baseOptimum = findBestSolution(decisions, isFeasibleBaseModel);
const cardinalityOptimum = findBestSolution(decisions, isFeasibleWithCardinality);
// Un optimum vaut null si aucune décision n'est réalisable : la ligne affiche alors « — ».
const buildComparisonRow = (
  model: string,
  isFeasible: FeasibilityTest,
  optimum: Solution | null
): ComparisonRow => ({
  model,
  feasibleCount: decisions.filter(isFeasible).length,
  selectedIds: optimum ? optimum.selectedIds.join(", ") : "—",
  cost: optimum?.cost,
  value: optimum?.value
});
console.table([
  buildComparisonRow("budget seul", isFeasibleBaseModel, baseOptimum),
  buildComparisonRow(`budget + au plus ${MAX_PRODUCTS}`, isFeasibleWithCardinality, cardinalityOptimum)
]);

if (baseOptimum !== null && cardinalityOptimum !== null) {
  console.log("Perte de valeur due à la nouvelle règle :", baseOptimum.value - cardinalityOptimum.value);

  // Vérification indépendante : on recalcule à partir des seuls identifiants retenus.
  const cardinalityOptimumProducts = PRODUCTS.filter(product => cardinalityOptimum.selectedIds.includes(product.id));
  console.log("Contrôle indépendant de l'optimum enrichi :", {
    cost: cardinalityOptimumProducts.reduce((sum, product) => sum + product.cost, 0),
    count: cardinalityOptimumProducts.length
  });
}

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("countSelected(A,B,D) = 3", () => countSelected({ A: 1, B: 1, C: 0, D: 1 }), 3);
check("(A,B,D) interdit par la cardinalité",
  () => isFeasibleWithCardinality({ A: 1, B: 1, C: 0, D: 1 }), false);
check("(B,C) autorisé", () => isFeasibleWithCardinality({ A: 0, B: 1, C: 1, D: 0 }), true);
check("11 décisions réalisables avec cardinalité",
  () => generateAllDecisions().filter(isFeasibleWithCardinality).length, 11);
check("optimum avec cardinalité = (B, C), valeur 22",
  () => findBestSolution(generateAllDecisions(), isFeasibleWithCardinality),
  { selectedIds: ["B", "C"], cost: 90, value: 22 });
check("l'optimum ne s'améliore pas en ajoutant une contrainte", () => {
  const withCardinality = findBestSolution(generateAllDecisions(), isFeasibleWithCardinality);
  const withoutCardinality = findBestSolution(generateAllDecisions(), isFeasibleBaseModel);
  if (withCardinality === null || withoutCardinality === null) {
    throw new Error("un des deux modèles n'a aucune décision réalisable (fonctions à compléter ?)");
  }
  return withCardinality.value <= withoutCardinality.value;
}, true);
printSummary();
