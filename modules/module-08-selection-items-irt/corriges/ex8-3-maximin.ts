/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 8 — Exercice 8.3 : Objectif maximin — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-08-selection-items-irt/module-08-selection-items-irt.md (§5, §6, §8)
 *  Lancer : node modules/module-08-selection-items-irt/corriges/ex8-3-maximin.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Formulation maximin :
 *      MAX   z
 *      s.c.  z − Σ_i I_i(θ_t) · x_i ≤ 0    pour θ_t ∈ {−1, 0, 1}  → GLP_UP, ub = 0
 *            Σ_i x_i = 6                                         → GLP_FX
 *            1 ≤ Σ_{i ∈ k} x_i ≤ 2      ∀ domaine k              → GLP_DB
 *            x_q02 + x_q05 ≤ 1                                   → GLP_UP
 *            x_i ∈ {0, 1},  z ≥ 0 continue
 *
 *  1. Quotas min/max : une seule contrainte « double borne » GLP_DB
 *     (lb = min, ub = max) remplace deux contraintes GLP_LO + GLP_UP.
 *
 *  2. Contraintes maximin : glpk.js attend toutes les variables à
 *     GAUCHE et une constante à droite. z ≤ Σ I·x devient
 *     z − Σ I·x ≤ 0 : z a le coefficient +1, chaque item le
 *     coefficient −I_i(θ_t). C'est une contrainte par point de grille :
 *     3 contraintes, et AUCUNE variable binaire supplémentaire.
 *
 *  3. z est une variable CONTINUE : elle n'apparaît pas dans
 *     `binaries`. On lui donne une borne inférieure 0 via `bounds`.
 *     L'objectif ne contient que z (coefficient 1).
 *
 *  4. computeInformationByTheta recalcule la TIF à partir de a et b, sans
 *     passer par le modèle. Son minimum doit être égal au z annoncé
 *     par GLPK : c'est la preuve que la linéarisation fait bien ce que
 *     l'on croit.
 *
 *  Résultats
 *    Grille θ ∈ {−1, 0, 1} : les DEUX modèles retiennent le même test
 *      (q02 q04 q07 q08 q10 q12), TIF ≈ [2.2011, 3.3656, 2.4139].
 *      Le test le plus informatif en moyenne est aussi, ici, celui dont
 *      le pire niveau est le meilleur : les deux objectifs coïncident.
 *    Grille θ ∈ {−1.5, 0, 1.5} : les objectifs divergent.
 *      - moyen   : min ≈ 1.3312, moyenne ≈ 2.0701 (TIF très pointue en 0)
 *      - maximin : min ≈ 1.4109, moyenne ≈ 1.9173 (TIF plus « plate »)
 *      Le maximin sacrifie de l'information au centre (3.37 → 2.90) pour
 *      relever les extrémités. Il retient q01 (b = −1) à la place de q08
 *      (b = −0.1), un item moins informatif au centre mais meilleur
 *      pour les candidats faibles.
 *
 *  Pièges fréquents
 *  - Mettre +I au lieu de −I : la contrainte devient z + Σ I·x ≤ 0,
 *    ce qui force z ≤ −(quelque chose de positif) : avec z ≥ 0 et
 *    6 items imposés, le modèle devient infaisable.
 *  - Déclarer z dans binaries : z ne pourrait valoir que 0 ou 1.
 *  - Oublier `bounds` : glpk.js donne par défaut une borne inférieure
 *    0 aux colonnes, mais il vaut mieux l'écrire explicitement.
 *
 *  Réponses aux questions
 *  a) Sur {−1, 0, 1}, le test « moyen » a déjà le meilleur minimum
 *     possible : les deux modèles donnent la même sélection. Ce n'est
 *     pas une règle générale, la grille large le montre.
 *  b) Sur {−1.5, 0, 1.5}, le maximin gagne ≈ 0.08 au pire niveau et
 *     perd ≈ 0.15 de moyenne. Aucun objectif n'est « le bon » : tout
 *     dépend de l'usage du test. Un test de certification avec un seuil
 *     vise un θ précis. Un test de positionnement doit mesurer
 *     correctement sur toute la plage.
 *  c) Le maximin peut avoir plusieurs solutions optimales (même z).
 *     C'est pourquoi l'auto-vérification compare des VALEURS
 *     (minimum, moyenne) et non la liste exacte des items.
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
type Model = LP & { binaries: string[] };
type SolverOutput = Result;
type SolveOutcome = { solverOutput: SolverOutput; selectedItems: Item[] };
type ComparisonRow = {
  thetaGrid: string;
  model: string;
  items: string;
  TIF: string;
  minimum: number;
  mean: number;
};

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
const WIDE_THETA_GRID: number[] = [-1.5, 0, 1.5];
const RULES: Rules = {
  testLength: 6,
  domains: ["A", "B", "C", "D"],
  minPerDomain: 1,
  maxPerDomain: 2,
  exclusions: [["q02", "q05"]]
};

