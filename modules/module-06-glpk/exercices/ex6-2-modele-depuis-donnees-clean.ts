/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 6 — Exercice 6.2 : Modèle généré depuis les données
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-06-glpk/module-06-glpk.md (§4, §6 et §8)
 *  Niveau : ★★☆   Durée indicative : 45 min
 *  Lancer : node modules/module-06-glpk/exercices/ex6-2-modele-depuis-donnees.ts
 *
 *  OBJECTIF
 *  Construire automatiquement un modèle glpk.js à partir d'un tableau
 *  de données, avec des contraintes optionnelles, puis vérifier chaque
 *  solution renvoyée par le solveur avec un code indépendant.
 *
 *  PRÉREQUIS
 *  - Exercice 6.1 (structure d'un modèle, statuts, seuil 0,5).
 *  - Module 1 : contrainte de cardinalité Σ x ≤ K / Σ x = K.
 *  - TypeScript : Array.prototype.map, Map, paramètre objet `options`
 *    typé avec des propriétés facultatives (maxCardinality?: number).
 *
 *  CONSIGNE
 *    1. buildModel(products, options) :
 *       - objectif MAX Σ value·x et contrainte "budget" Σ cost·x ≤ options.budget,
 *         générés à partir des données (aucun coefficient écrit à la main) ;
 *       - si options.maxCardinality est défini   : contrainte "cardinalite_max"    Σ x ≤ maxCardinality ;
 *       - si options.exactCardinality est défini : contrainte "cardinalite_exacte" Σ x = exactCardinality ;
 *       - toutes les variables sont binaires.
 *    2. validateSolution(products, selectedIds, options) : SANS utiliser le
 *       modèle, recalcule coût et nombre de produits et renvoie la liste
 *       des erreurs, avec exactement ces messages :
 *         `produit inconnu : ${id}`
 *         `budget dépassé : ${totalCost} > ${budget}`
 *         `cardinalité max dépassée : ${selectedCount} > ${maxCardinality}`
 *         `cardinalité exacte violée : ${selectedCount} ≠ ${exactCardinality}`
 *    3. Lance le script, observe le tableau des scénarios et le modèle
 *       au format LP, puis réponds aux QUESTIONS.
 *
 *  RÉSULTAT ATTENDU
 *  budget seul 25 · au plus 2 → 22 (B, C) · exactement 2 → 22 ·
 *  exactement 3 → 25 · exactement 4 → statut 4 (infaisable).
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

const glpk = await GLPK();

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Construire le modèle glpk.js à partir des données.
// Objectif : générer automatiquement le sac à dos MAX Σ value·x sous la
//            contrainte "budget" Σ cost·x ≤ options.budget, plus les règles de
//            cardinalité demandées dans options. Aucun coefficient n'est écrit à
//            la main : le même code doit fonctionner avec 4 produits ou 4 000.
// Entrée   : products, la liste des produits, ex. PRODUCTS (A : coût 30, valeur 8…) ;
//            options, ex. { budget: 100 }, { budget: 100, maxCardinality: 2 }
//            ou { budget: 100, exactCardinality: 2 }.
// Sortie   : un Model : objective en maximisation (un terme { name, coef } par
//            produit, coef = value), subjectTo, binaries (tous les id).
//            subjectTo contient, dans cet ordre : "budget" (≤ options.budget),
//            puis "cardinalite_max" (Σ x ≤ maxCardinality) si l'option est
//            donnée, puis "cardinalite_exacte" (Σ x = exactCardinality) si
//            l'option est donnée.
// Exemple  : buildModel(PRODUCTS, { budget: 100 }) → 1 contrainte, 4 binaires,
//            coefficients d'objectif [8, 12, 10, 5] ;
//            buildModel(PRODUCTS, { budget: 100, maxCardinality: 2 }).subjectTo[1]
//            → bornes de type GLP_UP, ub = 2, tous les coefficients valent 1 ;
//            avec exactCardinality: 2 → type GLP_FX, lb = ub = 2.
// Attention: 0 est une valeur d'option valide (« aucun produit ») : une option
//            qui vaut 0 n'est pas une option absente.
// (Indice 1 en fin de fichier.)
function buildModel(products: Product[], options: ModelOptions): Model {
  return undefined; // ← à remplacer
}

// TODO 2 — Vérificateur indépendant d'une sélection.
// Objectif : contrôler une solution renvoyée par le solveur SANS utiliser
//            buildModel : on repart des identifiants choisis et des données
//            brutes, et on recalcule le coût et le nombre de produits. Une
//            erreur dans le modèle ne peut ainsi pas fausser la vérification.
// Entrée   : products, ex. PRODUCTS ; selectedIds, les id retenus,
//            ex. ["A", "B", "D"] ; options, ex. { budget: 100, maxCardinality: 2 }.
// Sortie   : un tableau de messages d'erreur (string[]), vide si tout est respecté,
//            dans l'ordre : produits inconnus, budget, cardinalité max,
//            cardinalité exacte (textes exacts donnés dans la consigne).
// Exemple  : validateSolution(PRODUCTS, ["A", "B", "C"], { budget: 100 })
//            → ["budget dépassé : 120 > 100"] ;
//            validateSolution(PRODUCTS, ["A", "B", "D"], { budget: 100, maxCardinality: 2 })
//            → ["cardinalité max dépassée : 3 > 2"] ;
//            validateSolution(PRODUCTS, ["Z"], { budget: 100, exactCardinality: 2 })
//            → ["produit inconnu : Z", "cardinalité exacte violée : 1 ≠ 2"].
// Attention: un id inconnu ne compte pas dans le coût mais compte dans le
//            nombre de produits choisis ; une règle de cardinalité n'est testée
//            que si son option est définie.
// (Indice 2 en fin de fichier.)
function validateSolution(products: Product[], selectedIds: string[], options: ModelOptions): string[] {
  const errors: string[] = [];
  // ... à compléter
  return errors;
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Pourquoi « au plus 2 » et « exactement 2 » donnent-ils ici le même optimum ?
//  b) Pour « exactement 4 », que contiennent les variables renvoyées ?
//     Pourquoi faut-il tester le statut avant de les lire ?
//  c) Dans le texte LP, comment apparaissent les variables binaires ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (buildModel) — chaque liste de termes se génère avec map, ex.
//   products.map(product => ({ name: product.id, coef: product.cost })) pour le budget,
//   et coef: 1 pour les cardinalités. Structure possible :
//     const subjectTo: GlpkConstraint[] = [ { name: "budget", vars: …, bnds: { type: glpk.GLP_UP, … } } ];
//     const unitTerms = products.map(product => ({ name: product.id, coef: 1 }));
//     if (options.maxCardinality !== undefined)   subjectTo.push({ name: "cardinalite_max", … GLP_UP … });
//     if (options.exactCardinality !== undefined) subjectTo.push({ name: "cardinalite_exacte", … GLP_FX … });
//     return { name: "sac_a_dos_genere", objective: { direction, name, vars }, subjectTo, binaries };
//   Teste `!== undefined` et non `if (options.maxCardinality)`, sinon 0 serait ignoré.
//
// Indice 2 (validateSolution) — étapes :
//   - un Map id → produit pour retrouver les données :
//     new Map(products.map(product => [product.id, product])) ;
//   - pour chaque id choisi : inconnu → erreur, sinon on ajoute son coût ;
//   - comparer le coût total au budget, puis selectedIds.length à
//     maxCardinality / exactCardinality (seulement si ces options sont définies).
