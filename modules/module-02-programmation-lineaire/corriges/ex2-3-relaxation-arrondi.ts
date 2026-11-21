/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 2 — Exercice 2.3 : Relaxation et piège de l'arrondi — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-02-programmation-lineaire/module-02-programmation-lineaire.md (§6 et §7)
 *  Lancer : node modules/module-02-programmation-lineaire/corriges/ex2-3-relaxation-arrondi.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Problème entier :
 *      MAX 5x + 4y   s.c.  6x + 4y ≤ 24,   x + 2y ≤ 6,   x, y ≥ 0 ENTIERS
 *  Sa relaxation linéaire est le même problème avec x, y CONTINUS.
 *
 *  1. Relaxation : on réutilise computeVertices() de l'exercice 2.2. Les
 *     sommets sont (0,0), (0,3), (3,1.5), (4,0) et le meilleur est
 *     (3, 1.5) = 21. C'est une BORNE SUPÉRIEURE : aucune solution
 *     entière ne peut dépasser 21, car toute solution entière est aussi
 *     une solution de la relaxation.
 *
 *  2. Optimum entier : la région est bornée (6x ≤ 24 ⇒ x ≤ 4 ;
 *     2y ≤ 6 ⇒ y ≤ 3), donc on peut énumérer la grille 5 × 4 = 20 points
 *     et garder les 13 réalisables. Le meilleur est (4, 0) = 20.
 *
 *  3. Arrondi au plus proche : Math.round(1.5) = 2 → (3, 2).
 *     6·3 + 4·2 = 26 > 24 : IRRÉALISABLE. Arrondir peut faire sortir de
 *     la région. Indice qui ne trompe pas : son objectif (23) dépasse
 *     la borne 21, ce qui est impossible pour un point réalisable.
 *     Arrondi vers le bas : (3, 1) = 19, réalisable ici (cela ne l'est
 *     pas toujours, ex. avec des contraintes ≥), mais SOUS-OPTIMAL :
 *     (4, 0) = 20 est meilleur et n'est même pas « voisin » de (3, 1.5).
 *
 *  4. Écart borne − entier = 21 − 20 = 1. Le solveur ne connaît pas
 *     l'optimum entier à l'avance : il encadre la vérité entre la
 *     meilleure solution entière trouvée (20) et la borne (21). C'est
 *     exactement le « gap » du module 5.
 *
 *  Pièges fréquents
 *  - Énumérer la grille avec < au lieu de <= : on oublie x = 4, qui est
 *    justement l'optimum.
 *  - Croire que la relaxation donne une solution utilisable : y = 1.5
 *    n'a pas de sens si y compte des camions.
 *
 *  Réponses aux questions
 *  a) Parce que la région réalisable continue CONTIENT tous les points
 *     entiers réalisables : maximiser sur un ensemble plus grand donne
 *     une valeur au moins aussi bonne.
 *  b) Non : (4, 0) est à distance √(1 + 2.25) ≈ 1.8 de (3, 1.5), alors
 *     que (3, 1) et (3, 2) sont à 0.5. La proximité géométrique ne dit
 *     rien de l'optimalité entière.
 *  c) Avec des milliers de variables, on ne peut ni énumérer la grille
 *     ni se fier à l'arrondi : il faut le Branch and Bound (module 5).
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

// ─── 1. DONNÉES ─────────────────────────────────────────────────
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

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Optimum de la relaxation linéaire = meilleur sommet.
function findRelaxationOptimum(): ValuedPoint | null {
  return findBest(computeVertices());
}

// Tous les points ENTIERS réalisables de la grille [0..MAX_X] × [0..MAX_Y].
function listFeasibleIntegerPoints(): Point[] {
  const points: Point[] = [];
  for (let x = 0; x <= MAX_X; x++) {        // <= : la borne est incluse
    for (let y = 0; y <= MAX_Y; y++) {
      if (isFeasible({ x, y })) points.push({ x, y });
    }
  }
  return points;
}

// Optimum du problème entier, par énumération de la grille.
function findIntegerOptimum(): ValuedPoint | null {
  return findBest(listFeasibleIntegerPoints());
}

// Arrondi de chaque coordonnée à l'entier le plus proche.
function roundToNearest(point: Point): Point {
  return { x: Math.round(point.x), y: Math.round(point.y) };
}

// Arrondi de chaque coordonnée vers le bas.
function roundDown(point: Point): Point {
  return { x: Math.floor(point.x), y: Math.floor(point.y) };
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
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

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
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
