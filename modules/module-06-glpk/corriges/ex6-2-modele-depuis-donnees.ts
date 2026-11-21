/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 6 — Exercice 6.2 : Modèle généré depuis les données — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-06-glpk/module-06-glpk.md (§4, §6 et §8)
 *  Lancer : node modules/module-06-glpk/corriges/ex6-2-modele-depuis-donnees.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  1. Générer plutôt qu'écrire
 *     Chaque liste { name, coef } se déduit du tableau `products` par un
 *     map. Le modèle fonctionne alors à l'identique avec 4 produits ou
 *     avec 4 000 : seules les données changent.
 *       objectif    : products.map(product => ({ name: product.id, coef: product.value }))
 *       budget      : products.map(product => ({ name: product.id, coef: product.cost }))
 *       cardinalité : products.map(product => ({ name: product.id, coef: 1 }))
 *
 *  2. Contraintes optionnelles
 *     On ajoute la contrainte de cardinalité SEULEMENT si l'option est
 *     fournie (`!== undefined`, car 0 est une valeur légitime : « aucun
 *     produit »). Le type de borne traduit le sens de la règle :
 *       au plus K   → GLP_UP, ub = K
 *       exactement K → GLP_FX, lb = ub = K
 *
 *  3. Vérificateur indépendant
 *     validateSolution ne s'appuie PAS sur le modèle : il repart des
 *     identifiants choisis et des données brutes, et recalcule le coût
 *     et le nombre de produits. Une erreur dans buildModel (un
 *     mauvais coefficient, un GLP_LO à la place d'un GLP_UP…) produirait
 *     une solution que le vérificateur rejetterait.
 *
 *  Résultats
 *     budget seul      → z = 25 (A, B, D)
 *     au plus 2        → z = 22 (B, C)
 *     exactement 2     → z = 22 (B, C) : ici, même optimum que « au plus 2 »
 *     exactement 3     → z = 25 (A, B, D)
 *     exactement 4     → INFAISABLE : les 4 produits coûtent 140 > 100
 *
 *  Réponses aux questions
 *  a) « Au plus 2 » et « exactement 2 » donnent le même optimum, car la
 *     contrainte ≤ 2 est saturée à l'optimum (2 produits choisis).
 *     Imposer = 2 n'enlève donc pas la solution optimale. Ce ne serait
 *     plus le cas si un seul produit très précieux remplissait le budget.
 *  b) Pour « exactement 4 », le statut est GLP_NOFEAS. Toutes les
 *     variables valent 0 dans `vars` : les lire sans tester le statut
 *     ferait croire à tort à une sélection vide valide.
 *
 *  c) Dans le texte LP, les binaires apparaissent comme des variables
 *     entières (« Generals ») bornées par 0 <= x <= 1 : pour GLPK, un
 *     binaire n'est rien d'autre qu'un entier compris entre 0 et 1.
 *
 *  Piège : écrire { type: GLP_LO, lb: 0, ub: 2 } pour « au plus 2 ».
 *  GLP_LO ignore ub : la contrainte devient « ≥ 0 », toujours vraie, et
 *  la règle disparaît sans aucun message d'erreur.
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

const glpk = await GLPK();

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Product = { id: string; cost: number; value: number };
// Options du modèle : budget obligatoire, cardinalités facultatives.
type ModelOptions = { budget: number; maxCardinality?: number; exactCardinality?: number };
// Modèle glpk.js dont la liste des binaires est toujours renseignée.
type Model = LP & { binaries: string[] };
type GlpkConstraint = LP["subjectTo"][number];
// Réponse de glpk.solve (type fourni par glpk.js).
type SolverOutput = Result;
// Lecture d'une résolution : statut GLPK, valeur de l'objectif (z) et ids retenus.
type Solution = { status: number; value: number; selectedIds: string[] };
type Scenario = { name: string; options: ModelOptions };
type TableRow = {
  scenario: string;
  status: number | undefined;
  value: number | string;
  selectedIds: string;
  verification: string;
};

const PRODUCTS: Product[] = [
  { id: "A", cost: 30, value: 8 },
  { id: "B", cost: 50, value: 12 },
  { id: "C", cost: 40, value: 10 },
  { id: "D", cost: 20, value: 5 }
];
const BUDGET = 100;

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────

