/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 9 — Exercice 9.2 : Unicité de la solution
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-09-sudoku/module-09-sudoku.md (§6)
 *  Niveau : ★★★   Durée indicative : 45 min
 *  Lancer : node modules/module-09-sudoku/exercices/ex9-2-unicite.ts
 *
 *  OBJECTIF
 *  Un vrai sudoku n'a qu'UNE solution. Le solveur en renvoie une : il
 *  faut lui demander s'il en existe une autre. Pour cela :
 *  - écrire la contrainte qui interdit une grille déjà trouvée (TODO 1) ;
 *  - ajouter ces contraintes à un modèle SANS modifier le modèle reçu
 *    (TODO 2) ;
 *  - énumérer les solutions une par une, jusqu'à une limite (TODO 3) ;
 *  - classer une grille : sans solution, unique ou multiple (TODO 4).
 *
 *  PRÉREQUIS
 *  - Exercice 9.1 : le solveur complet est fourni ici (section 2).
 *  - Module 6 : GLP_UP, statuts GLP_OPT / GLP_NOFEAS.
 *  - TypeScript : spread { ...obj } et [...a, ...b], async / await,
 *    boucle while.
 *
 *  CONSIGNE
 *    1. buildExclusionConstraint(grid, exclusionIndex) : la contrainte
 *       `exclusion_${exclusionIndex}`
 *         Σ_{(l,c)} x_{l,c,grid[l][c]} ≤ 80
 *       sur les 81 variables qui valent 1 dans grid, ligne par ligne.
 *    2. withExclusions(model, excludedGrids) : un NOUVEAU modèle, égal à
 *       model plus une contrainte d'exclusion par grille (numérotées 0,
 *       1, 2… dans l'ordre de excludedGrids).
 *    3. findSolutions(puzzle, limit) : résout, interdit la grille trouvée,
 *       recommence ; s'arrête quand le modèle devient infaisable ou que
 *       limit solutions ont été trouvées.
 *    4. classifyPuzzle(solutions) : "sans solution", "unique" ou "multiple".
 *    5. Lance le script, observe les deux solutions du rectangle vidé,
 *       puis réponds aux QUESTIONS.
 *
 *  RÉSULTAT ATTENDU
 *  grille du cours : unique · rectangle vidé : multiple (6 et 7
 *  échangés) · grille vide : multiple · grille contradictoire : sans
 *  solution.
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

const glpk = await GLPK();

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Interdire une grille déjà trouvée.
// Objectif : écrire la contrainte qui exclut la grille complète grid, et
//            elle seule : la somme des 81 variables qui valent 1 dans grid
//            doit être ≤ 80, c'est-à-dire qu'au moins une case doit changer.
// Entrée   : grid, une grille complète, ex. SOLUTION ;
//            exclusionIndex, le numéro de la contrainte, ex. 0.
// Sortie   : une GlpkConstraint :
//            name, `exclusion_${exclusionIndex}` ;
//            vars, 81 termes { name: variableName(l, c, grid[l][c]), coef: 1 },
//              ligne par ligne ;
//            bnds, de type glpk.GLP_UP avec ub = 80.
// Exemple  : buildExclusionConstraint(SOLUTION, 0) → "exclusion_0", 81 termes,
//            les trois premiers sur x_0_0_5, x_0_1_3, x_0_2_4.
// Attention: une seule variable par case, celle du chiffre de grid ; avec
//            les 729 variables, la somme vaudrait 81 pour toute grille.
// (Indice 1 en fin de fichier.)
function buildExclusionConstraint(grid: Grid, exclusionIndex: number): GlpkConstraint {
  return undefined; // ← à remplacer
}

// TODO 2 — Ajouter les exclusions sans modifier le modèle.
// Objectif : obtenir le modèle de départ augmenté d'une contrainte
//            d'exclusion par grille déjà trouvée, en laissant intact le
//            modèle reçu, pour pouvoir le réutiliser à chaque tour.
// Entrée   : model, le modèle de départ, ex. buildSudokuModel(PUZZLE) ;
//            excludedGrids, les grilles à interdire, ex. [SOLUTION].
// Sortie   : un NOUVEAU Model : mêmes champs que model, avec subjectTo =
//            les contraintes de model, puis "exclusion_0", "exclusion_1"…
//            dans l'ordre de excludedGrids.
// Exemple  : withExclusions(buildSudokuModel(PUZZLE), [SOLUTION]).subjectTo.length
//            → 355, et le modèle reçu garde ses 354 contraintes.
// Attention: model.subjectTo.push(…) modifierait le modèle reçu : interdit.
// (Indice 2 en fin de fichier.)
function withExclusions(model: Model, excludedGrids: Grid[]): Model {
  return undefined; // ← à remplacer
}

