/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 2 — Exercice 2.2 : Calculer les sommets
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-02-programmation-lineaire/module-02-programmation-lineaire.md (§4)
 *  Niveau : ★★☆   Durée indicative : 50 min
 *  Lancer : node modules/module-02-programmation-lineaire/exercices/ex2-2-calcul-sommets.ts
 *
 *  OBJECTIF
 *  Calculer automatiquement les sommets d'un LP à deux variables à
 *  partir de ses contraintes, puis observer le déplacement de l'optimum
 *  quand on modifie une contrainte, en cinq étapes :
 *  - calculer le point où se coupent deux droites frontières (TODO 1) ;
 *  - tester si un point respecte toutes les contraintes (TODO 2) ;
 *  - lister les contraintes saturées en un point (TODO 3) ;
 *  - en déduire les sommets de la région réalisable (TODO 4) ;
 *  - choisir le meilleur sommet pour l'objectif, puis comparer avec la
 *    variante x ≤ 1.5 (TODO 5 et QUESTIONS).
 *
 *  PRÉREQUIS
 *  - Exercice 2.1.
 *  - Maths : intersection de deux droites (règle de Cramer, voir cours).
 *  - TypeScript : boucles imbriquées, Map<K, V>, every, filter, spread {...}.
 *
 *  CONSIGNE
 *  Chaque contrainte a·x + b·y ≤ c est une donnée
 *  { name, coefs: { x: a, y: b }, rhs: c }.
 *    1. computeIntersection(constraint1, constraint2) : point { x, y } où les deux
 *       droites (en égalité) se coupent, ou null si det ≈ 0 (parallèles).
 *       Arrondis x et y avec l'outil roundValue().
 *    2. isFeasible(point, constraints) : a·x + b·y ≤ c + TOLERANCE pour toutes les contraintes.
 *    3. findBindingConstraints(point, constraints) : noms des contraintes où |a·x + b·y − c| ≤ TOLERANCE.
 *    4. computeVertices(constraints) : intersections de toutes les paires (i < j),
 *       réalisables, sans doublon, triées avec byXThenY.
 *    5. findOptimum(constraints, objective) : { x, y, value, bindingConstraints } du
 *       meilleur sommet, ou null s'il n'y a aucun sommet.
 *  Puis lis la variante x ≤ 1.5 et réponds aux QUESTIONS.
 *
 *  RÉSULTAT ATTENDU
 *  Initial : 5 sommets, optimum (2, 2) = 10.
 *  Variante x ≤ 1.5 : optimum (1.5, 2.5) = 9.5.
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

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Intersection de deux droites frontières.
// Objectif : trouver le point où les droites a1·x + b1·y = c1 et a2·x + b2·y = c2
//            se coupent, par la règle de Cramer (cours §4) : c'est un sommet candidat.
// Entrée   : constraint1, une contrainte { name, coefs: { x: a, y: b }, rhs: c },
//              ex. CONSTRAINTS[0] (x + y ≤ 4) ;
//            constraint2, une contrainte de même forme, ex. CONSTRAINTS[1] (x ≤ 2).
// Sortie   : un Point { x, y } aux coordonnées arrondies avec roundValue,
//            ou null si les droites sont parallèles (|det| < TOLERANCE).
// Exemple  : computeIntersection(CONSTRAINTS[0], CONSTRAINTS[1]) → { x: 2, y: 2 } ;
//            computeIntersection(CONSTRAINTS[1], CONSTRAINTS[3]) → null (x = 2 et −x = 0 sont parallèles).
// Attention: compare |det| à TOLERANCE, pas à 0 exactement (nombres flottants).
// (Indice 1 en fin de fichier.)
function computeIntersection(constraint1: Constraint, constraint2: Constraint): Point | null {
  const { coefs: { x: a1, y: b1 }, rhs: c1 } = constraint1
  const { coefs: { x: a2, y: b2 }, rhs: c2 } = constraint2
  const det = a1 * b2 - a2 * b1
  if (Math.abs(det) < TOLERANCE) return null

  return  { x: roundValue((c1*b2 - c2*b1) / det), y: roundValue((a1*c2 - a2*c1) / det) }; // ← à remplacer
}

// TODO 2 — Le point respecte-t-il toutes les contraintes ?
// Objectif : tester la réalisabilité d'un point : pour chaque contrainte,
//            a·x + b·y ≤ c, avec une tolérance TOLERANCE pour absorber les erreurs d'arrondi.
// Entrée   : point, un Point, ex. { x: 2, y: 3 } ;
//            constraints, ex. CONSTRAINTS.
// Sortie   : un booléen, true si a·x + b·y ≤ rhs + TOLERANCE pour TOUTES les contraintes.
// Exemple  : isFeasible({ x: 2, y: 3 }, CONSTRAINTS) → false (x + y = 5 > 4) ;
//            isFeasible({ x: 2, y: 2 }, CONSTRAINTS) → true.
// (Indice 2 en fin de fichier.)
function isFeasible(point: Point, constraints: Constraint[]): boolean {
  return constraints.every(contraint => contraint.coefs.x*point.x + contraint.coefs.y*point.y <=contraint.rhs +TOLERANCE  ); // ← à remplacer
}

