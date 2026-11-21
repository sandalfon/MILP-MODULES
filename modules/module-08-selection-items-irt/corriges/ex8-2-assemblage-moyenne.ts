/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 8 — Exercice 8.2 : Assemblage d'un test (objectif moyen) — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-08-selection-items-irt/module-08-selection-items-irt.md (§3, §4, §6, §8)
 *  Lancer : node modules/module-08-selection-items-irt/corriges/ex8-2-assemblage-moyenne.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Formulation transmise au solveur :
 *      MAX   Σ_i c_i · x_i                     (c_i = information moyenne)
 *      s.c.  Σ_i x_i = 6                        longueur      → GLP_FX
 *            Σ_{i ∈ k} x_i ≥ 1   ∀ domaine k    quotas        → GLP_LO
 *            x_q02 + x_q05 ≤ 1                  exclusion     → GLP_UP
 *            x_i ∈ {0, 1}                       binaries
 *
 *  Chaque contrainte glpk.js est un objet { name, vars, bnds } :
 *   - vars liste les couples { name: <variable>, coef: <coefficient> } ;
 *   - bnds donne le type et les bornes. Pour GLP_FX, lb = ub = valeur.
 *     Pour GLP_LO, seul lb compte ; pour GLP_UP, seul ub compte (l'autre
 *     borne est ignorée, on la met à 0 par convention).
 *  Les contraintes de quotas sont GÉNÉRÉES par une boucle sur les
 *  domaines : on ne les écrit jamais à la main, pour qu'une banque de
 *  50 domaines se traite exactement comme une banque de 4.
 *
 *  Lecture du résultat : solverOutput.result contient status, z (valeur de
 *  l'objectif) et vars (valeur de chaque variable). On compare les x à
 *  0.5 plutôt qu'à 1, pour absorber d'éventuels 0.9999999.
 *
 *  Validation indépendante : validateSelection ne réutilise PAS le
 *  modèle. Elle recompte à partir des données brutes. Si une
 *  contrainte avait été mal écrite (GLP_UP au lieu de GLP_LO, par
 *  exemple), le solveur renverrait une solution « optimale » que le
 *  validateur rejetterait.
 *
 *  Résultat : q02, q04, q07, q08, q10, q12 → objectif ≈ 2.6602.
 *  q05 a la meilleure moyenne de la banque (0.5412) mais n'est pas
 *  retenu : l'exclusion l'oppose à q02 (0.5076). Le solveur garde q02,
 *  car q02 est aussi le meilleur item du domaine A, et prendre q05
 *  obligerait à le remplacer par un item A bien moins informatif.
 *
 *  Pièges fréquents
 *  - Oublier `binaries` : GLPK résout alors un LP continu (relaxation)
 *    et peut renvoyer des x fractionnaires.
 *  - Construire l'objectif sur ITEMS au lieu de SCORED_ITEMS : le champ
 *    score n'existe pas (TypeScript le signale ; en JavaScript, on
 *    obtiendrait undefined, puis NaN).
 *  - Confondre GLP_LO (≥) et GLP_UP (≤).
 *
 *  Réponses aux questions
 *  a) Si l'on retire l'exclusion, q05 entre à la place de q07 : la
 *     sélection devient q02, q04, q05, q08, q10, q12 et la moyenne
 *     passe à ≈ 2.8750. L'écart (≈ 0,21) est le « coût » de la règle
 *     d'exclusion. Une règle métier a toujours un prix en information :
 *     le mesurer aide à en discuter avec les experts du contenu.
 *  b) Les domaines A (q02) et B (q04) n'ont qu'un item : leur quota
 *     est donc saturé. C et D en ont deux.
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Item = { id: string; a: number; b: number; domain: string };
// Item enrichi de son coefficient d'objectif (calculé en section 2).
type ScoredItem = Item & { score: number };
type Rules = {
  testLength: number;
  domains: string[];
  minPerDomain: number;
  exclusions: [string, string][];
};
type Model = LP;
type SolverOutput = Result;
type GlpkConstraint = LP["subjectTo"][number];
type SolveOutcome = { solverOutput: SolverOutput; selectedItems: ScoredItem[] };

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
const WEIGHTS: number[] = [1 / 3, 1 / 3, 1 / 3];
const RULES: Rules = {
  testLength: 6,
  domains: ["A", "B", "C", "D"],
  minPerDomain: 1,
  exclusions: [["q02", "q05"]]
};

const glpk = await GLPK();

// ─── 2. OUTILS FOURNIS (exercice 8.1) ───────────────────────────
function information2PL(a: number, b: number, theta: number): number {
  const probability = 1 / (1 + Math.exp(-a * (theta - b)));
  return a * a * probability * (1 - probability);
}

// Chaque item reçoit son coefficient moyen : score = Σ_t w_t · I(θ_t).
// map crée de nouveaux objets : la banque ITEMS n'est pas modifiée.
const SCORED_ITEMS: ScoredItem[] = ITEMS.map(item => ({
  ...item,
  score: THETA_GRID.reduce((sum, theta, thetaIndex) =>
    sum + WEIGHTS[thetaIndex] * information2PL(item.a, item.b, theta), 0)
}));

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Σ_i x_i = longueur.
function buildLengthConstraint(items: Item[], testLength: number): GlpkConstraint {
  return {
    name: `longueur_${testLength}`,
    vars: items.map(item => ({ name: item.id, coef: 1 })),
    bnds: { type: glpk.GLP_FX, lb: testLength, ub: testLength }
  };
}

// Pour chaque domaine k : Σ_{i ∈ k} x_i ≥ minimum.
function buildQuotaConstraints(items: Item[], domains: string[], minimum: number): GlpkConstraint[] {
  return domains.map(domain => ({
    name: `quota_${domain}`,
    vars: items
      .filter(item => item.domain === domain)
      .map(item => ({ name: item.id, coef: 1 })),
    bnds: { type: glpk.GLP_LO, lb: minimum, ub: 0 }
  }));
}

