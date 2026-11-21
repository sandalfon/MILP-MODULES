/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 3 — Exercice 3.2 : Sélection de questions — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-03-variables-binaires/module-03-variables-binaires.md (§3 et §6)
 *  Lancer : node modules/module-03-variables-binaires/corriges/ex3-2-selection-questions.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  On combine l'énumération du module 1 avec les contraintes-données de
 *  l'exercice 3.1 : une décision est valide si elle ne viole AUCUNE
 *  contrainte de la liste. Le code de résolution ne connaît pas les
 *  règles métier : il ne fait que parcourir la liste. Ajouter une règle
 *  revient donc à ajouter un OBJET à la liste, sans modifier une seule
 *  ligne de l'énumération.
 *
 *  1. enumerateDecisions : bit i de mask ↔ item i (comme au module 1).
 *
 *  2. findValidSolutions : filter sur
 *     `constraints.every(constraint => satisfiesConstraint(constraint, x))`,
 *     puis map vers { selectedIds, value } (value = score total). Avec les
 *     5 règles de base, 4 des 32 décisions sont valides : {i1,i3,i5}=22,
 *     {i2,i3,i5}=21, {i1,i4,i5}=19, {i2,i4,i5}=18. i5 est dans toutes,
 *     car c'est le SEUL item du domaine C : la couverture de C force
 *     x_i5 = 1.
 *
 *  3. buildImplication("i5", "i3") : « i5 exige i3 » s'écrit
 *        x_i5 ≤ x_i3   ⇔   x_i5 − x_i3 ≤ 0
 *     On passe la variable de droite à gauche pour obtenir la forme
 *     standard Σ coef·x ≤ rhs, avec coefs { i5: 1, i3: -1 } et rhs = 0.
 *
 *  4. Avec la dépendance, il reste {i1,i3,i5}=22 et {i2,i3,i5}=21.
 *     L'optimum (22) est INCHANGÉ, car il contenait déjà i3. Une
 *     contrainte qui ne coupe pas l'optimum ne le dégrade pas, mais
 *     elle réduit quand même l'ensemble des solutions (4 → 2).
 *
 *  Pièges fréquents
 *  - Écrire l'implication à l'envers (x_i3 ≤ x_i5) : on obtiendrait
 *    « i3 exige i5 », une autre règle. Comme i5 est toujours pris ici,
 *    cette erreur passerait inaperçue sur ce jeu de données ! Seule la
 *    table de vérité (exercice 3.3) la détecte à coup sûr.
 *  - Oublier le signe moins : { i5: 1, i3: 1 } ≤ 0 interdirait de
 *    prendre i5 ou i3 ; le problème deviendrait infaisable.
 *
 *  Réponses aux questions
 *  a) Parce que i5 est le seul item du domaine C (voir point 2).
 *  b) Non, l'optimum reste 22 : {i1,i3,i5} respectait déjà la
 *     dépendance.
 *  c) Avec « i5 exige i4 » : il reste {i1,i4,i5}=19 et {i2,i4,i5}=18 ;
 *     l'optimum tombe à 19, car la contrainte coupe l'ancien optimum.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Item = { id: string; domain: string; score: number };
type Decision = Record<string, number>;   // id → 0 ou 1
type Coefs = Record<string, number>;      // id → coefficient
type Sense = "<=" | ">=" | "=";
type Constraint = { name: string; coefs: Coefs; sense: Sense; rhs: number };
type Solution = { selectedIds: string[]; value: number };   // value = score total des items choisis

const ITEMS: Item[] = [
  { id: "i1", domain: "A", score: 8 },
  { id: "i2", domain: "A", score: 7 },
  { id: "i3", domain: "B", score: 9 },
  { id: "i4", domain: "B", score: 6 },
  { id: "i5", domain: "C", score: 5 }
];
const FORM_SIZE = 3;

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────
// Solution de l'exercice 3.1.
const computeLhs = (constraint: Constraint, x: Decision): number =>
  Object.entries(constraint.coefs).reduce((sum, [id, coef]) => sum + coef * x[id], 0);

function satisfiesConstraint(constraint: Constraint, x: Decision): boolean {
  const lhs = computeLhs(constraint, x);
  if (constraint.sense === "<=") return lhs <= constraint.rhs;
  if (constraint.sense === ">=") return lhs >= constraint.rhs;
  if (constraint.sense === "=") return lhs === constraint.rhs;
  throw new Error(`Sens inconnu "${constraint.sense}"`);
}

