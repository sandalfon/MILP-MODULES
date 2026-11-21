/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 2 — Exercice 2.4 : Contraintes saturées et valeurs
 *                            marginales — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-02-programmation-lineaire/module-02-programmation-lineaire.md (§1 « Anatomie d'une contrainte », §4 « Contrainte saturée »)
 *  Lancer : node modules/module-02-programmation-lineaire/corriges/ex2-4-contraintes-saturees.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  1. L'écart (slack)
 *     Pour a·x + b·y ≤ c, écart = c − (a·x + b·y).
 *       écart > 0 : il reste de la marge ;
 *       écart = 0 : contrainte saturée (point sur la frontière) ;
 *       écart < 0 : contrainte violée.
 *     Les bornes x ≥ 0 et y ≥ 0 sont stockées sous la forme −x ≤ 0 :
 *     la même formule donne alors écart = 0 − (−x) = x. C'est bien la
 *     distance à la borne, sans traitement particulier.
 *     On compare à ±TOL, jamais à 0 exactement (flottants).
 *
 *  2. Le gain en desserrant
 *     On recopie les contraintes en remplaçant rhs par rhs + delta pour UNE
 *     seule contrainte, on recalcule l'optimum, et on soustrait l'ancienne
 *     valeur. Ne jamais modifier le tableau d'origine (on utilise map +
 *     spread via l'outil replaceRhs) : sinon les mesures suivantes
 *     partiraient d'un modèle déjà modifié.
 *
 *  3. Résultats à l'optimum (2, 2), valeur 10
 *       contrainte   écart   gain pour +1
 *       capacite       0         2
 *       x_max          0         1
 *       y_max          1         0
 *       x_min          2         0
 *       y_min          2         0
 *     Les contraintes saturées sont exactement celles qui rapportent
 *     quelque chose quand on les desserre. Pour chaque contrainte,
 *     écart × gain = 0 : c'est la règle des ÉCARTS COMPLÉMENTAIRES.
 *     Vérification par le calcul : les gains (2 et 1) sont tels que
 *     2·(1, 1) + 1·(1, 0) = (3, 2), le gradient de l'objectif 3x + 2y.
 *     L'objectif est une combinaison des contraintes saturées, ce qui
 *     est la signature d'un optimum.
 *
 *  4. Profil de la capacité : 4 → 5 → 6 → 7
 *     valeurs 10, 12, 12, 12 ; gains successifs [2, 0, 0].
 *     À c = 5, l'optimum est (2, 3) : y ≤ 3 devient à son tour saturée
 *     et bloque. TROIS contraintes y sont saturées en même temps
 *     (capacite, x_max, y_max) : c'est un sommet DÉGÉNÉRÉ, la charnière
 *     entre deux régimes. À partir de c = 6, la capacité retrouve de la
 *     marge et seules x_max et y_max restent saturées.
 *     La valeur marginale n'est donc valable que LOCALEMENT, tant que
 *     l'ensemble des contraintes saturées ne change pas.
 *
 *  5. Cas entier (sac à dos du module 1)
 *     budget  100 101 110 120 130 140
 *     valeur   25  25  27  30  30  35
 *     Les coûts étant des multiples de 10, un euro de plus (101) ne
 *     rapporte rien, mais 10 € de plus rapportent +2 d'un coup. Les gains
 *     se font par PALIERS : il n'y a pas de « valeur d'un euro »
 *     constante. C'est pourquoi les valeurs duales d'une MILP se lisent
 *     avec prudence.
 *
 *  Réponses aux questions
 *  a) Si tu peux augmenter une seule ressource d'une unité, prends la
 *     capacité : +2 contre +1 pour x_max et 0 pour les autres.
 *  b) y_max n'est pas saturée (écart 1) : la desserrer ne sert à rien.
 *     La resserrer jusqu'à y ≤ 2 ne coûte rien non plus. Seulement en
 *     dessous de 2 elle deviendrait saturée et ferait baisser l'optimum.
 *  c) Au-delà de c = 5, la capacité n'est plus saturée (en (2, 3),
 *     x + y = 5 < 6) : sa valeur marginale tombe à 0. Ce sont désormais
 *     x_max et y_max qui bloquent. En c = 5, trois contraintes sont
 *     saturées : c'est un sommet dégénéré (voir point 4).
 *  d) Les coûts sont des multiples de 10 : avec 101 €, aucune nouvelle
 *     combinaison ne devient possible. Avec 110 €, (B, C, D) le devient
 *     (valeur 27). Il n'y a donc pas de « valeur d'un euro » constante :
 *     en nombres entiers, les gains se font par paliers (point 5).
 *
 *  Pièges fréquents
 *  - Modifier la contrainte « en place » (constraint.rhs += 1) : les mesures
 *    suivantes partent alors d'un modèle faux.
 *  - Tester computeSlack(...) === 0 : un sommet calculé peut donner 1e-16.
 *  - Croire que la valeur marginale vaut pour n'importe quelle
 *    augmentation : elle n'est valable qu'au voisinage de l'optimum.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// Coefficients de x et de y dans une expression linéaire.
