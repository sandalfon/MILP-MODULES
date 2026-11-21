/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 2 — Exercice 2.2 : Calculer les sommets — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-02-programmation-lineaire/module-02-programmation-lineaire.md (§4)
 *  Lancer : node modules/module-02-programmation-lineaire/corriges/ex2-2-calcul-sommets.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Au lieu d'écrire les sommets à la main (exercice 2.1), on les CALCULE
 *  à partir des contraintes, décrites comme des DONNÉES :
 *      { name, coefs: { x: a, y: b }, rhs: c }  signifie  a·x + b·y ≤ c
 *  Les bornes x ≥ 0 et y ≥ 0 deviennent −x ≤ 0 et −y ≤ 0 : une seule
 *  forme (≤) suffit pour tout le code.
 *
 *  1. computeIntersection(constraint1, constraint2) — règle de Cramer
 *     det = a1·b2 − a2·b1. Si det ≈ 0, les droites sont parallèles
 *     (ex. x ≤ 2 et x ≥ 0) : pas de point unique, on renvoie null.
 *     On compare |det| à une TOLÉRANCE plutôt qu'à 0 exactement, par
 *     prudence avec les nombres flottants.
 *
 *  2. isFeasible(point, constraints)
 *     a·x + b·y ≤ c + TOLERANCE pour chaque contrainte. La tolérance est
 *     indispensable : un sommet calculé peut donner 4.000000000001 au
 *     lieu de 4 et serait rejeté à tort. Les vrais solveurs utilisent
 *     aussi des tolérances de faisabilité (souvent autour de 1e-6).
 *
 *  3. computeVertices(constraints)
 *     Avec m contraintes, il y a m(m−1)/2 paires (ici 5 → 10 paires).
 *     Certaines intersections sont parallèles (null), d'autres sont
 *     hors de la région (ex. x = 2 et y = 3 donne (2, 3), qui viole
 *     x + y ≤ 4). On garde les autres. Plusieurs paires peuvent donner
 *     le MÊME point (sommet « dégénéré » où 3 droites se croisent), d'où
 *     le dédoublonnage par une clé texte arrondie.
 *
 *  4. findOptimum : on évalue l'objectif sur les sommets et on garde le max
 *     (théorème du cours : si un optimum existe, un sommet l'atteint).
 *     Attention : cette méthode suppose la région BORNÉE. Sur une
 *     région non bornée, l'objectif pourrait croître sans fin hors des
 *     sommets. Elle est aussi exponentielle en général : c'est un outil
 *     pédagogique, pas un solveur.
 *
 *  Réponses aux questions
 *  a) Avec x ≤ 1.5, l'ancien optimum (2, 2) devient irréalisable. Le
 *     sommet (2, 2) disparaît et un nouveau sommet (1.5, 2.5) apparaît,
 *     à l'intersection de x = 1.5 et x + y = 4. L'optimum « glisse » le
 *     long de la droite x + y = 4 : 3·1.5 + 2·2.5 = 9.5.
 *  b) Les contraintes saturées à l'optimum restent x + y ≤ 4 et la borne
 *     sur x. Resserrer la borne de x de 0.5 a coûté 0.5 point d'objectif :
 *     chaque unité de x échangée contre une unité de y fait perdre
 *     3 − 2 = 1. C'est l'intuition du « prix dual » d'une contrainte.
 *  c) Avec x ≤ 1, l'optimum serait (1, 3) = 9 : y ≤ 3 devient saturée.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// Coefficients de x et de y dans une expression linéaire.
type Coefs = { x: number; y: number };
// coefs.x·x + coefs.y·y ≤ rhs, repérée par son nom (toutes les contraintes sont des ≤).
type Constraint = { name: string; coefs: Coefs; rhs: number };
type Point = { x: number; y: number };
// Coefficients de l'objectif : MAX coefs.x·x + coefs.y·y.
type Objective = Coefs;
type Optimum = { x: number; y: number; value: number; bindingConstraints: string[] };

// ─── 1. DONNÉES ─────────────────────────────────────────────────
// Chaque contrainte : a·x + b·y ≤ c, écrite { coefs: { x: a, y: b }, rhs: c }.
const CONSTRAINTS: Constraint[] = [
  { name: "capacite", coefs: { x: 1, y: 1 }, rhs: 4 },   // x + y ≤ 4
  { name: "x_max", coefs: { x: 1, y: 0 }, rhs: 2 },      // x ≤ 2
  { name: "y_max", coefs: { x: 0, y: 1 }, rhs: 3 },      // y ≤ 3
  { name: "x_min", coefs: { x: -1, y: 0 }, rhs: 0 },     // x ≥ 0  ⇔  −x ≤ 0
  { name: "y_min", coefs: { x: 0, y: -1 }, rhs: 0 }      // y ≥ 0  ⇔  −y ≤ 0
];
const OBJECTIVE: Objective = { x: 3, y: 2 };     // MAX 3x + 2y
const TOLERANCE = 1e-9;

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────
// Arrondit à 1e-9 et transforme −0 en 0 (affichage et comparaison propres).
const roundValue = (value: number): number => Math.round(value * 1e9) / 1e9 + 0;
// Comparateur pour trier des points par x puis par y.
const byXThenY = (point: Point, other: Point): number => point.x - other.x || point.y - other.y;
// Valeur d'une expression linéaire coefs.x·x + coefs.y·y au point donné.
const computeLinearValue = (coefs: Coefs, point: Point): number => coefs.x * point.x + coefs.y * point.y;
const computeObjectiveValue = (point: Point, objective: Objective): number => computeLinearValue(objective, point);
// Copie des contraintes où la contrainte `name` reçoit un nouveau second membre.
const replaceRhs = (constraints: Constraint[], name: string, rhs: number): Constraint[] =>
  constraints.map(constraint => (constraint.name === name ? { ...constraint, rhs } : constraint));

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Intersection des droites a1·x + b1·y = c1 et a2·x + b2·y = c2.
function computeIntersection(constraint1: Constraint, constraint2: Constraint): Point | null {
  // On nomme les données comme dans la règle de Cramer du cours.
  const { coefs: { x: a1, y: b1 }, rhs: c1 } = constraint1;
  const { coefs: { x: a2, y: b2 }, rhs: c2 } = constraint2;
  const det = a1 * b2 - a2 * b1;
  if (Math.abs(det) < TOLERANCE) return null; // droites parallèles ou confondues
  return {
    x: roundValue((c1 * b2 - c2 * b1) / det),
    y: roundValue((a1 * c2 - a2 * c1) / det)
  };
}

