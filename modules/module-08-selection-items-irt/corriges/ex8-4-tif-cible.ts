/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 8 — Exercice 8.4 (bonus) : Viser une TIF cible — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-08-selection-items-irt/module-08-selection-items-irt.md (§7, §8)
 *  Lancer : node modules/module-08-selection-items-irt/corriges/ex8-4-tif-cible.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  On ne cherche plus le test le PLUS informatif, mais celui dont la
 *  courbe d'information est la plus PROCHE d'une cible T, par exemple
 *  pour fabriquer plusieurs formes parallèles d'un même test :
 *      MIN   Σ_t |TIF(θ_t) − T_t|
 *
 *  La valeur absolue se linéarise avec deux variables continues ≥ 0
 *  par point de grille :
 *      Σ_i I_i(θ_t)·x_i − d⁺_t + d⁻_t = T_t      (GLP_FX, lb = ub = T_t)
 *      MIN   Σ_t (d⁺_t + d⁻_t)
 *  - Si la TIF dépasse la cible de 0.3 : d⁺ = 0.3, d⁻ = 0.
 *  - Si elle est en dessous de 0.3 : d⁺ = 0, d⁻ = 0.3.
 *  À l'optimum, d⁺_t et d⁻_t ne sont jamais tous deux positifs : les
 *  diminuer ensemble d'une même quantité garderait l'égalité vraie
 *  tout en baissant l'objectif. Donc d⁺_t + d⁻_t = |TIF(θ_t) − T_t|.
 *
 *  Dans glpk.js, les variables d⁺/d⁻ sont continues : elles ne vont pas
 *  dans `binaries`, et on leur donne une borne inférieure 0 via
 *  `bounds`. Les noms doivent être uniques : dplus_0, dmoins_0, etc.
 *
 *  Résultat avec la cible T = [2.0, 2.5, 2.0] :
 *    q01 q02 q06 q07 q10 q12, TIF ≈ [2.0103, 2.5910, 2.0258],
 *    écart total ≈ 0.1271 (trois petits excès).
 *  Pour comparaison, le test « information maximale » de l'exercice
 *  8.2 (TIF ≈ [2.2011, 3.3656, 2.4139]) est à ≈ 1.4806 de la cible :
 *  maximiser n'est pas viser.
 *
 *  Pièges fréquents
 *  - Inverser les signes de d⁺ et d⁻ : le modèle reste correct (les
 *    rôles sont simplement échangés), mais l'interprétation affichée
 *    devient fausse. Garde la convention −d⁺ + d⁻.
 *  - Oublier les bornes ≥ 0 : sans elles, d⁺ pourrait devenir négatif
 *    et l'objectif descendre sans limite (problème non borné).
 *  - Choisir une cible inatteignable (ex. 10 partout avec 6 items) :
 *    le modèle reste réalisable, grâce aux d⁻, mais l'écart est énorme.
 *    Vérifie toujours l'ordre de grandeur de la cible.
 *
 *  Réponses aux questions
 *  a) Les trois écarts sont des excès (d⁺ > 0, d⁻ = 0) : aucun
 *     sous-ensemble de 6 items respectant les règles ne colle mieux à la
 *     cible. On pourrait autoriser un écart nul en ajoutant des items ou
 *     en assouplissant les quotas.
 *  b) Pour pénaliser davantage un manque d'information, on donne à d⁻_t
 *     un coefficient plus grand que d⁺_t dans l'objectif (ex. 3 contre 1).
 *  c) Pour une deuxième forme parallèle, on ajoute une variable par item
 *     et par forme, et une contrainte « chaque item dans au plus une
 *     forme » : Σ_f x_{i,f} ≤ 1.
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Item = { id: string; a: number; b: number; domain: string };
type Rules = {
  testLength: number;
  domains: string[];
  minPerDomain: number;
  maxPerDomain: number;
  exclusions: [string, string][];
};
type GlpkConstraint = LP["subjectTo"][number];
type Term = GlpkConstraint["vars"][number];
type Bound = NonNullable<LP["bounds"]>[number];
type Model = LP & { binaries: string[]; bounds: Bound[] };
type SolverOutput = Result;
type SolveOutcome = { solverOutput: SolverOutput; selectedItems: Item[] };

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
const THETA_GRID: number[] = [-1, 0, 1];
const TARGET_TIF: number[] = [2.0, 2.5, 2.0]; // TIF visée en θ = −1, 0, 1
const RULES: Rules = {
  testLength: 6,
  domains: ["A", "B", "C", "D"],
  minPerDomain: 1,
  maxPerDomain: 2,
  exclusions: [["q02", "q05"]]
};

