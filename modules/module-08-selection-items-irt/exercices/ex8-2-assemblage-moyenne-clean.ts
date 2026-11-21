/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 8 — Exercice 8.2 : Assemblage d'un test (objectif moyen)
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-08-selection-items-irt/module-08-selection-items-irt.md (§3, §4, §6, §8)
 *  Niveau : ★★☆   Durée indicative : 1 h
 *  Lancer : node modules/module-08-selection-items-irt/exercices/ex8-2-assemblage-moyenne.ts
 *
 *  OBJECTIF
 *  Construire avec glpk.js la MILP qui choisit 6 items sur 12 en
 *  maximisant l'information moyenne sur θ ∈ {−1, 0, 1}, puis valider
 *  la solution de façon indépendante.
 *
 *  PRÉREQUIS
 *  - Exercice 8.1 (les coefficients score de SCORED_ITEMS sont fournis).
 *  - Module 6 : structure d'un modèle glpk.js (objective, subjectTo,
 *    binaries) et types de bornes GLP_FX / GLP_LO / GLP_UP.
 *  - Module 7 : principe du validateur indépendant.
 *
 *  CONSIGNE
 *  Formulation à traduire :
 *      MAX   Σ_i score_i · x_i
 *      s.c.  Σ_i x_i = 6                        (longueur)
 *            Σ_{i ∈ k} x_i ≥ 1   ∀ domaine k    (quotas)
 *            x_q02 + x_q05 ≤ 1                  (exclusion)
 *            x_i ∈ {0, 1}
 *    1. buildLengthConstraint(items, testLength)
 *    2. buildQuotaConstraints(items, domains, minimum) → UNE contrainte par domaine
 *    3. buildExclusionConstraint(id1, id2)
 *    4. buildModel(items, rules) → { name, objective, subjectTo, binaries }
 *    5. extractSelectedItems(solverOutput, items) → items dont x > 0.5
 *    6. validateSelection(selectedItems, rules) → liste des règles violées
 *
 *  RÉSULTAT ATTENDU
 *  Statut 5 (GLP_OPT), sélection q02, q04, q07, q08, q10, q12,
 *  objectif ≈ 2.6602, validation indépendante : [].
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Contrainte de longueur du test.
// Objectif : écrire Σ_i x_i = testLength au format glpk.js, pour imposer
//            exactement testLength items dans le test.
// Entrée   : items, les items candidats (ex. ITEMS, 12 items) ; testLength, la
//            longueur imposée (ex. 6).
// Sortie   : une GlpkConstraint { name, vars, bnds } : vars contient un terme
//            { name: <id de l'item>, coef: 1 } par item ; bnds est de type
//            glpk.GLP_FX avec lb = ub = testLength.
// Exemple  : buildLengthConstraint(ITEMS, 6) → 12 termes de coefficient 1,
//            bnds { type: GLP_FX, lb: 6, ub: 6 } ; un nom comme "longueur_6".
// Attention: avec GLP_FX, lb ET ub doivent valoir testLength.
// (Indice 1 en fin de fichier.)
function buildLengthConstraint(items: Item[], testLength: number): GlpkConstraint {
  return undefined; // ← à remplacer
}

// TODO 2 — Contraintes de quotas par domaine.
// Objectif : pour CHAQUE domaine k, écrire Σ_{i ∈ k} x_i ≥ minimum, afin que
//            chaque domaine de contenu soit représenté dans le test.
// Entrée   : items, les items candidats (ex. ITEMS) ; domains, les domaines
//            (ex. ["A", "B", "C", "D"]) ; minimum, le nombre d'items requis (ex. 1).
// Sortie   : un TABLEAU de GlpkConstraint, une par domaine, dans l'ordre de domains :
//            vars ne contient que les items du domaine (coef 1) ; bnds est de type
//            glpk.GLP_LO avec lb = minimum (ub = 0, ignoré).
// Exemple  : buildQuotaConstraints(ITEMS, ["A", "B", "C", "D"], 1) → 4 contraintes
//            de 3 termes ; celle de A porte sur q01, q02, q03, avec GLP_LO, lb = 1.
// Attention: les contraintes doivent être générées à partir des données, pas
//            écrites à la main domaine par domaine.
// (Indice 2 en fin de fichier.)
function buildQuotaConstraints(items: Item[], domains: string[], minimum: number): GlpkConstraint[] {
  return undefined; // ← à remplacer
}

// TODO 3 — Contrainte d'exclusion entre deux items « ennemis ».
// Objectif : écrire x_id1 + x_id2 ≤ 1 : les deux items ne peuvent pas être
//            dans le même test.
// Entrée   : id1, id2, les identifiants des deux items, ex. "q02" et "q05".
// Sortie   : une GlpkConstraint dont vars contient les deux termes de coefficient 1
//            (dans l'ordre id1, id2) et dont bnds est de type glpk.GLP_UP avec ub = 1.
// Exemple  : buildExclusionConstraint("q02", "q05") → variables ["q02", "q05"],
//            GLP_UP, ub = 1.
// (Indice 3 en fin de fichier.)
function buildExclusionConstraint(id1: string, id2: string): GlpkConstraint {
  return undefined; // ← à remplacer
}