type Coefs = { x: number; y: number };
// coefs.x·x + coefs.y·y ≤ rhs, repérée par son nom (toutes les contraintes sont des ≤).
type Constraint = { name: string; coefs: Coefs; rhs: number };
type Point = { x: number; y: number };
// Coefficients de l'objectif : MAX coefs.x·x + coefs.y·y.
type Objective = Coefs;
type Optimum = { x: number; y: number; value: number };
type Product = { id: string; cost: number; value: number };
type Status = "violée" | "saturée" | "marge";
type SlackRow = { name: string; slack: number; status: Status };
// { nom de contrainte: gain pour +1 }.
type MarginalValues = Record<string, number>;

// ─── 1. DONNÉES ─────────────────────────────────────────────────
// Le LP des exercices 2.1 et 2.2 : MAX 3x + 2y, chaque contrainte a·x + b·y ≤ c.
const CONSTRAINTS: Constraint[] = [
  { name: "capacite", coefs: { x: 1, y: 1 }, rhs: 4 },   // x + y ≤ 4
  { name: "x_max", coefs: { x: 1, y: 0 }, rhs: 2 },      // x ≤ 2
  { name: "y_max", coefs: { x: 0, y: 1 }, rhs: 3 },      // y ≤ 3
  { name: "x_min", coefs: { x: -1, y: 0 }, rhs: 0 },     // x ≥ 0  ⇔  −x ≤ 0
  { name: "y_min", coefs: { x: 0, y: -1 }, rhs: 0 }      // y ≥ 0  ⇔  −y ≤ 0
];
const OBJECTIVE: Objective = { x: 3, y: 2 };
const TOLERANCE = 1e-9;

// Sac à dos du module 1, pour la partie entière.
const PRODUCTS: Product[] = [
  { id: "A", cost: 30, value: 8 },
  { id: "B", cost: 50, value: 12 },
  { id: "C", cost: 40, value: 10 },
  { id: "D", cost: 20, value: 5 }
];

// ─── 2. OUTILS FOURNIS (exercice 2.2 et module 1) ───────────────
// Arrondit à 1e-9 et transforme −0 en 0.
const roundValue = (value: number): number => Math.round(value * 1e9) / 1e9 + 0;
const computeLinearValue = (coefs: Coefs, point: Point): number => coefs.x * point.x + coefs.y * point.y;
const computeObjectiveValue = (point: Point, objective: Objective): number => computeLinearValue(objective, point);
// COPIE des contraintes où la contrainte `name` reçoit le second membre rhs.
const replaceRhs = (constraints: Constraint[], name: string, rhs: number): Constraint[] =>
  constraints.map(constraint => (constraint.name === name ? { ...constraint, rhs } : constraint));

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

const isFeasible = (point: Point, constraints: Constraint[]): boolean =>
  constraints.every(constraint => computeLinearValue(constraint.coefs, point) <= constraint.rhs + TOLERANCE);

function computeVertices(constraints: Constraint[]): Point[] {
  const pointsByKey = new Map<string, Point>();
  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const point = computeIntersection(constraints[i], constraints[j]);
      if (point !== null && isFeasible(point, constraints)) pointsByKey.set(`${point.x};${point.y}`, point);
    }
  }
  return [...pointsByKey.values()];
}