// Résout un modèle et renvoie { status, value, selectedIds }. Refuse de lancer
// GLPK sur un modèle visiblement incomplet, car un modèle sans variable
// fait planter le module WebAssembly (« Aborted() »).
async function solveModel(model: Model): Promise<Solution | null> {
  if (!model?.objective?.vars?.length) return null;
  const solverOutput: SolverOutput = await glpk.solve(model, { msglev: glpk.GLP_MSG_OFF, presol: true });
  const selectedIds = Object.entries(solverOutput.result.vars)
    .filter(([, variableValue]) => variableValue > 0.5)
    .map(([id]) => id);
  return { status: solverOutput.result.status, value: solverOutput.result.z, selectedIds };
}

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Construit le modèle à partir des données et des options :
//   options.budget            (obligatoire) : Σ cost·x ≤ budget
//   options.maxCardinality    (facultatif)  : Σ x ≤ maxCardinality
//   options.exactCardinality  (facultatif)  : Σ x = exactCardinality
function buildModel(products: Product[], options: ModelOptions): Model {
  const subjectTo: GlpkConstraint[] = [
    {
      name: "budget",
      vars: products.map(product => ({ name: product.id, coef: product.cost })),
      bnds: { type: glpk.GLP_UP, lb: 0, ub: options.budget }
    }
  ];

  // Coefficients 1 : Σ x_i compte les produits choisis.
  const unitTerms = products.map(product => ({ name: product.id, coef: 1 }));

  if (options.maxCardinality !== undefined) {
    subjectTo.push({
      name: "cardinalite_max",
      vars: unitTerms,
      bnds: { type: glpk.GLP_UP, lb: 0, ub: options.maxCardinality }
    });
  }
  if (options.exactCardinality !== undefined) {
    subjectTo.push({
      name: "cardinalite_exacte",
      vars: unitTerms,
      bnds: { type: glpk.GLP_FX, lb: options.exactCardinality, ub: options.exactCardinality }
    });
  }

  return {
    name: "sac_a_dos_genere",
    objective: {
      direction: glpk.GLP_MAX,
      name: "valeur",
      vars: products.map(product => ({ name: product.id, coef: product.value }))
    },
    subjectTo,
    binaries: products.map(product => product.id)
  };
}

