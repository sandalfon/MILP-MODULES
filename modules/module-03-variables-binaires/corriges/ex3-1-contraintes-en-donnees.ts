/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 3 — Exercice 3.1 : Les contraintes comme données — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-03-variables-binaires/module-03-variables-binaires.md (§3, §4 et §6)
 *  Lancer : node modules/module-03-variables-binaires/corriges/ex3-1-contraintes-en-donnees.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Toute contrainte linéaire a la forme  Σ coef_i · x_i  (sens)  rhs.
 *  On la stocke donc comme un objet :
 *      { name, coefs: { i1: 1, i2: 1 }, sense: "<=", rhs: 1 }
 *  Les variables absentes de coefs ont implicitement un coefficient 0.
 *
 *  1. computeLhs : on parcourt les paires [id, coef] de constraint.coefs
 *     avec Object.entries et on additionne coef · x[id]. C'est le même
 *     reduce qu'au module 1, mais piloté par la contrainte au lieu de la
 *     liste des produits.
 *
 *  2. satisfiesConstraint : un switch sur le sens. Lever une erreur sur un
 *     sens inconnu (ex. "=<" mal tapé) est une protection importante :
 *     sinon la faute de frappe ferait « respecter » ou « violer » la
 *     contrainte en silence.
 *
 *  3. buildConstraints : les règles du formulaire deviennent
 *     - 1 contrainte de cardinalité : Σ x_i = 3 ;
 *     - 1 contrainte de couverture PAR DOMAINE, GÉNÉRÉE depuis les
 *       données : on extrait la liste des domaines avec un Set, puis on
 *       crée Σ_{i ∈ domaine} x_i ≥ 1 pour chacun. Ajouter un item du
 *       domaine D dans les données ajouterait automatiquement la
 *       contrainte couverture_D, sans toucher au code ;
 *     - 1 contrainte d'exclusion : x_i1 + x_i2 ≤ 1.
 *     Object.fromEntries transforme [[id, 1], ...] en { id: 1, ... }.
 *
 *  4. listViolations : filter sur les contraintes non respectées, puis map
 *     sur leur nom. On liste TOUTES les violations au lieu de s'arrêter à
 *     la première, ce qui facilite le diagnostic (module 7).
 *
 *  Réponses aux questions
 *  a) Oui : {i1, i2, i3} viole à la fois l'exclusion (i1 et i2 ensemble)
 *     et la couverture de C (i5 absent). Une même décision peut violer
 *     plusieurs contraintes, d'où l'intérêt de toutes les lister.
 *  b) Avec la décision vide, l'exclusion est RESPECTÉE (0 ≤ 1) : une
 *     contrainte « au plus » est toujours satisfaite en ne prenant rien.
 *     Ce sont les contraintes « au moins » et « exactement » qui
 *     obligent à choisir quelque chose.
 *  c) Il suffit d'ajouter l'item dans `ITEMS` : la contrainte
 *     couverture_D apparaît d'elle-même.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Item = { id: string; domain: string; score: number };
type Decision = Record<string, number>;   // id → 0 ou 1
type Coefs = Record<string, number>;      // id → coefficient
type Sense = "<=" | ">=" | "=";
// Les tests écrivent aussi des contraintes sans nom : name est facultatif.
type Constraint = { name?: string; coefs: Coefs; sense: Sense; rhs: number };
type NamedConstraint = Constraint & { name: string };

const ITEMS: Item[] = [
  { id: "i1", domain: "A", score: 8 },
  { id: "i2", domain: "A", score: 7 },
  { id: "i3", domain: "B", score: 9 },
  { id: "i4", domain: "B", score: 6 },
  { id: "i5", domain: "C", score: 5 }
];
const FORM_SIZE = 3;

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────
// Construit une décision x à partir de la liste des items choisis.
// Exemple : buildDecision("i1", "i3") → { i1: 1, i2: 0, i3: 1, i4: 0, i5: 0 }
const buildDecision = (...selectedIds: string[]): Decision =>
  Object.fromEntries(ITEMS.map(item => [item.id, selectedIds.includes(item.id) ? 1 : 0]));

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Membre de gauche : Σ coef_i · x_i sur les variables présentes dans la contrainte.
function computeLhs(constraint: Pick<Constraint, "coefs">, x: Decision): number {
  return Object.entries(constraint.coefs).reduce((sum, [id, coef]) => sum + coef * x[id], 0);
}

