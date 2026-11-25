/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 9 — Exercice 9.1 : Solveur de sudoku — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-09-sudoku/module-09-sudoku.md (§2 à §5)
 *  Lancer : node modules/module-09-sudoku/corriges/ex9-1-solveur-sudoku.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  1. Le choix des variables fait tout le modèle
 *     On ne cherche pas « le chiffre de la case » (une variable entière
 *     de 1 à 9, difficile à contraindre linéairement) mais, pour chaque
 *     case ET chaque chiffre, une variable binaire :
 *       x_{l,c,v} = 1  ⇔  la case (ligne l, colonne c) contient v.
 *     Cela fait 9 × 9 × 9 = 729 binaires. Avec elles, « tous différents »
 *     devient une simple somme.
 *
 *  2. Une seule forme de contrainte : Σ x = 1 (GLP_FX, lb = ub = 1)
 *       case    (l, c)  : Σ_v x_{l,c,v} = 1   un seul chiffre par case
 *       ligne   (l, v)  : Σ_c x_{l,c,v} = 1   v une fois dans la ligne l
 *       colonne (c, v)  : Σ_l x_{l,c,v} = 1   v une fois dans la colonne c
 *       bloc    (b, v)  : Σ_{(l,c)∈b} x_{l,c,v} = 1
 *     soit 4 × 81 = 324 contraintes, générées à partir de INDICES, DIGITS
 *     et boxCells : aucune n'est écrite à la main. Les chiffres donnés
 *     sont des contraintes à une seule variable : x_{l,c,v} = 1.
 *
 *  3. Pas d'objectif
 *     Toutes les grilles complètes respectent les mêmes règles : il n'y a
 *     rien à maximiser. glpk.js exige pourtant un objectif ; on met une
 *     variable avec un coefficient 0. Le solveur s'arrête alors à la
 *     première solution réalisable, qui est prouvée optimale (statut
 *     GLP_OPT) puisque toutes valent 0.
 *
 *  4. Lecture et vérification
 *     readGrid relit, pour chaque case, le chiffre dont la variable
 *     dépasse 0,5 (un binaire peut revenir sous la forme 0,9999999).
 *     findGridErrors repart de la grille seule, sans le modèle : si une
 *     famille de contraintes manquait dans buildRuleConstraints, la
 *     grille renvoyée aurait des doublons et la vérification le dirait.
 *
 *  Pièges fréquents
 *  - Oublier une famille (souvent les blocs) : GLPK renvoie une grille
 *    « optimale » qui n'est pas un sudoku valide. D'où la vérification
 *    indépendante.
 *  - Se tromper dans boxCells (ligne et colonne inversées, mauvais
 *    départ du bloc) : les contraintes de bloc portent alors sur 9 cases
 *    qui ne forment pas un carré 3×3.
 *  - Lire les variables sans tester le statut : pour une grille
 *    contradictoire, toutes valent 0 et readGrid renverrait une grille
 *    vide.
 *
 *  Réponses aux questions
 *  a) Il n'y a rien à optimiser : on cherche une solution réalisable.
 *     Avec un objectif quelconque (par ex. MAX Σ x_{0,0,v} · v), GLPK
 *     renverrait toujours une grille valide, mais parmi plusieurs
 *     solutions possibles il choisirait celle qui maximise cet objectif.
 *  b) 729 variables, 324 + 30 = 354 contraintes. Les 2^729 combinaisons
 *     ne sont jamais énumérées : la relaxation continue de ce modèle est
 *     serrée (les chiffres donnés fixent beaucoup de variables, et chaque
 *     variable fixée à 1 en force d'autres à 0), si bien que GLPK trouve la
 *     solution en explorant très peu de nœuds.
 *  c) On ajoute une contrainte qui interdit la solution trouvée :
 *     Σ des 81 variables qui valent 1 ≤ 80 (« au moins une case
 *     change »), puis on relance. Si le statut est GLP_NOFEAS, la
 *     solution était unique ; sinon, on obtient une deuxième grille.
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

// Solution de PUZZLE, utilisée par l'auto-vérification.
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

// PUZZLE avec un 5 de trop sur la première ligne : aucune solution.
const CONTRADICTORY_PUZZLE: Grid = PUZZLE.map((rowValues, row) =>
  row === 0 ? [5, 3, 5, ...rowValues.slice(3)] : rowValues);

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────

