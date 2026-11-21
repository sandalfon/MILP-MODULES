/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 3 — Exercice 3.2 : Sélection de questions
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-03-variables-binaires/module-03-variables-binaires.md (§3 et §6)
 *  Niveau : ★★☆   Durée indicative : 40 min
 *  Lancer : node modules/module-03-variables-binaires/exercices/ex3-2-selection-questions.ts
 *
 *  OBJECTIF
 *  Énumérer les formulaires de 3 questions qui respectent une liste de
 *  contraintes-données, puis ajouter une règle de dépendance.
 *
 *  PRÉREQUIS
 *  - Exercice 3.1 (computeLhs, satisfiesConstraint, buildConstraints fournis).
 *  - Module 1 : énumération par masque binaire.
 *  - Cours : implication B ⇒ A s'écrit x_B − x_A ≤ 0.
 *
 *  CONSIGNE
 *    1. enumerateDecisions() : les 2⁵ = 32 décisions (objets { i1: 0|1, ... }).
 *    2. findValidSolutions(constraints) : décisions qui respectent TOUTES
 *       les contraintes, transformées en { selectedIds, value }.
 *    3. buildImplication(ifId, thenId) : contrainte-donnée « ifId exige thenId »,
 *       nommée `dependance_${ifId}_${thenId}`.
 *    4. findBest(solutions) : la solution de plus grande valeur, ou null.
 *  Puis compare les solutions avec et sans « i5 exige i3 ».
 *  Les indices sont en fin de fichier : cherche d'abord seul.
 *
 *  RÉSULTAT ATTENDU
 *  Sans dépendance : 4 solutions (scores 22, 21, 19, 18).
 *  Avec : {i1, i3, i5} = 22 et {i2, i3, i5} = 21.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Toutes les décisions possibles.
// Objectif : énumérer, comme au module 1, les 2⁵ = 32 façons de fixer
//            chaque variable x_i à 0 ou 1.
// Entrée   : aucune (la fonction lit ITEMS, 5 items i1 … i5).
// Sortie   : un tableau de 32 décisions, chacune de la forme
//            { i1: 0|1, i2: 0|1, i3: 0|1, i4: 0|1, i5: 0|1 }.
// Exemple  : enumerateDecisions().length → 32 ; la liste contient
//            { i1: 0, i2: 0, i3: 0, i4: 0, i5: 0 } et { i1: 1, i2: 0, i3: 1, i4: 0, i5: 1 }.
// Attention: chaque décision doit contenir les 5 ids (valeur 0 comprise),
//            sinon x[id] vaut undefined dans les calculs.
// (Indice 1 en fin de fichier.)
function enumerateDecisions(): Decision[] {
  const decisions: Decision[] = [];
  // ... à compléter
  return decisions;
}

// TODO 2 — Solutions valides.
// Objectif : garder les décisions qui respectent TOUTES les contraintes de
//            la liste (aucune violation), et les présenter comme des Solution.
// Entrée   : constraints, la liste des contraintes-données,
//            ex. buildConstraints(ITEMS) (cardinalité, 3 couvertures, exclusion).
// Sortie   : un tableau de Solution { selectedIds, value }, où selectedIds
//            est la liste des ids choisis (outil getSelectedIds) et value le
//            score total (outil computeTotalScore), dans l'ordre d'énumération.
// Exemple  : findValidSolutions(buildConstraints(ITEMS)).map(solution => solution.value)
//            → [22, 21, 19, 18] ; la première est { selectedIds: ["i1", "i3", "i5"], value: 22 }.
// Attention: une liste vide de contraintes laisse passer les 32 décisions.
// (Indice 2 en fin de fichier.)
function findValidSolutions(constraints: Constraint[]): Solution[] {
  return []; // ← à remplacer
}

// TODO 3 — Règle de dépendance « ifId exige thenId ».
// Objectif : traduire « si ifId est choisi, thenId doit l'être aussi »
//            (x_ifId ≤ x_thenId) en contrainte-donnée de forme Σ coef·x ≤ rhs,
//            toutes les variables à gauche. À toi de trouver les
//            coefficients de ifId et de thenId, et le rhs.
// Entrée   : ifId, l'item qui exige, ex. "i5" ; thenId, l'item exigé, ex. "i3".
// Sortie   : une Constraint nommée `dependance_${ifId}_${thenId}`, de sens "<=".
// Exemple  : buildImplication("i5", "i3") → { name: "dependance_i5_i3", coefs: …, sense: "<=", rhs: … }
//            telle que {i5} seul soit interdit, mais {i3} seul, {i3, i5} et {} permis.
// Attention: l'implication n'est pas symétrique : « i5 exige i3 » n'est
//            pas « i3 exige i5 » (voir le piège du cours, §3).
// (Indice 3 en fin de fichier.)
function buildImplication(ifId: string, thenId: string): Constraint {
  return undefined; // ← à remplacer
}

// TODO 4 — Meilleure solution.
// Objectif : choisir, parmi les solutions valides, celle de plus grande
//            valeur (l'optimum du problème énuméré).
// Entrée   : solutions, ex. findValidSolutions(baseConstraints) (valeurs 22, 21, 19, 18).
// Sortie   : la Solution de value maximale, ou null si la liste est vide.
// Exemple  : avec « i5 exige i3 » → { selectedIds: ["i1", "i3", "i5"], value: 22 } ;
//            findBest([]) → null.
// Attention: traite la liste vide AVANT tout calcul ; en cas d'égalité,
//            garder la première rencontrée suffit.
// (Indice 4 en fin de fichier.)
function findBest(solutions: Solution[]): Solution | null {
  return undefined; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Pourquoi i5 apparaît-il dans TOUTES les solutions valides ?
//  b) L'ajout de la dépendance dégrade-t-il l'optimum ? Pourquoi ?
//  c) Remplace la règle par « i5 exige i4 » : que devient l'optimum ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (enumerateDecisions) — pour chaque mask de 0 à 2 ** ITEMS.length − 1 :
//   decisions.push(Object.fromEntries(ITEMS.map((item, i) => [item.id, bit i de mask ? 1 : 0]))) ;
//   le bit i de mask se teste avec (mask & (1 << i)) !== 0.
//
// Indice 2 (findValidSolutions) — enumerateDecisions().filter(x => …) avec
//   constraints.every(constraint => satisfiesConstraint(constraint, x)),
//   puis .map(x => ({ selectedIds: getSelectedIds(x), value: computeTotalScore(x) })).
//
// Indice 3 (buildImplication) — passe x_thenId à gauche : x_ifId − x_thenId ≤ 0.
//   Pour des clés venant de variables, utilise des clés calculées :
//   { [ifId]: …, [thenId]: … }.
//
// Indice 4 (findBest) — if (solutions.length === 0) return null; puis
//   solutions.reduce((bestSolution, solution) => …) en gardant la plus grande value.
