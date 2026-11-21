// Module 8 — Exemple commenté : assemblage d'un test IRT 2PL par optimisation MILP (glpk.js).
// Lancer : npm run tp8-solveur
// Dépendance : npm install glpk.js
// Sous Node.js, importer « glpk.js/node » (« glpk.js » charge la version navigateur).
import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";

// Item de la banque : a = discrimination, b = difficulté.
type Item = {
  id: string;
  a: number;
  b: number;
  domain: string;
};

// Item enrichi de son coefficient dans la fonction objectif.
type ScoredItem = Item & { score: number };

// Format de modèle attendu par glpk.solve, et réponse du solveur (types de glpk.js).
type Model = LP;
type SolverOutput = Result;

// Contrainte linéaire : lb <= somme(coef * variable) <= ub, selon bnds.type.
type GlpkConstraint = LP["subjectTo"][number];

// Terme coef * variable d'une expression linéaire.
type Term = GlpkConstraint["vars"][number];

// Constantes de GLPK utilisées pour construire le modèle et lire le statut.
type GlpkConstants = {
  GLP_MAX: number;  // Maximisation.
  GLP_FX: number;   // Contrainte « = lb ».
  GLP_LO: number;   // Contrainte « >= lb ».
  GLP_UP: number;   // Contrainte « <= ub ».
  GLP_OPT: number;  // Statut : solution optimale.
  GLP_FEAS: number; // Statut : solution réalisable.
};

// ─── Données ────────────────────────────────────────────────────

// Jeu synthétique de 12 items. Remplacer par les paramètres validés de la banque.
const ITEMS: Item[] = [
  { id: "q01", a: 1.2, b: -1.0, domain: "A" },
  { id: "q02", a: 1.8, b: -0.5, domain: "A" },
  { id: "q03", a: 0.9, b: 0.0, domain: "A" },
  { id: "q04", a: 1.5, b: 0.4, domain: "B" },
  { id: "q05", a: 2.0, b: 0.8, domain: "B" },
  { id: "q06", a: 1.1, b: 1.2, domain: "B" },
  { id: "q07", a: 1.4, b: -0.8, domain: "C" },
  { id: "q08", a: 1.7, b: -0.1, domain: "C" },
  { id: "q09", a: 0.8, b: 0.3, domain: "C" },
  { id: "q10", a: 1.9, b: 0.9, domain: "D" },
  { id: "q11", a: 1.3, b: 1.4, domain: "D" },
  { id: "q12", a: 1.6, b: 0.1, domain: "D" }
];

// Les coefficients d'information sont calculés à plusieurs niveaux theta.
// Les poids définissent ici une moyenne uniforme sur la grille.
const THETA_GRID = [-1, 0, 1];
const WEIGHTS = [1 / 3, 1 / 3, 1 / 3];

// Règles d'assemblage, exprimées comme des données.
const TEST_LENGTH = 6;
const REQUIRED_DOMAINS: string[] = ["A", "B", "C", "D"];
const EXCLUDED_PAIR: [string, string] = ["q02", "q05"];

// ─── Calculs (fonctions pures) ──────────────────────────────────

// Fonction d'information d'un item dichotomique 2PL.
// Attention : formule sans facteur d'échelle D. Adapter si la calibration utilise D=1.7.
function information2PL(discrimination: number, difficulty: number, theta: number): number {
  const probability = 1 / (1 + Math.exp(-discrimination * (theta - difficulty))); // P(réponse correcte | theta)
  return discrimination ** 2 * probability * (1 - probability);                  // Information de Fisher
}

// Ajoute à chaque item son coefficient d'objectif, sans modifier la banque d'origine.
// weights doit avoir la même longueur que thetaGrid.
const scoreItems = (items: Item[], thetaGrid: number[], weights: number[]): ScoredItem[] =>
  items.map(item => ({
    ...item,
    score: thetaGrid.reduce((total, theta, thetaIndex) =>
      total + weights[thetaIndex] * information2PL(item.a, item.b, theta), 0)
  }));

