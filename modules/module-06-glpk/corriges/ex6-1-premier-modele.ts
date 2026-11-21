/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 6 — Exercice 6.1 : Premier modèle glpk.js — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-06-glpk/module-06-glpk.md (§2 à §5)
 *  Lancer : node modules/module-06-glpk/corriges/ex6-1-premier-modele.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  1. Le modèle traduit LIGNE À LIGNE la formulation mathématique :
 *       MAX 8A + 12B + 10C + 5D           → objective (GLP_MAX)
 *       30A + 50B + 40C + 20D ≤ 100       → une entrée de subjectTo, GLP_UP
 *       A, B, C, D ∈ {0, 1}               → binaries
 *     Sans `binaries`, les variables seraient CONTINUES (≥ 0, non bornées
 *     au-dessus). On résoudrait alors un autre problème : le solveur
 *     prendrait par exemple 3,33 fois le produit A (voir la QUESTION).
 *
 *  2. Le statut se lit dans solverOutput.result.status. On le traduit avec
 *     les constantes de glpk (GLP_OPT = 5, GLP_NOFEAS = 4…) plutôt
 *     qu'avec des nombres en dur : le code reste lisible, et il reste
 *     juste même si les valeurs numériques changeaient un jour.
 *
 *  3. Lecture des binaires : on compare à 0,5 au lieu de tester === 1,
 *     car un solveur peut renvoyer 0.9999999 ou 1e-10. Le `?? 0`
 *     traite une variable absente du résultat comme valant 0.
 *
 *  Résultat : statut OPTIMAL, z = 25, produits A, B, D. C'est la même
 *  solution que l'énumération du module 1 : le solveur et la méthode
 *  « à la main » se confirment mutuellement.
 *
 *  Pièges fréquents
 *  - Importer "glpk.js" au lieu de "glpk.js/node" sous Node.js :
 *    ReferenceError: Worker is not defined.
 *  - Oublier `await` devant GLPK() : l'initialisation (chargement du
 *    WebAssembly) est asynchrone, `glpk` serait alors une Promise et
 *    glpk.solve n'existerait pas. En revanche, sous Node.js
 *    (« glpk.js/node », version 5.0), glpk.solve(...) est SYNCHRONE :
 *    il renvoie directement le résultat. Le `await` placé devant est
 *    toléré (attendre une valeur qui n'est pas une Promise la renvoie
 *    telle quelle) et garde le code compatible avec la version
 *    navigateur, où solve() renvoie une Promise.
 *  - Lire vars sans tester le statut : si le modèle est infaisable,
 *    toutes les variables valent 0, ce qui ressemble à une sélection vide.
 *
 *  Réponse à la QUESTION : sans la ligne binaries, le problème devient
 *  un LP continu, sans borne supérieure sur les variables. Le solveur
 *  choisit alors la variable au meilleur rapport valeur/coût (A, 8/30 ≈
 *  0,267 par €) et remplit tout le budget avec : A ≈ 3,33, B = C = D = 0,
 *  soit z ≈ 26,67. La relaxation 0 ≤ x ≤ 1
 *  du module 5 donnait 25,4. Ces deux valeurs dépassent 25 : comme
 *  prévu, relâcher la contrainte d'intégrité ne peut qu'améliorer
 *  l'objectif.
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, printSummary, printTitle } from "../../../lib/verif.ts";

const glpk = await GLPK();

// ─── 1. DONNÉES ─────────────────────────────────────────────────
// A : coût 30, valeur 8 ; B : 50, 12 ; C : 40, 10 ; D : 20, 5 ; budget 100.
const IDS: string[] = ["A", "B", "C", "D"];

// Modèle glpk.js dont la liste des binaires est toujours renseignée.
type Model = LP & { binaries: string[] };
// Réponse de glpk.solve (type fourni par glpk.js).
type SolverOutput = Result;
// Valeurs renvoyées par le solveur : nom de variable → valeur.
type VariableValues = Record<string, number>;

