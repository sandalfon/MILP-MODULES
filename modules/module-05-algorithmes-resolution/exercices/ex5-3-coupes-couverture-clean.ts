/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 5 — Exercice 5.3 : Coupes de couverture
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-05-algorithmes-resolution/module-05-algorithmes-resolution.md (§5)
 *  Niveau : ★★☆   Durée indicative : 40 min
 *  Lancer : node modules/module-05-algorithmes-resolution/exercices/ex5-3-coupes-couverture.ts
 *
 *  OBJECTIF
 *  Construire des coupes de couverture pour la contrainte de sac à dos
 *  30A + 50B + 40C + 20D ≤ 100, en trois étapes :
 *  - TROUVER les couvertures, puis les couvertures minimales, qui
 *    définissent les coupes (TODO 1 à 4) ;
 *  - vérifier que ces coupes sont VALIDES : aucune solution entière
 *    réalisable n'est perdue (TODO 5 et 6) ;
 *  - vérifier qu'elles COUPENT la solution fractionnaire de la racine
 *    du Branch and Bound (TODO 7).
 *
 *  PRÉREQUIS
 *  - Exercices 5.1 et 5.2 : relaxation, point (A=1, B=0,2, C=1, D=1).
 *  - Cours §5 : couverture, couverture minimale, Σ_{i∈C} x_i ≤ |C| − 1.
 *  - TypeScript : every, filter, reduce sur des tableaux d'identifiants
 *    (type IdSet = string[]).
 *
 *  CONSIGNE
 *  Un « ensemble » est un tableau d'identifiants, ex. ["A", "B", "C"].
 *  Complète les 7 fonctions de la section 3 dans l'ordre : poids total,
 *  couverture, couverture minimale, liste des couvertures minimales,
 *  respect d'une coupe, validité d'une coupe, coupes violées par un point.
 *  Chaque bloc TODO détaille l'entrée, la sortie et un exemple ; si tu
 *  bloques, la section INDICES en fin de fichier donne des pistes.
 *
 *  RÉSULTAT ATTENDU
 *  Deux couvertures minimales {A,B,C} et {B,C,D}, deux coupes valides
 *  x_A + x_B + x_C ≤ 2 et x_B + x_C + x_D ≤ 2, toutes deux violées par
 *  le point relâché (valeur 2,2).
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Poids total d'un ensemble.
// Objectif : calculer le membre de gauche de la contrainte 30A + 50B + 40C + 20D
//            quand on prend exactement les objets de l'ensemble.
// Entrée   : idSet, un tableau d'identifiants, ex. ["A", "B", "D"].
// Sortie   : un nombre, la somme des coûts (poids) des objets de idSet.
// Exemple  : computeTotalWeight(["A", "B", "D"]) → 30 + 50 + 20 = 100.
// Attention: l'ensemble vide [] pèse 0.
// (Indice 1 en fin de fichier.)
function computeTotalWeight(idSet: IdSet): number {
  return undefined; // ← à remplacer
}

// TODO 2 — Couverture.
// Objectif : dire si l'ensemble est une COUVERTURE (§5 du cours) : un
//            ensemble d'objets qu'on ne peut pas prendre tous ensemble.
// Entrée   : idSet, ex. ["B", "C", "D"].
// Sortie   : true si son poids total dépasse STRICTEMENT CAPACITY, false sinon.
// Exemple  : isCover(["B", "C", "D"]) → true (110 > 100) ;
//            isCover(["A", "B", "D"]) → false (100 ≤ 100 est permis).
// (Indice 2 en fin de fichier.)
function isCover(idSet: IdSet): boolean {
  return undefined; // ← à remplacer
}

// TODO 3 — Couverture minimale.
// Objectif : reconnaître les couvertures MINIMALES, qui donnent les coupes
//            les plus fortes. Deux conditions à réunir :
//            - l'ensemble est une couverture ;
//            - retirer n'importe lequel de ses objets le fait repasser
//              sous la capacité (l'ensemble restant n'est plus une couverture).
// Entrée   : idSet, ex. ["A", "B", "C"].
// Sortie   : true si idSet est une couverture minimale, false sinon.
// Exemple  : isMinimalCover(["A", "B", "C"]) → true (retirer A → 90, B → 70, C → 80) ;
//            isMinimalCover(["A", "B", "C", "D"]) → false (retirer D laisse 120 > 100).
// Attention: un ensemble qui n'est pas une couverture n'est pas minimal ;
//            ne modifie pas idSet en retirant un objet (travaille sur une copie).
// (Indice 3 en fin de fichier.)
function isMinimalCover(idSet: IdSet): boolean {
  return undefined; // ← à remplacer
}