// Terme x_i avec un coefficient 1 : sert aux contraintes de comptage.
const toUnitTerm = (item: Item): Term => ({ name: item.id, coef: 1 });

// Fonction pure : construit toutes les contraintes linéaires du modèle.
function buildConstraints(glpk: GlpkConstants, items: Item[]): GlpkConstraint[] {
  // La contrainte de longueur impose exactement TEST_LENGTH items.
  const lengthConstraint: GlpkConstraint = {
    name: `longueur_exacte_${TEST_LENGTH}`,
    vars: items.map(toUnitTerm),
    bnds: { type: glpk.GLP_FX, lb: TEST_LENGTH, ub: TEST_LENGTH }
  };

  // Pour chaque domaine, impose au moins un item.
  // Chaque ligne est une contrainte linéaire indépendante.
  const domainConstraints: GlpkConstraint[] = REQUIRED_DOMAINS.map(domain => ({
    name: `quota_${domain}`,
    vars: items.filter(item => item.domain === domain).map(toUnitTerm),
    bnds: { type: glpk.GLP_LO, lb: 1, ub: 0 }
  }));

  // Exclusion : les deux items ne peuvent pas être sélectionnés ensemble.
  // x_q02 + x_q05 <= 1.
  const exclusionConstraint: GlpkConstraint = {
    name: `exclusion_${EXCLUDED_PAIR.join("_")}`,
    vars: EXCLUDED_PAIR.map(id => ({ name: id, coef: 1 })),
    bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
  };

  return [lengthConstraint, ...domainConstraints, exclusionConstraint];
}

// Assemble la formulation mathématique :
// max somme(score_i * x_i), sous contraintes, avec x_i binaire.
const buildAssemblyModel = (glpk: GlpkConstants, scoredItems: ScoredItem[]): Model => ({
  name: "assemblage_irt_2pl",
  objective: {
    direction: glpk.GLP_MAX,
    name: "information_moyenne_ponderee",
    vars: scoredItems.map(item => ({ name: item.id, coef: item.score }))
  },
  subjectTo: buildConstraints(glpk, scoredItems),
  binaries: scoredItems.map(item => item.id)
});

// Une solution n'est exploitable que si GLPK la déclare optimale ou réalisable.
const hasUsableSolution = (glpk: GlpkConstants, solverOutput: SolverOutput): boolean =>
  [glpk.GLP_OPT, glpk.GLP_FEAS].includes(solverOutput.result.status);

// Récupère les items dont la variable binaire vaut environ 1.
// Le seuil 0.5 évite les petits écarts numériques autour de 0 ou 1.
const extractSelectedItems = (scoredItems: ScoredItem[], solverOutput: SolverOutput): ScoredItem[] =>
  scoredItems.filter(item => (solverOutput.result.vars[item.id] ?? 0) > 0.5);

const computeTotalScore = (selectedItems: ScoredItem[]): number =>
  selectedItems.reduce((total, item) => total + item.score, 0);

// ─── Résolution et affichage ────────────────────────────────────

// Initialise GLPK (solveur MILP compilé en WebAssembly).
const glpk = await GLPK();

const scoredItems = scoreItems(ITEMS, THETA_GRID, WEIGHTS);

// Résout le modèle. Le résultat contient notamment le statut et les variables.
const solverOutput: SolverOutput = await glpk.solve(buildAssemblyModel(glpk, scoredItems), {
  msglev: glpk.GLP_MSG_OFF,
  presol: true
});

console.log("Statut / résultat solveur :", solverOutput);

if (!hasUsableSolution(glpk, solverOutput)) {
  console.error("Aucune solution exploitable : vérifier la faisabilité du modèle.");
  process.exit(1);
}

// Contrôle post-résolution : longueur, quotas et exclusion.
// En production, ajouter un validateur complet (voir module 7).
const selectedItems = extractSelectedItems(scoredItems, solverOutput);
console.log("Items sélectionnés :", selectedItems.map(item => item.id));
console.log("Domaines sélectionnés :", selectedItems.map(item => item.domain));
console.log("Information moyenne de l'objectif :", computeTotalScore(selectedItems));
