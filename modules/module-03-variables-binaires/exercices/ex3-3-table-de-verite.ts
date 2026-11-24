/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 3 — Exercice 3.3 : Table de vérité d'une formulation
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-03-variables-binaires/module-03-variables-binaires.md (§3 et §5)
 *  Niveau : ★★★   Durée indicative : 50 min
 *  Lancer : node modules/module-03-variables-binaires/exercices/ex3-3-table-de-verite.ts
 *
 *  OBJECTIF
 *  Écrire un vérificateur qui prouve qu'une formulation linéaire
 *  interdit EXACTEMENT les cas interdits par une règle logique, puis
 *  s'en servir :
 *  - comparer, affectation par affectation, la règle logique et le
 *    modèle linéaire, et lister leurs désaccords (TODO 1) ;
 *  - traduire six règles logiques en contraintes linéaires : implication,
 *    exclusion, ou, ou exclusif, équivalence, ET (TODO 2) ;
 *  - prendre en défaut deux formulations fausses fournies, le ET
 *    incomplet et l'implication à l'envers (ton vérificateur du TODO 1
 *    suffit, rien de plus à écrire).
 *
 *  PRÉREQUIS
 *  - Exercices 3.1 et 3.2 (contraintes-données, satisfiesConstraint).
 *  - Cours : catalogue de traductions, linéarisation du ET (z = x·y).
 *
 *  CONSIGNE
 *    1. findDisagreements(rule, constraints, variables) : pour chaque
 *       affectation de enumerateAssignments(variables), compare ce que
 *       permet la règle et ce que permet le modèle (toutes les contraintes
 *       respectées), et renvoie la liste des désaccords { assignment, type }
 *       avec type = "trop permissive" (modèle OUI, règle NON)
 *               ou "trop restrictive" (modèle NON, règle OUI).
 *    2. Dans l'objet `FORMULATIONS`, remplace chaque `constraints: []` par
 *       la traduction linéaire de la règle (outil makeConstraint(coefs, sense, rhs)),
 *       toutes les variables à GAUCHE.
 *  Les `FAULTY_FORMULATIONS` sont fournies : ton vérificateur doit les
 *  prendre en défaut.
 *  Les indices sont en fin de fichier : cherche d'abord seul.
 *
 *  RÉSULTAT ATTENDU
 *  Les six cas « correcte » ; ET incomplet : 1 désaccord ; implication à
 *  l'envers : 2 désaccords.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
// Types des données manipulées ; les formulations elles-mêmes sont en section 4.
type Assignment = Record<string, number>;   // variable → 0 ou 1
type Coefs = Record<string, number>;        // variable → coefficient
type Sense = "<=" | ">=" | "=";
type Constraint = { coefs: Coefs; sense: Sense; rhs: number };
type LogicalRule = (assignment: Assignment) => boolean;
type Formulation = { label: string; variables: string[]; rule: LogicalRule; constraints: Constraint[] };
type Disagreement = { assignment: Assignment; type: "trop permissive" | "trop restrictive" };

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────
// Repris des modules 1 et 3.
const computeLhs = (constraint: Constraint, x: Assignment): number =>
  Object.entries(constraint.coefs).reduce((sum, [id, coef]) => sum + coef * x[id], 0);

function satisfiesConstraint(constraint: Constraint, x: Assignment): boolean {
  const lhs = computeLhs(constraint, x);
  if (constraint.sense === "<=") return lhs <= constraint.rhs;
  if (constraint.sense === ">=") return lhs >= constraint.rhs;
  if (constraint.sense === "=") return lhs === constraint.rhs;
  throw new Error(`Sens inconnu "${constraint.sense}"`);
}

// Les 2ᵏ affectations 0/1 des variables données, ex. ["A","B"] → 4 objets.
function enumerateAssignments(variables: string[]): Assignment[] {
  const assignments: Assignment[] = [];
  for (let mask = 0; mask < 2 ** variables.length; mask++) {
    assignments.push(Object.fromEntries(variables.map((variable, i) => [variable, (mask & (1 << i)) !== 0 ? 1 : 0])));
  }
  return assignments;
}