// Meilleur sommet : { x, y, value }, ou null si la région est vide.
function findOptimum(constraints: Constraint[], objective: Objective): Optimum | null {
  const candidates = computeVertices(constraints);
  if (candidates.length === 0) return null;
  const best = candidates.reduce((bestVertex, vertex) =>
    (computeObjectiveValue(vertex, objective) > computeObjectiveValue(bestVertex, objective) ? vertex : bestVertex));
  return { x: best.x, y: best.y, value: computeObjectiveValue(best, objective) };
}

// Comme findOptimum, mais pour un LP dont on SAIT que la région est non vide :
// une région vide serait une erreur de données, on la signale clairement.
function requireOptimum(constraints: Constraint[], objective: Objective): Optimum {
  const optimum = findOptimum(constraints, objective);
  if (optimum === null) throw new Error("Région réalisable vide : ce LP n'a pas d'optimum.");
  return optimum;
}

// Optimum du sac à dos par énumération (module 1).
function computeBestKnapsackValue(budget: number): number {
  let bestValue = 0;
  for (let mask = 0; mask < 2 ** PRODUCTS.length; mask++) {
    const selectedProducts = PRODUCTS.filter((_, i) => (mask & (1 << i)) !== 0);
    const cost = selectedProducts.reduce((sum, product) => sum + product.cost, 0);
    const value = selectedProducts.reduce((sum, product) => sum + product.value, 0);
    if (cost <= budget && value > bestValue) bestValue = value;
  }
  return bestValue;
}

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Écart de la contrainte au point : c − (a·x + b·y).
function computeSlack(constraint: Constraint, point: Point): number {
  return roundValue(constraint.rhs - computeLinearValue(constraint.coefs, point));
}

// Statut lisible d'une contrainte au point, à TOLERANCE près.
function computeStatus(constraint: Constraint, point: Point): Status {
  const slackValue = computeSlack(constraint, point);
  if (slackValue < -TOLERANCE) return "violée";
  if (slackValue <= TOLERANCE) return "saturée";
  return "marge";
}

// Tableau { name, slack, status } de toutes les contraintes au point donné.
function buildSlackTable(point: Point, constraints: Constraint[]): SlackRow[] {
  return constraints.map(constraint => ({ name: constraint.name, slack: computeSlack(constraint, point), status: computeStatus(constraint, point) }));
}

// Variation de la valeur optimale quand on ajoute delta au second membre de `name`.
function computeLooseningGain(constraints: Constraint[], objective: Objective, name: string, delta: number = 1): number {
  const constraint = constraints.find(candidate => candidate.name === name);
  if (constraint === undefined) throw new Error(`Contrainte inconnue : ${name}`);
  const valueBefore = requireOptimum(constraints, objective).value;
  const valueAfter = requireOptimum(replaceRhs(constraints, name, constraint.rhs + delta), objective).value;
  return roundValue(valueAfter - valueBefore);
}

// { nom: gain pour +1 } pour chaque contrainte.
function computeMarginalValues(constraints: Constraint[], objective: Objective): MarginalValues {
  return Object.fromEntries(constraints.map(constraint => [constraint.name, computeLooseningGain(constraints, objective, constraint.name, 1)]));
}

// Vrai si, pour chaque contrainte, l'écart OU la valeur marginale est nul.
function satisfiesComplementarySlackness(constraints: Constraint[], objective: Objective): boolean {
  const currentOptimum = requireOptimum(constraints, objective);
  const marginalValues = computeMarginalValues(constraints, objective);
  return constraints.every(constraint => Math.abs(computeSlack(constraint, currentOptimum) * marginalValues[constraint.name]) <= TOLERANCE);
}