const glpk = await GLPK();

// ─── 2. OUTILS FOURNIS (exercices 8.1 et 8.2) ────────────────────
function information2PL(a: number, b: number, theta: number): number {
  const probability = 1 / (1 + Math.exp(-a * (theta - b)));
  return a * a * probability * (1 - probability);
}

function buildLengthConstraint(items: Item[], testLength: number): GlpkConstraint {
  return {
    name: `longueur_${testLength}`,
    vars: items.map(item => ({ name: item.id, coef: 1 })),
    bnds: { type: glpk.GLP_FX, lb: testLength, ub: testLength }
  };
}

function buildExclusionConstraint(id1: string, id2: string): GlpkConstraint {
  return {
    name: `exclusion_${id1}_${id2}`,
    vars: [{ name: id1, coef: 1 }, { name: id2, coef: 1 }],
    bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
  };
}

function extractSelectedItems(solverOutput: SolverOutput, items: Item[]): Item[] {
  const vars = solverOutput.result.vars;
  return items.filter(item => (vars[item.id] ?? 0) > 0.5);
}

async function solveModel(model: LP): Promise<SolveOutcome> {
  const solverOutput = await glpk.solve(model, { msglev: glpk.GLP_MSG_OFF, presol: true });
  return { solverOutput, selectedItems: extractSelectedItems(solverOutput, ITEMS) };
}

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// min ≤ Σ_{i ∈ k} x_i ≤ max pour chaque domaine : une double borne GLP_DB.
function buildMinMaxQuotaConstraints(items: Item[], domains: string[], min: number, max: number): GlpkConstraint[] {
  return domains.map(domain => ({
    name: `quota_${domain}`,
    vars: items
      .filter(item => item.domain === domain)
      .map(item => ({ name: item.id, coef: 1 })),
    bnds: { type: glpk.GLP_DB, lb: min, ub: max }
  }));
}

// Pour chaque θ_t : z − Σ_i I_i(θ_t) · x_i ≤ 0.
function buildMaximinConstraints(items: Item[], thetaGrid: number[]): GlpkConstraint[] {
  return thetaGrid.map(theta => ({
    name: `info_min_theta_${theta}`,
    vars: [
      { name: "z", coef: 1 },
      ...items.map(item => ({ name: item.id, coef: -information2PL(item.a, item.b, theta) }))
    ],
    bnds: { type: glpk.GLP_UP, lb: 0, ub: 0 }
  }));
}

// (fourni) Contraintes de test communes aux deux modèles (moyen et maximin).
function buildTestConstraints(items: Item[], rules: Rules): GlpkConstraint[] {
  return [
    buildLengthConstraint(items, rules.testLength),
    ...buildMinMaxQuotaConstraints(items, rules.domains,
      rules.minPerDomain, rules.maxPerDomain),
    ...rules.exclusions.map(([id1, id2]) => buildExclusionConstraint(id1, id2))
  ];
}

// MAX z, avec z continue ≥ 0 et les x binaires.
function buildMaximinModel(items: Item[], rules: Rules, thetaGrid: number[]): Model {
  return {
    name: "assemblage_maximin",
    objective: {
      direction: glpk.GLP_MAX,
      name: "information_minimale",
      vars: [{ name: "z", coef: 1 }]
    },
    subjectTo: [...buildTestConstraints(items, rules), ...buildMaximinConstraints(items, thetaGrid)],
    binaries: items.map(item => item.id),
    bounds: [{ name: "z", type: glpk.GLP_LO, lb: 0, ub: 0 }]
  };
}

// (fourni) Modèle moyen de l'exercice 8.2, avec les mêmes contraintes de test,
// pour une comparaison à règles identiques.
function buildMeanModel(items: Item[], rules: Rules, thetaGrid: number[]): Model {
  return {
    name: "assemblage_moyenne",
    objective: {
      direction: glpk.GLP_MAX,
      name: "information_moyenne",
      vars: items.map(item => ({
        name: item.id,
        coef: thetaGrid.reduce((sum, theta) => sum + information2PL(item.a, item.b, theta), 0) / thetaGrid.length
      }))
    },
    subjectTo: buildTestConstraints(items, rules),
    binaries: items.map(item => item.id)
  };
}

