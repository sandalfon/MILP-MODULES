/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 1 — Exercice 1.2 : Énumération exhaustive — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-01-fondamentaux/module-01-fondamentaux.md (§5 et §6)
 *  Lancer : node modules/module-01-fondamentaux/corriges/ex1-2-enumeration.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  1. Masque → décision
 *     Le produit d'indice i est pris si le bit i de `mask` vaut 1 :
 *        (mask & (1 << i)) !== 0
 *     `1 << i` vaut 1, 2, 4, 8… : c'est un entier dont seul le bit i
 *     est allumé. Le ET bit à bit `&` isole ce bit dans `mask`. On
 *     convertit le booléen obtenu en 0/1 avec un ternaire.
 *     Exemple : mask = 11 = 0b1011 → A=1, B=1, C=0, D=1.
 *
 *  2. Toutes les décisions
 *     Les entiers 0 à 2ⁿ − 1 couvrent toutes les combinaisons de n
 *     bits, chacune exactement une fois. On obtient donc 2⁴ = 16
 *     décisions, sans doublon ni oubli.
 *
 *  3. Recherche de l'optimum
 *     On parcourt les décisions en gardant la meilleure solution
 *     RÉALISABLE vue jusqu'ici (on l'appellera « incumbent » au
 *     module 5). Le test `best === null` traite la première
 *     solution réalisable rencontrée.
 *     Avec `>` strict, en cas d'égalité, on garde la PREMIÈRE solution
 *     trouvée. Avec `>=`, on garderait la dernière. Les deux sont
 *     optimales : la valeur optimale est unique, la solution ne l'est
 *     pas forcément.
 *
 *  Réponses aux questions
 *  Oui. Résultat : 13 décisions réalisables sur 16, optimum (A, B, D) avec
 *  une valeur de 25 pour un coût de 100. Le budget est entièrement
 *  consommé : on dit que la contrainte de budget est SATURÉE (ou
 *  « active ») à l'optimum.
 *
 *  Pour aller plus loin : la fonction findBestSolution reçoit le test
 *  de réalisabilité en PARAMÈTRE. On peut donc la réutiliser telle
 *  quelle avec d'autres contraintes, comme dans l'exercice 1.3.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Product = { id: string; cost: number; value: number };
// Décision : identifiant du produit → valeur de sa variable (0 ou 1).
type Decision = Record<string, number>;
type Solution = { selectedIds: string[]; cost: number; value: number };
type FeasibilityTest = (x: Decision) => boolean;

const PRODUCTS: Product[] = [
  { id: "A", cost: 30, value: 8 },
  { id: "B", cost: 50, value: 12 },
  { id: "C", cost: 40, value: 10 },
  { id: "D", cost: 20, value: 5 }
];
const BUDGET: number = 100;

// ─── 2. OUTILS FOURNIS (solution de l'exercice 1.1) ─────────────
const totalCost = (x: Decision): number => PRODUCTS.reduce((sum, product) => sum + product.cost * x[product.id], 0);
const totalValue = (x: Decision): number => PRODUCTS.reduce((sum, product) => sum + product.value * x[product.id], 0);
const listSelectedIds = (x: Decision): string[] => PRODUCTS.filter(product => x[product.id] === 1).map(product => product.id);
const fitsBudget = (x: Decision): boolean => totalCost(x) <= BUDGET;

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Convertit un entier en décision : bit i de mask ↔ variable du produit i.
function maskToDecision(mask: number): Decision {
  const x: Decision = {};
  PRODUCTS.forEach((product, i) => {
    x[product.id] = (mask & (1 << i)) !== 0 ? 1 : 0;
  });
  return x;
}

// Génère les 2ⁿ décisions possibles, de mask = 0 à mask = 2ⁿ − 1.
function generateAllDecisions(): Decision[] {
  const decisions: Decision[] = [];
  for (let mask = 0; mask < 2 ** PRODUCTS.length; mask++) {
    decisions.push(maskToDecision(mask));
  }
  return decisions;
}

// Parcourt les décisions et renvoie la meilleure réalisable,
// ou null si aucune décision ne respecte les contraintes.
function findBestSolution(decisions: Decision[], isFeasible: FeasibilityTest): Solution | null {
  let best: Solution | null = null;
  for (const x of decisions) {
    if (!isFeasible(x)) continue; // on ignore les décisions interdites
    const value = totalValue(x);
    if (best === null || value > best.value) {
      best = { selectedIds: listSelectedIds(x), cost: totalCost(x), value };
    }
  }
  return best;
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Les 16 décisions et leur évaluation");
const decisions = generateAllDecisions();
console.table(decisions.map((x, mask) => ({
  mask,
  binary: mask.toString(2).padStart(PRODUCTS.length, "0"),
  selectedIds: listSelectedIds(x).join(", ") || "(aucun)",
  cost: totalCost(x),
  value: totalValue(x),
  isFeasible: fitsBudget(x)
})));

const feasibleCount = decisions.filter(fitsBudget).length;
console.log(`Décisions réalisables : ${feasibleCount} / ${decisions.length}`);

const optimum = findBestSolution(decisions, fitsBudget);
console.log("Solution optimale :", optimum);

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("masque 0 → rien", () => maskToDecision(0), { A: 0, B: 0, C: 0, D: 0 });
check("masque 11 (0b1011) → A, B, D", () => maskToDecision(11), { A: 1, B: 1, C: 0, D: 1 });
check("16 décisions générées", () => generateAllDecisions().length, 16);
check("décisions toutes distinctes", () =>
  new Set(generateAllDecisions().map(x => JSON.stringify(x))).size, 16);
check("13 décisions réalisables", () => generateAllDecisions().filter(fitsBudget).length, 13);
check("optimum = (A, B, D), coût 100, valeur 25",
  () => findBestSolution(generateAllDecisions(), fitsBudget),
  { selectedIds: ["A", "B", "D"], cost: 100, value: 25 });
check("aucune décision réalisable → null",
  () => findBestSolution(generateAllDecisions(), () => false), null);
printSummary();