const glpk = await GLPK();

// ─── 2. OUTILS FOURNIS (exercices 8.1 à 8.3) ─────────────────────
function information2PL(a: number, b: number, theta: number): number {
  const probability = 1 / (1 + Math.exp(-a * (theta - b)));
  return a * a * probability * (1 - probability);
}

function computeInformationByTheta(selectedItems: Item[], thetaGrid: number[]): number[] {
  return thetaGrid.map(theta =>
    selectedItems.reduce((sum, item) => sum + information2PL(item.a, item.b, theta), 0));
}

function buildTestConstraints(items: Item[], rules: Rules): GlpkConstraint[] {
  const toUnitTerms = (itemList: Item[]): Term[] => itemList.map(item => ({ name: item.id, coef: 1 }));
  return [
    {
      name: "longueur",
      vars: toUnitTerms(items),
      bnds: { type: glpk.GLP_FX, lb: rules.testLength, ub: rules.testLength }
    },
    ...rules.domains.map(domain => ({
      name: `quota_${domain}`,
      vars: toUnitTerms(items.filter(item => item.domain === domain)),
      bnds: { type: glpk.GLP_DB, lb: rules.minPerDomain, ub: rules.maxPerDomain }
    })),
    ...rules.exclusions.map(([id1, id2]) => ({
      name: `exclusion_${id1}_${id2}`,
      vars: [{ name: id1, coef: 1 }, { name: id2, coef: 1 }],
      bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
    }))
  ];
}

async function solveModel(model: LP): Promise<SolveOutcome> {
  const solverOutput = await glpk.solve(model, { msglev: glpk.GLP_MSG_OFF, presol: true });
  const vars = solverOutput.result.vars;
  return { solverOutput, selectedItems: ITEMS.filter(item => (vars[item.id] ?? 0) > 0.5) };
}

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Pour chaque θ_t : Σ_i I_i(θ_t)·x_i − dplus_t + dmoins_t = T_t.
function buildTargetConstraints(items: Item[], thetaGrid: number[], target: number[]): GlpkConstraint[] {
  return thetaGrid.map((theta, thetaIndex) => ({
    name: `cible_theta_${theta}`,
    vars: [
      ...items.map(item => ({ name: item.id, coef: information2PL(item.a, item.b, theta) })),
      { name: `dplus_${thetaIndex}`, coef: -1 },
      { name: `dmoins_${thetaIndex}`, coef: 1 }
    ],
    bnds: { type: glpk.GLP_FX, lb: target[thetaIndex], ub: target[thetaIndex] }
  }));
}

// MIN Σ_t (dplus_t + dmoins_t), x binaires, d continues ≥ 0.
function buildTargetModel(items: Item[], rules: Rules, thetaGrid: number[], target: number[]): Model {
  const deviationNames = thetaGrid.flatMap((_, thetaIndex) => [`dplus_${thetaIndex}`, `dmoins_${thetaIndex}`]);
  return {
    name: "assemblage_tif_cible",
    objective: {
      direction: glpk.GLP_MIN,
      name: "ecart_total",
      vars: deviationNames.map(variableName => ({ name: variableName, coef: 1 }))
    },
    subjectTo: [...buildTestConstraints(items, rules), ...buildTargetConstraints(items, thetaGrid, target)],
    binaries: items.map(item => item.id),
    bounds: deviationNames.map(variableName => ({ name: variableName, type: glpk.GLP_LO, lb: 0, ub: 0 }))
  };
}