// Gains successifs quand le second membre de `name` prend les valeurs `rhsValues`.
// Ex. rhsValues = [4, 5, 6, 7] → [v(5) − v(4), v(6) − v(5), v(7) − v(6)].
function computeGainProfile(constraints: Constraint[], objective: Objective, name: string, rhsValues: number[]): number[] {
  const optimalValues = rhsValues.map(rhsValue =>
    requireOptimum(replaceRhs(constraints, name, rhsValue), objective).value);
  return optimalValues.slice(1).map((value, i) => roundValue(value - optimalValues[i]));
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
// La région est non vide : requireOptimum renvoie bien un optimum.
const initialOptimum = requireOptimum(CONSTRAINTS, OBJECTIVE);
printTitle(`Écarts à l'optimum (${initialOptimum.x}, ${initialOptimum.y}), valeur ${initialOptimum.value}`);
// « ?? {} » : tant que computeMarginalValues n'est pas complétée, elle renvoie undefined.
const marginalValues = computeMarginalValues(CONSTRAINTS, OBJECTIVE) ?? {};
console.table(buildSlackTable(initialOptimum, CONSTRAINTS).map(row => ({
  ...row,
  gainForPlusOne: marginalValues[row.name]
})));
console.log("Écarts complémentaires respectés :", satisfiesComplementarySlackness(CONSTRAINTS, OBJECTIVE));

printTitle("Profil de la capacité : c = 4, 5, 6, 7");
const rhsValues: number[] = [4, 5, 6, 7];
console.table(rhsValues.map(rhsValue => {
  const modifiedConstraints = replaceRhs(CONSTRAINTS, "capacite", rhsValue);
  const modifiedOptimum = requireOptimum(modifiedConstraints, OBJECTIVE);
  const bindingConstraints = buildSlackTable(modifiedOptimum, modifiedConstraints)
    .filter(row => row.status === "saturée").map(row => row.name).join(", ");
  return { rhs: rhsValue, x: modifiedOptimum.x, y: modifiedOptimum.y, value: modifiedOptimum.value, bindingConstraints };
}));
console.log("Gains successifs :", computeGainProfile(CONSTRAINTS, OBJECTIVE, "capacite", rhsValues));

printTitle("Cas entier : valeur optimale du sac à dos selon le budget");
const budgets: number[] = [100, 101, 110, 120, 130, 140];
console.table(budgets.map(budget => ({ budget, value: computeBestKnapsackValue(budget) })));

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
const POINT_2_2: Point = { x: 2, y: 2 };
check("écart de la capacité en (2,2) = 0", () => computeSlack(CONSTRAINTS[0], POINT_2_2), 0);
check("écart de y_max en (2,2) = 1", () => computeSlack(CONSTRAINTS[2], POINT_2_2), 1);
check("écart de x_min en (2,2) = 2", () => computeSlack(CONSTRAINTS[3], POINT_2_2), 2);
check("capacité violée en (3,3)", () => computeStatus(CONSTRAINTS[0], { x: 3, y: 3 }), "violée");
check("statuts en (2,2)", () => buildSlackTable(POINT_2_2, CONSTRAINTS).map(row => row.status),
  ["saturée", "saturée", "marge", "marge", "marge"]);
check("gain +1 sur la capacité = 2", () => computeLooseningGain(CONSTRAINTS, OBJECTIVE, "capacite"), 2);
check("gain +1 sur x_max = 1", () => computeLooseningGain(CONSTRAINTS, OBJECTIVE, "x_max"), 1);
check("le modèle d'origine n'est pas modifié", () => {
  computeLooseningGain(CONSTRAINTS, OBJECTIVE, "capacite");
  return CONSTRAINTS[0].rhs;
}, 4);
check("valeurs marginales", () => computeMarginalValues(CONSTRAINTS, OBJECTIVE),
  { capacite: 2, x_max: 1, y_max: 0, x_min: 0, y_min: 0 });
check("écarts complémentaires respectés", () => satisfiesComplementarySlackness(CONSTRAINTS, OBJECTIVE), true);
check("profil de la capacité 4→7 : [2, 0, 0]",
  () => computeGainProfile(CONSTRAINTS, OBJECTIVE, "capacite", [4, 5, 6, 7]), [2, 0, 0]);
check("sac à dos : +1 € ne rapporte rien, +10 € rapporte 2",
  () => [computeBestKnapsackValue(101) - computeBestKnapsackValue(100), computeBestKnapsackValue(110) - computeBestKnapsackValue(100)], [0, 2]);
printSummary();
