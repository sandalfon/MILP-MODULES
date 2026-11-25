/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 9 — Exercice 9.2 : Unicité de la solution — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-09-sudoku/module-09-sudoku.md (§6)
 *  Lancer : node modules/module-09-sudoku/corriges/ex9-2-unicite.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  1. Interdire une grille déjà trouvée
 *     Une grille complète met à 1 exactement 81 variables, une par case.
 *     Toute AUTRE grille diffère d'elle sur au moins une case : la
 *     variable correspondante y vaut 0. D'où la contrainte
 *       Σ_{(l,c)} x_{l,c,g[l][c]} ≤ 80
 *     qui exclut la grille g (sa somme vaut 81) et elle seule : toutes
 *     les autres grilles la respectent. On l'appelle une coupe « no-good ».
 *
 *  2. Ne pas modifier le modèle reçu
 *     withExclusions renvoie un NOUVEAU modèle ({ ...model, subjectTo:
 *     [...] }). Le modèle de départ reste intact : on peut le réutiliser
 *     à chaque tour de findSolutions sans accumuler de contraintes par
 *     erreur.
 *
 *  3. Énumérer jusqu'à une limite
 *     findSolutions résout, ajoute une coupe pour la grille trouvée, et
 *     recommence, jusqu'à ce que le modèle devienne infaisable ou que la
 *     limite soit atteinte. Pour savoir si une grille est unique, la
 *     limite 2 suffit : on s'arrête dès la deuxième solution.
 *
 *  Résultats
 *     PUZZLE                → 1 solution : unique
 *     AMBIGUOUS_PUZZLE      → 2 solutions (les 6 et 7 du rectangle échangés)
 *     grille vide, limite 3 → 3 solutions (il en existe ≈ 6,7 × 10²¹)
 *     grille contradictoire → 0 solution
 *
 *  Pièges fréquents
 *  - Écrire la coupe sur TOUTES les variables (729) : la somme vaut alors
 *    81 pour toute grille valide, et ≤ 80 rend le modèle infaisable.
 *  - Utiliser GLP_LO au lieu de GLP_UP : « ≥ 80 » n'exclut rien.
 *  - Modifier model.subjectTo avec push : chaque appel ajoute les coupes
 *    au même tableau, et les tours suivants les cumulent en double.
 *  - Oublier la limite : sur une grille presque vide, la boucle ne
 *    s'arrêterait pas en pratique.
 *
 *  Réponses aux questions
 *  a) Une autre grille diffère sur au moins une case, donc au moins une
 *     des 81 variables de la coupe vaut 0 : sa somme est ≤ 80. Seule la
 *     grille exclue atteint 81.
 *  b) La grille vide a environ 6,7 × 10²¹ solutions : sans limite, on
 *     ferait un appel au solveur par solution. Pour décider de l'unicité,
 *     il suffit de savoir s'il en existe une deuxième : limite = 2.
 *  c) Il faut k + 1 résolutions pour trouver k solutions et constater
 *     qu'il n'y en a pas d'autre, chacune sur un modèle un peu plus gros.
 *     C'est raisonnable pour 2 ou 3 solutions ; pour en compter des
 *     milliers, un algorithme de retour arrière dédié est plus efficace.
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

const glpk = await GLPK();

// ─── 1. DONNÉES ─────────────────────────────────────────────────
// Modèle glpk.js dont la liste des binaires est toujours renseignée.
type Model = LP & { binaries: string[] };
type GlpkConstraint = LP["subjectTo"][number];
// Réponse de glpk.solve (type fourni par glpk.js).
type SolverOutput = Result;
// Une grille : 9 lignes de 9 chiffres ; 0 = case vide.
type Grid = number[][];
// Une case : [ligne, colonne], chacune de 0 à 8.
type Cell = [number, number];
// Lecture d'une résolution : statut GLPK et valeur de chaque variable.
type SolverAnswer = { status: number; vars: Record<string, number> };
type Uniqueness = "sans solution" | "unique" | "multiple";

const BOX_SIZE = 3;
const INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8];   // numéros de ligne, de colonne et de bloc
const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const PUZZLE: Grid = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9]
];

// Solution (unique) de PUZZLE.
const SOLUTION: Grid = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9]
];

