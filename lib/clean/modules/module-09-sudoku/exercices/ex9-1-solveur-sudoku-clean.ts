/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 9 — Exercice 9.1 : Solveur de sudoku
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-09-sudoku/module-09-sudoku.md (§2 à §5)
 *  Niveau : ★★★   Durée indicative : 1 h
 *  Lancer : node modules/module-09-sudoku/exercices/ex9-1-solveur-sudoku.ts
 *
 *  OBJECTIF
 *  Résoudre n'importe quelle grille de sudoku avec GLPK, en écrivant
 *  seulement les RÈGLES du jeu sous forme de MILP, puis vérifier la
 *  grille obtenue avec un code indépendant :
 *  - écrire la brique commune à toutes les contraintes, « exactement une
 *    de ces variables vaut 1 » (TODO 1) ;
 *  - repérer les 9 cases d'un bloc 3×3 (TODO 2) ;
 *  - générer les 324 contraintes des règles du sudoku (TODO 3) ;
 *  - générer une contrainte par chiffre donné dans la grille (TODO 4) ;
 *  - assembler le modèle complet (TODO 5) ;
 *  - relire la grille dans la réponse du solveur (TODO 6) ;
 *  - VÉRIFIER une grille sans utiliser le modèle (TODO 7).
 *
 *  PRÉREQUIS
 *  - Module 6, exercices 6.1 et 6.2 (structure d'un modèle, GLP_FX, statuts,
 *    seuil 0,5, modèle généré à partir des données).
 *  - Module 3 : variables binaires et contraintes Σ x = 1.
 *  - TypeScript : map, flatMap, filter, find, spread [...a, ...b],
 *    tuples ([number, number]).
 *
 *  CONSIGNE
 *  Les variables : pour chaque case (ligne l, colonne c) et chaque
 *  chiffre v, une variable binaire x_{l,c,v} qui vaut 1 si la case
 *  contient v. Son nom est donné par variableName(l, c, v) (fourni).
 *  Lignes, colonnes et blocs sont numérotés de 0 à 8 ; les blocs de
 *  gauche à droite, puis de haut en bas :
 *        0 | 1 | 2
 *        3 | 4 | 5
 *        6 | 7 | 8
 *    1. exactlyOne(name, variableNames) : la contrainte Σ x = 1.
 *    2. boxCells(boxIndex) : les 9 cases du bloc, ligne par ligne.
 *    3. buildRuleConstraints() — 4 familles de 81 contraintes, dans cet
 *       ordre et avec ces noms :
 *         `case_${row}_${col}`        un seul chiffre par case
 *         `ligne_${row}_${digit}`     chaque chiffre une fois par ligne
 *         `colonne_${col}_${digit}`   chaque chiffre une fois par colonne
 *         `bloc_${boxIndex}_${digit}` chaque chiffre une fois par bloc
 *       (boucle extérieure sur la case, la ligne, la colonne ou le bloc ;
 *       boucle intérieure sur la colonne ou le chiffre).
 *    4. buildGivenConstraints(puzzle) : `donne_${row}_${col}` pour chaque
 *       case non vide, ligne par ligne.
 *    5. buildSudokuModel(puzzle) : objectif sans effet, les contraintes
 *       des TODO 3 puis 4, les 729 binaires.
 *    6. readGrid(vars) : la grille lue dans la réponse du solveur.
 *    7. findGridErrors(grid, puzzle) — messages, dans cet ordre :
 *         `case vide : (${row}, ${col})`
 *         `chiffre donné modifié : (${row}, ${col})`
 *             (ces deux-là case par case, ligne par ligne)
 *         `doublon ligne ${row} : ${digit}`
 *         `doublon colonne ${col} : ${digit}`
 *         `doublon bloc ${boxIndex} : ${digit}`
 *    8. Lance le script, observe la grille résolue et le statut de la
 *       grille contradictoire, puis réponds aux QUESTIONS.
 *
 *  RÉSULTAT ATTENDU
 *  729 variables, 354 contraintes ; la grille résolue est validée
 *  (« vérification : OK ») ; la grille contradictoire a le statut 4.
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — « Exactement une de ces variables vaut 1 ».
// Objectif : écrire la contrainte Σ x = 1 sur une liste de variables. Toutes
//            les règles du sudoku, et même les chiffres donnés, ont cette forme.
// Entrée   : name, le nom de la contrainte, ex. "case_0_0" ;
//            variableNames, les noms des variables à sommer,
//              ex. ["x_0_0_1", "x_0_0_2", …, "x_0_0_9"].
// Sortie   : une GlpkConstraint :
//            name, le nom reçu ;
//            vars, un terme { name, coef: 1 } par variable, dans l'ordre reçu ;
//            bnds, de type glpk.GLP_FX avec lb = ub = 1.
// Exemple  : exactlyOne("test", ["a", "b"])
//            → { name: "test", vars: [{ name: "a", coef: 1 }, { name: "b", coef: 1 }],
//                bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 } }.
// Attention: avec GLP_FX, lb et ub doivent valoir tous les deux 1.
// (Indice 1 en fin de fichier.)
function exactlyOne(name: string, variableNames: string[]): GlpkConstraint {
  return undefined; // ← à remplacer
}

