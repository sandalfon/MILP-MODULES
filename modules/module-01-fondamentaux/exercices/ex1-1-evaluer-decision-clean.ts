/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 1 — Exercice 1.1 : Évaluer une décision
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-01-fondamentaux/module-01-fondamentaux.md (§2 à §4)
 *  Niveau : ★☆☆   Durée indicative : 20 min
 *  Lancer : node modules/module-01-fondamentaux/exercices/ex1-1-evaluer-decision.ts
 *
 *  OBJECTIF
 *  Savoir calculer, pour une décision donnée, son coût, sa valeur
 *  (fonction objectif) et dire si elle est réalisable.
 *
 *  PRÉREQUIS
 *  - TypeScript : tableaux d'objets typés (Product[]), Array.prototype.reduce /
 *    every / filter / map, accès dynamique à une propriété x[key]
 *    (type Record<string, number>).
 *  - Cours : notion de variable binaire et d'expression linéaire Σ coef·x.
 *
 *  CONSIGNE
 *  Une décision est un objet qui associe à chaque produit 0 (non pris)
 *  ou 1 (pris), par exemple { A: 1, B: 1, C: 0, D: 1 }.
 *  Complète les fonctions marquées TODO, dans l'ordre :
 *    1. totalCost(x)       → Σ cost_i · x_i
 *    2. totalValue(x)      → Σ value_i · x_i   (la fonction objectif)
 *    3. satisfiesDomain(x) → true si chaque x_i vaut exactement 0 ou 1
 *    4. isFeasible(x)      → domaine respecté ET coût ≤ BUDGET
 *    5. listSelectedIds(x) → tableau des id dont x vaut 1
 *  Chaque bloc TODO détaille l'objectif ; des indices sont regroupés
 *  en fin de fichier, à lire seulement si tu bloques.
 *
 *  RÉSULTAT ATTENDU
 *  Le tableau affiché donne pour (A, B, D) un coût de 100, une valeur
 *  de 25 et isFeasible = true. Toutes les lignes de l'auto-vérification
 *  doivent être marquées ✔.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 2. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Coût total d'une décision.
// Objectif : calculer Σ cost_i · x_i, la dépense engagée par la décision x
//            (le membre de gauche de la contrainte de budget).
// Entrée   : x, la valeur (0 ou 1) de la variable de chaque produit,
//            ex. { A: 1, B: 1, C: 0, D: 1 }.
// Sortie   : un nombre, la somme des coûts des produits dont la variable vaut 1.
// Exemple  : totalCost({ A: 1, B: 1, C: 0, D: 1 }) → 30 + 50 + 20 = 100.
// Attention: la décision vide { A: 0, B: 0, C: 0, D: 0 } coûte 0.
// (Indice 1 en fin de fichier.)
function totalCost(x: Decision): number {
  return undefined; // ← à remplacer
}

// TODO 2 — Valeur totale d'une décision (la fonction objectif).
// Objectif : calculer Σ value_i · x_i, la quantité que l'on cherche à maximiser.
// Entrée   : x, une décision, ex. { A: 1, B: 1, C: 0, D: 1 }.
// Sortie   : un nombre, la somme des valeurs des produits dont la variable vaut 1.
// Exemple  : totalValue({ A: 1, B: 1, C: 0, D: 1 }) → 8 + 12 + 5 = 25.
// (Indice 2 en fin de fichier.)
function totalValue(x: Decision): number {
  return undefined; // ← à remplacer
}

// TODO 3 — Respect du domaine binaire x_i ∈ {0, 1}.
// Objectif : dire si CHAQUE produit de PRODUCTS a une variable qui vaut
//            exactement 0 ou 1 (un choix « oui/non » n'admet rien d'autre).
// Entrée   : x, une décision, ex. { A: 0.5, B: 0, C: 0, D: 0 }.
// Sortie   : true si toutes les variables valent 0 ou 1, false sinon.
// Exemple  : satisfiesDomain({ A: 1, B: 0, C: 1, D: 0 }) → true ;
//            satisfiesDomain({ A: 0.5, B: 0, C: 0, D: 0 }) → false.
// Attention: un produit absent de x ({ A: 1, B: 0, C: 0 }) doit rendre
//            la décision invalide : sa variable vaut alors undefined.
// (Indice 3 en fin de fichier.)
function satisfiesDomain(x: Decision): boolean {
  return undefined; // ← à remplacer
}

// TODO 4 — Réalisabilité d'une décision.
// Objectif : une décision est réalisable si elle respecte TOUTES les
//            contraintes : le domaine binaire ET le budget (coût ≤ BUDGET).
// Entrée   : x, une décision, ex. { A: 1, B: 1, C: 1, D: 0 }.
// Sortie   : true si la décision est réalisable, false sinon.
// Exemple  : isFeasible({ A: 1, B: 1, C: 0, D: 1 }) → true (coût 100 ≤ 100) ;
//            isFeasible({ A: 1, B: 1, C: 1, D: 0 }) → false (coût 120 > 100).
// Attention: un coût égal au budget est autorisé (≤, pas <) ; une variable
//            hors domaine (0.5, undefined) rend la décision irréalisable.
// (Indice 4 en fin de fichier.)
function isFeasible(x: Decision): boolean {
  return undefined; // ← à remplacer
}

// TODO 5 — Identifiants des produits choisis.
// Objectif : traduire une décision en liste lisible des produits retenus,
//            pour l'affichage.
// Entrée   : x, une décision, ex. { A: 0, B: 1, C: 1, D: 0 }.
// Sortie   : un tableau de chaînes, les id des produits dont la variable
//            vaut 1, dans l'ordre de PRODUCTS.
// Exemple  : listSelectedIds({ A: 0, B: 1, C: 1, D: 0 }) → ["B", "C"].
// Attention: la décision vide donne [].
// (Indice 5 en fin de fichier.)
function listSelectedIds(x: Decision): string[] {
  return []; // ← à remplacer
}

// ─── 3. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTION (à méditer, réponse dans le corrigé) : parmi ces quatre
// décisions, laquelle a la meilleure valeur ? Est-elle réalisable ?

// ─── 4. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (totalCost) — PRODUCTS.reduce((sum, product) => …, 0) ;
//   x[product.id] lit la variable du produit.
//
// Indice 2 (totalValue) — même schéma que totalCost, avec product.value.
//
// Indice 3 (satisfiesDomain) — PRODUCTS.every(…). Pense au cas où
//   x[product.id] est undefined : il n'est égal ni à 0 ni à 1.
//
// Indice 4 (isFeasible) — combine satisfiesDomain(x) et totalCost(x) avec &&.
//
// Indice 5 (listSelectedIds) — filter puis map.
