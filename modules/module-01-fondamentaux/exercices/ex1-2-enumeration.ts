/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 1 — Exercice 1.2 : Énumération exhaustive
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-01-fondamentaux/module-01-fondamentaux.md (§5 et §6)
 *  Niveau : ★★☆   Durée indicative : 40 min
 *  Lancer : node modules/module-01-fondamentaux/exercices/ex1-2-enumeration.ts
 *
 *  OBJECTIF
 *  Générer TOUTES les décisions possibles d'un problème à 4 variables
 *  binaires et en déduire la solution optimale, en trois étapes :
 *  - traduire un entier (masque) en décision (TODO 1) ;
 *  - énumérer les 2ⁿ décisions, chacune une seule fois (TODO 2) ;
 *  - garder la meilleure décision réalisable (TODO 3).
 *
 *  PRÉREQUIS
 *  - Exercice 1.1 (les fonctions d'évaluation sont fournies plus bas).
 *  - TypeScript : boucle for, opérateurs bit à bit & et <<, forEach,
 *    type union Solution | null.
 *  - Cours : un entier mask de 0 à 2ⁿ − 1, lu en binaire, encode une décision.
 *
 *  CONSIGNE
 *    1. maskToDecision(mask) : construis la décision x codée par l'entier
 *       mask : le produit d'indice i est pris si le bit i de mask vaut 1.
 *    2. generateAllDecisions() : renvoie le tableau des 2ⁿ décisions.
 *    3. findBestSolution(decisions, isFeasible) : parcours les
 *       décisions, ignore celles qui ne sont pas réalisables et renvoie
 *       la meilleure sous la forme { selectedIds, cost, value }, ou null si
 *       aucune n'est réalisable.
 *  Chaque bloc TODO détaille l'objectif ; des indices sont regroupés
 *  en fin de fichier, à lire seulement si tu bloques.
 *
 *  RÉSULTAT ATTENDU
 *  16 décisions, 13 réalisables, optimum (A, B, D) : coût 100, valeur 25.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Convertir un masque en décision.
// Objectif : lire l'entier mask en binaire : le bit i (en partant de la
//            droite) donne la valeur de la variable du produit d'indice i
//            dans PRODUCTS (A ↔ bit 0, B ↔ bit 1, C ↔ bit 2, D ↔ bit 3).
// Entrée   : mask, un entier entre 0 et 2ⁿ − 1, ex. 11 (0b1011).
// Sortie   : une Decision qui donne 0 ou 1 à CHAQUE produit.
// Exemple  : maskToDecision(11) → { A: 1, B: 1, C: 0, D: 1 } ;
//            maskToDecision(0)  → { A: 0, B: 0, C: 0, D: 0 }.
// Attention: les produits à 0 doivent figurer dans x (valeur 0), pas être omis.
// (Indice 1 en fin de fichier.)
function maskToDecision(mask: number): Decision {
  const x: Decision = {};
  PRODUCTS.forEach((product, i) => { x[product.id] = (mask & (1 << i)) ?1 :0 })
  // ... à compléter
  return x;
}

// TODO 2 — Générer toutes les décisions.
// Objectif : énumérer les 2ⁿ décisions possibles du problème à
//            n = PRODUCTS.length variables binaires, chacune une seule fois.
// Entrée   : aucune (on utilise PRODUCTS).
// Sortie   : un tableau de Decision, de longueur 2ⁿ, toutes distinctes.
// Exemple  : generateAllDecisions().length → 16 ; generateAllDecisions()[11]
//            → { A: 1, B: 1, C: 0, D: 1 }.
// Attention: 2ⁿ − 1 est le dernier masque ; ne saute ni 0 ni 2ⁿ − 1, et ne
//            va pas jusqu'à 2ⁿ (ce serait une décision de trop).
// (Indice 2 en fin de fichier.)
function generateAllDecisions(): Decision[] {
  const decisions: Decision[] = [];
  for (let mask = 0; mask < 2 ** PRODUCTS.length; mask++)
    decisions.push(maskToDecision(mask))
  // ... à compléter
  return decisions;
}

// TODO 3 — Trouver la meilleure décision réalisable.
// Objectif : trouver l'optimum en examinant chaque décision :
//            - écarter celles que isFeasible refuse ;
//            - parmi les autres, garder celle de plus grande valeur totale ;
//            - la renvoyer sous forme de Solution : ses id retenus, son
//              coût et sa valeur (null si aucune n'est réalisable).
// Entrée   : decisions, la liste à examiner (ex. generateAllDecisions()) ;
//            isFeasible, le test de réalisabilité à appliquer (ex. fitsBudget).
// Sortie   : la meilleure Solution { selectedIds, cost, value }, ou null si
//            aucune décision n'est réalisable.
// Exemple  : findBestSolution(generateAllDecisions(), fitsBudget)
//            → { selectedIds: ["A", "B", "D"], cost: 100, value: 25 } ;
//            findBestSolution(generateAllDecisions(), () => false) → null.
// Attention: en cas d'égalité de valeur, garde la PREMIÈRE solution trouvée.
// (Indice 3 en fin de fichier.)
function findBestSolution(decisions: Decision[], isFeasible: FeasibilityTest): Solution | null {

  const feasibleDecision = decisions.filter(decision => isFeasible(decision))
  if (feasibleDecision.length ===0) return null
  const bestDecision =  feasibleDecision.reduce((meilleur, decision) => totalValue(decision) > totalValue(meilleur) ? decision : meilleur)
  // ... à compléter
  return {selectedIds: listSelectedIds(bestDecision), cost: totalCost(bestDecision), value:totalValue(bestDecision) };
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTION : la contrainte de budget est-elle « saturée » à l'optimum
// (coût exactement égal à 100) ? Qu'est-ce que cela signifie ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (maskToDecision) — PRODUCTS.forEach((product, i) => { … }) ;
//   pour chaque produit d'indice i :
//   x[product.id] = 1 si (mask & (1 << i)) !== 0, sinon 0.
//
// Indice 2 (generateAllDecisions) — boucle for sur mask de 0 à
//   2 ** PRODUCTS.length − 1 (condition : mask < 2 ** PRODUCTS.length),
//   et ajoute maskToDecision(mask) au tableau.
//
// Indice 3 (findBestSolution) — structure suggérée :
//   let best = null;
//   pour chaque x de decisions :
//     si x n'est pas réalisable → passer à la suivante (continue)
//     si best est null OU totalValue(x) > best.value :
//       best = { selectedIds: listSelectedIds(x), cost: …, value: … }
//   return best;