// Écart total recalculé sans le solveur : Σ_t |TIF(θ_t) − T_t|.
function computeTotalDeviation(selectedItems: Item[], thetaGrid: number[], target: number[]): number {
  return computeInformationByTheta(selectedItems, thetaGrid)
    .reduce((sum, information, thetaIndex) => sum + Math.abs(information - target[thetaIndex]), 0);
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle(`Test le plus proche de la TIF cible [${TARGET_TIF.join(", ")}]`);
try {
  const { solverOutput, selectedItems } = await solveModel(
    buildTargetModel(ITEMS, RULES, THETA_GRID, TARGET_TIF));
  const vars = solverOutput.result.vars;
  const tifValues = computeInformationByTheta(selectedItems, THETA_GRID);
  console.log("Statut :", solverOutput.result.status, "· items :", selectedItems.map(item => item.id).join(" "));
  console.table(THETA_GRID.map((theta, thetaIndex) => ({
    theta,
    target: TARGET_TIF[thetaIndex],
    TIF: tifValues[thetaIndex].toFixed(4),
    "d+ (excès)": vars[`dplus_${thetaIndex}`].toFixed(4),
    "d- (manque)": vars[`dmoins_${thetaIndex}`].toFixed(4)
  })));
  console.log("Écart total GLPK :", solverOutput.result.z.toFixed(4),
    "· recalcul indépendant :", computeTotalDeviation(selectedItems, THETA_GRID, TARGET_TIF).toFixed(4));

  // Comparaison avec le test « information maximale » de l'exercice 8.2.
  const maxInformationTest = ITEMS.filter(item => ["q02", "q04", "q07", "q08", "q10", "q12"].includes(item.id));
  console.log("Écart du test « information maximale » :",
    computeTotalDeviation(maxInformationTest, THETA_GRID, TARGET_TIF).toFixed(4));
} catch (error) {
  console.log("Résolution impossible :", (error as Error).message);
}

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("3 contraintes cible, 14 variables chacune, GLP_FX", () =>
  buildTargetConstraints(ITEMS, THETA_GRID, TARGET_TIF)
    .map(constraint => [constraint.vars.length, constraint.bnds.type === glpk.GLP_FX]),
  [[14, true], [14, true], [14, true]]);
check("θ = 0 : dplus_1 coef −1, dmoins_1 coef +1, second membre 2.5", () => {
  const constraint = buildTargetConstraints(ITEMS, THETA_GRID, TARGET_TIF)[1];
  const coef = (variableName: string): number | undefined => constraint.vars.find(term => term.name === variableName)?.coef;
  return [coef("dplus_1"), coef("dmoins_1"), constraint.bnds.lb, constraint.bnds.ub];
}, [-1, 1, 2.5, 2.5]);
check("modèle : minimisation de 6 variables d'écart, bornées ≥ 0, non binaires", () => {
  const model = buildTargetModel(ITEMS, RULES, THETA_GRID, TARGET_TIF);
  return [model.objective.direction === glpk.GLP_MIN, model.objective.vars.length,
    model.bounds.length, model.binaries.some(variableName => variableName.startsWith("d"))];
}, [true, 6, 6, false]);
check("écart indépendant du test « information maximale » ≈ 1.4806", () =>
  computeTotalDeviation(ITEMS.filter(item => ["q02", "q04", "q07", "q08", "q10", "q12"].includes(item.id)),
    THETA_GRID, TARGET_TIF), 1.4806, 1e-4);
await checkAsync("statut optimal", async () =>
  (await solveModel(buildTargetModel(ITEMS, RULES, THETA_GRID, TARGET_TIF))).solverOutput.result.status,
  glpk.GLP_OPT);
await checkAsync("écart total optimal ≈ 0.1271", async () =>
  (await solveModel(buildTargetModel(ITEMS, RULES, THETA_GRID, TARGET_TIF))).solverOutput.result.z,
  0.1271, 1e-4);
await checkAsync("écart GLPK = Σ |TIF − cible| recalculé", async () => {
  const { solverOutput, selectedItems } = await solveModel(
    buildTargetModel(ITEMS, RULES, THETA_GRID, TARGET_TIF));
  return solverOutput.result.z - computeTotalDeviation(selectedItems, THETA_GRID, TARGET_TIF);
}, 0, 1e-6);
await checkAsync("à chaque θ, d+ et d- ne sont pas tous deux positifs", async () => {
  const { solverOutput } = await solveModel(buildTargetModel(ITEMS, RULES, THETA_GRID, TARGET_TIF));
  const vars = solverOutput.result.vars;
  return THETA_GRID.every((_, thetaIndex) =>
    Math.min(vars[`dplus_${thetaIndex}`], vars[`dmoins_${thetaIndex}`]) < 1e-9);
}, true);
printSummary();