// TODO 2 — Les 9 cases d'un bloc 3×3.
// Objectif : donner les cases [ligne, colonne] du bloc boxIndex, pour écrire
//            ensuite la règle « chaque chiffre une fois par bloc ».
// Entrée   : boxIndex, le numéro du bloc, de 0 à 8 (schéma dans la CONSIGNE).
// Sortie   : un tableau de 9 cases [ligne, colonne], ligne par ligne, puis
//            de gauche à droite dans chaque ligne.
// Exemple  : boxCells(0) → [[0, 0], [0, 1], [0, 2], [1, 0], …, [2, 2]] ;
//            boxCells(5) → [[3, 6], [3, 7], [3, 8], [4, 6], …, [5, 8]].
// Attention: la ligne de départ dépend de boxIndex divisé par 3, la colonne
//            de départ du reste de cette division.
// (Indice 2 en fin de fichier.)
function boxCells(boxIndex: number): Cell[] {
  return undefined; // ← à remplacer
}

// TODO 3 — Les règles du sudoku.
// Objectif : générer, avec exactlyOne, les 324 contraintes qui définissent
//            une grille valide, en quatre familles de 81, dans cet ordre :
//            - une par case (ligne, colonne) : un seul chiffre dans la case ;
//            - une par (ligne, chiffre) : le chiffre une fois dans la ligne ;
//            - une par (colonne, chiffre) : le chiffre une fois dans la colonne ;
//            - une par (bloc, chiffre) : le chiffre une fois dans le bloc.
//            Aucune contrainte n'est écrite à la main : tout se déduit de
//            INDICES, DIGITS et boxCells.
// Entrée   : aucune (les règles ne dépendent pas de la grille).
// Sortie   : un tableau de 324 GlpkConstraint de 9 termes chacune, nommées
//            comme dans la CONSIGNE 3.
// Exemple  : buildRuleConstraints()[0] → "case_0_0", sur x_0_0_1 … x_0_0_9 ;
//            buildRuleConstraints()[81] → "ligne_0_1", sur x_0_0_1 … x_0_8_1 ;
//            buildRuleConstraints()[243] → "bloc_0_1", sur les 9 cases du bloc 0.
// Attention: une famille oubliée ne provoque aucune erreur : GLPK renvoie une
//            grille « optimale » qui n'est pas un sudoku. Seul le TODO 7 le verra.
// (Indice 3 en fin de fichier.)
function buildRuleConstraints(): GlpkConstraint[] {
  return undefined; // ← à remplacer
}

// TODO 4 — Les chiffres donnés.
// Objectif : imposer chaque chiffre déjà écrit dans la grille, par une
//            contrainte x_{l,c,v} = 1 sur une seule variable.
// Entrée   : puzzle, la grille à résoudre (0 = case vide), ex. PUZZLE.
// Sortie   : un tableau de GlpkConstraint, une par case non vide, ligne par
//            ligne, nommées `donne_${row}_${col}`.
// Exemple  : buildGivenConstraints(PUZZLE) → 30 contraintes ; la première,
//            "donne_0_0", porte sur la seule variable x_0_0_5.
// Attention: les cases vides (0) ne produisent aucune contrainte.
// (Indice 4 en fin de fichier.)
function buildGivenConstraints(puzzle: Grid): GlpkConstraint[] {
  return undefined; // ← à remplacer
}

// TODO 5 — Le modèle complet.
// Objectif : assembler le MILP du sudoku. Il n'y a rien à optimiser : on
//            cherche seulement une grille qui respecte toutes les contraintes.
// Entrée   : puzzle, la grille à résoudre, ex. PUZZLE.
// Sortie   : un Model :
//            name, "sudoku" ;
//            objective, en maximisation, avec une seule variable de
//              coefficient 0 (glpk.js exige au moins un terme) ;
//            subjectTo, les règles (TODO 3) puis les chiffres donnés (TODO 4) ;
//            binaries, les 729 variables x_{l,c,v}.
// Exemple  : buildSudokuModel(PUZZLE) → 729 binaires, 324 + 30 = 354 contraintes.
// Attention: une variable absente de binaries serait continue : GLPK pourrait
//            alors répartir une case entre plusieurs chiffres.
// (Indice 5 en fin de fichier.)
function buildSudokuModel(puzzle: Grid): Model {
  return undefined; // ← à remplacer
}

