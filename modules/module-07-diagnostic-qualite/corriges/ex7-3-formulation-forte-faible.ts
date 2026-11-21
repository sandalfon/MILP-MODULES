/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 7 — Exercice 7.3 : Formulation forte ou faible — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-07-diagnostic-qualite/module-07-diagnostic-qualite.md (§1) + module 5 (relaxation, gap)
 *  Lancer : node modules/module-07-diagnostic-qualite/corriges/ex7-3-formulation-forte-faible.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Problème : 3 entrepôts (coût fixe d'ouverture), 5 clients. Chaque
 *  client est affecté à exactement un entrepôt OUVERT. On minimise
 *  coûts fixes + coûts d'affectation.
 *    y_e  ∈ {0,1} : entrepôt e ouvert
 *    x_ce ∈ {0,1} : client c servi par e
 *    Σ_e x_ce = 1                           pour chaque client
 *
 *  Deux façons d'écrire « pas de client sur un entrepôt fermé » :
 *    agrégée     : Σ_c x_ce − 5·y_e ≤ 0    (3 lignes)
 *    désagrégée  : x_ce − y_e ≤ 0          (15 lignes)
 *  En nombres entiers, elles sont équivalentes : même optimum, 112
 *  (ouvrir E1 et E2).
 *
 *  Dans la RELAXATION (0 ≤ x, y ≤ 1), elles ne le sont plus :
 *    - agrégée : chaque client prend son entrepôt le plus proche
 *      (coût 57). Il suffit ensuite d'ouvrir y_e = (clients servis)/5 :
 *      0,4 pour E1 et E2, 0,2 pour E3. Les coûts fixes ne sont comptés
 *      que pour 8 + 10 + 4 = 22. Borne : 57 + 22 = 79.
 *    - désagrégée : x_ce = 1 impose y_e ≥ 1. Les coûts fixes sont
 *      payés en entier, et la relaxation donne directement 112 : elle
 *      est ici entière.
 *  Écart relatif à l'optimum : (112 − 79) / 112 ≈ 29,5 % pour la forme
 *  agrégée, 0 % pour la désagrégée.
 *
 *  Pourquoi c'est important : le Branch and Bound (module 5) élague un
 *  nœud quand sa borne ne peut pas battre l'incumbent. Avec une borne
 *  à 79, presque rien n'est élagué. Avec 112, la preuve d'optimalité
 *  est immédiate. Plus de lignes, mais beaucoup moins de nœuds : sur de
 *  gros modèles, c'est souvent la différence entre des secondes et des
 *  heures.
 *
 *  Pièges fréquents
 *  - Oublier les bornes 0..1 de la relaxation : sans `bounds`, les
 *    variables continues ne sont bornées qu'à 0 ≤ x. Ici, l'affectation
 *    limite déjà x, mais rien ne limiterait y au-dessus.
 *  - Comparer des bornes de modèles qui n'ont PAS le même optimum
 *    entier : la comparaison n'a de sens qu'entre formulations
 *    équivalentes.
 *
 *  Réponses aux questions
 *  a) Les deux formulations ont le même optimum entier (112), car elles
 *     excluent exactement les mêmes décisions 0/1.
 *  b) La forme agrégée donne 79 : elle « paie » les entrepôts au prorata
 *     des clients servis (y fractionnaires 0,4 / 0,4 / 0,2).
 *  c) La forme désagrégée a 5 fois plus de contraintes d'ouverture
 *     (15 contre 3), mais une relaxation bien plus serrée : c'est un
 *     bon échange.
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

