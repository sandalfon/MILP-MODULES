/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 3 — Exercice 3.3 : Table de vérité d'une formulation — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-03-variables-binaires/module-03-variables-binaires.md (§3 et §5)
 *  Lancer : node modules/module-03-variables-binaires/corriges/ex3-3-table-de-verite.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Une formulation est correcte si, pour CHAQUE affectation 0/1 des
 *  variables, « les contraintes sont respectées » ⇔ « la règle logique
 *  l'autorise ». Avec 2 ou 3 variables, il n'y a que 4 ou 8 cas : on les
 *  teste tous.
 *
 *  1. findDisagreements
 *     Pour chaque affectation :
 *       isAllowedByRule   = rule(assignment)
 *       isAllowedByModel  = constraints.every(constraint => satisfiesConstraint(constraint, assignment))
 *     S'ils diffèrent, on enregistre un désaccord, avec son type :
 *       - règle NON, modèle OUI → formulation TROP PERMISSIVE
 *         (le solveur pourrait renvoyer une solution interdite) ;
 *       - règle OUI, modèle NON → formulation TROP RESTRICTIVE
 *         (le solveur ignorerait des solutions permises, peut-être
 *         la meilleure, sans aucun message d'erreur).
 *     Le second défaut est le plus sournois : rien ne « casse », on
 *     obtient juste une solution moins bonne.
 *
 *  2. Les formulations (forme Σ coef·x  sens  rhs)
 *     implication B ⇒ A : x_B − x_A ≤ 0
 *     exclusion          : x_A + x_B ≤ 1
 *     OU                 : x_A + x_B ≥ 1
 *     OU exclusif        : x_A + x_B = 1
 *     équivalence        : x_A − x_B = 0
 *     ET (z = x·y)       : z − x ≤ 0 ;  z − y ≤ 0 ;  z − x − y ≥ −1
 *     La troisième contrainte du ET, z ≥ x + y − 1, devient
 *     z − x − y ≥ −1 une fois les variables passées à gauche.
 *
 *  3. Formulations fautives (fournies pour être prises en défaut)
 *     - ET incomplet (sans z ≥ x + y − 1) : 1 désaccord, x=1, y=1, z=0,
 *       trop permissif. Le solveur pourrait mettre z à 0 alors que x et
 *       y valent 1, par exemple si z a un coût dans l'objectif.
 *     - Implication écrite à l'envers (x_A ≤ x_B) : 2 désaccords, l'un
 *       trop permissif (A=0, B=1), l'autre trop restrictif (A=1, B=0).
 *
 *  Réponses aux questions
 *  a) Ils font partie des solutions permises par la règle ET par le
 *     modèle : ce sont des accords, et c'est ce qu'on veut.
 *  b) La table de vérité contient 2ᵏ lignes : on ne l'emploie que sur la
 *     poignée de variables d'UNE règle, jamais sur le modèle entier.
 *     C'est un test unitaire de la formulation, pas une méthode de
 *     résolution.
 *  c) Exemple : « au plus 2 parmi A, B, C » : x_A + x_B + x_C ≤ 2, avec
 *     la règle assignment => assignment.A + assignment.B + assignment.C <= 2 ;
 *     0 désaccord sur les 8 cas.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
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

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Renvoie la liste des affectations où la règle et le modèle ne sont pas d'accord.
function findDisagreements(rule: LogicalRule, constraints: Constraint[], variables: string[]): Disagreement[] {
  const disagreements: Disagreement[] = [];
  for (const assignment of enumerateAssignments(variables)) {
    const isAllowedByRule = rule(assignment);
    const isAllowedByModel = constraints.every(constraint => satisfiesConstraint(constraint, assignment));
    if (isAllowedByRule !== isAllowedByModel) {
      disagreements.push({
        assignment,
        type: isAllowedByModel ? "trop permissive" : "trop restrictive"
      });
    }
  }
  return disagreements;
}

// ─── 4. FORMULATIONS ────────────────────────────────────────────
// Chaque cas : la règle logique (fonction → booléen) et sa traduction linéaire.
const FORMULATIONS: Record<string, Formulation> = {
  implication: {
    label: "B ⇒ A (B exige A)",
    variables: ["A", "B"],
    rule: assignment => !assignment.B || assignment.A === 1,
    constraints: [makeConstraint({ B: 1, A: -1 }, "<=", 0)]
  },
  exclusion: {
    label: "pas A et B ensemble",
    variables: ["A", "B"],
    rule: assignment => !(assignment.A === 1 && assignment.B === 1),
    constraints: [makeConstraint({ A: 1, B: 1 }, "<=", 1)]
  },
  or: {
    label: "A ou B (au moins un)",
    variables: ["A", "B"],
    rule: assignment => assignment.A === 1 || assignment.B === 1,
    constraints: [makeConstraint({ A: 1, B: 1 }, ">=", 1)]
  },
  xor: {
    label: "exactement un de A, B",
    variables: ["A", "B"],
    rule: assignment => assignment.A !== assignment.B,
    constraints: [makeConstraint({ A: 1, B: 1 }, "=", 1)]
  },
  equivalence: {
    label: "A ⇔ B",
    variables: ["A", "B"],
    rule: assignment => assignment.A === assignment.B,
    constraints: [makeConstraint({ A: 1, B: -1 }, "=", 0)]
  },
  and: {
    label: "z = x ET y (linéarisation de x·y)",
    variables: ["x", "y", "z"],
    rule: assignment => assignment.z === assignment.x * assignment.y,
    constraints: [
      makeConstraint({ z: 1, x: -1 }, "<=", 0),            // z ≤ x
      makeConstraint({ z: 1, y: -1 }, "<=", 0),            // z ≤ y
      makeConstraint({ z: 1, x: -1, y: -1 }, ">=", -1)     // z ≥ x + y − 1
    ]
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

// ─── 5. PROGRAMME PRINCIPAL ─────────────────────────────────────
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

// ─── 6. AUTO-VÉRIFICATION ───────────────────────────────────────
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