// Raccourci d'écriture d'une contrainte-donnée.
const makeConstraint = (coefs: Coefs, sense: Sense, rhs: number): Constraint => ({ coefs, sense, rhs });

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Désaccords entre une règle logique et sa formulation.
// Objectif : tester une formulation par table de vérité (cours §5). Pour
//            CHAQUE affectation 0/1 des variables :
//            - déterminer si la règle logique la permet ;
//            - déterminer si le modèle la permet (toutes les contraintes
//              respectées) ;
//            - s'ils ne sont pas d'accord, noter un désaccord et son type.
// Entrée   : rule, la règle logique, ex. FORMULATIONS.implication.rule ;
//            constraints, sa traduction linéaire, ex. [makeConstraint({ A: 1, B: -1 }, "<=", 0)] ;
//            variables, les variables concernées, ex. ["A", "B"].
// Sortie   : un tableau de Disagreement { assignment, type }, dans l'ordre
//            de enumerateAssignments(variables) ; [] si la formulation est correcte.
//            type = "trop permissive"  si le modèle accepte un cas que la règle interdit,
//                   "trop restrictive" si le modèle rejette un cas que la règle permet.
// Exemple  : sur l'implication écrite à l'envers ci-dessus → 2 désaccords,
//            { assignment: { A: 0, B: 1 }, type: "trop permissive" } et
//            { assignment: { A: 1, B: 0 }, type: "trop restrictive" } ;
//            sur le ET incomplet → [{ assignment: { x: 1, y: 1, z: 0 }, type: "trop permissive" }].
// Attention: un cas où règle et modèle disent tous deux NON est un accord,
//            pas un désaccord.
// (Indice 1 en fin de fichier.)
function findDisagreements(rule: LogicalRule, constraints: Constraint[], variables: string[]): Disagreement[] {
  const disagreements: Disagreement[] = [];
  // ... à compléter
  return disagreements;
}

// ─── 4. FORMULATIONS À ÉCRIRE ───────────────────────────────────
// TODO 2 — Traduction linéaire de six règles logiques.
// Objectif : pour chaque cas de FORMULATIONS, écrire dans constraints la
//            ou les contraintes linéaires qui interdisent EXACTEMENT les
//            affectations que rule interdit (catalogue du cours, §3).
//            Les 6 cas à remplir :
//            - implication : « B exige A », variables A, B ;
//            - exclusion : « pas A et B ensemble », variables A, B ;
//            - or : « A ou B (au moins un) », variables A, B ;
//            - xor : « exactement un de A, B », variables A, B ;
//            - equivalence : « A ⇔ B », variables A, B ;
//            - and : « z = x ET y », variables x, y, z.
// Entrée   : pour chaque cas, label, variables et rule (déjà fournis),
//            ex. implication : variables ["A", "B"], rule « B exige A ».
// Sortie   : constraints, un tableau de contraintes créées avec
//            makeConstraint(coefs, sense, rhs), toutes les variables à
//            GAUCHE et une constante seule à droite.
// Exemple  : pour une règle « au moins 2 parmi A, B, C », on écrirait
//            constraints: [makeConstraint({ A: 1, B: 1, C: 1 }, ">=", 2)] ;
//            une fois le cas rempli, findDisagreements(rule, constraints, variables) → [].
// Attention: un tableau vide n'est pas accepté par l'auto-vérification ;
//            le cas « et » (z = x·y) demande plusieurs contraintes, et
//            deux ne suffisent pas (voir FAULTY_FORMULATIONS.incompleteAnd).
// (Indice 2 en fin de fichier.)
const FORMULATIONS: Record<string, Formulation> = {
  implication: {
    label: "B ⇒ A (B exige A)",
    variables: ["A", "B"],
    rule: assignment => !assignment.B || assignment.A === 1,
    constraints: [] // ← à écrire
  },
  exclusion: {
    label: "pas A et B ensemble",
    variables: ["A", "B"],
    rule: assignment => !(assignment.A === 1 && assignment.B === 1),
    constraints: [] // ← à écrire
  },
  or: {
    label: "A ou B (au moins un)",
    variables: ["A", "B"],
    rule: assignment => assignment.A === 1 || assignment.B === 1,
    constraints: [] // ← à écrire
  },
  xor: {
    label: "exactement un de A, B",
    variables: ["A", "B"],
    rule: assignment => assignment.A !== assignment.B,
    constraints: [] // ← à écrire
  },
  equivalence: {
    label: "A ⇔ B",
    variables: ["A", "B"],
    rule: assignment => assignment.A === assignment.B,
    constraints: [] // ← à écrire
  },
  and: {
    label: "z = x ET y (linéarisation de x·y)",
    variables: ["x", "y", "z"],
    rule: assignment => assignment.z === assignment.x * assignment.y,
    constraints: [] // ← à écrire
  }
};