// ─── 2. FONCTIONS ───────────────────────────────────────────────

// Modèle écrit « à la main », exactement comme la formulation papier.
function buildModel(): Model {
  return {
    name: "sac_a_dos",
    objective: {
      direction: glpk.GLP_MAX,
      name: "valeur",
      vars: [
        { name: "A", coef: 8 }, { name: "B", coef: 12 },
        { name: "C", coef: 10 }, { name: "D", coef: 5 }
      ]
    },
    subjectTo: [
      {
        name: "budget",
        vars: [
          { name: "A", coef: 30 }, { name: "B", coef: 50 },
          { name: "C", coef: 40 }, { name: "D", coef: 20 }
        ],
        bnds: { type: glpk.GLP_UP, lb: 0, ub: 100 } // Σ ≤ 100 (lb ignoré)
      }
    ],
    binaries: ["A", "B", "C", "D"]
  };
}

// Traduit le code numérique du statut en texte.
function statusToText(status: number): string {
  const labels: Record<number, string> = {
    [glpk.GLP_OPT]: "optimal",
    [glpk.GLP_FEAS]: "réalisable (optimalité non prouvée)",
    [glpk.GLP_NOFEAS]: "infaisable",
    [glpk.GLP_INFEAS]: "irréalisable",
    [glpk.GLP_UNBND]: "non borné",
    [glpk.GLP_UNDEF]: "indéfini"
  };
  return labels[status] ?? `inconnu (${status})`;
}

// Liste des variables binaires valant (environ) 1.
function readSelectedIds(vars: VariableValues): string[] {
  return IDS.filter(id => (vars[id] ?? 0) > 0.5);
}

// ─── 3. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Résolution du sac à dos avec GLPK");
const model = buildModel();
let solverOutput: SolverOutput | null = null;
try {
  solverOutput = await glpk.solve(model, { msglev: glpk.GLP_MSG_OFF, presol: true });
  console.log("Résultat brut :", JSON.stringify(solverOutput.result));
  console.log("Statut :", statusToText(solverOutput.result.status));
  if (solverOutput.result.status === glpk.GLP_OPT) {
    console.log("Valeur optimale z :", solverOutput.result.z);
    console.log("Produits choisis :", readSelectedIds(solverOutput.result.vars));
  } else {
    console.log("Pas de solution optimale : on ne lit pas les variables.");
  }
} catch (error) {
  console.log("Le modèle n'est pas encore valide :", (error as Error).message);
}

// ─── 4. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("statut 5 → optimal", () => statusToText(glpk.GLP_OPT), "optimal");
check("statut 4 → infaisable", () => statusToText(glpk.GLP_NOFEAS), "infaisable");
check("4 variables binaires déclarées", () => buildModel().binaries.length, 4);
check("objectif en maximisation", () => buildModel().objective.direction, glpk.GLP_MAX);
check("contrainte budget de type ≤ 100", () => {
  const budgetConstraint = buildModel().subjectTo.find(constraint => constraint.name === "budget");
  if (!budgetConstraint) throw new Error("contrainte « budget » absente du modèle");
  const coefSum = budgetConstraint.vars.reduce((sum, term) => sum + term.coef, 0);
  return [budgetConstraint.bnds.type, budgetConstraint.bnds.ub, coefSum];
}, [glpk.GLP_UP, 100, 140]);
check("statut obtenu = GLP_OPT", () => solverOutput?.result.status, glpk.GLP_OPT);
check("z = 25", () => solverOutput?.result.z, 25);
check("choisis = A, B, D", () => readSelectedIds(solverOutput?.result.vars ?? {}), ["A", "B", "D"]);
check("lecture robuste au bruit numérique",
  () => readSelectedIds({ A: 0.9999999, B: 1e-9, C: 1.0000001 }), ["A", "C"]);
printSummary();
