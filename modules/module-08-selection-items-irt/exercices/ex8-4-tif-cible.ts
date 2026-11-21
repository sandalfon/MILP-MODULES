/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 8 — Exercice 8.4 (bonus) : Viser une TIF cible
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-08-selection-items-irt/module-08-selection-items-irt.md (§7, §8)
 *  Niveau : ★★★   Durée indicative : 1 h
 *  Lancer : node modules/module-08-selection-items-irt/exercices/ex8-4-tif-cible.ts
 *
 *  OBJECTIF
 *  Assembler le test dont la courbe d'information est la plus PROCHE
 *  d'une cible T = [2.0, 2.5, 2.0] en θ = −1, 0, 1, en linéarisant une
 *  valeur absolue avec des variables d'écart.
 *
 *  PRÉREQUIS
 *  - Exercice 8.3 (contraintes de test et recalcul de la TIF fournis).
 *  - Cours §7 : |TIF − T| = d⁺ + d⁻ avec TIF − d⁺ + d⁻ = T, d⁺, d⁻ ≥ 0.
 *
 *  CONSIGNE
 *  Formulation à traduire :
 *      MIN   Σ_t (d⁺_t + d⁻_t)
 *      s.c.  Σ_i I_i(θ_t)·x_i − d⁺_t + d⁻_t = T_t     pour chaque θ_t
 *            (+ longueur, quotas min/max, exclusion : fournis)
 *            x_i ∈ {0, 1},  d⁺_t ≥ 0,  d⁻_t ≥ 0
 *  Nomme les variables d'écart `dplus_${thetaIndex}` et `dmoins_${thetaIndex}`
 *  (thetaIndex = 0, 1, 2 : position de θ dans la grille).
 *    1. buildTargetConstraints(items, thetaGrid, target)
 *    2. buildTargetModel(items, rules, thetaGrid, target)
 *    3. computeTotalDeviation(selectedItems, thetaGrid, target) → Σ_t |TIF(θ_t) − T_t|
 *
 *  RÉSULTAT ATTENDU
 *  Écart total optimal ≈ 0.1271, identique au recalcul indépendant.
 *  Le test « information maximale » de l'exercice 8.2 est à ≈ 1.4806.
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ──────────────────────────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Contraintes d'écart à la TIF cible.
// Objectif : pour chaque θ de la grille (position thetaIndex), écrire l'égalité
//            Σ_i I_i(θ)·x_i − d⁺ + d⁻ = cible, qui définit l'excès d⁺ et le manque d⁻.
// Entrée   : items (ex. ITEMS) ; thetaGrid (ex. THETA_GRID = [-1, 0, 1]) ;
//            target, la TIF visée à chaque θ (ex. TARGET_TIF = [2.0, 2.5, 2.0]).
// Sortie   : un tableau de GlpkConstraint, une par θ : vars contient un terme par item
//            de coefficient information2PL(item.a, item.b, theta), puis
//            { name: `dplus_${thetaIndex}`, coef: −1 } et { name: `dmoins_${thetaIndex}`, coef: +1 } ;
//            bnds de type glpk.GLP_FX avec lb = ub = target[thetaIndex].
// Exemple  : buildTargetConstraints(ITEMS, THETA_GRID, TARGET_TIF) → 3 contraintes de
//            14 termes ; pour θ = 0 : dplus_1 → −1, dmoins_1 → +1, lb = ub = 2.5.
// Attention: les noms des variables d'écart doivent être uniques (un indice par θ).
// (Indice 1 en fin de fichier.)
function buildTargetConstraints(items: Item[], thetaGrid: number[], target: number[]): GlpkConstraint[] {
  return undefined; // ← à remplacer
}

// TODO 2 — Modèle « TIF cible » complet.
// Objectif : assembler MIN Σ_t (d⁺_t + d⁻_t) sous les contraintes du test et les
//            contraintes d'écart, avec x_i binaires et d⁺, d⁻ continues ≥ 0 (cours §7).
// Entrée   : items (ex. ITEMS) ; rules (ex. RULES) ; thetaGrid (ex. THETA_GRID) ;
//            target (ex. TARGET_TIF).
// Sortie   : un Model { name, objective, subjectTo, binaries, bounds } :
//            objective en glpk.GLP_MIN, coefficient 1 sur chacune des variables d'écart ;
//            subjectTo = contraintes du test (buildTestConstraints) puis contraintes d'écart ;
//            binaries = les id des items seulement ; bounds = une borne GLP_LO, lb = 0,
//            par variable d'écart.
// Exemple  : buildTargetModel(ITEMS, RULES, THETA_GRID, TARGET_TIF) → 6 variables
//            d'écart dans l'objectif, 6 bornes, aucune binaire en « d… » ;
//            résolu, écart total ≈ 0.1271.
// Attention: sans les bornes ≥ 0, l'objectif peut descendre sans limite.
// (Indice 2 en fin de fichier.)
function buildTargetModel(items: Item[], rules: Rules, thetaGrid: number[], target: number[]): Model {
  return undefined; // ← à remplacer
}

// TODO 3 — Écart total recalculé sans le solveur.
// Objectif : calculer Σ_t |TIF(θ_t) − target[t]| à partir des paramètres a et b,
//            pour contrôler la valeur annoncée par GLPK.
// Entrée   : selectedItems, les items du test (ex. q02, q04, q07, q08, q10, q12) ;
//            thetaGrid (ex. THETA_GRID) ; target (ex. TARGET_TIF = [2.0, 2.5, 2.0]).
// Sortie   : un nombre ≥ 0, la somme des écarts absolus.
// Exemple  : pour le test « information maximale » (TIF ≈ [2.2011, 3.3656, 2.4139])
//            → ≈ 0.2011 + 0.8656 + 0.4139 = 1.4806.
// Attention: un manque compte autant qu'un excès : prends la valeur absolue.
// (Indice 3 en fin de fichier.)
function computeTotalDeviation(selectedItems: Item[], thetaGrid: number[], target: number[]): number {
  return undefined; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Les écarts obtenus sont-ils des excès ou des manques ? Pourquoi
//     ne peut-on pas atteindre exactement la cible ?
//  b) Comment pénaliser plus fortement un MANQUE d'information qu'un excès ?
//  c) Comment adapterais-tu le modèle pour assembler DEUX formes
//     parallèles sans item commun ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (buildTargetConstraints) — thetaGrid.map((theta, thetaIndex) => ({ ... })) ;
//   les termes des items s'écrivent avec ...items.map(item => ({ ... })).
//
// Indice 2 (buildTargetModel) — construis d'abord la liste des noms d'écart :
//   const deviationNames = thetaGrid.flatMap((_, thetaIndex) => [`dplus_${thetaIndex}`, `dmoins_${thetaIndex}`]);
//   puis deviationNames.map(…) pour l'objectif et pour bounds.
//
// Indice 3 (computeTotalDeviation) — computeInformationByTheta (fourni) puis reduce
//   avec Math.abs(information - target[thetaIndex]).
