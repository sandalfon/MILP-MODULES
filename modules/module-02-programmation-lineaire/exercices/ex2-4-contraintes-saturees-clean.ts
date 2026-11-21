/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 2 — Exercice 2.4 : Contraintes saturées et valeurs
 *                            marginales
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-02-programmation-lineaire/module-02-programmation-lineaire.md (§1 « Anatomie d'une contrainte », §4 « Contrainte saturée »)
 *  Niveau : ★★☆   Durée indicative : 45 min
 *  Lancer : node modules/module-02-programmation-lineaire/exercices/ex2-4-contraintes-saturees.ts
 *
 *  OBJECTIF
 *  Identifier les contraintes qui « bloquent » l'optimum, mesurer ce que
 *  rapporte le fait de les desserrer, et voir les limites de cette mesure.
 *
 *  PRÉREQUIS
 *  - Exercice 2.2 (le calcul des sommets et de l'optimum est fourni).
 *  - Cours : second membre = rhs (constante de droite) ; écart = rhs − membre de gauche ;
 *    saturée ⇔ écart nul.
 *  - TypeScript : map, find, every, slice, Object.fromEntries, spread {...constraint} ;
 *    traitement explicite d'une valeur « T | null » (outil requireOptimum).
 *
 *  CONSIGNE
 *  Le LP est celui des exercices précédents : MAX 3x + 2y, optimum (2, 2) = 10.
 *  Chaque contrainte a·x + b·y ≤ c est une donnée { name, coefs: { x: a, y: b }, rhs: c }.
 *    1. computeSlack(constraint, point) : c − (a·x + b·y) au point donné.
 *    2. computeStatus(constraint, point) : "violée", "saturée" ou "marge" (avec la tolérance TOLERANCE).
 *    3. buildSlackTable(point, constraints) : [{ name, slack, status }, ...].
 *    4. computeLooseningGain(constraints, objective, name, delta) : variation de la
 *       valeur optimale quand le second membre de `name` augmente de delta.
 *       NE MODIFIE PAS constraints.
 *    5. computeMarginalValues(constraints, objective) : { name: gain pour +1 } pour chaque contrainte.
 *    6. satisfiesComplementarySlackness(constraints, objective) : true si, pour chaque
 *       contrainte, écart × valeur marginale ≈ 0.
 *    7. computeGainProfile(constraints, objective, name, rhsValues) : gains successifs
 *       quand le second membre de `name` prend les valeurs du tableau `rhsValues`.
 *  Puis observe la dernière partie (cas entier, fournie) et réponds aux QUESTIONS.
 *
 *  RÉSULTAT ATTENDU
 *  Écarts en (2,2) : capacite 0, x_max 0, y_max 1, x_min 2, y_min 2.
 *  Valeurs marginales : capacite 2, x_max 1, les autres 0.
 *  Profil de la capacité 4 → 7 : gains [2, 0, 0].
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

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Écart (slack) d'une contrainte en un point.
// Objectif : mesurer la marge restante de la contrainte a·x + b·y ≤ c au point donné :
//            écart = second membre − membre de gauche = c − (a·x + b·y) (cours §1 et §4).
// Entrée   : constraint, une contrainte { name, coefs, rhs }, ex. CONSTRAINTS[2] (y ≤ 3) ;
//            point, un Point, ex. { x: 2, y: 2 }.
// Sortie   : un nombre, l'écart arrondi avec roundValue : > 0 marge, 0 saturée, < 0 violée.
// Exemple  : computeSlack(CONSTRAINTS[2], { x: 2, y: 2 }) → 3 − 2 = 1 ;
//            computeSlack(CONSTRAINTS[3], { x: 2, y: 2 }) → 0 − (−2) = 2.
// Attention: sans arrondi, un calcul flottant peut donner 1e-16 au lieu de 0.
// (Indice 1 en fin de fichier.)
function computeSlack(constraint: Constraint, point: Point): number {
  return undefined; // ← à remplacer
}

// TODO 2 — Statut d'une contrainte en un point.
// Objectif : traduire l'écart en un statut lisible, en comparant à ±TOLERANCE (jamais à 0 exactement) :
//            écart < −TOLERANCE → "violée" ; écart ≤ TOLERANCE → "saturée" ; sinon → "marge".
// Entrée   : constraint, ex. CONSTRAINTS[0] (x + y ≤ 4) ; point, ex. { x: 3, y: 3 }.
// Sortie   : "violée", "saturée" ou "marge" (type Status).
// Exemple  : computeStatus(CONSTRAINTS[0], { x: 3, y: 3 }) → "violée" (écart −2) ;
//            computeStatus(CONSTRAINTS[0], { x: 2, y: 2 }) → "saturée".
// (Indice 2 en fin de fichier.)
function computeStatus(constraint: Constraint, point: Point): Status {
  return undefined; // ← à remplacer
}

// TODO 3 — Tableau des écarts.
// Objectif : résumer, pour chaque contrainte, son écart et son statut au point donné.
// Entrée   : point, ex. { x: 2, y: 2 } ; constraints, ex. CONSTRAINTS.
// Sortie   : un tableau de SlackRow { name, slack, status }, dans l'ordre de constraints.
// Exemple  : buildSlackTable({ x: 2, y: 2 }, CONSTRAINTS)[0] → { name: "capacite", slack: 0, status: "saturée" } ;
//            les statuts valent ["saturée", "saturée", "marge", "marge", "marge"].
// (Indice 3 en fin de fichier.)
function buildSlackTable(point: Point, constraints: Constraint[]): SlackRow[] {
  return []; // ← à remplacer
}

// TODO 4 — Gain obtenu en desserrant une contrainte.
// Objectif : mesurer la variation de la valeur optimale quand le second membre de la
//            contrainte `name` passe de rhs à rhs + delta (cours §4, valeur marginale).
// Entrée   : constraints, ex. CONSTRAINTS ; objective, ex. OBJECTIVE ;
//            name, le nom de la contrainte, ex. "capacite" ; delta, l'augmentation (1 par défaut).
// Sortie   : un nombre arrondi avec roundValue : valeur optimale après − valeur optimale avant.
// Exemple  : computeLooseningGain(CONSTRAINTS, OBJECTIVE, "capacite") → 12 − 10 = 2 ;
//            computeLooseningGain(CONSTRAINTS, OBJECTIVE, "x_max") → 1.
// Attention: NE MODIFIE JAMAIS constraint.rhs directement : CONSTRAINTS[0].rhs doit rester 4.
//            Un nom inconnu doit lever une erreur explicite.
// (Indice 4 en fin de fichier.)
function computeLooseningGain(constraints: Constraint[], objective: Objective, name: string, delta: number = 1): number {
  return undefined; // ← à remplacer
}

// TODO 5 — Valeurs marginales de toutes les contraintes.
// Objectif : calculer, pour chaque contrainte, le gain obtenu en augmentant son second membre de 1.
// Entrée   : constraints, ex. CONSTRAINTS ; objective, ex. OBJECTIVE.
// Sortie   : un objet MarginalValues { nom de contrainte: gain pour +1 }.
// Exemple  : computeMarginalValues(CONSTRAINTS, OBJECTIVE)
//            → { capacite: 2, x_max: 1, y_max: 0, x_min: 0, y_min: 0 }.
// (Indice 5 en fin de fichier.)
function computeMarginalValues(constraints: Constraint[], objective: Objective): MarginalValues {
  return undefined; // ← à remplacer
}

// TODO 6 — Règle des écarts complémentaires.
// Objectif : vérifier qu'à l'optimum, pour chaque contrainte, SOIT l'écart est nul,
//            SOIT la valeur marginale est nulle (leur produit vaut 0 à TOLERANCE près).
// Entrée   : constraints, ex. CONSTRAINTS ; objective, ex. OBJECTIVE.
// Sortie   : un booléen, true si |écart × valeur marginale| ≤ TOLERANCE pour TOUTES les contraintes.
// Exemple  : satisfiesComplementarySlackness(CONSTRAINTS, OBJECTIVE) → true
//            (capacite : 0 × 2 ; y_max : 1 × 0 ; x_min : 2 × 0…).
// (Indice 6 en fin de fichier.)
function satisfiesComplementarySlackness(constraints: Constraint[], objective: Objective): boolean {
  return undefined; // ← à remplacer
}

// TODO 7 — Profil de gain d'une contrainte.
// Objectif : montrer que la valeur marginale n'est valable que localement, en calculant
//            les gains successifs quand le second membre de `name` prend plusieurs valeurs.
// Entrée   : constraints, ex. CONSTRAINTS ; objective, ex. OBJECTIVE ; name, ex. "capacite" ;
//            rhsValues, les seconds membres à essayer dans l'ordre, ex. [4, 5, 6, 7].
// Sortie   : un tableau de rhsValues.length − 1 nombres (arrondis) : en notant v(c) la valeur
//            optimale avec le second membre c, [v(5) − v(4), v(6) − v(5), v(7) − v(6)].
// Exemple  : computeGainProfile(CONSTRAINTS, OBJECTIVE, "capacite", [4, 5, 6, 7]) → [2, 0, 0]
//            (valeurs optimales 10, 12, 12, 12).
// (Indice 7 en fin de fichier.)
function computeGainProfile(constraints: Constraint[], objective: Objective, name: string, rhsValues: number[]): number[] {
  return undefined; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Si tu ne peux augmenter qu'UNE ressource d'une unité, laquelle choisis-tu ?
//  b) Que se passe-t-il si l'on desserre y ≤ 3 ? Et si on la resserre à y ≤ 2 ?
//  c) Pourquoi le gain de la capacité tombe-t-il à 0 après c = 5 ? Combien
//     de contraintes sont saturées en c = 5 ? Comment appelle-t-on ce sommet ?
//  d) Cas entier : pourquoi +1 € ne rapporte-t-il rien alors que +10 €
//     rapporte 2 ? Peut-on parler d'une « valeur d'un euro » de budget ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (computeSlack) — constraint.rhs − computeLinearValue(constraint.coefs, point),
//   le tout passé dans roundValue(...) pour éviter les 1e-16 parasites.
//
// Indice 2 (computeStatus) — calcule une seule fois l'écart avec computeSlack(constraint, point),
//   puis enchaîne deux if (violée, puis saturée) avant de renvoyer "marge".
//
// Indice 3 (buildSlackTable) — constraints.map(constraint => ({ ... })) en appelant
//   computeSlack et computeStatus pour chaque contrainte.
//
// Indice 4 (computeLooseningGain) — quatre étapes :
//   1) retrouve la contrainte : constraints.find(constraint => constraint.name === name)
//      (si elle vaut undefined, lève une erreur explicite) ;
//   2) valueBefore = requireOptimum(constraints, objective).value ;
//   3) valueAfter = requireOptimum(replaceRhs(constraints, name, constraint.rhs + delta), objective).value
//      (replaceRhs renvoie une COPIE : l'original n'est pas touché) ;
//   4) renvoie roundValue(valueAfter − valueBefore).
//
// Indice 5 (computeMarginalValues) — Object.fromEntries(constraints.map(constraint =>
//   [constraint.name, ...])) avec computeLooseningGain pour delta = 1.
//
// Indice 6 (satisfiesComplementarySlackness) — calcule l'optimum (requireOptimum) et les
//   valeurs marginales, puis vérifie avec every que
//   |computeSlack(constraint, optimum) × marginalValues[constraint.name]| ≤ TOLERANCE.
//
// Indice 7 (computeGainProfile) — calcule d'abord optimalValues = [v(4), v(5), v(6), v(7)]
//   avec map, requireOptimum et replaceRhs, puis
//   optimalValues.slice(1).map((value, i) => value − optimalValues[i]) (arrondi).
