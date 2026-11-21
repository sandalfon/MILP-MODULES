/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 1 — Exercice 1.1 : Évaluer une décision — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-01-fondamentaux/module-01-fondamentaux.md (§2 à §4)
 *  Lancer : node modules/module-01-fondamentaux/corriges/ex1-1-evaluer-decision.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Une décision x est un objet { A: 0|1, B: 0|1, ... }. Le coût total et
 *  la valeur totale sont deux expressions LINÉAIRES de la forme
 *  Σ coef_i · x_i : on multiplie chaque coefficient par la variable
 *  correspondante, puis on additionne. En TypeScript, ce schéma se
 *  traduit toujours par un reduce :
 *
 *      PRODUCTS.reduce((sum, product) => sum + product.<coef> * x[product.id], 0)
 *
 *  - Le 0 final est la valeur initiale de la somme : sans lui, reduce
 *    démarrerait avec le premier OBJET produit, pas avec un nombre.
 *  - On multiplie par x[product.id] au lieu de filtrer les produits choisis :
 *    les deux donnent le même résultat, mais la multiplication
 *    reproduit exactement l'écriture mathématique. C'est ce que l'on
 *    transmettra au solveur au module 6.
 *
 *  Une décision est RÉALISABLE si elle respecte TOUTES les contraintes,
 *  y compris le domaine des variables : chaque x_i doit valoir 0 ou 1.
 *  Oublier ce contrôle laisserait passer { A: 0.5, ... }, une valeur
 *  qui n'a pas de sens pour un choix « oui/non ».
 *
 *  Pièges fréquents
 *  - Comparer avec < au lieu de <= : un coût de exactement 100 € RESPECTE
 *    le budget. La décision (A, B, D) coûte 100 et elle est réalisable.
 *  - Oublier un produit absent de l'objet x : x[product.id] vaut alors
 *    undefined, et undefined * 30 donne NaN. Le contrôle de domaine
 *    détecte ce cas, car undefined n'est ni 0 ni 1.
 *
 *  Réponses aux questions
 *  - Parmi les quatre décisions affichées, (A, B, C) a la meilleure valeur
 *    (30), mais elle coûte 120 > 100 : elle est irréalisable. La meilleure
 *    décision RÉALISABLE du tableau est (A, B, D), qui vaut 25.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Product = { id: string; cost: number; value: number };
// Décision : identifiant du produit → valeur de sa variable (0 ou 1).
type Decision = Record<string, number>;

const PRODUCTS: Product[] = [
  { id: "A", cost: 30, value: 8 },
  { id: "B", cost: 50, value: 12 },
  { id: "C", cost: 40, value: 10 },
  { id: "D", cost: 20, value: 5 }
];
const BUDGET: number = 100;

// ─── 2. FONCTIONS ───────────────────────────────────────────────

// Σ cost_i · x_i
function totalCost(x: Decision): number {
  return PRODUCTS.reduce((sum, product) => sum + product.cost * x[product.id], 0);
}

// Σ value_i · x_i : c'est la fonction objectif.
function totalValue(x: Decision): number {
  return PRODUCTS.reduce((sum, product) => sum + product.value * x[product.id], 0);
}

// Vrai si chaque variable vaut exactement 0 ou 1 : x_i ∈ {0, 1}.
function satisfiesDomain(x: Decision): boolean {
  return PRODUCTS.every(product => x[product.id] === 0 || x[product.id] === 1);
}

// Réalisable = domaine respecté ET contrainte de budget respectée.
// Le domaine est testé d'abord : s'il est faux, inutile de calculer un coût qui
// n'a pas de sens (il vaudrait NaN, et NaN <= BUDGET serait de toute façon faux).
function isFeasible(x: Decision): boolean {
  return satisfiesDomain(x) && totalCost(x) <= BUDGET;
}

// Liste des identifiants dont la variable vaut 1, pour un affichage lisible.
function listSelectedIds(x: Decision): string[] {
  return PRODUCTS.filter(product => x[product.id] === 1).map(product => product.id);
}

// ─── 3. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Évaluation de quelques décisions");

const decisions: Decision[] = [
  { A: 1, B: 1, C: 0, D: 1 },
  { A: 1, B: 1, C: 1, D: 0 },
  { A: 0, B: 1, C: 1, D: 0 },
  { A: 0, B: 0, C: 0, D: 0 }
];

console.table(decisions.map(x => ({
  selectedIds: listSelectedIds(x).join(", ") || "(aucun)",
  cost: totalCost(x),
  value: totalValue(x),
  isFeasible: isFeasible(x)
})));

// ─── 4. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("coût de (A,B,D) = 100", () => totalCost({ A: 1, B: 1, C: 0, D: 1 }), 100);
check("valeur de (A,B,D) = 25", () => totalValue({ A: 1, B: 1, C: 0, D: 1 }), 25);
check("coût de la décision vide = 0", () => totalCost({ A: 0, B: 0, C: 0, D: 0 }), 0);
check("(A,B,D) est réalisable (100 ≤ 100)", () => isFeasible({ A: 1, B: 1, C: 0, D: 1 }), true);
check("(A,B,C) n'est pas réalisable (120 > 100)", () => isFeasible({ A: 1, B: 1, C: 1, D: 0 }), false);
check("x_A = 0.5 viole le domaine binaire", () => isFeasible({ A: 0.5, B: 0, C: 0, D: 0 }), false);
check("produit manquant dans x : non réalisable", () => isFeasible({ A: 1, B: 0, C: 0 }), false);
check("produits choisis de (0,1,1,0)", () => listSelectedIds({ A: 0, B: 1, C: 1, D: 0 }), ["B", "C"]);
printSummary();