// TODO 4 — Modèle complet « information moyenne ».
// Objectif : assembler MAX Σ score_i · x_i sous les contraintes de longueur,
//            de quotas et d'exclusion, avec x_i binaires (formulation de l'en-tête).
// Entrée   : items, les items notés (ex. SCORED_ITEMS, chacun avec son score) ;
//            rules, les règles du test (ex. RULES : testLength 6, domains A à D,
//            minPerDomain 1, exclusions [["q02", "q05"]]).
// Sortie   : un Model { name, objective, subjectTo, binaries } :
//            objective en glpk.GLP_MAX avec un terme { name: id, coef: score } par item ;
//            subjectTo = la contrainte de longueur, puis les quotas, puis une
//            contrainte par paire de rules.exclusions ; binaries = tous les id d'items.
// Exemple  : buildModel(SCORED_ITEMS, RULES) → 12 termes dans l'objectif,
//            1 + 4 + 1 = 6 contraintes, 12 binaires.
// Attention: sans binaries, GLPK résout la relaxation continue et peut renvoyer
//            des x fractionnaires.
// (Indice 4 en fin de fichier.)
function buildModel(items: ScoredItem[], rules: Rules): Model {
  return undefined; // ← à remplacer
}

// TODO 5 — Lire la sélection dans la réponse du solveur.
// Objectif : retrouver les items retenus, c'est-à-dire ceux dont la variable
//            binaire vaut 1 dans la solution.
// Entrée   : solverOutput, la réponse de glpk.solve (ex. valeurs q02 → 1, q01 → 0…) ;
//            items, les items notés (ex. SCORED_ITEMS).
// Sortie   : le sous-tableau des items dont la variable est > 0.5, dans l'ordre de items.
// Exemple  : avec la solution optimale → les items q02, q04, q07, q08, q10, q12.
// Attention: compare à 0.5 et non à 1 (un solveur peut renvoyer 0.9999999) ;
//            une variable absente de la réponse compte pour 0.
// (Indice 5 en fin de fichier.)
function extractSelectedItems(solverOutput: SolverOutput, items: ScoredItem[]): ScoredItem[] {
  return undefined; // ← à remplacer
}

// TODO 6 — Validateur INDÉPENDANT de la sélection.
// Objectif : recompter les règles à partir des données brutes, sans réutiliser
//            le modèle, pour détecter une erreur de formulation (cours §8).
// Entrée   : selectedItems, les items du test (ex. ITEMS.slice(0, 6) : q01 à q06) ;
//            rules, les règles (ex. RULES).
// Sortie   : un tableau de messages, un par règle violée ([] si tout est respecté) :
//            longueur différente de rules.testLength ; pour chaque domaine, moins de
//            rules.minPerDomain items ; pour chaque paire d'exclusion, les deux présents.
// Exemple  : validateSelection(ITEMS.slice(0, 6), RULES) → 3 messages
//            (quota C insuffisant, quota D insuffisant, exclusion q02/q05 violée) ;
//            avec la sélection optimale → [].
// Attention: une même sélection peut violer plusieurs règles : n'arrête pas au
//            premier problème.
// (Indice 6 en fin de fichier.)
function validateSelection(selectedItems: Item[], rules: Rules): string[] {
  const errors: string[] = [];
  // ... à compléter
  return undefined; // ← à remplacer
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

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) q05 a la meilleure moyenne de la banque. Pourquoi n'est-il pas retenu ?
//     Combien d'information « coûte » la règle d'exclusion ?
//  b) Quels domaines ont leur quota saturé (exactement 1 item) ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (buildLengthConstraint) — items.map(item => ({ name: item.id, coef: 1 }))
//   donne les termes ; le nom peut s'écrire `longueur_${testLength}`.
//
// Indice 2 (buildQuotaConstraints) — domains.map(domain => ({ ... })) ; pour vars,
//   filtre les items du domaine (item.domain === domain) puis transforme-les en termes.
//
// Indice 3 (buildExclusionConstraint) — vars : [{ name: id1, coef: 1 }, { name: id2, coef: 1 }] ;
//   lb est ignoré pour GLP_UP (mets 0).
//
// Indice 4 (buildModel) — réutilise les TODO 1 à 3 ; l'opérateur ... insère un
//   tableau de contraintes dans subjectTo, et rules.exclusions.map(([id1, id2]) => …)
//   crée une contrainte par paire.
//
// Indice 5 (extractSelectedItems) — les valeurs sont dans solverOutput.result.vars[item.id] ;
//   items.filter(item => (… ?? 0) > 0.5).
//
// Indice 6 (validateSelection) — le squelette prépare le tableau errors : une boucle
//   for…of sur rules.domains (filter(…).length), une autre sur rules.exclusions
//   (selectedIds.includes), errors.push(message) à chaque violation, puis return errors.