// Recalcul indépendant : TIF(θ_t) = Σ_{i retenu} I_i(θ_t), pour chaque θ_t.
function computeInformationByTheta(selectedItems: Item[], thetaGrid: number[]): number[] {
  return thetaGrid.map(theta =>
    selectedItems.reduce((sum, item) => sum + information2PL(item.a, item.b, theta), 0));
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
// Résout les deux modèles sur une grille et renvoie une ligne de tableau par modèle.
async function compareModels(thetaGrid: number[]): Promise<ComparisonRow[]> {
  const meanOutcome = await solveModel(buildMeanModel(ITEMS, RULES, thetaGrid));
  const maximinOutcome = await solveModel(buildMaximinModel(ITEMS, RULES, thetaGrid));
  const toRow = (modelName: string, { selectedItems }: SolveOutcome): ComparisonRow => {
    const tifValues = computeInformationByTheta(selectedItems, thetaGrid);
    return {
      thetaGrid: thetaGrid.join(" ; "),
      model: modelName,
      items: selectedItems.map(item => item.id).join(" "),
      TIF: tifValues.map(information => information.toFixed(4)).join(" / "),
      minimum: +Math.min(...tifValues).toFixed(4),
      mean: +(tifValues.reduce((sum, information) => sum + information, 0) / tifValues.length).toFixed(4)
    };
  };
  return [toRow("moyen", meanOutcome), toRow("maximin", maximinOutcome)];
}

printTitle("Comparaison : objectif moyen vs maximin");
try {
  console.table([...(await compareModels(THETA_GRID)), ...(await compareModels(WIDE_THETA_GRID))]);
} catch (error) {
  console.log("Résolution impossible :", (error as Error).message);
}

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("quotas min/max : 4 contraintes GLP_DB [1, 2]", () =>
  buildMinMaxQuotaConstraints(ITEMS, RULES.domains, 1, 2)
    .map(constraint => [constraint.bnds.type === glpk.GLP_DB, constraint.bnds.lb, constraint.bnds.ub]),
  [[true, 1, 2], [true, 1, 2], [true, 1, 2], [true, 1, 2]]);
check("3 contraintes maximin (une par θ), 13 variables chacune", () =>
  buildMaximinConstraints(ITEMS, THETA_GRID).map(constraint => constraint.vars.length), [13, 13, 13]);
check("contrainte θ = 1 : z a +1, q05 a −0.9610", () => {
  const constraint = buildMaximinConstraints(ITEMS, THETA_GRID)[2];
  const coef = (variableName: string): number => {
    const term = constraint.vars.find(candidateTerm => candidateTerm.name === variableName);
    if (!term) throw new Error(`la variable ${variableName} est absente de la contrainte θ = 1`);
    return term.coef;
  };
  return [coef("z"), +coef("q05").toFixed(4), constraint.bnds.type === glpk.GLP_UP, constraint.bnds.ub];
}, [1, -0.961, true, 0]);
check("z est continue (absente de binaries) et bornée ≥ 0", () => {
  const model = buildMaximinModel(ITEMS, RULES, THETA_GRID);
  return [model.binaries.includes("z"), model.bounds?.[0]?.name, model.objective.vars.map(term => term.name)];
}, [false, "z", ["z"]]);
check("recalcul TIF de {q02, q08} ≈ [1.0887, 1.3831, 0.5256]", () =>
  computeInformationByTheta(ITEMS.filter(item => ["q02", "q08"].includes(item.id)), THETA_GRID)
    .map(information => +information.toFixed(4)), [1.0887, 1.3831, 0.5256]);
await checkAsync("maximin : statut optimal", async () =>
  (await solveModel(buildMaximinModel(ITEMS, RULES, THETA_GRID))).solverOutput.result.status,
  glpk.GLP_OPT);
await checkAsync("maximin : z = min des TIF recalculées", async () => {
  const { solverOutput, selectedItems } = await solveModel(buildMaximinModel(ITEMS, RULES, THETA_GRID));
  return solverOutput.result.vars.z - Math.min(...computeInformationByTheta(selectedItems, THETA_GRID));
}, 0, 1e-6);
await checkAsync("grille {−1,0,1} : z ≈ 2.2011", async () =>
  (await solveModel(buildMaximinModel(ITEMS, RULES, THETA_GRID))).solverOutput.result.vars.z,
  2.2011, 1e-4);
await checkAsync("grille large : [min, moyenne] moyen ≈ [1.3312, 2.0701], maximin ≈ [1.4109, 1.9173]",
  async () => (await compareModels(WIDE_THETA_GRID)).map(row => [row.minimum, row.mean]),
  [[1.3312, 2.0701], [1.4109, 1.9173]]);
printSummary();