// TODO 6 — Relire la grille.
// Objectif : traduire la réponse du solveur en grille de chiffres : pour
//            chaque case, le chiffre dont la variable vaut 1.
// Entrée   : vars, la valeur de chaque variable renvoyée par le solveur,
//              ex. { x_0_0_5: 1, x_0_0_1: 0, … }.
// Sortie   : une Grid de 9 × 9 chiffres ; 0 pour une case dont aucune
//            variable ne vaut 1.
// Exemple  : readGrid({ x_0_0_5: 1, x_0_1_3: 0.9999999, x_0_2_4: 0.0000001 })[0]
//            → [5, 3, 0, 0, 0, 0, 0, 0, 0].
// Attention: un binaire peut revenir sous la forme 0,9999999 : compare à 0,5.
//            Une variable absente de vars compte pour 0.
// (Indice 6 en fin de fichier.)
function readGrid(vars: Record<string, number>): Grid {
  return undefined; // ← à remplacer
}

// TODO 7 — Vérificateur indépendant d'une grille.
// Objectif : contrôler une grille SANS utiliser le modèle, pour détecter une
//            erreur dans les TODO 3 à 5. Cinq contrôles, dans cet ordre :
//            - pour chaque case, ligne par ligne : la case est vide, ou elle
//              ne contient pas le chiffre donné par puzzle ;
//            - pour chaque ligne : les chiffres présents plusieurs fois ;
//            - pour chaque colonne : les chiffres présents plusieurs fois ;
//            - pour chaque bloc : les chiffres présents plusieurs fois.
// Entrée   : grid, la grille à vérifier, ex. une grille relue par readGrid ;
//            puzzle, la grille de départ, ex. PUZZLE.
// Sortie   : un tableau de messages d'erreur (string[]), vide si la grille
//            est valide (textes exacts dans la CONSIGNE 7).
// Exemple  : findGridErrors(SOLUTION, PUZZLE) → [] ;
//            avec les deux premières cases de SOLUTION échangées (3, 5, …)
//            → ["chiffre donné modifié : (0, 0)", "chiffre donné modifié : (0, 1)",
//               "doublon colonne 0 : 3", "doublon colonne 1 : 5"].
// Attention: une case vide produit seulement « case vide », jamais « chiffre
//            donné modifié » ; un chiffre en double produit un seul message par
//            groupe ; les cases vides ne comptent pas comme des doublons.
// (Indice 7 en fin de fichier.)
function findGridErrors(grid: Grid, puzzle: Grid): string[] {
  const errors: string[] = [];
  // ... à compléter
  return errors;
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Pourquoi le modèle n'a-t-il pas de véritable objectif ? Que changerait
//     un objectif quelconque, par exemple MAX Σ_v v · x_{0,0,v} ?
//  b) Le modèle a 729 variables binaires, soit 2^729 combinaisons. Pourquoi
//     GLPK le résout-il pourtant en une fraction de seconde ?
//  c) Comment vérifier, avec un second appel au solveur, que la solution
//     trouvée est la SEULE solution de la grille ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (exactlyOne) — variableNames.map(variable => ({ name: variable, coef: 1 }))
//   donne les termes ; les bornes s'écrivent { type: glpk.GLP_FX, lb: 1, ub: 1 }.
//
// Indice 2 (boxCells) — firstRow = Math.floor(boxIndex / 3) * 3 et
//   firstCol = (boxIndex % 3) * 3 ; puis, pour i de 0 à 8 (INDICES.map) :
//   [firstRow + Math.floor(i / 3), firstCol + (i % 3)].
//
// Indice 3 (buildRuleConstraints) — flatMap aplatit les doubles boucles :
//     INDICES.flatMap(row => INDICES.map(col =>
//       exactlyOne(`case_${row}_${col}`, DIGITS.map(digit => variableName(row, col, digit)))))
//   Les trois autres familles suivent le même schéma ; pour les blocs :
//   boxCells(boxIndex).map(([row, col]) => variableName(row, col, digit)).
//   Assemble les quatre tableaux avec [...famille1, ...famille2, …].
//
// Indice 4 (buildGivenConstraints) — INDICES.flatMap(row => INDICES
//   .filter(col => puzzle[row][col] !== 0)
//   .map(col => exactlyOne(…, [variableName(row, col, puzzle[row][col])]))).
//
// Indice 5 (buildSudokuModel) — objectif possible :
//   { direction: glpk.GLP_MAX, name: "aucun", vars: [{ name: variableName(0, 0, 1), coef: 0 }] } ;
//   les binaires : une triple boucle INDICES / INDICES / DIGITS avec flatMap.
//
// Indice 6 (readGrid) — INDICES.map(row => INDICES.map(col => …)) ; dans la
//   case : DIGITS.find(digit => (vars[variableName(row, col, digit)] ?? 0) > 0.5) ?? 0.
//
// Indice 7 (findGridErrors) — une fonction locale qui reçoit un libellé
//   (ex. "ligne 3") et une liste de cases, et renvoie un message par chiffre
//   présent plus d'une fois parmi ces cases :
//     DIGITS.filter(digit => cells.filter(([row, col]) => grid[row][col] === digit).length > 1)
//   Les cases d'une ligne : INDICES.map(col => [row, col]) ; d'un bloc : boxCells(boxIndex).