// Compare le membre de gauche au second membre selon le sens.
function satisfiesConstraint(constraint: Constraint, x: Decision): boolean {
  const lhs = computeLhs(constraint, x);
  switch (constraint.sense) {
    case "<=": return lhs <= constraint.rhs;
    case ">=": return lhs >= constraint.rhs;
    case "=": return lhs === constraint.rhs;
    default: throw new Error(`Sens inconnu "${constraint.sense}" dans la contrainte ${constraint.name}`);
  }
}

// Traduit les règles du formulaire en contraintes-données.
function buildConstraints(items: Item[]): NamedConstraint[] {
  const constraints: NamedConstraint[] = [];

  // Exactement FORM_SIZE items : tous les coefficients valent 1.
  constraints.push({
    name: `cardinalite_exacte_${FORM_SIZE}`,
    coefs: Object.fromEntries(items.map(item => [item.id, 1])),
    sense: "=",
    rhs: FORM_SIZE
  });

  // Une contrainte de couverture par domaine présent dans les données.
  const domains = [...new Set(items.map(item => item.domain))];
  for (const domain of domains) {
    constraints.push({
      name: `couverture_${domain}`,
      coefs: Object.fromEntries(items.filter(item => item.domain === domain).map(item => [item.id, 1])),
      sense: ">=",
      rhs: 1
    });
  }

  // i1 et i2 ne peuvent pas être choisis ensemble.
  constraints.push({ name: "exclusion_i1_i2", coefs: { i1: 1, i2: 1 }, sense: "<=", rhs: 1 });

  return constraints;
}

// Noms de toutes les contraintes violées par x.
function listViolations(x: Decision, constraints: NamedConstraint[]): string[] {
  return constraints.filter(constraint => !satisfiesConstraint(constraint, x)).map(constraint => constraint.name);
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
const constraints = buildConstraints(ITEMS);

printTitle("Contraintes générées");
for (const constraint of constraints) {
  const lhs = Object.entries(constraint.coefs)
    .map(([id, coef]) => (coef === 1 ? id : `${coef}·${id}`))
    .join(" + ");
  console.log(`  ${constraint.name.padEnd(22)} ${lhs} ${constraint.sense} ${constraint.rhs}`);
}

printTitle("Diagnostic de quelques décisions");
const trials = [["i1", "i3", "i5"], ["i1", "i2", "i3"], [], ["i2", "i4", "i5"]];
console.table(trials.map(selectedIds => ({
  selectedIds: selectedIds.join(", ") || "(aucun)",
  violations: listViolations(buildDecision(...selectedIds), constraints).join(", ") || "aucune"
})));

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
const exclusion: Constraint = { name: "ex", coefs: { i1: 1, i2: 1 }, sense: "<=", rhs: 1 };
check("lhs de l'exclusion pour {i1, i2}", () => computeLhs(exclusion, buildDecision("i1", "i2")), 2);
check("lhs avec coefficients quelconques",
  () => computeLhs({ coefs: { i3: 2, i5: -1 } }, buildDecision("i3", "i5")), 1);
check("respecte '<=' : {i1} respecte l'exclusion", () => satisfiesConstraint(exclusion, buildDecision("i1")), true);
check("respecte '<=' : {i1, i2} viole l'exclusion", () => satisfiesConstraint(exclusion, buildDecision("i1", "i2")), false);
check("respecte '>='", () => satisfiesConstraint({ coefs: { i5: 1 }, sense: ">=", rhs: 1 }, buildDecision()), false);
check("respecte '='", () => satisfiesConstraint({ coefs: { i1: 1, i3: 1 }, sense: "=", rhs: 2 }, buildDecision("i1", "i3")), true);
check("noms des contraintes générées", () => buildConstraints(ITEMS).map(constraint => constraint.name),
  ["cardinalite_exacte_3", "couverture_A", "couverture_B", "couverture_C", "exclusion_i1_i2"]);
check("couverture_B porte sur i3 et i4",
  () => buildConstraints(ITEMS).find(constraint => constraint.name === "couverture_B"),
  { name: "couverture_B", coefs: { i3: 1, i4: 1 }, sense: ">=", rhs: 1 });
check("{i1, i3, i5} ne viole rien",
  () => listViolations(buildDecision("i1", "i3", "i5"), buildConstraints(ITEMS)), []);
check("{i1, i2, i3} viole couverture_C et l'exclusion",
  () => listViolations(buildDecision("i1", "i2", "i3"), buildConstraints(ITEMS)),
  ["couverture_C", "exclusion_i1_i2"]);
check("décision vide : cardinalité et 3 couvertures violées",
  () => listViolations(buildDecision(), buildConstraints(ITEMS)),
  ["cardinalite_exacte_3", "couverture_A", "couverture_B", "couverture_C"]);
printSummary();