const glpk = await GLPK();

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Warehouse = { id: string; fixedCost: number };
type Formulation = "agregee" | "desagregee";
// Modèle et réponse de glpk.js, réutilisés sous leurs noms du glossaire.
type Model = LP;
type SolverOutput = Result;
// Contrainte au format attendu par glpk.js.
type GlpkConstraint = Model["subjectTo"][number];
// Une ligne du tableau comparatif (erreur : TODO incomplet).
type ComparisonRow = {
  formulation: Formulation;
  constraintCount?: number;
  "borne relaxation"?: number;
  "y relaxés E1/E2/E3"?: string;
  "optimum entier"?: number;
  "écart"?: string;
  error?: string;
};

const WAREHOUSES: Warehouse[] = [
  { id: "E1", fixedCost: 20 },
  { id: "E2", fixedCost: 25 },
  { id: "E3", fixedCost: 20 }
];
const CUSTOMERS: string[] = ["c1", "c2", "c3", "c4", "c5"];
// ASSIGNMENT_COSTS[warehouseId][indice client] : coût pour servir le client depuis l'entrepôt.
const ASSIGNMENT_COSTS: Record<string, number[]> = {
  E1: [10, 25, 30, 40, 15],
  E2: [35, 10, 12, 20, 30],
  E3: [30, 35, 25, 10, 20]
};

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────

const xVarName = (customer: string, warehouseId: string): string => `x_${customer}_${warehouseId}`;
const yVarName = (warehouseId: string): string => `y_${warehouseId}`;

// Toutes les variables du modèle : y puis x.
const allVariableNames = (): string[] => [
  ...WAREHOUSES.map(warehouse => yVarName(warehouse.id)),
  ...CUSTOMERS.flatMap(customer => WAREHOUSES.map(warehouse => xVarName(customer, warehouse.id)))
];

// Objectif : coûts fixes + coûts d'affectation (MIN).
function buildObjective(): Model["objective"] {
  return {
    direction: glpk.GLP_MIN,
    name: "cout_total",
    vars: [
      ...WAREHOUSES.map(warehouse => ({ name: yVarName(warehouse.id), coef: warehouse.fixedCost })),
      ...CUSTOMERS.flatMap((customer, i) => WAREHOUSES.map(warehouse =>
        ({ name: xVarName(customer, warehouse.id), coef: ASSIGNMENT_COSTS[warehouse.id][i] })))
    ]
  };
}

// Chaque client est affecté à exactement un entrepôt : Σ_e x_ce = 1.
function buildAssignmentConstraints(): GlpkConstraint[] {
  return CUSTOMERS.map(customer => ({
    name: `affectation_${customer}`,
    vars: WAREHOUSES.map(warehouse => ({ name: xVarName(customer, warehouse.id), coef: 1 })),
    bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
  }));
}

// Résout en se protégeant d'un modèle vide (GLPK planterait) :
// renvoie null tant qu'un TODO renvoie undefined.
async function solveModel(model: Model): Promise<SolverOutput | null> {
  if (!model?.objective?.vars?.length || !model.subjectTo?.length) return null;
  return glpk.solve(model, { msglev: glpk.GLP_MSG_OFF, presol: true });
}

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Contraintes liant x et y, selon la forme choisie.
function buildOpeningConstraints(formulation: Formulation): GlpkConstraint[] {
  if (formulation === "agregee") {
    // Σ_c x_ce − |clients| · y_e ≤ 0 : une ligne par entrepôt.
    return WAREHOUSES.map(warehouse => ({
      name: `ouverture_${warehouse.id}`,
      vars: [
        ...CUSTOMERS.map(customer => ({ name: xVarName(customer, warehouse.id), coef: 1 })),
        { name: yVarName(warehouse.id), coef: -CUSTOMERS.length }
      ],
      bnds: { type: glpk.GLP_UP, lb: 0, ub: 0 }
    }));
  }
  // forme désagrégée : x_ce − y_e ≤ 0, une ligne par couple (client, entrepôt).
  return CUSTOMERS.flatMap(customer => WAREHOUSES.map(warehouse => ({
    name: `ouverture_${customer}_${warehouse.id}`,
    vars: [{ name: xVarName(customer, warehouse.id), coef: 1 }, { name: yVarName(warehouse.id), coef: -1 }],
    bnds: { type: glpk.GLP_UP, lb: 0, ub: 0 }
  })));
}

