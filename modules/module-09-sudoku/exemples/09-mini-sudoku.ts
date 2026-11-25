// Module 9 — Exemple commenté : un mini-sudoku 4×4 résolu par GLPK
// Lancer : npm run tp9
//
// Même méthode que pour le 9×9, en plus petit pour pouvoir tout afficher :
// 4 lignes, 4 colonnes, 4 blocs 2×2 et les chiffres 1 à 4.
//   variables   : x_{l,c,v} = 1 si la case (l, c) contient v → 4 × 4 × 4 = 64 binaires
//   contraintes : 4 familles de 16 « Σ x = 1 » + 1 contrainte par chiffre donné
//   objectif    : aucun (coefficient 0) : on cherche une grille réalisable
//
// Toutes les fonctions sont pures : elles ne dépendent que de leurs paramètres
// et des constantes de la section DONNÉES. Seul le programme principal, à la
// fin, appelle le solveur et affiche.

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";

// ─── Données ────────────────────────────────────────────────────
type Model = LP & { binaries: string[] };
type GlpkConstraint = LP["subjectTo"][number];
type SolverOutput = Result;
type Grid = number[][];        // 0 = case vide
type Cell = [number, number];  // [ligne, colonne]

const BOX_SIZE = 2;
const INDICES = [0, 1, 2, 3];  // numéros de ligne, de colonne et de bloc
const DIGITS = [1, 2, 3, 4];

const PUZZLE: Grid = [
  [1, 0, 0, 0],
  [0, 0, 3, 0],
  [0, 4, 0, 0],
  [0, 0, 0, 2]
];

const glpk = await GLPK();

// ─── Fonctions pures ────────────────────────────────────────────

// Nom de la variable « la case (row, col) contient digit », ex. "x_0_1_3".
const variableName = (row: number, col: number, digit: number): string => `x_${row}_${col}_${digit}`;

// La brique unique du modèle : « exactement une de ces variables vaut 1 ».
// GLP_FX avec lb = ub = 1 traduit l'égalité Σ x = 1.
const exactlyOne = (name: string, variableNames: string[]): GlpkConstraint => ({
  name,
  vars: variableNames.map(variable => ({ name: variable, coef: 1 })),
  bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
});

// Les cases du bloc boxIndex. Les blocs sont numérotés ligne par ligne :
//   0 | 1
//   2 | 3
// Le bloc 3 commence à la ligne 2 (⌊3 / 2⌋ × 2) et à la colonne 2 ((3 mod 2) × 2).
const boxCells = (boxIndex: number): Cell[] => {
  const firstRow = Math.floor(boxIndex / BOX_SIZE) * BOX_SIZE;
  const firstCol = (boxIndex % BOX_SIZE) * BOX_SIZE;
  return INDICES.map((i): Cell => [firstRow + Math.floor(i / BOX_SIZE), firstCol + (i % BOX_SIZE)]);
};

// Les règles du jeu : 4 familles de 16 contraintes. Chaque famille fixe deux
// indices et somme sur le troisième. flatMap aplatit la double boucle en un
// seul tableau.
const buildRuleConstraints = (): GlpkConstraint[] => [
  // (ligne, colonne) fixées, somme sur les chiffres : un chiffre par case
  ...INDICES.flatMap(row => INDICES.map(col =>
    exactlyOne(`case_${row}_${col}`, DIGITS.map(digit => variableName(row, col, digit))))),
  // (ligne, chiffre) fixés, somme sur les colonnes : chiffre une fois par ligne
  ...INDICES.flatMap(row => DIGITS.map(digit =>
    exactlyOne(`ligne_${row}_${digit}`, INDICES.map(col => variableName(row, col, digit))))),
  // (colonne, chiffre) fixés, somme sur les lignes : chiffre une fois par colonne
  ...INDICES.flatMap(col => DIGITS.map(digit =>
    exactlyOne(`colonne_${col}_${digit}`, INDICES.map(row => variableName(row, col, digit))))),
  // (bloc, chiffre) fixés, somme sur les cases du bloc : chiffre une fois par bloc
  ...INDICES.flatMap(boxIndex => DIGITS.map(digit =>
    exactlyOne(`bloc_${boxIndex}_${digit}`,
      boxCells(boxIndex).map(([row, col]) => variableName(row, col, digit)))))
];

// Un chiffre donné est une contrainte à UNE variable : x_{l,c,v} = 1.
const buildGivenConstraints = (puzzle: Grid): GlpkConstraint[] =>
  INDICES.flatMap(row => INDICES
    .filter(col => puzzle[row][col] !== 0)
    .map(col => exactlyOne(`donne_${row}_${col}`, [variableName(row, col, puzzle[row][col])])));

// Le modèle complet. glpk.js exige un objectif : une variable de coefficient 0
// suffit, puisque toutes les grilles valides se valent.
const buildSudokuModel = (puzzle: Grid): Model => ({
  name: "mini_sudoku",
  objective: { direction: glpk.GLP_MAX, name: "aucun", vars: [{ name: variableName(0, 0, 1), coef: 0 }] },
  subjectTo: [...buildRuleConstraints(), ...buildGivenConstraints(puzzle)],
  binaries: INDICES.flatMap(row => INDICES.flatMap(col => DIGITS.map(digit => variableName(row, col, digit))))
});

// Relecture : dans chaque case, le chiffre dont la variable vaut 1
// (seuil 0,5, car un binaire peut revenir sous la forme 0,9999999).
const readGrid = (vars: Record<string, number>): Grid =>
  INDICES.map(row => INDICES.map(col =>
    DIGITS.find(digit => (vars[variableName(row, col, digit)] ?? 0) > 0.5) ?? 0));

const formatGrid = (grid: Grid): string =>
  grid.map(rowValues => rowValues.map(digit => digit || ".").join(" ")).join("\n");

// ─── Programme principal ────────────────────────────────────────
const model = buildSudokuModel(PUZZLE);
console.log("Grille de départ :");
console.log(formatGrid(PUZZLE));
console.log(`\nModèle : ${model.binaries.length} binaires, ${model.subjectTo.length} contraintes`
  + ` (4 × 16 règles + ${model.subjectTo.length - 64} chiffres donnés)`);
console.log("Exemple de contrainte de bloc :", JSON.stringify(model.subjectTo[48]));

const solverOutput: SolverOutput = await glpk.solve(model, { msglev: glpk.GLP_MSG_OFF, presol: true });
if (solverOutput.result.status !== glpk.GLP_OPT) {
  console.log(`\nAucune solution (statut ${solverOutput.result.status}).`);
} else {
  console.log("\nGrille résolue :");
  console.log(formatGrid(readGrid(solverOutput.result.vars)));
}
