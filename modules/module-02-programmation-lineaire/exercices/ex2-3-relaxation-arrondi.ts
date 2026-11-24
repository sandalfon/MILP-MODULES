/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 2 — Exercice 2.3 : Relaxation et piège de l'arrondi
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-02-programmation-lineaire/module-02-programmation-lineaire.md (§6 et §7)
 *  Niveau : ★★☆   Durée indicative : 40 min
 *  Lancer : node modules/module-02-programmation-lineaire/exercices/ex2-3-relaxation-arrondi.ts
 *
 *  OBJECTIF
 *  Comparer l'optimum d'un problème entier à celui de sa relaxation
 *  linéaire, et constater qu'arrondir la solution continue ne suffit pas :
 *  - résoudre la relaxation continue, dont la valeur est une borne
 *    supérieure de l'optimum entier (TODO 1) ;
 *  - énumérer les points entiers réalisables (TODO 2) ;
 *  - en déduire l'optimum entier (TODO 3) ;
 *  - arrondir la solution continue de deux façons, au plus proche et vers
 *    le bas, et comparer le résultat à l'optimum entier (TODO 4 et 5).
 *
 *  PRÉREQUIS
 *  - Exercice 2.2 (le calcul des sommets est fourni ci-dessous).
 *  - Cours : relaxation linéaire, borne supérieure en maximisation.
 *  - TypeScript : boucles imbriquées, Math.round, Math.floor ; type « T | null ».
 *
 *  CONSIGNE
 *  Problème entier : MAX 5x + 4y  s.c.  6x + 4y ≤ 24,  x + 2y ≤ 6,
 *                    x, y ≥ 0 et ENTIERS.
 *    1. findRelaxationOptimum() : meilleur sommet de la version continue.
 *    2. listFeasibleIntegerPoints() : tous les { x, y } entiers de
 *       [0..MAX_X] × [0..MAX_Y] qui respectent les contraintes.
 *    3. findIntegerOptimum() : meilleur de ces points.
 *    4. roundToNearest(point) et roundDown(point) : arrondis de chaque coordonnée.
 *  Lis ensuite la sortie et réponds aux QUESTIONS.
 *
 *  RÉSULTAT ATTENDU
 *  Relaxation (3, 1.5) = 21 ; entier (4, 0) = 20 ; (3, 2) irréalisable ;
 *  (3, 1) = 19 réalisable mais sous-optimal.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// Coefficients de x et de y dans une expression linéaire.
type Coefs = { x: number; y: number };
// coefs.x·x + coefs.y·y ≤ rhs, repérée par son nom (toutes les contraintes sont des ≤).
type Constraint = { name: string; coefs: Coefs; rhs: number };
type Point = { x: number; y: number };
// Coefficients de l'objectif : MAX coefs.x·x + coefs.y·y.
type Objective = Coefs;
// Un point accompagné de la valeur de l'objectif.
type ValuedPoint = { x: number; y: number; value: number };

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
const CONSTRAINTS: Constraint[] = [
  { name: "ressource_1", coefs: { x: 6, y: 4 }, rhs: 24 },  // 6x + 4y ≤ 24
  { name: "ressource_2", coefs: { x: 1, y: 2 }, rhs: 6 },   // x + 2y ≤ 6
  { name: "x_min", coefs: { x: -1, y: 0 }, rhs: 0 },        // x ≥ 0
  { name: "y_min", coefs: { x: 0, y: -1 }, rhs: 0 }         // y ≥ 0
];
const OBJECTIVE: Objective = { x: 5, y: 4 };      // MAX 5x + 4y
// Bornes déduites des contraintes : 6x ≤ 24 ⇒ x ≤ 4 ; 2y ≤ 6 ⇒ y ≤ 3.
const MAX_X: number = 4;
const MAX_Y: number = 3;
const TOLERANCE = 1e-9;

// ─── 2. OUTILS FOURNIS (solution de l'exercice 2.2) ─────────────
// Arrondit à 1e-9 et transforme −0 en 0.
const roundValue = (value: number): number => Math.round(value * 1e9) / 1e9 + 0;
// Comparateur pour trier des points par x puis par y.
const byXThenY = (point: Point, other: Point): number => point.x - other.x || point.y - other.y;
const computeLinearValue = (coefs: Coefs, point: Point): number => coefs.x * point.x + coefs.y * point.y;
const computeObjectiveValue = (point: Point): number => computeLinearValue(OBJECTIVE, point);
const isFeasible = (point: Point): boolean =>
  CONSTRAINTS.every(constraint => computeLinearValue(constraint.coefs, point) <= constraint.rhs + TOLERANCE);

