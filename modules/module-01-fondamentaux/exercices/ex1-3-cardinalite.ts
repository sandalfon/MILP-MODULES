/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 1 — Exercice 1.3 : Contrainte de cardinalité
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-01-fondamentaux/module-01-fondamentaux.md (§7)
 *  Niveau : ★★☆   Durée indicative : 30 min
 *  Lancer : node modules/module-01-fondamentaux/exercices/ex1-3-cardinalite.ts
 *
 *  OBJECTIF
 *  Ajouter une contrainte au modèle et mesurer son effet sur l'optimum.
 *
 *  PRÉREQUIS
 *  - Exercices 1.1 et 1.2 (l'énumération est fournie ci-dessous).
 *  - Cours : une contrainte de cardinalité s'écrit Σ x_i ≤ K.
 *
 *  CONSIGNE
 *  Nouvelle règle métier : « au plus deux produits peuvent être choisis ».
 *    1. Écris sur papier l'inégalité correspondante.
 *    2. countSelected(x) : renvoie Σ x_i.
 *    3. isFeasibleBaseModel(x) : budget seul.
 *    4. isFeasibleWithCardinality(x) : budget ET au plus MAX_PRODUCTS.
 *    5. Lance le script, compare les deux optimums, et réponds aux
 *       QUESTIONS en bas du programme principal.
 *  Chaque bloc TODO détaille l'objectif ; des indices sont regroupés
 *  en fin de fichier, à lire seulement si tu bloques.
 *
 *  RÉSULTAT ATTENDU
 *  Budget seul : (A, B, D) = 25. Avec cardinalité : (B, C) = 22,
 *  11 décisions réalisables.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Nombre de produits choisis.
// Objectif : calculer Σ x_i, le membre de gauche de la contrainte de
//            cardinalité x_A + x_B + x_C + x_D ≤ MAX_PRODUCTS.
// Entrée   : x, une décision binaire, ex. { A: 1, B: 1, C: 0, D: 1 }.
// Sortie   : un nombre, combien de variables valent 1.
// Exemple  : countSelected({ A: 1, B: 1, C: 0, D: 1 }) → 3.
// Attention: la décision vide donne 0.
// (Indice 1 en fin de fichier.)
function countSelected(x: Decision): number {
  return PRODUCTS.reduce((sum, product)=> x[product.id]+sum,0); // ← à remplacer
}

// TODO 2 — Réalisabilité dans le modèle de base.
// Objectif : seule la contrainte de budget s'applique (coût ≤ BUDGET) ;
//            ce modèle sert de point de comparaison.
// Entrée   : x, une décision binaire, ex. { A: 1, B: 1, C: 0, D: 1 }.
// Sortie   : true si la décision respecte le budget, false sinon.
// Exemple  : isFeasibleBaseModel({ A: 1, B: 1, C: 0, D: 1 }) → true (100 ≤ 100) ;
//            isFeasibleBaseModel({ A: 1, B: 1, C: 1, D: 0 }) → false (120 > 100).
// (Indice 2 en fin de fichier.)
function isFeasibleBaseModel(x: Decision): boolean {
  return totalCost(x)<=BUDGET; // ← à remplacer
}

// TODO 3 — Réalisabilité dans le modèle enrichi.
// Objectif : une décision est réalisable si elle respecte le budget ET
//            la nouvelle règle « au plus MAX_PRODUCTS produits ».
// Entrée   : x, une décision binaire, ex. { A: 0, B: 1, C: 1, D: 0 }.
// Sortie   : true si les deux contraintes sont respectées, false sinon.
// Exemple  : isFeasibleWithCardinality({ A: 0, B: 1, C: 1, D: 0 }) → true ;
//            isFeasibleWithCardinality({ A: 1, B: 1, C: 0, D: 1 }) → false
//            (3 produits > 2, même si le budget est respecté).
// Attention: exactement MAX_PRODUCTS produits est autorisé (≤, pas <).
// (Indice 3 en fin de fichier.)
function isFeasibleWithCardinality(x: Decision): boolean {
  return isFeasibleBaseModel(x) && countSelected(x) <=MAX_PRODUCTS; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Pourquoi l'optimum ne peut-il pas s'AMÉLIORER quand on ajoute une contrainte ?
//  b) Dans le modèle enrichi, le budget est-il encore saturé ? Quelle
//     contrainte « bloque » désormais l'optimum ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (countSelected) — même reduce que totalCost, avec un coefficient 1.
//
// Indice 2 (isFeasibleBaseModel) — compare totalCost(x) à BUDGET.
//
// Indice 3 (isFeasibleWithCardinality) — combine les deux contraintes avec && :
//   le budget et countSelected(x) ≤ MAX_PRODUCTS.