function buildConstraints(items: Item[]): Constraint[] {
  const allItemsCoefs = Object.fromEntries(items.map(item => [item.id, 1]));
  const constraints: Constraint[] = [
    { name: `cardinalite_exacte_${FORM_SIZE}`, coefs: allItemsCoefs, sense: "=", rhs: FORM_SIZE }
  ];
  for (const domain of new Set(items.map(item => item.domain))) {
    const coefs = Object.fromEntries(items.filter(item => item.domain === domain).map(item => [item.id, 1]));
    constraints.push({ name: `couverture_${domain}`, coefs, sense: ">=", rhs: 1 });
  }
  constraints.push({ name: "exclusion_i1_i2", coefs: { i1: 1, i2: 1 }, sense: "<=", rhs: 1 });
  return constraints;
}

const computeTotalScore = (x: Decision): number => ITEMS.reduce((sum, item) => sum + item.score * x[item.id], 0);
const getSelectedIds = (x: Decision): string[] => ITEMS.filter(item => x[item.id] === 1).map(item => item.id);

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Les 2⁵ = 32 décisions possibles.
function enumerateDecisions(): Decision[] {
  const decisions: Decision[] = [];
  for (let mask = 0; mask < 2 ** ITEMS.length; mask++) {
    decisions.push(Object.fromEntries(ITEMS.map((item, i) => [item.id, (mask & (1 << i)) !== 0 ? 1 : 0])));
  }
  return decisions;
}

// Décisions qui respectent TOUTES les contraintes, sous la forme { selectedIds, value }.
function findValidSolutions(constraints: Constraint[]): Solution[] {
  return enumerateDecisions()
    .filter(x => constraints.every(constraint => satisfiesConstraint(constraint, x)))
    .map(x => ({ selectedIds: getSelectedIds(x), value: computeTotalScore(x) }));
}

// « ifId exige thenId » : x_ifId ≤ x_thenId  ⇔  x_ifId − x_thenId ≤ 0.
function buildImplication(ifId: string, thenId: string): Constraint {
  return { name: `dependance_${ifId}_${thenId}`, coefs: { [ifId]: 1, [thenId]: -1 }, sense: "<=", rhs: 0 };
}

// Solution de valeur maximale, ou null s'il n'y en a aucune.
function findBest(solutions: Solution[]): Solution | null {
  if (solutions.length === 0) return null;
  return solutions.reduce((bestSolution, solution) =>
    (solution.value > bestSolution.value ? solution : bestSolution));
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
const baseConstraints = buildConstraints(ITEMS);
const printSolutions = (solutions: Solution[]): void =>
  console.table(solutions.map(solution => ({ selectedIds: solution.selectedIds.join(", "), value: solution.value })));

printTitle("Règles de base");
const baseSolutions = findValidSolutions(baseConstraints);
printSolutions(baseSolutions);
console.log("Meilleure :", findBest(baseSolutions));

printTitle("Règles de base + « i5 exige i3 »");
// Tant que buildImplication n'est pas complétée, elle renvoie undefined : on ne l'ajoute pas.
const dependency = buildImplication("i5", "i3");
const constraintsWithDependency = dependency ? [...baseConstraints, dependency] : baseConstraints;
const solutionsWithDependency = findValidSolutions(constraintsWithDependency);
printSolutions(solutionsWithDependency);
console.log("Meilleure :", findBest(solutionsWithDependency));

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("32 décisions", () => enumerateDecisions().length, 32);
check("4 solutions valides sans dépendance", () => findValidSolutions(baseConstraints).length, 4);
check("scores sans dépendance", () => findValidSolutions(baseConstraints).map(solution => solution.value), [22, 21, 19, 18]);
check("implication i5 ⇒ i3 sous forme de données", () => buildImplication("i5", "i3"),
  { name: "dependance_i5_i3", coefs: { i5: 1, i3: -1 }, sense: "<=", rhs: 0 });
check("solutions avec dépendance",
  () => findValidSolutions([...baseConstraints, buildImplication("i5", "i3")]).map(solution => solution.selectedIds),
  [["i1", "i3", "i5"], ["i2", "i3", "i5"]]);
check("meilleure avec dépendance = {i1, i3, i5} = 22",
  () => findBest(findValidSolutions([...baseConstraints, buildImplication("i5", "i3")])),
  { selectedIds: ["i1", "i3", "i5"], value: 22 });
check("« i5 exige i4 » fait tomber l'optimum à 19",
  () => findBest(findValidSolutions([...baseConstraints, buildImplication("i5", "i4")]))?.value, 19);
check("aucune solution → null", () => findBest([]), null);
printSummary();
