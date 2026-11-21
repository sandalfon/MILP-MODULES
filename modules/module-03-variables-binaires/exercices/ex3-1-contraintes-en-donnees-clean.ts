/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 3 — Exercice 3.1 : Les contraintes comme données
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-03-variables-binaires/module-03-variables-binaires.md (§3, §4 et §6)
 *  Niveau : ★★☆   Durée indicative : 45 min
 *  Lancer : node modules/module-03-variables-binaires/exercices/ex3-1-contraintes-en-donnees.ts
 *
 *  OBJECTIF
 *  Représenter chaque contrainte linéaire par un objet
 *  { name, coefs, sense, rhs }, l'évaluer de façon générique et générer
 *  automatiquement les contraintes d'un formulaire de questions.
 *
 *  PRÉREQUIS
 *  - Modules 1 et 2 (expression linéaire Σ coef·x).
 *  - TypeScript : Object.entries, Object.fromEntries, Set, switch, throw ;
 *    type union (Sense), Pick, propriété facultative (name?).
 *  - Cours : catalogue de traductions (cardinalité, couverture, exclusion).
 *
 *  CONSIGNE
 *  Une décision est un objet { i1: 0|1, ..., i5: 0|1 } (outil buildDecision()).
 *    1. computeLhs(constraint, x) : le membre de gauche Σ coef · x[id].
 *    2. satisfiesConstraint(constraint, x) : compare le lhs à constraint.rhs
 *       selon constraint.sense ("<=", ">=", "=") ;
 *       lève une Error si le sens est inconnu.
 *    3. buildConstraints(items) : renvoie, DANS CET ORDRE,
 *       - cardinalite_exacte_3 : Σ x_i = 3 (tous les items, coef 1) ;
 *       - couverture_<D> : Σ_{i du domaine D} x_i ≥ 1, une par domaine,
 *         générée à partir des données (pas de "A", "B", "C" écrits en dur) ;
 *       - exclusion_i1_i2 : x_i1 + x_i2 ≤ 1.
 *    4. listViolations(x, constraints) : noms des contraintes non respectées.
 *  Les indices sont en fin de fichier : cherche d'abord seul.
 *
 *  RÉSULTAT ATTENDU
 *  {i1, i3, i5} : aucune violation. {i1, i2, i3} : couverture_C et
 *  exclusion_i1_i2.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Membre de gauche d'une contrainte.
// Objectif : calculer lhs = Σ coef · x[id], la partie de la contrainte qui
//            dépend de la décision (le « membre de gauche » du cours, §4).
// Entrée   : constraint, dont seul le champ coefs est lu, ex. { coefs: { i1: 1, i2: 1 } } ;
//            x, la décision, ex. buildDecision("i1", "i2") = { i1: 1, i2: 1, i3: 0, i4: 0, i5: 0 }.
// Sortie   : un nombre, la somme des coef · x[id] sur les variables présentes dans coefs.
// Exemple  : computeLhs({ coefs: { i1: 1, i2: 1 } }, buildDecision("i1", "i2")) → 2 ;
//            computeLhs({ coefs: { i3: 2, i5: -1 } }, buildDecision("i3", "i5")) → 2 − 1 = 1.
// Attention: une variable absente de coefs a un coefficient 0 ; les
//            coefficients peuvent être négatifs.
// (Indice 1 en fin de fichier.)
function computeLhs(constraint: Pick<Constraint, "coefs">, x: Decision): number {
  return undefined; // ← à remplacer
}

// TODO 2 — La décision respecte-t-elle la contrainte ?
// Objectif : comparer le membre de gauche computeLhs(constraint, x) au
//            second membre constraint.rhs, selon le sens constraint.sense.
// Entrée   : constraint, ex. { name: "ex", coefs: { i1: 1, i2: 1 }, sense: "<=", rhs: 1 } ;
//            x, la décision, ex. buildDecision("i1").
// Sortie   : true si « lhs (sense) rhs » est vrai, false sinon.
// Exemple  : avec la contrainte ci-dessus, buildDecision("i1") → true (1 ≤ 1),
//            buildDecision("i1", "i2") → false (2 ≤ 1 est faux) ;
//            satisfiesConstraint({ coefs: { i5: 1 }, sense: ">=", rhs: 1 }, buildDecision()) → false.
// Attention: "=" teste l'égalité exacte ; pour tout autre sens (faute de
//            frappe comme "=<"), lever une Error dont le message commence
//            par « Sens inconnu » au lieu de renvoyer true ou false en silence.
// (Indice 2 en fin de fichier.)
function satisfiesConstraint(constraint: Constraint, x: Decision): boolean {
  return undefined; // ← à remplacer
}