// Intersection des deux droites (règle de Cramer), ou null si elles sont parallèles.
function computeIntersection(constraint1: Constraint, constraint2: Constraint): Point | null {
  const { coefs: { x: a1, y: b1 }, rhs: c1 } = constraint1;
  const { coefs: { x: a2, y: b2 }, rhs: c2 } = constraint2;
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < TOLERANCE) return null;
  return {
    x: roundValue((c1 * b2 - c2 * b1) / det),
    y: roundValue((a1 * c2 - a2 * c1) / det)
  };
}

// Sommets de la région CONTINUE.
function computeVertices(): Point[] {
  const pointsByKey = new Map<string, Point>();
  for (let i = 0; i < CONSTRAINTS.length; i++) {
    for (let j = i + 1; j < CONSTRAINTS.length; j++) {
      const point = computeIntersection(CONSTRAINTS[i], CONSTRAINTS[j]);
      if (point !== null && isFeasible(point)) pointsByKey.set(`${point.x};${point.y}`, point);
    }
  }
  return [...pointsByKey.values()].sort(byXThenY);
}

// Garde le point de plus grand objectif et renvoie { x, y, value } (null si vide).
function findBest(points: Point[]): ValuedPoint | null {
  if (points.length === 0) return null;
  const bestPoint = points.reduce((currentBest, point) =>
    (computeObjectiveValue(point) > computeObjectiveValue(currentBest) ? point : currentBest));
  return { x: bestPoint.x, y: bestPoint.y, value: computeObjectiveValue(bestPoint) };
}

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Optimum de la relaxation linéaire.
// Objectif : résoudre la relaxation (x, y CONTINUS) en gardant le meilleur sommet
//            de la région continue ; sa valeur est une BORNE SUPÉRIEURE de l'optimum entier.
// Entrée   : aucune (le LP est donné par CONSTRAINTS et OBJECTIVE).
// Sortie   : un ValuedPoint { x, y, value }, ou null si la région n'a aucun sommet.
// Exemple  : findRelaxationOptimum() → { x: 3, y: 1.5, value: 21 }.
// (Indice 1 en fin de fichier.)
function findRelaxationOptimum(): ValuedPoint | null {
  return undefined; // ← à remplacer
}

// TODO 2 — Points entiers réalisables.
// Objectif : énumérer la grille des points à coordonnées ENTIÈRES de
//            [0..MAX_X] × [0..MAX_Y] et garder ceux qui respectent les contraintes.
// Entrée   : aucune (grille bornée par MAX_X = 4 et MAX_Y = 3).
// Sortie   : un tableau de Point { x, y } entiers et réalisables.
// Exemple  : listFeasibleIntegerPoints().length → 13 ; le tableau contient { x: 4, y: 0 }.
// Attention: les bornes MAX_X et MAX_Y sont INCLUSES : (4, 0) doit être testé.
// (Indice 2 en fin de fichier.)
function listFeasibleIntegerPoints(): Point[] {
  const points: Point[] = [];
  // ... à compléter
  return points;
}

// TODO 3 — Optimum du problème entier.
// Objectif : trouver le meilleur point entier réalisable, pour le comparer à la relaxation.
// Entrée   : aucune.
// Sortie   : un ValuedPoint { x, y, value }, ou null s'il n'y a aucun point entier réalisable.
// Exemple  : findIntegerOptimum() → { x: 4, y: 0, value: 20 } (≤ 21, la borne de la relaxation).
// (Indice 3 en fin de fichier.)
function findIntegerOptimum(): ValuedPoint | null {
  return undefined; // ← à remplacer
}

// TODO 4 — Arrondi au plus proche.
// Objectif : reproduire l'idée naïve « on arrondit la solution continue » en arrondissant
//            chaque coordonnée à l'entier le plus proche.
// Entrée   : point, un Point à coordonnées réelles, ex. { x: 3, y: 1.5 }.
// Sortie   : un nouveau Point { x, y } à coordonnées entières.
// Exemple  : roundToNearest({ x: 3, y: 1.5 }) → { x: 3, y: 2 } (irréalisable : 6·3 + 4·2 = 26 > 24).
// (Indice 4 en fin de fichier.)
function roundToNearest(point: Point): Point {
  return undefined; // ← à remplacer
}