// Le point respecte-t-il toutes les contraintes (à TOLERANCE près) ?
function isFeasible(point: Point, constraints: Constraint[]): boolean {
  return constraints.every(constraint => computeLinearValue(constraint.coefs, point) <= constraint.rhs + TOLERANCE);
}

// Noms des contraintes vérifiées avec égalité au point donné.
function findBindingConstraints(point: Point, constraints: Constraint[]): string[] {
  return constraints
    .filter(constraint => Math.abs(computeLinearValue(constraint.coefs, point) - constraint.rhs) <= TOLERANCE)
    .map(constraint => constraint.name);
}

// Tous les sommets : intersections réalisables, sans doublon, triés.
function computeVertices(constraints: Constraint[]): Point[] {
  const pointsByKey = new Map<string, Point>();
  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {   // j > i : chaque paire une seule fois
      const point = computeIntersection(constraints[i], constraints[j]);
      if (point === null || !isFeasible(point, constraints)) continue;
      pointsByKey.set(`${point.x};${point.y}`, point);           // même clé = même point
    }
  }
  return [...pointsByKey.values()].sort(byXThenY);
}

// Meilleur sommet pour l'objectif, avec sa valeur et ses contraintes saturées.
function findOptimum(constraints: Constraint[], objective: Objective): Optimum | null {
  const candidates = computeVertices(constraints);
  if (candidates.length === 0) return null;      // région vide : LP infaisable
  const best = candidates.reduce((bestVertex, vertex) =>
    computeObjectiveValue(vertex, objective) > computeObjectiveValue(bestVertex, objective) ? vertex : bestVertex);
  return {
    x: best.x,
    y: best.y,
    value: computeObjectiveValue(best, objective),
    bindingConstraints: findBindingConstraints(best, constraints)
  };
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Problème initial : x ≤ 2");
console.table(computeVertices(CONSTRAINTS).map(vertex => ({ ...vertex, objective: computeObjectiveValue(vertex, OBJECTIVE) })));
console.log("Optimum :", findOptimum(CONSTRAINTS, OBJECTIVE));

printTitle("Variante : x ≤ 1.5");
const variantConstraints = replaceRhs(CONSTRAINTS, "x_max", 1.5);
console.table(computeVertices(variantConstraints).map(vertex => ({ ...vertex, objective: computeObjectiveValue(vertex, OBJECTIVE) })));
console.log("Optimum :", findOptimum(variantConstraints, OBJECTIVE));

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("intersection capacite ∩ x_max = (2, 2)",
  () => computeIntersection(CONSTRAINTS[0], CONSTRAINTS[1]), { x: 2, y: 2 });
check("x_max et x_min parallèles → null",
  () => computeIntersection(CONSTRAINTS[1], CONSTRAINTS[3]), null);
check("(2, 3) n'est pas réalisable", () => isFeasible({ x: 2, y: 3 }, CONSTRAINTS), false);
check("contraintes saturées en (2, 2)",
  () => findBindingConstraints({ x: 2, y: 2 }, CONSTRAINTS), ["capacite", "x_max"]);
check("5 sommets du problème initial", () => computeVertices(CONSTRAINTS),
  [{ x: 0, y: 0 }, { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 0 }, { x: 2, y: 2 }]);
check("optimum initial (2, 2) = 10", () => findOptimum(CONSTRAINTS, OBJECTIVE),
  { x: 2, y: 2, value: 10, bindingConstraints: ["capacite", "x_max"] });
check("sommets avec x ≤ 1.5", () => computeVertices(replaceRhs(CONSTRAINTS, "x_max", 1.5)),
  [{ x: 0, y: 0 }, { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 1.5, y: 0 }, { x: 1.5, y: 2.5 }]);
check("optimum avec x ≤ 1.5 : (1.5, 2.5) = 9.5",
  () => findOptimum(replaceRhs(CONSTRAINTS, "x_max", 1.5), OBJECTIVE),
  { x: 1.5, y: 2.5, value: 9.5, bindingConstraints: ["capacite", "x_max"] });
check("région vide (x ≤ −1 et x ≥ 0) → null",
  () => findOptimum(replaceRhs(CONSTRAINTS, "x_max", -1), OBJECTIVE), null);
printSummary();