// Vérification indépendante : repart des identifiants et des données brutes.
function validateSolution(products: Product[], selectedIds: string[], options: ModelOptions): string[] {
  const errors: string[] = [];
  const productById = new Map(products.map(product => [product.id, product]));

  let totalCost = 0;
  for (const id of selectedIds) {
    const product = productById.get(id);
    if (!product) {
      errors.push(`produit inconnu : ${id}`);
      continue;
    }
    totalCost += product.cost;
  }
  const selectedCount = selectedIds.length;

  if (totalCost > options.budget) {
    errors.push(`budget dépassé : ${totalCost} > ${options.budget}`);
  }
  if (options.maxCardinality !== undefined && selectedCount > options.maxCardinality) {
    errors.push(`cardinalité max dépassée : ${selectedCount} > ${options.maxCardinality}`);
  }
  if (options.exactCardinality !== undefined && selectedCount !== options.exactCardinality) {
    errors.push(`cardinalité exacte violée : ${selectedCount} ≠ ${options.exactCardinality}`);
  }
  return errors;
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Résolution de plusieurs variantes du modèle");

const SCENARIOS: Scenario[] = [
  { name: "budget seul", options: { budget: BUDGET } },
  { name: "au plus 2", options: { budget: BUDGET, maxCardinality: 2 } },
  { name: "exactement 2", options: { budget: BUDGET, exactCardinality: 2 } },
  { name: "exactement 3", options: { budget: BUDGET, exactCardinality: 3 } },
  { name: "exactement 4", options: { budget: BUDGET, exactCardinality: 4 } }
];

const rows: TableRow[] = [];
for (const scenario of SCENARIOS) {
  const solution = await solveModel(buildModel(PRODUCTS, scenario.options));
  const isOptimal = solution?.status === glpk.GLP_OPT;
  rows.push({
    scenario: scenario.name,
    status: solution?.status,
    value: isOptimal ? solution.value : "—",
    selectedIds: isOptimal ? solution.selectedIds.join(", ") : "—",
    // On ne vérifie que si une solution existe vraiment.
    verification: isOptimal
      ? (validateSolution(PRODUCTS, solution.selectedIds, scenario.options).join(" ; ") || "OK")
      : "pas de solution"
  });
}
console.table(rows);
console.log(`(statuts : ${glpk.GLP_OPT} = optimal, ${glpk.GLP_NOFEAS} = infaisable)`);

printTitle("Modèle « au plus 2 » au format CPLEX LP (glpk.write)");
// Garde défensive : avec « glpk.js/node » 5.0, glpk.write existe toujours (test toujours vrai).
if (typeof glpk.write === "function") {
  try {
    console.log(glpk.write(buildModel(PRODUCTS, { budget: BUDGET, maxCardinality: 2 })));
  } catch (error) {
    console.log("Modèle non affichable :", (error as Error).message);
  }
}

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("modèle de base : 1 contrainte, 4 binaires", () => {
  const model = buildModel(PRODUCTS, { budget: BUDGET });
  return [model.subjectTo.length, model.binaries.length];
}, [1, 4]);
check("coefficients de l'objectif tirés des données", () =>
  buildModel(PRODUCTS, { budget: BUDGET }).objective.vars.map(term => term.coef), [8, 12, 10, 5]);
check("maxCardinality 2 → contrainte GLP_UP ub 2", () => {
  const constraint = buildModel(PRODUCTS, { budget: BUDGET, maxCardinality: 2 }).subjectTo[1];
  return [constraint.bnds.type, constraint.bnds.ub, constraint.vars.every(term => term.coef === 1)];
}, [glpk.GLP_UP, 2, true]);
check("exactCardinality 2 → contrainte GLP_FX lb = ub = 2", () => {
  const constraint = buildModel(PRODUCTS, { budget: BUDGET, exactCardinality: 2 }).subjectTo[1];
  return [constraint.bnds.type, constraint.bnds.lb, constraint.bnds.ub];
}, [glpk.GLP_FX, 2, 2]);
check("vérif : (A,B,C) dépasse le budget", () =>
  validateSolution(PRODUCTS, ["A", "B", "C"], { budget: BUDGET }), ["budget dépassé : 120 > 100"]);
check("vérif : (A,B,D) avec au plus 2", () =>
  validateSolution(PRODUCTS, ["A", "B", "D"], { budget: BUDGET, maxCardinality: 2 }),
  ["cardinalité max dépassée : 3 > 2"]);
check("vérif : produit inconnu et cardinalité exacte", () =>
  validateSolution(PRODUCTS, ["Z"], { budget: BUDGET, exactCardinality: 2 }),
  ["produit inconnu : Z", "cardinalité exacte violée : 1 ≠ 2"]);
// Construit, résout et renvoie { status, value, selectedIds } ; échoue (✘) tant que le modèle est incomplet.
async function solveWithOptions(options: ModelOptions): Promise<Solution> {
  const solution = await solveModel(buildModel(PRODUCTS, options));
  if (!solution) throw new Error("modèle incomplet : buildModel ne renvoie pas encore de variables");
  return solution;
}
await checkAsync("budget seul : z = 25",
  async () => (await solveWithOptions({ budget: BUDGET })).value, 25);
await checkAsync("au plus 2 : (B, C), z = 22", async () => {
  const solution = await solveWithOptions({ budget: BUDGET, maxCardinality: 2 });
  return [solution.selectedIds, solution.value];
}, [["B", "C"], 22]);
await checkAsync("exactement 3 : z = 25",
  async () => (await solveWithOptions({ budget: BUDGET, exactCardinality: 3 })).value, 25);
await checkAsync("exactement 4 : infaisable",
  async () => (await solveWithOptions({ budget: BUDGET, exactCardinality: 4 })).status, glpk.GLP_NOFEAS);
await checkAsync("solution optimale « au plus 2 » validée", async () => {
  const solution = await solveWithOptions({ budget: BUDGET, maxCardinality: 2 });
  return validateSolution(PRODUCTS, solution.selectedIds, { budget: BUDGET, maxCardinality: 2 });
}, []);
printSummary();