// TODO 3 — Contraintes du formulaire, générées depuis les données.
// Objectif : traduire les règles du formulaire en contraintes-données,
//            DANS CET ORDRE :
//            a. cardinalité : name `cardinalite_exacte_${FORM_SIZE}`,
//               coefficient 1 pour chaque item, sense "=", rhs FORM_SIZE ;
//            b. couverture : pour chaque domaine présent dans les données
//               (ordre de première apparition), name `couverture_${domain}`,
//               coefficient 1 pour les seuls items de ce domaine, sense ">=", rhs 1 ;
//            c. exclusion : name "exclusion_i1_i2", coefs { i1: 1, i2: 1 }, sense "<=", rhs 1.
// Entrée   : items, la liste des items, ex. ITEMS (5 items, domaines A, A, B, B, C).
// Sortie   : un tableau de NamedConstraint (5 pour ITEMS).
// Exemple  : buildConstraints(ITEMS).map(constraint => constraint.name)
//            → ["cardinalite_exacte_3", "couverture_A", "couverture_B", "couverture_C", "exclusion_i1_i2"] ;
//            la contrainte couverture_B vaut
//            { name: "couverture_B", coefs: { i3: 1, i4: 1 }, sense: ">=", rhs: 1 }.
// Attention: n'écris pas les domaines "A", "B", "C" en dur : un nouvel item
//            d'un domaine D doit produire couverture_D sans changer le code.
// (Indice 3 en fin de fichier.)
function buildConstraints(items: Item[]): NamedConstraint[] {
  const constraints: NamedConstraint[] = [];

  // a. cardinalité

  // b. couverture (une contrainte par domaine)

  // c. exclusion

  return constraints;
}

// TODO 4 — Noms des contraintes violées.
// Objectif : diagnostiquer une décision en listant TOUTES les contraintes
//            qu'elle ne respecte pas (pas seulement la première).
// Entrée   : x, la décision, ex. buildDecision("i1", "i2", "i3") ;
//            constraints, ex. buildConstraints(ITEMS).
// Sortie   : un tableau de noms (string[]), dans l'ordre de constraints ;
//            [] si la décision respecte tout.
// Exemple  : listViolations(buildDecision("i1", "i2", "i3"), buildConstraints(ITEMS))
//            → ["couverture_C", "exclusion_i1_i2"] ;
//            listViolations(buildDecision("i1", "i3", "i5"), buildConstraints(ITEMS)) → [].
// Attention: la décision vide viole la cardinalité et les 3 couvertures,
//            mais respecte l'exclusion.
// (Indice 4 en fin de fichier.)
function listViolations(x: Decision, constraints: NamedConstraint[]): string[] {
  return []; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Une même décision peut-elle violer plusieurs contraintes ? Exemple ?
//  b) Pourquoi la décision vide RESPECTE-t-elle l'exclusion ?
//  c) Que faudrait-il modifier pour gérer un nouvel item i6 du domaine D ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (computeLhs) — Object.entries(constraint.coefs).reduce((sum, [id, coef]) => …, 0) ;
//   x[id] lit la valeur de la variable id.
//
// Indice 2 (satisfiesConstraint) — calcule d'abord const lhs = computeLhs(constraint, x),
//   puis un switch sur constraint.sense :
//   "<=" → lhs <= constraint.rhs ; ">=" → lhs >= constraint.rhs ; "=" → lhs === constraint.rhs ;
//   default → throw new Error(`Sens inconnu ...`).
//
// Indice 3 (buildConstraints) —
//   a. coefs de la cardinalité : Object.fromEntries(items.map(item => [item.id, 1])).
//   b. liste des domaines sans doublon : [...new Set(items.map(item => item.domain))] ;
//      puis, pour chaque domain, items.filter(item => item.domain === domain) avant le
//      même Object.fromEntries, et constraints.push({ name: `couverture_${domain}`, coefs, sense: ">=", rhs: 1 }).
//   c. un simple constraints.push({ name: "exclusion_i1_i2", … }).
//
// Indice 4 (listViolations) — constraints.filter(…) garde celles que
//   satisfiesConstraint rejette, puis .map(constraint => constraint.name).