// Formulations volontairement FAUSSES (fournies, ne pas corriger) :
// le vérificateur doit y trouver des désaccords.
const FAULTY_FORMULATIONS: Record<string, Formulation> = {
  incompleteAnd: {
    label: "ET sans z ≥ x + y − 1",
    variables: ["x", "y", "z"],
    rule: FORMULATIONS.and.rule,
    constraints: [makeConstraint({ z: 1, x: -1 }, "<=", 0), makeConstraint({ z: 1, y: -1 }, "<=", 0)]
  },
  reversedImplication: {
    label: "B ⇒ A écrit x_A ≤ x_B",
    variables: ["A", "B"],
    rule: FORMULATIONS.implication.rule,
    constraints: [makeConstraint({ A: 1, B: -1 }, "<=", 0)]
  }
};

// ─── 5. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
printTitle("Vérification des formulations");
const summaryRows = Object.entries({ ...FORMULATIONS, ...FAULTY_FORMULATIONS }).map(([key, formulation]) => {
  const disagreements = findDisagreements(formulation.rule, formulation.constraints, formulation.variables);
  return {
    case: key,
    rule: formulation.label,
    verdict: disagreements.length === 0 ? "correcte" : `${disagreements.length} désaccord(s)`,
    detail: disagreements.map(disagreement => `${JSON.stringify(disagreement.assignment)} ${disagreement.type}`).join(" | ")
  };
});
console.table(summaryRows);

printTitle("Table de vérité complète du ET linéarisé");
const andFormulation = FORMULATIONS.and;
console.table(enumerateAssignments(andFormulation.variables).map(assignment => ({
  ...assignment,
  rule: andFormulation.rule(assignment),
  model: andFormulation.constraints.every(constraint => satisfiesConstraint(constraint, assignment))
})));

// QUESTIONS :
//  a) Dans la table du ET, que représentent les lignes où rule et model valent true ?
//  b) Pourquoi ne peut-on pas utiliser cette méthode pour vérifier un modèle
//     complet de 1 000 variables ?
//  c) Invente une règle sur 3 variables (ex. « au plus 2 parmi A, B, C »),
//     ajoute-la à `FORMULATIONS` et vérifie ta formulation.

// ─── 6. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
printTitle("Auto-vérification");
const findDisagreementsOf = (formulation: Formulation): Disagreement[] =>
  findDisagreements(formulation.rule, formulation.constraints, formulation.variables);
check("4 affectations pour 2 variables", () => enumerateAssignments(["A", "B"]).length, 4);
for (const formulation of Object.values(FORMULATIONS)) {
  check(`formulation « ${formulation.label} » correcte`,
    () => formulation.constraints.length > 0 && findDisagreementsOf(formulation).length === 0, true);
}
check("ET incomplet : désaccord détecté en x=1, y=1, z=0", () => findDisagreementsOf(FAULTY_FORMULATIONS.incompleteAnd),
  [{ assignment: { x: 1, y: 1, z: 0 }, type: "trop permissive" }]);
check("implication à l'envers : un cas trop restrictif et un trop permissif",
  () => findDisagreementsOf(FAULTY_FORMULATIONS.reversedImplication).map(disagreement => disagreement.type).sort(),
  ["trop permissive", "trop restrictive"]);
printSummary();

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (findDisagreements) — structure possible :
//   pour chaque assignment de enumerateAssignments(variables) :
//     const isAllowedByRule  = rule(assignment);
//     const isAllowedByModel = constraints.every(constraint => satisfiesConstraint(constraint, assignment));
//     s'ils diffèrent → disagreements.push({ assignment, type: … }),
//     le type se déduisant de isAllowedByModel.
//
// Indice 2 (FORMULATIONS) — passe toutes les variables à gauche :
//   x_B ≤ x_A s'écrit makeConstraint({ B: 1, A: -1 }, "<=", 0) (implication) ;
//   équivalence : x_A = x_B ;
//   et : TROIS contraintes, z ≤ x, z ≤ y et z ≥ x + y − 1
//   (la dernière devient z − x − y ≥ −1).
