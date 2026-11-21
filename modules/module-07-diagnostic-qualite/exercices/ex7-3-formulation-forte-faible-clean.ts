/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 7 — Exercice 7.3 : Formulation forte ou faible
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-07-diagnostic-qualite/module-07-diagnostic-qualite.md (§1) + module 5 (relaxation, gap)
 *  Niveau : ★★★   Durée indicative : 1 h
 *  Lancer : node modules/module-07-diagnostic-qualite/exercices/ex7-3-formulation-forte-faible.ts
 *
 *  OBJECTIF
 *  Constater sur un exemple que deux formulations ÉQUIVALENTES (même
 *  optimum entier) peuvent avoir des relaxations continues très
 *  différentes, et donc des bornes plus ou moins utiles au solveur.
 *
 *  PRÉREQUIS
 *  - Module 2 : relaxation linéaire (x ∈ {0,1} remplacé par 0 ≤ x ≤ 1).
 *  - Module 5 : borne, incumbent, gap.
 *  - Module 6 : bounds (GLP_DB), binaries, passer les variables à gauche.
 *
 *  CONSIGNE
 *  3 entrepôts (coût fixe), 5 clients, chaque client affecté à exactement
 *  un entrepôt ouvert ; on minimise coûts fixes + coûts d'affectation.
 *  Variables : y_E1… (ouverture), x_c1_E1… (affectation). L'objectif et
 *  les contraintes d'affectation sont FOURNIS.
 *    1. buildOpeningConstraints(formulation) :
 *         "agregee"    : une ligne par entrepôt e, nom `ouverture_${warehouse.id}` :
 *                        Σ_c x_ce − (nombre de clients)·y_e ≤ 0
 *                        (vars : les x du client c1 à c5, PUIS y en dernier)
 *         "desagregee" : une ligne par couple, nom `ouverture_${customer}_${warehouse.id}` :
 *                        x_ce − y_e ≤ 0
 *    2. buildModel(formulation, isInteger) : affectation + ouverture ;
 *         isInteger = true  → binaries = allVariableNames()
 *         isInteger = false → bounds   = chaque variable en GLP_DB [0, 1]
 *    3. computeRelativeGap(bound, optimum) = (optimum − bound) / |optimum|.
 *
 *  RÉSULTAT ATTENDU
 *  Optimum entier 112 pour les deux formes. Borne de relaxation : 79
 *  (agrégée, écart 29,5 %) contre 112 (désagrégée, écart 0 %).
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

const glpk = await GLPK();

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Contraintes liant x et y.
// Objectif : écrire « pas de client servi par un entrepôt fermé » sous ses
//            deux formes équivalentes en nombres entiers : agrégée (peu de
//            lignes, relaxation faible) ou désagrégée (beaucoup de lignes,
//            relaxation serrée).
// Entrée   : formulation, "agregee" ou "desagregee".
// Sortie   : un tableau de GlpkConstraint { name, vars, bnds } (format : CONSIGNE 1) :
//              "agregee"    → 3 contraintes, une par entrepôt ;
//              "desagregee" → 15 contraintes, une par couple (client, entrepôt).
// Exemple  : buildOpeningConstraints("agregee") contient "ouverture_E1" :
//            6 termes, x_c1_E1 … x_c5_E1 (coef 1) puis { name: "y_E1", coef: -5 },
//            bnds { type: glpk.GLP_UP, lb: 0, ub: 0 } ;
//            buildOpeningConstraints("desagregee").length → 15.
// Attention: les variables sont toutes à gauche (second membre 0) ; dans la
//            forme agrégée, le terme y vient en DERNIER et son coefficient
//            vaut −(nombre de clients) ; utilise xVarName / yVarName pour
//            les noms des variables.
// (Indice 1 en fin de fichier.)
function buildOpeningConstraints(formulation: Formulation): GlpkConstraint[] {
  return undefined; // ← à remplacer
}

// TODO 2 — Assemble le modèle.
// Objectif : construire, pour une formulation donnée, soit le MILP (variables
//            binaires), soit sa relaxation continue (variables dans [0, 1]),
//            afin de comparer la borne de relaxation à l'optimum entier.
// Entrée   : formulation, "agregee" ou "desagregee" ;
//            isInteger, true pour le MILP, false pour la relaxation.
// Sortie   : un Model : objectif fourni (buildObjective()), contraintes
//            d'affectation (fournies) puis d'ouverture (TODO 1), et selon
//            isInteger : binaries (18 noms) OU bounds (18 bornes GLP_DB [0, 1]).
// Exemple  : buildModel("agregee", false).bounds?.length → 18, binaries absent ;
//            buildModel("desagregee", true).binaries?.length → 18, bounds absent ;
//            relaxation agrégée → z = 79 ; MILP des deux formes → z = 112.
// Attention: jamais binaries ET bounds dans le même modèle ; sans bounds, la
//            relaxation ne bornerait pas y au-dessus.
// (Indice 2 en fin de fichier.)
function buildModel(formulation: Formulation, isInteger: boolean): Model {
  return undefined; // ← à remplacer
}

// TODO 3 — Écart relatif entre une borne (inférieure, car on minimise) et l'optimum.
// Objectif : mesurer la qualité d'une relaxation : plus l'écart (gap) est
//            petit, plus la borne aide le Branch and Bound à élaguer.
// Entrée   : bound, la valeur de la relaxation continue, ex. 79 ;
//            optimum, l'optimum entier, ex. 112.
// Sortie   : un nombre, (optimum − bound) / |optimum| (0 = relaxation parfaite).
// Exemple  : computeRelativeGap(79, 112) → 33 / 112 ≈ 0,295 (29,5 %) ;
//            computeRelativeGap(112, 112) → 0.
// Attention: on divise par la valeur ABSOLUE de l'optimum.
function computeRelativeGap(bound: number, optimum: number): number {
  return undefined; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Pourquoi les deux formes ont-elles le même optimum entier ?
//  b) Observe les y relaxés de la forme agrégée. Comment la relaxation
//     « triche »-t-elle sur les coûts fixes ?
//  c) La forme désagrégée a 5 fois plus de contraintes d'ouverture.
//     Est-ce un mauvais échange ? Pense au Branch and Bound du module 5.

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (buildOpeningConstraints) —
//   agrégée    : WAREHOUSES.map(warehouse => ({ name: `ouverture_${warehouse.id}`,
//                  vars: [...CUSTOMERS.map(customer => x coef 1), { name: yVarName(warehouse.id), coef: -CUSTOMERS.length }],
//                  bnds: { type: glpk.GLP_UP, lb: 0, ub: 0 } }))
//   désagrégée : CUSTOMERS.flatMap(customer => WAREHOUSES.map(warehouse =>
//                  ({ name: `ouverture_${customer}_${warehouse.id}`, ... })))
//
// Indice 2 (buildModel) —
//   { name: `entrepots_${formulation}`, objective: buildObjective(),
//     subjectTo: [...buildAssignmentConstraints(), ...buildOpeningConstraints(formulation)] }
//   puis, selon `isInteger`, ajoute binaries OU bounds (jamais les deux) ;
//   allVariableNames() donne les 18 noms de variables.