// TODO 3 — Contraintes saturées en un point.
// Objectif : lister les contraintes vérifiées avec égalité au point donné,
//            c'est-à-dire |a·x + b·y − c| ≤ TOLERANCE (cours §4, « Contrainte saturée »).
// Entrée   : point, un Point, ex. { x: 2, y: 2 } ;
//            constraints, ex. CONSTRAINTS.
// Sortie   : un tableau des noms (name) des contraintes saturées, dans l'ordre de constraints.
// Exemple  : findBindingConstraints({ x: 2, y: 2 }, CONSTRAINTS) → ["capacite", "x_max"].
// (Indice 3 en fin de fichier.)
function findBindingConstraints(point: Point, constraints: Constraint[]): string[] {
  return constraints.filter(contraint => Math.abs(contraint.coefs.x*point.x + contraint.coefs.y*point.y -contraint.rhs) <=TOLERANCE).map(contraint => contraint.name); // ← à remplacer
}

// TODO 4 — Sommets de la région réalisable.
// Objectif : obtenir les sommets du polygone réalisable :
//            - calculer l'intersection de chaque paire de contraintes (i < j) ;
//            - écarter les paires de droites parallèles (pas d'intersection)
//              et les points hors de la région réalisable ;
//            - ne garder qu'un exemplaire de chaque point ;
//            - trier les points avec byXThenY.
// Entrée   : constraints, un tableau de contraintes, ex. CONSTRAINTS (5 contraintes → 10 paires).
// Sortie   : un tableau de Point, sans doublon, trié avec byXThenY.
// Exemple  : computeVertices(CONSTRAINTS)
//            → [{ x: 0, y: 0 }, { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 0 }, { x: 2, y: 2 }].
// Attention: deux paires de droites peuvent donner le MÊME point (sommet dégénéré) ;
//            une intersection peut être null (droites parallèles) ou hors de la région.
// (Indice 4 en fin de fichier.)
function computeVertices(constraints: Constraint[]): Point[] {
  const intersections = constraints
      .flatMap((constraint1, i) =>
        constraints.slice(i + 1).map(constraint2 => computeIntersection(constraint1, constraint2))
      )
      .filter((point): point is Point => point !== null && isFeasible(point, constraints))
      .reduce(
        (acc, point) => acc.set(`${point.x};${point.y}`, point),
        new Map<string, Point>()
      )

    return Array.from(intersections.values()).sort(byXThenY)
}

// TODO 5 — Meilleur sommet pour l'objectif.
// Objectif : appliquer le théorème du cours (un optimum, s'il existe, est atteint
//            en un sommet) :
//            - calculer les sommets de la région réalisable ;
//            - évaluer l'objectif sur chaque sommet et garder le meilleur ;
//            - renvoyer ses coordonnées, la valeur de l'objectif et les noms
//              des contraintes saturées en ce sommet.
// Entrée   : constraints, ex. CONSTRAINTS ;
//            objective, les coefficients { x, y }, ex. OBJECTIVE.
// Sortie   : un Optimum { x, y, value, bindingConstraints }, où :
//            value = valeur de l'objectif ;
//            bindingConstraints = noms des contraintes saturées ;
//            ou null s'il n'y a aucun sommet.
// Exemple  : findOptimum(CONSTRAINTS, OBJECTIVE)
//            → { x: 2, y: 2, value: 10, bindingConstraints: ["capacite", "x_max"] }.
// Attention: région vide (ex. x ≤ −1 et x ≥ 0) → aucun sommet → null.
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
  }; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
printTitle("Problème initial : x ≤ 2");
console.table(computeVertices(CONSTRAINTS).map(vertex => ({ ...vertex, objective: computeObjectiveValue(vertex, OBJECTIVE) })));
console.log("Optimum :", findOptimum(CONSTRAINTS, OBJECTIVE));

printTitle("Variante : x ≤ 1.5");
const variantConstraints = replaceRhs(CONSTRAINTS, "x_max", 1.5);
console.table(computeVertices(variantConstraints).map(vertex => ({ ...vertex, objective: computeObjectiveValue(vertex, OBJECTIVE) })));
console.log("Optimum :", findOptimum(variantConstraints, OBJECTIVE));

// QUESTIONS :
//  a) Pourquoi l'optimum se déplace-t-il avec x ≤ 1.5 ? Sur quelle droite glisse-t-il ?
//  b) Resserrer x de 0.5 fait perdre combien d'objectif ? Explique ce chiffre
//     à partir des coefficients 3 et 2 de l'objectif.
//  c) Sans exécuter : quel serait l'optimum avec x ≤ 1 ? Vérifie ensuite.

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (computeIntersection) — nomme les données comme dans la règle de Cramer :
//     const { coefs: { x: a1, y: b1 }, rhs: c1 } = constraint1;   (idem pour constraint2)
//     det = a1·b2 − a2·b1   ; si |det| < TOLERANCE → return null
//     x = (c1·b2 − c2·b1) / det
//     y = (a1·c2 − a2·c1) / det
//   puis renvoie { x: roundValue(x), y: roundValue(y) }.
//
// Indice 2 (isFeasible) — constraints.every(constraint => …) avec
//   computeLinearValue(constraint.coefs, point) ≤ constraint.rhs + TOLERANCE.
//
// Indice 3 (findBindingConstraints) — filter (avec Math.abs(computeLinearValue(…) − constraint.rhs)),
//   puis map(constraint => constraint.name).
//
// Indice 4 (computeVertices) — structure suggérée :
//     const pointsByKey = new Map<string, Point>();
//     pour i de 0 à constraints.length−1, pour j de i+1 à constraints.length−1 :
//       point = computeIntersection(constraints[i], constraints[j])
//       si point est null ou non réalisable → continue
//       pointsByKey.set(`${point.x};${point.y}`, point)      // la clé élimine les doublons
//     return [...pointsByKey.values()].sort(byXThenY);
