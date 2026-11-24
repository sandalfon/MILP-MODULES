/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 6 — Exercice 6.1 : Premier modèle glpk.js
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-06-glpk/module-06-glpk.md (§2 à §5)
 *  Niveau : ★☆☆   Durée indicative : 30 min
 *  Lancer : node modules/module-06-glpk/exercices/ex6-1-premier-modele.ts
 *
 *  OBJECTIF
 *  Écrire ton premier modèle MILP pour un vrai solveur, le résoudre,
 *  puis lire correctement le statut et les variables, en trois étapes :
 *  - écrire à la main le modèle glpk.js du sac à dos du module 1 (TODO 1) ;
 *  - traduire le statut numérique renvoyé par GLPK en texte lisible
 *    (TODO 2) ;
 *  - lire dans la réponse du solveur les produits retenus (TODO 3).
 *
 *  PRÉREQUIS
 *  - Module 1 : formulation du sac à dos
 *       MAX 8A + 12B + 10C + 5D
 *       s.c. 30A + 50B + 40C + 20D ≤ 100,  A, B, C, D ∈ {0, 1}
 *  - TypeScript : async/await, objets imbriqués, opérateur ?? ,
 *    type LP fourni par glpk.js, Record<number, string>.
 *  - glpk.js installé (npm install) et importé depuis "glpk.js/node".
 *
 *  CONSIGNE
 *    1. buildModel() : complète l'objectif (coefficients de valeur),
 *       la contrainte de budget (coefficients de coût, type ≤ 100) et la
 *       liste des variables binaires.
 *    2. statusToText(status) : traduis le code du statut en texte
 *       ("optimal", "infaisable", etc.) sans écrire de nombre en dur.
 *    3. readSelectedIds(vars) : renvoie les id dont la valeur est > 0.5.
 *    4. Réponds à la QUESTION en bas du programme principal.
 *
 *  RÉSULTAT ATTENDU
 *  Statut "optimal", z = 25, produits choisis ["A", "B", "D"].
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, printSummary, printTitle } from "../../../lib/verif.ts";

const glpk = await GLPK();

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
// A : coût 30, valeur 8 ; B : 50, 12 ; C : 40, 10 ; D : 20, 5 ; budget 100.
const IDS: string[] = ["A", "B", "C", "D"];

// Modèle glpk.js dont la liste des binaires est toujours renseignée.
type Model = LP & { binaries: string[] };
// Réponse de glpk.solve (type fourni par glpk.js).
type SolverOutput = Result;
// Valeurs renvoyées par le solveur : nom de variable → valeur.
type VariableValues = Record<string, number>;

// ─── 2. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Écrire le modèle du sac à dos à la main.
// Objectif : traduire LIGNE À LIGNE la formulation papier du module 1 en
//            modèle glpk.js : MAX 8A + 12B + 10C + 5D
//            s.c. 30A + 50B + 40C + 20D ≤ 100, A, B, C, D ∈ {0, 1}.
//            Quatre champs marqués « ← à compléter » :
//            - objective.vars : les termes de l'objectif (valeurs) ;
//            - subjectTo[0].vars : les termes du budget (coûts) ;
//            - subjectTo[0].bnds : les bornes qui expriment « ≤ 100 » ;
//            - binaries : les noms des variables binaires.
// Entrée   : aucune (les coefficients sont ceux de la ligne DONNÉES :
//            A : coût 30, valeur 8 ; B : 50, 12 ; C : 40, 10 ; D : 20, 5).
// Sortie   : un Model dont :
//            - objective.vars contient un terme { name, coef } par produit
//              (coef = valeur) ;
//            - subjectTo[0] (« budget ») a un terme par produit (coef = coût)
//              et des bornes bnds qui expriment « Σ ≤ 100 » ;
//            - binaries liste les 4 noms de variables.
// Exemple  : buildModel().binaries.length → 4 ; la somme des coefficients
//            de « budget » vaut 30 + 50 + 40 + 20 = 140 ; une fois résolu :
//            statut optimal, z = 25.
// Attention: sans binaries, les variables seraient continues (≥ 0, sans
//            borne supérieure) : on résoudrait un autre problème.
// (Indice 1 en fin de fichier.)
function buildModel(): Model {
  return {
    name: "sac_a_dos",
    objective: {
      direction: glpk.GLP_MAX,
      name: "valeur",
      vars: [] // ← à compléter
    },
    subjectTo: [
      {
        name: "budget",
        vars: [],     // ← à compléter
        bnds: undefined // ← à compléter
      }
    ],
    binaries: [] // ← à compléter
  };
}

// TODO 2 — Traduire un statut numérique en texte.
// Objectif : rendre lisible le statut renvoyé par GLPK (solverOutput.result.status)
//            en s'appuyant sur les constantes de glpk, jamais sur des nombres
//            écrits en dur. Libellés attendus :
//              glpk.GLP_OPT    → "optimal"
//              glpk.GLP_FEAS   → "réalisable (optimalité non prouvée)"
//              glpk.GLP_NOFEAS → "infaisable"
//              glpk.GLP_INFEAS → "irréalisable"
//              glpk.GLP_UNBND  → "non borné"
//              glpk.GLP_UNDEF  → "indéfini"
// Entrée   : status, un code numérique de statut, ex. glpk.GLP_OPT (= 5).
// Sortie   : le libellé correspondant (string).
// Exemple  : statusToText(glpk.GLP_OPT) → "optimal" ;
//            statusToText(glpk.GLP_NOFEAS) → "infaisable".
// Attention: un code non prévu, ex. 42, renvoie `inconnu (${status})`, soit "inconnu (42)".
// (Indice 2 en fin de fichier.)
function statusToText(status: number): string {
  return undefined; // ← à remplacer
}

// TODO 3 — Lire les variables binaires choisies.
// Objectif : savoir quels produits le solveur a retenus, à partir des
//            valeurs de variables qu'il renvoie (solverOutput.result.vars).
// Entrée   : vars, nom de variable → valeur, ex. { A: 1, B: 1, C: 0, D: 1 }.
// Sortie   : les id de IDS (dans l'ordre de IDS) dont la variable vaut 1, en string[].
// Exemple  : readSelectedIds({ A: 1, B: 1, C: 0, D: 1 }) → ["A", "B", "D"] ;
//            readSelectedIds({ A: 0.9999999, B: 1e-9, C: 1.0000001 }) → ["A", "C"].
// Attention: le solveur calcule en virgule flottante (0.9999999, 1e-9…) :
//            ne teste jamais === 1, compare au seuil 0,5. Une variable absente
//            de vars (ici D) vaut 0.
// (Indice 3 en fin de fichier.)
function readSelectedIds(vars: VariableValues): string[] {
  return undefined; // ← à remplacer
}

// ─── 3. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTION : retire temporairement la ligne `binaries` (ou mets-la à []).
// Que renvoie le solveur ? Pourquoi z dépasse-t-il 25 ?

// ─── 4. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (buildModel) — un terme s'écrit { name: "A", coef: 8 } ;
//   « Σ ≤ 100 » s'écrit bnds: { type: glpk.GLP_UP, lb: 0, ub: 100 } (lb est ignoré
//   avec GLP_UP) ; binaries est la liste des noms ["A", …].
//
// Indice 2 (statusToText) — un objet Record<number, string> dont les clés sont
//   calculées : { [glpk.GLP_OPT]: "optimal", … }, puis l'opérateur ?? pour le
//   cas inconnu.
//
// Indice 3 (readSelectedIds) — IDS.filter(id => …) ; (vars[id] ?? 0) lit une
//   variable en remplaçant une valeur absente par 0.
