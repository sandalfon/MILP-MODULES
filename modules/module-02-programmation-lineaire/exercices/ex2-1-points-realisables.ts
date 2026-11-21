/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 2 — Exercice 2.1 : Points réalisables et sommets
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-02-programmation-lineaire/module-02-programmation-lineaire.md (§1 et §4)
 *  Niveau : ★☆☆   Durée indicative : 25 min
 *  Lancer : node modules/module-02-programmation-lineaire/exercices/ex2-1-points-realisables.ts
 *
 *  OBJECTIF
 *  Tester si des points (à coordonnées continues) respectent un LP et
 *  trouver l'optimum en évaluant l'objectif aux sommets.
 *
 *  PRÉREQUIS
 *  - Module 1 (réalisabilité, objectif).
 *  - TypeScript : déstructuration [x, y], map, filter, reduce ; type de retour « T | null ».
 *  - Cours : région réalisable, sommets, optimum en un sommet.
 *
 *  CONSIGNE
 *  Problème :  MAX 3x + 2y  s.c.  x + y ≤ 4,  x ≤ 2,  y ≤ 3,  x, y ≥ 0.
 *    1. isFeasible(x, y)       : true si TOUTES les contraintes sont respectées.
 *    2. computeObjective(x, y) : 3x + 2y.
 *    3. evaluatePoints(points) : pour chaque [x, y], renvoie
 *       { x, y, isFeasible, objective }.
 *    4. findBestPoint(points)  : la ligne réalisable d'objectif maximal,
 *       ou null s'il n'y a aucun point réalisable.
 *
 *  RÉSULTAT ATTENDU
 *  Objectifs aux sommets : 0, 6, 10, 9, 6. Optimum (2, 2) = 10.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// Un point du plan, sous forme de couple [x, y].
type Coordinates = [x: number, y: number];
// Une ligne du tableau d'évaluation.
type PointRow = { x: number; y: number; isFeasible: boolean; objective: number };

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
// Sommets de la région réalisable (calculés à la main, cf. cours §4).
const CANDIDATE_VERTICES: Coordinates[] = [[0, 0], [2, 0], [2, 2], [1, 3], [0, 3]];
// Points de test : un intérieur et quelques points hors de la région.
const TEST_POINTS: Coordinates[] = [[1, 1], [3, 1], [2, 3], [-1, 0], [1.5, 2.5]];

// ─── 2. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Le point (x, y) est-il réalisable ?
// Objectif : dire si le point appartient à la région réalisable, c'est-à-dire
//            s'il respecte les 5 contraintes : x ≥ 0, y ≥ 0, x + y ≤ 4, x ≤ 2, y ≤ 3.
// Entrée   : x et y, deux nombres réels (continus), ex. x = 1.5, y = 2.5.
// Sortie   : un booléen, true si TOUTES les contraintes sont respectées.
// Exemple  : isFeasible(2, 2) → true ; isFeasible(3, 1) → false (viole x ≤ 2).
// Attention: les bornes x ≥ 0 et y ≥ 0 sont des contraintes comme les autres :
//            isFeasible(-1, 0) → false.
// (Indice 1 en fin de fichier.)
function isFeasible(x: number, y: number): boolean {
  return x >= 0 &&
    y >= 0 &&
    x + y <= 4 &&
    x <= 2 &&
    y <= 3 ; // ← à remplacer
}

// TODO 2 — Valeur de l'objectif.
// Objectif : calculer la fonction objectif 3x + 2y que le LP cherche à maximiser.
// Entrée   : x et y, deux nombres réels, ex. x = 1, y = 3.
// Sortie   : un nombre, la valeur 3x + 2y.
// Exemple  : computeObjective(1, 3) → 3·1 + 2·3 = 9.
function computeObjective(x: number, y: number): number {
  return 3*x + 2* y; // ← à remplacer
}