// TODO 4 — Liste des couvertures minimales.
// Objectif : trouver toutes les couvertures minimales de la contrainte, parmi
//            les 2⁴ = 16 sous-ensembles donnés par l'outil listAllSubsets().
// Entrée   : aucune.
// Sortie   : un tableau d'ensembles (IdSet[]), dans l'ordre de listAllSubsets().
// Exemple  : findMinimalCovers() → [["A", "B", "C"], ["B", "C", "D"]].
// (Indice 4 en fin de fichier.)
function findMinimalCovers(): IdSet[] {
  return undefined; // ← à remplacer
}

// TODO 5 — Respect d'une coupe de couverture.
// Objectif : tester si un point x respecte la coupe Σ_{i∈C} x_i ≤ |C| − 1
//            associée à la couverture C.
// Entrée   : cover, une couverture, ex. ["B", "C", "D"] ;
//            x, la valeur de chaque variable (entière ou fractionnaire),
//            ex. { A: 1, B: 1, C: 0, D: 1 } ou RELAXED_DECISION.
// Sortie   : true si la coupe est respectée, false si elle est violée.
// Exemple  : satisfiesCut(["B", "C", "D"], { A: 1, B: 1, C: 0, D: 1 }) → true (2 ≤ 2) ;
//            satisfiesCut(["A", "B", "C"], RELAXED_DECISION) → false (2,2 > 2).
// Attention: avec des fractions, 0.2 + 1 + 1 peut valoir 2.2000000000000002 :
//            compare avec la tolérance EPS.
// (Indice 5 en fin de fichier.)
function satisfiesCut(cover: IdSet, x: Decision): boolean {
  return undefined; // ← à remplacer
}

// TODO 6 — Validité d'une coupe.
// Objectif : vérifier qu'une coupe est VALIDE, c'est-à-dire qu'elle ne fait
//            perdre aucune solution entière réalisable.
// Entrée   : cover, l'ensemble qui définit la coupe, ex. ["A", "B", "C"].
// Sortie   : true si TOUTES les solutions de listFeasibleIntegerSolutions()
//            (13 ici) respectent la coupe, false sinon.
// Exemple  : isValidCut(["A", "B", "C"]) → true ;
//            isValidCut(["A", "B", "D"]) → false (elle éliminerait l'optimum (A, B, D)).
// (Indice 6 en fin de fichier.)
function isValidCut(cover: IdSet): boolean {
  return undefined; // ← à remplacer
}

// TODO 7 — Coupes violées par un point.
// Objectif : trouver les coupes de couverture minimale qui COUPENT le point x
//            (la solution fractionnaire de la racine du Branch and Bound) :
//            - partir de toutes les couvertures minimales ;
//            - ne garder que celles dont la coupe est violée par x.
// Entrée   : x, ex. RELAXED_DECISION = { A: 1, B: 0.2, C: 1, D: 1 }.
// Sortie   : les couvertures minimales (IdSet[]) dont la coupe est violée par x.
// Exemple  : findViolatedCuts(RELAXED_DECISION) → [["A", "B", "C"], ["B", "C", "D"]] ;
//            pour l'optimum entier { A: 1, B: 1, C: 0, D: 1 } → [].
// (Indice 7 en fin de fichier.)
function findViolatedCuts(x: Decision): IdSet[] {
  return undefined; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) {A,B,C,D} est une couverture non minimale. Sa coupe Σ x ≤ 3 est-elle
//     valide ? Coupe-t-elle le point relâché ? Pourquoi est-elle inutile
//     en présence de la coupe x_A + x_B + x_C ≤ 2 ?
//  b) Pourquoi x_A + x_B + x_D ≤ 2 ne doit SURTOUT PAS être ajoutée ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (computeTotalWeight) — WEIGHT_BY_ID[id] donne le poids d'un objet ;
//   idSet.reduce((sum, id) => …, 0).
//
// Indice 2 (isCover) — Réutilise computeTotalWeight et compare avec > (pas ≥).
//
// Indice 3 (isMinimalCover) — isCover(idSet) && idSet.every(id => !isCover(idSet.filter(otherId => otherId !== id))).
//
// Indice 4 (findMinimalCovers) — listAllSubsets().filter(…) avec isMinimalCover.
//
// Indice 5 (satisfiesCut) — Calcule lhs = Σ x[id] avec reduce sur cover, puis
//   compare lhs <= cover.length − 1 + EPS.
//
// Indice 6 (isValidCut) — listFeasibleIntegerSolutions().every(x => …) avec satisfiesCut.
//
// Indice 7 (findViolatedCuts) — findMinimalCovers().filter(cover => …) : garde
//   celles que x ne respecte PAS.