// Nom de la variable binaire x_{ligne,colonne,chiffre}, ex. variableName(0, 2, 4) → "x_0_2_4".
const variableName = (row: number, col: number, digit: number): string => `x_${row}_${col}_${digit}`;

// Grille affichable : une ligne de texte par ligne de la grille.
const formatGrid = (grid: Grid): string =>
  grid.map(rowValues => rowValues.join(" ")).join("\n");

// Résout un modèle et renvoie { status, vars }. Refuse de lancer GLPK sur un
// modèle visiblement incomplet, car un modèle sans variable fait planter le
// module WebAssembly (« Aborted() »).
async function solveModel(model: Model): Promise<SolverAnswer | null> {
  const isComplete = model?.objective?.vars?.length > 0
    && model.subjectTo?.length > 0
    && model.subjectTo.every(constraint => constraint?.vars?.length > 0);
  if (!isComplete) return null;
  const solverOutput: SolverOutput = await glpk.solve(model, { msglev: glpk.GLP_MSG_OFF, presol: true });
  return { status: solverOutput.result.status, vars: solverOutput.result.vars };
}

// ─── 3. FONCTIONS ───────────────────────────────────────────────

function exactlyOne(name: string, variableNames: string[]): GlpkConstraint {
  return {
    name,
    vars: variableNames.map(variable => ({ name: variable, coef: 1 })),
    bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
  };
}

function boxCells(boxIndex: number): Cell[] {
  const firstRow = Math.floor(boxIndex / BOX_SIZE) * BOX_SIZE;
  const firstCol = (boxIndex % BOX_SIZE) * BOX_SIZE;
  return INDICES.map((i): Cell => [firstRow + Math.floor(i / BOX_SIZE), firstCol + (i % BOX_SIZE)]);
}