// x_id1 + x_id2 ≤ 1.
function buildExclusionConstraint(id1: string, id2: string): GlpkConstraint {
  return {
    name: `exclusion_${id1}_${id2}`,
    vars: [{ name: id1, coef: 1 }, { name: id2, coef: 1 }],
    bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
  };
}

// Assemble objectif + contraintes + déclaration des binaires.
function buildModel(items: ScoredItem[], rules: Rules): Model {
  return {
    name: "assemblage_moyenne",
    objective: {
      direction: glpk.GLP_MAX,
      name: "information_moyenne",
      vars: items.map(item => ({ name: item.id, coef: item.score }))
    },
    subjectTo: [
      buildLengthConstraint(items, rules.testLength),
      ...buildQuotaConstraints(items, rules.domains, rules.minPerDomain),
      ...rules.exclusions.map(([id1, id2]) => buildExclusionConstraint(id1, id2))
    ],
    binaries: items.map(item => item.id)
  };
}

// Items dont la variable vaut (environ) 1.
function extractSelectedItems(solverOutput: SolverOutput, items: ScoredItem[]): ScoredItem[] {
  const vars = solverOutput.result.vars;
  return items.filter(item => (vars[item.id] ?? 0) > 0.5);
}

// Contrôle indépendant : renvoie la liste des règles violées ([] si tout va bien).
function validateSelection(selectedItems: Item[], rules: Rules): string[] {
  const errors: string[] = [];
  const selectedIds = selectedItems.map(item => item.id);
  if (selectedItems.length !== rules.testLength) {
    errors.push(`longueur ${selectedItems.length} ≠ ${rules.testLength}`);
  }
  for (const domain of rules.domains) {
    const itemCount = selectedItems.filter(item => item.domain === domain).length;
    if (itemCount < rules.minPerDomain) errors.push(`quota ${domain} insuffisant (${itemCount})`);
  }
  for (const [id1, id2] of rules.exclusions) {
    if (selectedIds.includes(id1) && selectedIds.includes(id2)) errors.push(`exclusion ${id1}/${id2} violée`);
  }
  return errors;
}

// Construit et résout le modèle (fourni). Regroupé dans une fonction pour être
// réutilisé tel quel par le programme principal et l'auto-vérification.
async function solveAssembly(rules: Rules): Promise<SolveOutcome> {
  const solverOutput = await glpk.solve(buildModel(SCORED_ITEMS, rules), {
    msglev: glpk.GLP_MSG_OFF,
    presol: true
  });
  return { solverOutput, selectedItems: extractSelectedItems(solverOutput, SCORED_ITEMS) };
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Résolution du modèle « information moyenne »");
try {
  const { solverOutput, selectedItems } = await solveAssembly(RULES);
  console.log("Statut :", solverOutput.result.status, solverOutput.result.status === glpk.GLP_OPT ? "(optimal)" : "");
  console.log("Objectif annoncé par GLPK :", solverOutput.result.z.toFixed(4));
  console.table(selectedItems.map(({ id, domain, a, b, score }) =>
    ({ id, domain, a, b, score: score.toFixed(4) })));
  console.log("Objectif recalculé :", selectedItems.reduce((sum, item) => sum + item.score, 0).toFixed(4));
  console.log("Validation indépendante :", validateSelection(selectedItems, RULES));

  // Question a) : coût de la règle d'exclusion.
  const withoutExclusion = await solveAssembly({ ...RULES, exclusions: [] });
  console.log("Sans exclusion :", withoutExclusion.selectedItems.map(item => item.id).join(", "),
    "→", withoutExclusion.solverOutput.result.z.toFixed(4));
} catch (error) {
  console.log("Résolution impossible :", (error as Error).message);
}

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("contrainte de longueur : GLP_FX à 6 sur 12 variables", () => {
  const constraint = buildLengthConstraint(ITEMS, 6);
  return [constraint.vars.length, constraint.bnds.type === glpk.GLP_FX, constraint.bnds.lb, constraint.bnds.ub];
}, [12, true, 6, 6]);
check("4 quotas, 3 items chacun, type GLP_LO", () =>
  buildQuotaConstraints(ITEMS, RULES.domains, 1)
    .map(constraint => [constraint.vars.length, constraint.bnds.type === glpk.GLP_LO, constraint.bnds.lb]),
  [[3, true, 1], [3, true, 1], [3, true, 1], [3, true, 1]]);
check("exclusion q02/q05 : GLP_UP ≤ 1", () => {
  const constraint = buildExclusionConstraint("q02", "q05");
  return [constraint.vars.map(term => term.name), constraint.bnds.type === glpk.GLP_UP, constraint.bnds.ub];
}, [["q02", "q05"], true, 1]);
check("validateur : sélection fautive → 3 erreurs (quota C, quota D, exclusion)", () =>
  validateSelection(ITEMS.slice(0, 6), RULES).length, 3);
await checkAsync("statut optimal", async () =>
  (await solveAssembly(RULES)).solverOutput.result.status, glpk.GLP_OPT);
await checkAsync("sélection q02, q04, q07, q08, q10, q12", async () =>
  (await solveAssembly(RULES)).selectedItems.map(item => item.id),
  ["q02", "q04", "q07", "q08", "q10", "q12"]);
await checkAsync("objectif ≈ 2.6602", async () =>
  (await solveAssembly(RULES)).solverOutput.result.z, 2.6602, 1e-4);
await checkAsync("la sélection passe la validation indépendante", async () =>
  validateSelection((await solveAssembly(RULES)).selectedItems, RULES), []);
printSummary();