// TODO 5 — Arrondi vers le bas.
// Objectif : autre arrondi naïf : chaque coordonnée est ramenée à l'entier inférieur.
// Entrée   : point, un Point à coordonnées réelles, ex. { x: 3, y: 1.5 }.
// Sortie   : un nouveau Point { x, y } à coordonnées entières.
// Exemple  : roundDown({ x: 3, y: 1.5 }) → { x: 3, y: 1 } (réalisable, valeur 19, mais sous-optimal).
// (Indice 5 en fin de fichier.)
function roundDown(point: Point): Point {
  return undefined; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
const relaxedSolution = findRelaxationOptimum();
const integerSolution = findIntegerOptimum();

printTitle("Relaxation linéaire");
console.table(computeVertices().map(vertex => ({ ...vertex, objective: computeObjectiveValue(vertex) })));
console.log("Optimum de la relaxation (borne supérieure) :", relaxedSolution);

printTitle("Problème entier");
console.log(`Points entiers réalisables : ${listFeasibleIntegerPoints().length}`);
console.log("Optimum entier :", integerSolution);

printTitle("Tentatives d'arrondi");
// Les tests « if » évitent un plantage tant que les fonctions ne sont pas complétées.
if (relaxedSolution) {
  const roundings = [
    ["au plus proche", roundToNearest(relaxedSolution)],
    ["vers le bas", roundDown(relaxedSolution)]
  ] as const;
  for (const [roundingName, roundedPoint] of roundings) {
    if (roundedPoint) {
      console.log(`Arrondi ${roundingName} : (${roundedPoint.x}, ${roundedPoint.y}) → réalisable = ${isFeasible(roundedPoint)}, objectif = ${computeObjectiveValue(roundedPoint)}`);
    }
  }
  if (integerSolution) console.log(`Écart borne − optimum entier : ${relaxedSolution.value - integerSolution.value}`);
}

// QUESTIONS :
//  a) Pourquoi l'optimum de la relaxation est-il forcément ≥ l'optimum entier ?
//  b) L'optimum entier est-il le point entier le plus PROCHE de l'optimum continu ?
//  c) Pourquoi cette méthode (grille + arrondi) est-elle inutilisable sur
//     un vrai problème à 1 000 variables ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
printTitle("Auto-vérification");
check("optimum de la relaxation = (3, 1.5) = 21", () => findRelaxationOptimum(), { x: 3, y: 1.5, value: 21 });
check("13 points entiers réalisables", () => listFeasibleIntegerPoints().length, 13);
check("(4, 0) fait partie des points entiers",
  () => listFeasibleIntegerPoints().some(point => point.x === 4 && point.y === 0), true);
check("optimum entier = (4, 0) = 20", () => findIntegerOptimum(), { x: 4, y: 0, value: 20 });
check("arrondi au plus proche = (3, 2)", () => roundToNearest({ x: 3, y: 1.5 }), { x: 3, y: 2 });
check("(3, 2) est irréalisable", () => isFeasible(roundToNearest({ x: 3, y: 1.5 })), false);
check("arrondi vers le bas = (3, 1)", () => roundDown({ x: 3, y: 1.5 }), { x: 3, y: 1 });
check("borne ≥ optimum entier", () => {
  const bound = findRelaxationOptimum();
  const integerOptimum = findIntegerOptimum();
  if (!bound || !integerOptimum) throw new Error("optimum introuvable : complète d'abord findRelaxationOptimum et findIntegerOptimum");
  return bound.value >= integerOptimum.value;
}, true);
printSummary();

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (findRelaxationOptimum) — une seule ligne suffit, avec les outils
//   fournis findBest() et computeVertices().
//
// Indice 2 (listFeasibleIntegerPoints) — deux boucles imbriquées : x de 0 à MAX_X
//   INCLUS (<=), y de 0 à MAX_Y INCLUS ; garde { x, y } si isFeasible({ x, y }).
//
// Indice 3 (findIntegerOptimum) — même idée que l'indice 1, mais findBest() est
//   appliqué aux points entiers réalisables.
//
// Indice 4 (roundToNearest) — Math.round sur chaque coordonnée.
//
// Indice 5 (roundDown) — Math.floor sur chaque coordonnée.