function buildRuleConstraints(): GlpkConstraint[] {
  return [
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
}

function buildGivenConstraints(puzzle: Grid): GlpkConstraint[] {
  return INDICES.flatMap(row => INDICES
    .filter(col => puzzle[row][col] !== 0)
    .map(col => exactlyOne(`donne_${row}_${col}`, [variableName(row, col, puzzle[row][col])])));
}

function buildSudokuModel(puzzle: Grid): Model {
  return {
    name: "sudoku",
    objective: { direction: glpk.GLP_MAX, name: "aucun", vars: [{ name: variableName(0, 0, 1), coef: 0 }] },
    subjectTo: [...buildRuleConstraints(), ...buildGivenConstraints(puzzle)],
    binaries: INDICES.flatMap(row => INDICES.flatMap(col => DIGITS.map(digit => variableName(row, col, digit))))
  };
}

function readGrid(vars: Record<string, number>): Grid {
  return INDICES.map(row => INDICES.map(col =>
    DIGITS.find(digit => (vars[variableName(row, col, digit)] ?? 0) > 0.5) ?? 0));
}

function findGridErrors(grid: Grid, puzzle: Grid): string[] {
  const cellErrors = INDICES.flatMap(row => INDICES.flatMap(col => {
    if (grid[row][col] === 0) return [`case vide : (${row}, ${col})`];
    if (puzzle[row][col] !== 0 && grid[row][col] !== puzzle[row][col]) {
      return [`chiffre donné modifié : (${row}, ${col})`];
    }
    return [];
  }));
  // Un message par chiffre présent plusieurs fois parmi les cases d'un groupe.
  const findDuplicates = (groupLabel: string, cells: Cell[]): string[] =>
    DIGITS
      .filter(digit => cells.filter(([row, col]) => grid[row][col] === digit).length > 1)
      .map(digit => `doublon ${groupLabel} : ${digit}`);
  return [
    ...cellErrors,
    ...INDICES.flatMap(row => findDuplicates(`ligne ${row}`, INDICES.map((col): Cell => [row, col]))),
    ...INDICES.flatMap(col => findDuplicates(`colonne ${col}`, INDICES.map((row): Cell => [row, col]))),
    ...INDICES.flatMap(boxIndex => findDuplicates(`bloc ${boxIndex}`, boxCells(boxIndex)))
  ];
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Taille du modèle");
const model = buildSudokuModel(PUZZLE);
console.log(`${model?.binaries?.length ?? 0} variables binaires, ${model?.subjectTo?.length ?? 0} contraintes`);

printTitle("Résolution de la grille");
const answer = await solveModel(model);
if (answer === null) {
  console.log("Modèle incomplet : complète d'abord les TODO.");
} else if (answer.status !== glpk.GLP_OPT) {
  console.log(`Pas de solution (statut ${answer.status}).`);
} else {
  const solvedGrid = readGrid(answer.vars);
  console.log(formatGrid(solvedGrid));
  console.log("vérification :", findGridErrors(solvedGrid, PUZZLE).join(" ; ") || "OK");
}

printTitle("Grille contradictoire");
const contradictoryAnswer = await solveModel(buildSudokuModel(CONTRADICTORY_PUZZLE));
console.log(`statut : ${contradictoryAnswer?.status ?? "—"} (${glpk.GLP_NOFEAS} = aucune solution)`);

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("exactlyOne : Σ x = 1 en GLP_FX", () => exactlyOne("test", ["a", "b"]), {
  name: "test",
  vars: [{ name: "a", coef: 1 }, { name: "b", coef: 1 }],
  bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
});
check("boxCells(0) : le bloc en haut à gauche", () => boxCells(0),
  [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]);
check("boxCells(5) : le bloc du milieu à droite", () => boxCells(5),
  [[3, 6], [3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 6], [5, 7], [5, 8]]);
check("règles : 324 contraintes de 9 termes", () => {
  const constraints = buildRuleConstraints();
  return [constraints.length, constraints.every(constraint => constraint.vars.length === 9)];
}, [324, true]);
check("règles : familles dans l'ordre case, ligne, colonne, bloc", () =>
  [0, 81, 162, 243].map(position => buildRuleConstraints()[position].name),
  ["case_0_0", "ligne_0_1", "colonne_0_1", "bloc_0_1"]);
check("chiffres donnés : 30 contraintes, la première fixe x_0_0_5", () => {
  const constraints = buildGivenConstraints(PUZZLE);
  return [constraints.length, constraints[0].name, constraints[0].vars];
}, [30, "donne_0_0", [{ name: "x_0_0_5", coef: 1 }]]);
check("modèle : 729 binaires, 354 contraintes", () => {
  const sudokuModel = buildSudokuModel(PUZZLE);
  return [sudokuModel.binaries.length, sudokuModel.subjectTo.length];
}, [729, 354]);
check("readGrid : lit les binaires au seuil 0,5", () =>
  readGrid({ x_0_0_5: 1, x_0_1_3: 0.9999999, x_0_2_4: 0.0000001 })[0].slice(0, 3), [5, 3, 0]);
check("findGridErrors : la solution connue est valide", () => findGridErrors(SOLUTION, PUZZLE), []);
check("findGridErrors : deux chiffres donnés échangés", () => {
  const swappedGrid = SOLUTION.map((rowValues, row) =>
    row === 0 ? [rowValues[1], rowValues[0], ...rowValues.slice(2)] : rowValues);
  return findGridErrors(swappedGrid, PUZZLE);
}, ["chiffre donné modifié : (0, 0)", "chiffre donné modifié : (0, 1)", "doublon colonne 0 : 3", "doublon colonne 1 : 5"]);
check("findGridErrors : une case vide", () => {
  const gridWithHole = SOLUTION.map((rowValues, row) =>
    row === 8 ? [...rowValues.slice(0, 8), 0] : rowValues);
  return findGridErrors(gridWithHole, PUZZLE);
}, ["case vide : (8, 8)"]);
// Résout une grille et renvoie la réponse ; échoue (✘) tant que le modèle est incomplet.
async function solvePuzzle(puzzle: Grid): Promise<SolverAnswer> {
  const solverAnswer = await solveModel(buildSudokuModel(puzzle));
  if (!solverAnswer) throw new Error("modèle incomplet : buildSudokuModel ne renvoie pas encore de contraintes");
  return solverAnswer;
}
await checkAsync("PUZZLE : statut optimal et grille = SOLUTION", async () => {
  const solverAnswer = await solvePuzzle(PUZZLE);
  return [solverAnswer.status, readGrid(solverAnswer.vars)];
}, [glpk.GLP_OPT, SOLUTION]);
await checkAsync("grille contradictoire : aucune solution",
  async () => (await solvePuzzle(CONTRADICTORY_PUZZLE)).status, glpk.GLP_NOFEAS);
printSummary();
