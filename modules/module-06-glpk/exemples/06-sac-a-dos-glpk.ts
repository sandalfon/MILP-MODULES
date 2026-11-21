// Module 6 — Exemple commenté : résoudre un vrai modèle MILP (sac à dos) avec glpk.js.
// Lancer : npm run tp6
// Installation préalable : npm install glpk.js
// Sous Node.js, il faut importer la version « glpk.js/node » :
// l'import « glpk.js » charge la version navigateur et échoue au lancement.
import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";

type Product = {
  id: string;
  cost: number;
  value: number;
};

// Types fournis par glpk.js, renommés selon le glossaire du cours.
type Model = LP;                                   // format de modèle attendu par glpk.solve
type Term = LP["objective"]["vars"][number];       // terme { name, coef } : coef · variable
type SolverOutput = Result;                        // réponse de glpk.solve

// Constantes de GLPK utilisées pour construire le modèle.
type GlpkConstants = {
  GLP_MAX: number; // Maximisation.
  GLP_UP: number;  // Contrainte « <= ub ».
};

// ─── Données ─────────────────────────────────────────────────────
// Les données métier sont séparées du modèle : le modèle est généré à partir d'elles.
const PRODUCTS: Product[] = [
  { id: "A", cost: 30, value: 8 },
  { id: "B", cost: 50, value: 12 },
  { id: "C", cost: 40, value: 10 },
  { id: "D", cost: 20, value: 5 }
];
const BUDGET = 100;

// ─── Calcul (fonction pure) ──────────────────────────────────────
// Construit le modèle sans le résoudre.
// glpk n'est lu que pour ses constantes (GLP_MAX, GLP_UP).
function buildKnapsackModel(glpk: GlpkConstants, products: Product[], budget: number): Model {
  // Fonction objectif : maximiser la somme des valeurs des produits choisis.
  const objectiveTerms: Term[] = products.map(product => ({ name: product.id, coef: product.value }));
  // Coefficients des coûts dans la contrainte 30A+50B+40C+20D <= 100.
  const budgetTerms: Term[] = products.map(product => ({ name: product.id, coef: product.cost }));

  return {
    name: "selection_produits",
    objective: { direction: glpk.GLP_MAX, name: "satisfaction", vars: objectiveTerms },

    // Contraintes : ici une seule contrainte de budget.
    // GLP_UP signifie que la somme doit être inférieure ou égale à ub.
    subjectTo: [{
      name: "budget",
      vars: budgetTerms,
      bnds: { type: glpk.GLP_UP, ub: budget, lb: 0 }
    }],

    // Déclare toutes les variables comme binaires (0 ou 1).
    binaries: products.map(product => product.id)
  };
}

// ─── Résolution et affichage ─────────────────────────────────────
// GLPK est initialisé de manière asynchrone (chargement du WebAssembly) : await obligatoire.
const glpk = await GLPK();

// Lance le solveur. msglev désactive les logs détaillés ; presol active le presolve.
// Sous « glpk.js/node », solve est synchrone : le await est toléré (compatibilité navigateur).
const solverOutput: SolverOutput = await glpk.solve(buildKnapsackModel(glpk, PRODUCTS, BUDGET), {
  msglev: glpk.GLP_MSG_OFF,
  presol: true
});

// Affiche le statut et les valeurs de variables retournées par GLPK.
console.log(solverOutput);