// TODO 3 — Tableau d'évaluation des points.
// Objectif : produire une ligne par point, avec ses coordonnées, sa réalisabilité
//            et la valeur de l'objectif, pour comparer les points d'un coup d'œil.
// Entrée   : points, un tableau de couples [x, y], ex. CANDIDATE_VERTICES.
// Sortie   : un tableau de PointRow { x, y, isFeasible, objective }, dans l'ordre des points.
// Exemple  : evaluatePoints([[2, 2], [3, 1]])
//            → [{ x: 2, y: 2, isFeasible: true, objective: 10 },
//               { x: 3, y: 1, isFeasible: false, objective: 11 }].
// Attention: l'objectif est calculé aussi pour les points irréalisables.
// (Indice 3 en fin de fichier.)
function evaluatePoints(points: Coordinates[]): PointRow[] {
  return points.map(([x, y]) => ({ x, y, isFeasible: isFeasible(x, y), objective: computeObjective(x, y) }));
}

// TODO 4 — Meilleur point réalisable.
// Objectif : trouver, PARMI LES POINTS RÉALISABLES, celui dont l'objectif est maximal.
// Entrée   : points, un tableau de couples [x, y], ex. CANDIDATE_VERTICES.
// Sortie   : la ligne PointRow du meilleur point réalisable, ou null s'il n'y en a aucun.
// Exemple  : findBestPoint(CANDIDATE_VERTICES) → { x: 2, y: 2, isFeasible: true, objective: 10 }.
// Attention: (2, 3) vaut 12 mais est irréalisable : il ne doit pas gagner.
//            findBestPoint([[5, 5], [-1, -1]]) → null.
// (Indice 4 en fin de fichier.)
function findBestPoint(points: Coordinates[]): PointRow | null {
return  evaluatePoints(points).reduce<PointRow | null>(
      (best, evaluate) => evaluate.isFeasible && (!best || evaluate.objective > best.objective) ? evaluate : best,
      null
    )
}

// ─── 3. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
printTitle("Sommets candidats");
console.table(evaluatePoints(CANDIDATE_VERTICES));
console.log("Optimum parmi les sommets :", findBestPoint(CANDIDATE_VERTICES));

printTitle("Autres points de test");
console.table(evaluatePoints(TEST_POINTS));

// QUESTIONS :
//  a) (1, 1) est réalisable. Pourquoi ne peut-il pas être optimal ?
//  b) Certains points de test ont un objectif > 10. Pourquoi n'est-ce
//     pas une contradiction avec l'optimum (2, 2) ?
//  c) Quelles contraintes sont saturées (égalité) en (2, 2) ?

// ─── 4. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
printTitle("Auto-vérification");
check("(2, 2) réalisable", () => isFeasible(2, 2), true);
check("(1.5, 2.5) réalisable (variables continues)", () => isFeasible(1.5, 2.5), true);
check("(3, 1) viole x ≤ 2", () => isFeasible(3, 1), false);
check("(2, 3) viole x + y ≤ 4", () => isFeasible(2, 3), false);
check("(-1, 0) viole x ≥ 0", () => isFeasible(-1, 0), false);
check("objectif(1, 3) = 9", () => computeObjective(1, 3), 9);
check("objectifs des sommets", () => evaluatePoints(CANDIDATE_VERTICES).map(row => row.objective), [0, 6, 10, 9, 6]);
check("optimum = (2, 2) de valeur 10",
  () => findBestPoint(CANDIDATE_VERTICES), { x: 2, y: 2, isFeasible: true, objective: 10 });
check("le meilleur point de test réalisable est (1.5, 2.5) = 9.5",
  () => findBestPoint(TEST_POINTS)?.objective, 9.5);
check("aucun point réalisable → null", () => findBestPoint([[5, 5], [-1, -1]]), null);
printSummary();

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (isFeasible) — relie les 5 comparaisons par && dans un seul return.
//
// Indice 3 (evaluatePoints) — points.map(([x, y]) => ({ ... })) : la
//   déstructuration [x, y] récupère les coordonnées, et les parenthèses
//   autour de { ... } renvoient un objet.
//
// Indice 4 (findBestPoint) — enchaîne les étapes : evaluatePoints →
//   filter(isFeasible) → si le tableau est vide, return null → reduce
//   pour garder la ligne de plus grand objective.