// TODO 3 — Énumérer les solutions.
// Objectif : trouver les solutions de puzzle une par une, sans dépasser
//            limit. Tant que moins de limit solutions sont trouvées :
//            - résoudre le modèle de puzzle, avec une exclusion pour chaque
//              solution déjà trouvée ;
//            - si la réponse est absente ou que le statut n'est pas
//              glpk.GLP_OPT, s'arrêter : il n'y a plus d'autre solution ;
//            - sinon, relire la grille et l'ajouter aux solutions.
// Entrée   : puzzle, la grille à résoudre, ex. AMBIGUOUS_PUZZLE ;
//            limit, le nombre maximal de solutions cherchées, ex. 2.
// Sortie   : une promesse de tableau de grilles (Grid[]), dans l'ordre où le
//            solveur les a trouvées ; [] si puzzle n'a aucune solution.
// Exemple  : await findSolutions(PUZZLE, 5) → [SOLUTION] ;
//            await findSolutions(AMBIGUOUS_PUZZLE, 5) → 2 grilles ;
//            await findSolutions(EMPTY_PUZZLE, 3) → 3 grilles.
// Attention: construis le modèle de puzzle une seule fois, et repars de lui
//            à chaque tour (TODO 2) ; sans limite, la grille vide ferait
//            tourner la boucle presque indéfiniment.
// (Indice 3 en fin de fichier.)
async function findSolutions(puzzle: Grid, limit: number): Promise<Grid[]> {
  return undefined; // ← à remplacer
}

// TODO 4 — Classer une grille.
// Objectif : traduire le nombre de solutions trouvées en verdict.
// Entrée   : solutions, les grilles renvoyées par findSolutions.
// Sortie   : "sans solution" (aucune grille), "unique" (une) ou "multiple"
//            (deux ou plus).
// Exemple  : classifyPuzzle([]) → "sans solution" ;
//            classifyPuzzle([SOLUTION]) → "unique".
// Attention: avec findSolutions(puzzle, 2), « multiple » veut dire « au moins
//            deux » : on ne sait pas combien il y en a en tout.
// (Indice 4 en fin de fichier.)
function classifyPuzzle(solutions: Grid[]): Uniqueness {
  return undefined; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Pourquoi la contrainte ≤ 80 exclut-elle la grille trouvée, et
//     AUCUNE autre grille valide ?
//  b) La grille vide a environ 6,7 × 10²¹ solutions. Pourquoi une limite
//     de 2 suffit-elle pour décider si une grille est unique ?
//  c) Combien d'appels au solveur faut-il pour trouver k solutions et
//     prouver qu'il n'y en a pas d'autre ? Cette méthode convient-elle pour
//     compter des milliers de solutions ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (buildExclusionConstraint) — les termes :
//   INDICES.flatMap(row => INDICES.map(col => ({ name: variableName(row, col, grid[row][col]), coef: 1 })))
//   et les bornes { type: glpk.GLP_UP, lb: 0, ub: 80 }.
//
// Indice 2 (withExclusions) — { ...model, subjectTo: [...model.subjectTo, ...nouvelles] } ;
//   les nouvelles : excludedGrids.map((grid, exclusionIndex) => buildExclusionConstraint(grid, exclusionIndex)).
//
// Indice 3 (findSolutions) — schéma :
//     const baseModel = buildSudokuModel(puzzle);
//     const solutions: Grid[] = [];
//     while (solutions.length < limit) {
//       const answer = await solveModel(withExclusions(baseModel, solutions));
//       if (…) break;
//       solutions.push(readGrid(answer.vars));
//     }
//     return solutions;
//   (solutions est un tableau local, créé par la fonction : le modifier ne
//   touche à rien de l'extérieur.)
//
// Indice 4 (classifyPuzzle) — deux tests sur solutions.length suffisent.