// SOLUTION privée de 4 cases en rectangle, (0,3) (0,4) (3,3) (3,4), qui valent
// 6 7 / 7 6 : on peut y échanger les 6 et les 7, d'où exactement 2 solutions.
const RECTANGLE_CELLS: Cell[] = [[0, 3], [0, 4], [3, 3], [3, 4]];
const AMBIGUOUS_PUZZLE: Grid = SOLUTION.map((rowValues, row) => rowValues.map((digit, col) =>
  RECTANGLE_CELLS.some(([cellRow, cellCol]) => cellRow === row && cellCol === col) ? 0 : digit));

const EMPTY_PUZZLE: Grid = INDICES.map(() => INDICES.map(() => 0));

// PUZZLE avec un 5 de trop sur la première ligne : aucune solution.
const CONTRADICTORY_PUZZLE: Grid = PUZZLE.map((rowValues, row) =>
  row === 0 ? [5, 3, 5, ...rowValues.slice(3)] : rowValues);

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────
// Le solveur de l'exercice 9.1, complet.

const variableName = (row: number, col: number, digit: number): string => `x_${row}_${col}_${digit}`;

const exactlyOne = (name: string, variableNames: string[]): GlpkConstraint => ({
  name,
  vars: variableNames.map(variable => ({ name: variable, coef: 1 })),
  bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
});

const boxCells = (boxIndex: number): Cell[] => {
  const firstRow = Math.floor(boxIndex / BOX_SIZE) * BOX_SIZE;
  const firstCol = (boxIndex % BOX_SIZE) * BOX_SIZE;
  return INDICES.map((i): Cell => [firstRow + Math.floor(i / BOX_SIZE), firstCol + (i % BOX_SIZE)]);
};

const buildRuleConstraints = (): GlpkConstraint[] => [
  ...INDICES.flatMap(row => INDICES.map(col =>
    exactlyOne(`case_${row}_${col}`, DIGITS.map(digit => variableName(row, col, digit))))),
  ...INDICES.flatMap(row => DIGITS.map(digit =>
    exactlyOne(`ligne_${row}_${digit}`, INDICES.map(col => variableName(row, col, digit))))),
  ...INDICES.flatMap(col => DIGITS.map(digit =>
    exactlyOne(`colonne_${col}_${digit}`, INDICES.map(row => variableName(row, col, digit))))),
  ...INDICES.flatMap(boxIndex => DIGITS.map(digit =>
    exactlyOne(`bloc_${boxIndex}_${digit}`,
      boxCells(boxIndex).map(([row, col]) => variableName(row, col, digit)))))
];

const buildGivenConstraints = (puzzle: Grid): GlpkConstraint[] =>
  INDICES.flatMap(row => INDICES
    .filter(col => puzzle[row][col] !== 0)
    .map(col => exactlyOne(`donne_${row}_${col}`, [variableName(row, col, puzzle[row][col])])));

const buildSudokuModel = (puzzle: Grid): Model => ({
  name: "sudoku",
  objective: { direction: glpk.GLP_MAX, name: "aucun", vars: [{ name: variableName(0, 0, 1), coef: 0 }] },
  subjectTo: [...buildRuleConstraints(), ...buildGivenConstraints(puzzle)],
  binaries: INDICES.flatMap(row => INDICES.flatMap(col => DIGITS.map(digit => variableName(row, col, digit))))
});

const readGrid = (vars: Record<string, number>): Grid =>
  INDICES.map(row => INDICES.map(col =>
    DIGITS.find(digit => (vars[variableName(row, col, digit)] ?? 0) > 0.5) ?? 0));

const formatGrid = (grid: Grid): string =>
  grid.map(rowValues => rowValues.map(digit => digit || ".").join(" ")).join("\n");

// Résout un modèle et renvoie { status, vars }. Refuse de lancer GLPK sur un
// modèle visiblement incomplet, car une contrainte sans variable fait planter
// le module WebAssembly (« Aborted() »).
async function solveModel(model: Model): Promise<SolverAnswer | null> {
  const isComplete = model?.objective?.vars?.length > 0
    && model.subjectTo?.length > 0
    && model.subjectTo.every(constraint => constraint?.vars?.length > 0);
  if (!isComplete) return null;
  const solverOutput: SolverOutput = await glpk.solve(model, { msglev: glpk.GLP_MSG_OFF, presol: true });
  return { status: solverOutput.result.status, vars: solverOutput.result.vars };
}

// ─── 3. FONCTIONS ───────────────────────────────────────────────

function buildExclusionConstraint(grid: Grid, exclusionIndex: number): GlpkConstraint {
  return {
    name: `exclusion_${exclusionIndex}`,
    vars: INDICES.flatMap(row => INDICES.map(col => ({ name: variableName(row, col, grid[row][col]), coef: 1 }))),
    bnds: { type: glpk.GLP_UP, lb: 0, ub: 80 }
  };
}

