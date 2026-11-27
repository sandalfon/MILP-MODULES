/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 8 — Exercice 8.3 : Objectif maximin
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-08-selection-items-irt/module-08-selection-items-irt.md (§5, §6, §8)
 *  Niveau : ★★★   Durée indicative : 1 h 15
 *  Lancer : node modules/module-08-selection-items-irt/exercices/ex8-3-maximin.ts
 *
 *  OBJECTIF
 *  Maximiser l'information du test AU PIRE niveau de la grille θ, en
 *  linéarisant le « min » avec une variable auxiliaire continue z, puis
 *  comparer avec l'objectif moyen de l'exercice 8.2, en quatre étapes :
 *  - encadrer le nombre d'items de chaque domaine entre un minimum et
 *    un maximum, en une seule contrainte par domaine (TODO 1) ;
 *  - écrire, pour chaque θ de la grille, la contrainte qui force z à
 *    rester sous l'information du test en ce θ (TODO 2) ;
 *  - assembler le modèle maximin complet, avec z continue (TODO 3) ;
 *  - recalculer la TIF de la sélection à chaque θ, sans le solveur,
 *    pour contrôler z et comparer les deux objectifs (TODO 4).
 *
 *  PRÉREQUIS
 *  - Exercice 8.2 (contraintes de longueur et d'exclusion fournies).
 *  - Cours §5 : MAX z  s.c.  z ≤ Σ_i I_i(θ_t)·x_i  pour chaque θ_t.
 *  - glpk.js : type GLP_DB (double borne), champ `bounds` pour une
 *    variable continue.
 *
 *  CONSIGNE
 *  Formulation à traduire :
 *      MAX   z
 *      s.c.  z − Σ_i I_i(θ_t) · x_i ≤ 0    pour chaque θ_t
 *            Σ_i x_i = 6
 *            1 ≤ Σ_{i ∈ k} x_i ≤ 2      ∀ domaine k
 *            x_q02 + x_q05 ≤ 1
 *            x_i ∈ {0, 1},  z ≥ 0 continue
 *    1. buildMinMaxQuotaConstraints(items, domains, min, max) → GLP_DB
 *    2. buildMaximinConstraints(items, thetaGrid) → une contrainte par θ
 *    3. buildMaximinModel(items, rules, thetaGrid)
 *    4. computeInformationByTheta(selectedItems, thetaGrid) → recalcul indépendant de la TIF
 *  Lance ensuite le script : il compare les deux objectifs sur la grille
 *  {−1, 0, 1} puis sur une grille plus large {−1.5, 0, 1.5}.
 *
 *  RÉSULTAT ATTENDU
 *  Grille {−1, 0, 1} : z ≈ 2.2011. Grille large : le maximin relève le
 *  minimum (≈ 1.4109 contre 1.3312) au prix d'une moyenne plus faible.
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Quotas bornés des deux côtés.
// Objectif : pour chaque domaine k, écrire min ≤ Σ_{i ∈ k} x_i ≤ max en UNE seule
//            contrainte à double borne (au lieu d'un GLP_LO et d'un GLP_UP).
// Entrée   : items (ex. ITEMS) ;
//            domains (ex. ["A", "B", "C", "D"]) ;
//            min, la borne basse du nombre d'items par domaine (ex. 1) ;
//            max, la borne haute du nombre d'items par domaine (ex. 2).
// Sortie   : un tableau de GlpkConstraint, une par domaine, ne portant que sur les
//            items du domaine (coef 1), avec bnds de type glpk.GLP_DB, lb = min, ub = max.
// Exemple  : buildMinMaxQuotaConstraints(ITEMS, RULES.domains, 1, 2) → 4 contraintes
//            GLP_DB [1, 2], de 3 termes chacune.
// (Indice 1 en fin de fichier.)
function buildMinMaxQuotaConstraints(items: Item[], domains: string[], min: number, max: number): GlpkConstraint[] {
  return undefined; // ← à remplacer
}

// TODO 2 — Contraintes de linéarisation du maximin.
// Objectif : pour chaque θ de la grille, écrire z ≤ Σ_i I_i(θ)·x_i sous la forme
//            glpk.js z − Σ_i I_i(θ)·x_i ≤ 0 (variables à gauche, constante à droite).
// Entrée   : items (ex. ITEMS) ;
//            thetaGrid, les niveaux θ (ex. THETA_GRID = [-1, 0, 1]).
// Sortie   : un tableau de GlpkConstraint, une par θ :
//              vars contient d'abord { name: "z", coef: 1 }, puis un terme par item
//                de coefficient −information2PL(item.a, item.b, theta) ;
//              bnds de type glpk.GLP_UP, ub = 0.
// Exemple  : buildMaximinConstraints(ITEMS, THETA_GRID) → 3 contraintes de 13 termes ;
//            dans celle de θ = 1, z a le coefficient +1 et q05 ≈ −0.9610.
// Attention: le SIGNE des coefficients des items est négatif ; avec +I, le modèle
//            devient infaisable.
// (Indice 2 en fin de fichier.)
function buildMaximinConstraints(items: Item[], thetaGrid: number[]): GlpkConstraint[] {
  return undefined; // ← à remplacer
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

// TODO 3 — Modèle maximin complet.
// Objectif : assembler MAX z sous les contraintes du test et les contraintes
//            maximin, avec x_i binaires et z continue ≥ 0 (cours §5).
//            Le modèle contient :
//            - l'objectif, à maximiser, qui ne porte que sur z ;
//            - les contraintes du test (longueur, quotas, exclusions) ;
//            - les contraintes maximin, une par θ de thetaGrid ;
//            - la déclaration des variables d'items comme binaires ;
//            - la borne inférieure 0 de la variable continue z.
// Entrée   : items (ex. ITEMS) ;
//            rules (ex. RULES, quotas de 1 à 2 par domaine) ;
//            thetaGrid (ex. THETA_GRID).
// Sortie   : un Model { name, objective, subjectTo, binaries, bounds } :
//              objective en glpk.GLP_MAX avec le seul terme { name: "z", coef: 1 } ;
//              subjectTo = contraintes du test puis contraintes maximin ;
//              binaries = les id des items ;
//              bounds = [{ name: "z", type: glpk.GLP_LO, lb: 0, ub: 0 }].
// Exemple  : buildMaximinModel(ITEMS, RULES, THETA_GRID) → binaries sans "z",
//            bounds[0].name = "z", objectif ["z"] ; résolu, z ≈ 2.2011.
// Attention: ne mets pas z dans binaries : il ne pourrait valoir que 0 ou 1.
// (Indice 3 en fin de fichier.)
function buildMaximinModel(items: Item[], rules: Rules, thetaGrid: number[]): Model {
  return undefined; // ← à remplacer
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

// TODO 4 — Recalcul indépendant de la TIF.
// Objectif : recalculer, à partir de a et b seulement, l'information du test à
//            chaque θ de la grille, pour contrôler le z annoncé par le solveur.
// Entrée   : selectedItems, les items du test (ex. les items q02 et q08) ;
//            thetaGrid (ex. THETA_GRID = [-1, 0, 1]).
// Sortie   : un tableau [TIF(θ_1), TIF(θ_2), …] avec TIF(θ) = Σ information2PL(a, b, θ)
//            sur les items de selectedItems.
// Exemple  : pour {q02, q08} et THETA_GRID → ≈ [1.0887, 1.3831, 0.5256].
// Attention: n'utilise pas le résultat du solveur : c'est un contrôle indépendant.
// (Indice 4 en fin de fichier.)
function computeInformationByTheta(selectedItems: Item[], thetaGrid: number[]): number[] {
  return undefined; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Sur la grille {−1, 0, 1}, pourquoi les deux modèles peuvent-ils
//     donner exactement le même test ?
//  b) Sur la grille large, que gagne-t-on et que perd-on avec le maximin ?
//     Quel objectif choisirais-tu pour un test de positionnement ?
//  c) Pourquoi l'auto-vérification compare-t-elle des valeurs (minimum,
//     moyenne) plutôt que la liste exacte des items retenus ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (buildMinMaxQuotaConstraints) — même structure que les quotas de
//   l'exercice 8.2 (domains.map + filter sur item.domain), seul bnds change.
//
// Indice 2 (buildMaximinConstraints) — thetaGrid.map(theta => ({ ... })) ; dans vars,
//   [{ name: "z", coef: 1 }, ...items.map(item => ({ name: item.id, coef: … }))].
//
// Indice 3 (buildMaximinModel) — subjectTo :
//   [...buildTestConstraints(items, rules), ...buildMaximinConstraints(items, thetaGrid)].
//
// Indice 4 (computeInformationByTheta) — thetaGrid.map(theta =>
//   selectedItems.reduce((sum, item) => …, 0)).