// isInteger = true  → MILP (toutes les variables binaires)
// isInteger = false → relaxation continue : chaque variable dans [0, 1]
function buildModel(formulation: Formulation, isInteger: boolean): Model {
  const model: Model = {
    name: `entrepots_${formulation}`,
    objective: buildObjective(),
    subjectTo: [...buildAssignmentConstraints(), ...buildOpeningConstraints(formulation)]
  };
  if (isInteger) {
    model.binaries = allVariableNames();
  } else {
    model.bounds = allVariableNames().map(variableName => ({ name: variableName, type: glpk.GLP_DB, lb: 0, ub: 1 }));
  }
  return model;
}

// Écart relatif entre une borne inférieure (minimisation) et l'optimum.
function computeRelativeGap(bound: number, optimum: number): number {
  return (optimum - bound) / Math.abs(optimum);
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Relaxation continue et optimum entier des deux formulations");
const rows: ComparisonRow[] = [];
for (const formulation of ["agregee", "desagregee"] as const) {
  try {
    const relaxationOutput = await solveModel(buildModel(formulation, false));
    const milpOutput = await solveModel(buildModel(formulation, true));
    const relaxedY = relaxationOutput ? WAREHOUSES.map(warehouse => relaxationOutput.result.vars[yVarName(warehouse.id)].toFixed(2)).join(" / ") : "—";
    rows.push({
      formulation,
      constraintCount: buildModel(formulation, true)?.subjectTo.length,
      "borne relaxation": relaxationOutput?.result.z,
      "y relaxés E1/E2/E3": relaxedY,
      "optimum entier": milpOutput?.result.z,
      "écart": relaxationOutput && milpOutput ? (100 * computeRelativeGap(relaxationOutput.result.z, milpOutput.result.z)).toFixed(1) + " %" : "—"
    });
  } catch (error) {
    rows.push({ formulation, error: (error as Error).message });
  }
}
console.table(rows);

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("agrégée : 3 contraintes d'ouverture", () => buildOpeningConstraints("agregee").length, 3);
check("désagrégée : 15 contraintes d'ouverture", () => buildOpeningConstraints("desagregee").length, 15);
check("agrégée E1 : Σ x − 5·y ≤ 0", () => {
  const openingE1 = buildOpeningConstraints("agregee").find(constraint => constraint.name === "ouverture_E1");
  return [openingE1?.vars.length, openingE1?.vars.at(-1), openingE1?.bnds.type, openingE1?.bnds.ub];
}, [6, { name: "y_E1", coef: -5 }, glpk.GLP_UP, 0]);
check("relaxation : 18 variables bornées dans [0, 1]", () => {
  const model = buildModel("agregee", false);
  return [model.bounds?.length,
    model.bounds?.every(bound => bound.type === glpk.GLP_DB && bound.lb === 0 && bound.ub === 1), model.binaries];
}, [18, true, undefined]);
check("MILP : 18 binaires, pas de bounds", () => {
  const model = buildModel("desagregee", true);
  return [model.binaries?.length, model.bounds];
}, [18, undefined]);
check("écart relatif (112 − 79) / 112", () => computeRelativeGap(79, 112), 33 / 112);
await checkAsync("borne de la relaxation agrégée = 79", async () =>
  (await solveModel(buildModel("agregee", false)))?.result.z, 79);
await checkAsync("borne de la relaxation désagrégée = 112", async () =>
  (await solveModel(buildModel("desagregee", false)))?.result.z, 112);
await checkAsync("même optimum entier (112) pour les deux formes", async () => [
  (await solveModel(buildModel("agregee", true)))?.result.z,
  (await solveModel(buildModel("desagregee", true)))?.result.z
], [112, 112]);
printSummary();