function withExclusions(model: Model, excludedGrids: Grid[]): Model {
  return {
    ...model,
    subjectTo: [
      ...model.subjectTo,
      ...excludedGrids.map((grid, exclusionIndex) => buildExclusionConstraint(grid, exclusionIndex))
    ]
  };
}

async function findSolutions(puzzle: Grid, limit: number): Promise<Grid[]> {
  const baseModel = buildSudokuModel(puzzle);
  const solutions: Grid[] = [];
  while (solutions.length < limit) {
    const answer = await solveModel(withExclusions(baseModel, solutions));
    if (answer === null || answer.status !== glpk.GLP_OPT) break;
    solutions.push(readGrid(answer.vars));
  }
  return solutions;
}

function classifyPuzzle(solutions: Grid[]): Uniqueness {
  if (solutions.length === 0) return "sans solution";
  return solutions.length === 1 ? "unique" : "multiple";
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
const PUZZLES_TO_CHECK: { name: string; puzzle: Grid }[] = [
  { name: "grille du cours", puzzle: PUZZLE },
  { name: "rectangle vidé", puzzle: AMBIGUOUS_PUZZLE },
  { name: "grille vide", puzzle: EMPTY_PUZZLE },
  { name: "grille contradictoire", puzzle: CONTRADICTORY_PUZZLE }
];

printTitle("Unicité (limite : 2 solutions)");
for (const { name, puzzle } of PUZZLES_TO_CHECK) {
  const solutions = await findSolutions(puzzle, 2);
  console.log(`  ${name.padEnd(22)} → ${solutions?.length ?? "—"} solution(s) trouvée(s) : ${classifyPuzzle(solutions ?? [])}`);
}

printTitle("Les deux solutions du rectangle vidé");
const ambiguousSolutions = await findSolutions(AMBIGUOUS_PUZZLE, 2);
(ambiguousSolutions ?? []).forEach((grid, solutionIndex) =>
  console.log(`solution ${solutionIndex + 1} (lignes 0 à 3) :\n${formatGrid(grid.slice(0, 4))}\n`));

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("coupe : 81 termes, ≤ 80 (GLP_UP)", () => {
  const constraint = buildExclusionConstraint(SOLUTION, 0);
  return [constraint.name, constraint.vars.length, constraint.bnds.type, constraint.bnds.ub];
}, ["exclusion_0", 81, glpk.GLP_UP, 80]);
check("coupe : porte sur le chiffre de chaque case", () =>
  buildExclusionConstraint(SOLUTION, 3).vars.slice(0, 3),
  [{ name: "x_0_0_5", coef: 1 }, { name: "x_0_1_3", coef: 1 }, { name: "x_0_2_4", coef: 1 }]);
check("withExclusions : ajoute une coupe par grille, dans l'ordre", () => {
  const model = buildSudokuModel(PUZZLE);
  return withExclusions(model, [SOLUTION, SOLUTION]).subjectTo.slice(-2).map(constraint => constraint.name);
}, ["exclusion_0", "exclusion_1"]);
check("withExclusions : ne modifie pas le modèle reçu", () => {
  const model = buildSudokuModel(PUZZLE);
  withExclusions(model, [SOLUTION]);
  return model.subjectTo.length;
}, 354);
check("classifyPuzzle : 0, 1 et 2 solutions", () =>
  [classifyPuzzle([]), classifyPuzzle([SOLUTION]), classifyPuzzle([SOLUTION, SOLUTION])],
  ["sans solution", "unique", "multiple"]);
await checkAsync("PUZZLE : une seule solution, SOLUTION", async () => {
  const solutions = await findSolutions(PUZZLE, 5);
  return [solutions.length, solutions[0]];
}, [1, SOLUTION]);
await checkAsync("rectangle vidé : exactement 2 solutions, dont SOLUTION", async () => {
  const solutions = await findSolutions(AMBIGUOUS_PUZZLE, 5);
  return [solutions.length, solutions.some(grid => JSON.stringify(grid) === JSON.stringify(SOLUTION))];
}, [2, true]);
await checkAsync("grille vide : la limite 3 est respectée",
  async () => (await findSolutions(EMPTY_PUZZLE, 3)).length, 3);
await checkAsync("grille contradictoire : aucune solution",
  async () => (await findSolutions(CONTRADICTORY_PUZZLE, 5)).length, 0);
printSummary();
