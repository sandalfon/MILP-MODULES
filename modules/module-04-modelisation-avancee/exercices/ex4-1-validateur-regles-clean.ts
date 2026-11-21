/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 4 — Exercice 4.1 : Validateur de règles
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-04-modelisation-avancee/module-04-modelisation-avancee.md (§1, §6 et §8)
 *  Niveau : ★★☆   Durée indicative : 45 min
 *  Lancer : node modules/module-04-modelisation-avancee/exercices/ex4-1-validateur-regles.ts
 *
 *  OBJECTIF
 *  Écrire un validateur GÉNÉRIQUE qui renvoie le nom de chaque règle
 *  violée par une sélection, puis vérifier que chaque règle logique a
 *  une traduction linéaire exacte (table de vérité).
 *
 *  PRÉREQUIS
 *  - Module 3 : exclusion x_first + x_second ≤ 1, dépendance x_ifId ≤ x_thenId.
 *  - Cours §6 : activation Σ_{j∈H} x_j ≥ m · x_G.
 *  - TypeScript : Set<string> (has, size), filter, map, switch,
 *    objets-dictionnaires, union de types (Rule) distinguée par `type`.
 *
 *  CONSIGNE
 *  Les règles sont des DONNÉES (tableau `RULES`). Un dictionnaire
 *  `ruleCheckers` associe chaque type à sa fonction de vérification.
 *    1. satisfiesCardinality : nombre d'items DISTINCTS choisis === count.
 *    2. satisfiesExclusion   : first et second ne sont pas choisis ensemble.
 *    3. satisfiesDependency  : si `ifId` est choisi, `thenId` doit l'être.
 *    4. satisfiesActivation  : si `trigger` est choisi, au moins
 *       `minimum` items de `group` doivent l'être.
 *    5. findViolatedRules(selectedIds, rules) : renvoie les NOMS des règles
 *       violées, dans l'ordre du tableau `rules` ([] si tout est respecté).
 *    6. satisfiesLinearFormulation(rule, x) : évalue l'INÉGALITÉ LINÉAIRE
 *       de la règle sur un vecteur x = { A: 0|1, ... }.
 *  Les indices sont regroupés en fin de fichier.
 *
 *  RÉSULTAT ATTENDU
 *  Le tableau de validation liste les bonnes violations, et la table de
 *  vérité affiche 0 désaccord pour chaque règle.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
type CardinalityRule = { type: "exactCardinality"; name: string; count: number };
type ExclusionRule = { type: "exclusion"; name: string; first: string; second: string };
type DependencyRule = { type: "dependency"; name: string; ifId: string; thenId: string };
type ActivationRule = {
  type: "activation"; name: string; trigger: string; group: string[]; minimum: number
};
type Rule = CardinalityRule | ExclusionRule | DependencyRule | ActivationRule;
type RuleType = Rule["type"];
type Decision = Record<string, number>;   // x = { A: 0|1, B: 0|1, ... }
type EncodedSelection = { x: Decision; selectedIds: string[] };

const UNIVERSE: string[] = ["A", "B", "C", "G", "H1", "H2", "H3"];

const RULES: Rule[] = [
  { type: "exactCardinality", name: "cardinalite_4", count: 4 },
  { type: "exclusion", name: "exclusion_A_B", first: "A", second: "B" },
  { type: "dependency", name: "dependance_C_A", ifId: "C", thenId: "A" },
  { type: "activation", name: "activation_G_H", trigger: "G", group: ["H1", "H2", "H3"], minimum: 2 }
];

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────
// Toutes les sélections possibles de l'univers, sous deux formes.
function enumerateAllSelections(): EncodedSelection[] {
  const selections: EncodedSelection[] = [];
  for (let mask = 0; mask < 2 ** UNIVERSE.length; mask++) {
    const x: Decision = {};
    UNIVERSE.forEach((id, i) => { x[id] = (mask & (1 << i)) !== 0 ? 1 : 0; });
    selections.push({ x, selectedIds: UNIVERSE.filter(id => x[id] === 1) });
  }
  return selections;
}

// Nombre de sélections où logique JS et formulation linéaire divergent.
// S'appuie sur `ruleCheckers` et `satisfiesLinearFormulation` (section 3).
function countDisagreements(rule: Rule): number {
  return enumerateAllSelections().filter(({ x, selectedIds }) => {
    const logicalVerdict = ruleCheckers[rule.type](new Set(selectedIds), rule);
    const linearVerdict = satisfiesLinearFormulation(rule, x);
    // Une réponse non booléenne (TODO non fait) compte comme un désaccord.
    return typeof logicalVerdict !== "boolean" || logicalVerdict !== linearVerdict;
  }).length;
}

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────
// Chaque vérification reçoit `selectedSet` (un Set) et la règle, et
// renvoie true si la règle est RESPECTÉE.

// TODO 1 — Règle de cardinalité exacte.
// Objectif : dire si la sélection contient exactement rule.count items
//            DISTINCTS (règle « exactement K éléments », Σ x_i = K).
// Entrée   : selectedSet, l'ensemble des items choisis, ex. new Set(["A", "C", "H1", "H2"]) ;
//            rule, la règle de cardinalité, ex. RULES[0] = { …, count: 4 }.
// Sortie   : un booléen, true si la règle est RESPECTÉE.
// Exemple  : satisfiesCardinality(new Set(["A", "C", "H1", "H2"]), RULES[0]) → true ;
//            satisfiesCardinality(new Set(["A", "A", "C", "H1"]), RULES[0]) → false (3 items distincts).
// Attention: un doublon dans la sélection ne doit pas compter deux fois.
// (Indice 1 en fin de fichier.)
function satisfiesCardinality(selectedSet: Set<string>, rule: CardinalityRule): boolean {
  return undefined; // ← à remplacer
}

// TODO 2 — Règle d'exclusion (incompatibilité).
// Objectif : dire si les deux items rule.first et rule.second ne sont PAS
//            choisis ensemble (règle x_first + x_second ≤ 1).
// Entrée   : selectedSet, ex. new Set(["A", "B", "C", "H1"]) ;
//            rule, ex. RULES[1] = { …, first: "A", second: "B" }.
// Sortie   : un booléen, true si la règle est RESPECTÉE.
// Exemple  : satisfiesExclusion(new Set(["A", "B", "C", "H1"]), RULES[1]) → false ;
//            satisfiesExclusion(new Set(["A", "C", "H1", "H2"]), RULES[1]) → true.
// Attention: choisir un seul des deux, ou aucun, est permis.
// (Indice 2 en fin de fichier.)
function satisfiesExclusion(selectedSet: Set<string>, rule: ExclusionRule): boolean {
  return undefined; // ← à remplacer
}

// TODO 3 — Règle de dépendance « ifId exige thenId ».
// Objectif : dire si l'implication « rule.ifId choisi ⇒ rule.thenId choisi »
//            est vraie pour cette sélection (règle x_ifId ≤ x_thenId).
// Entrée   : selectedSet, ex. new Set(["B", "C", "H1", "H2"]) ;
//            rule, ex. RULES[2] = { …, ifId: "C", thenId: "A" }.
// Sortie   : un booléen, true si la règle est RESPECTÉE.
// Exemple  : satisfiesDependency(new Set(["B", "C", "H1", "H2"]), RULES[2]) → false (C sans A) ;
//            satisfiesDependency(new Set(["A", "C", "H1", "H2"]), RULES[2]) → true.
// Attention: si C n'est pas choisi, la règle n'exige rien : ["A", "B"] la respecte.
// (Indice 3 en fin de fichier.)
function satisfiesDependency(selectedSet: Set<string>, rule: DependencyRule): boolean {
  return undefined; // ← à remplacer
}

// TODO 4 — Règle d'activation conditionnelle.
// Objectif : dire si « rule.trigger choisi ⇒ au moins rule.minimum items de
//            rule.group choisis » est vraie (règle Σ_{j∈H} x_j ≥ m · x_G, cours §6).
// Entrée   : selectedSet, ex. new Set(["A", "B", "G", "H1"]) ;
//            rule, ex. RULES[3] = { …, trigger: "G", group: ["H1", "H2", "H3"], minimum: 2 }.
// Sortie   : un booléen, true si la règle est RESPECTÉE.
// Exemple  : satisfiesActivation(new Set(["A", "G", "H1", "H2"]), RULES[3]) → true ;
//            satisfiesActivation(new Set(["A", "B", "G", "H1"]), RULES[3]) → false (un seul H).
// Attention: sans G, aucune exigence : ["H1", "H2", "H3", "A"] respecte la règle.
// (Indice 4 en fin de fichier.)
function satisfiesActivation(selectedSet: Set<string>, rule: ActivationRule): boolean {
  return undefined; // ← à remplacer
}

// Aiguillage fourni : type de règle → fonction de vérification.
// Signature écrite comme une méthode : TypeScript accepte alors chaque
// vérificateur, bien qu'il attende un type de règle plus précis que Rule.
type RuleChecker = { isSatisfied(selectedSet: Set<string>, rule: Rule): boolean }["isSatisfied"];
const ruleCheckers: Record<RuleType, RuleChecker> = {
  exactCardinality: satisfiesCardinality,
  exclusion: satisfiesExclusion,
  dependency: satisfiesDependency,
  activation: satisfiesActivation
};

// TODO 5 — Validateur générique.
// Objectif : renvoyer le diagnostic complet d'une sélection : le nom de
//            CHAQUE règle violée, sans s'arrêter à la première, en utilisant
//            la vérification associée à son type dans ruleCheckers.
// Entrée   : selectedIds, les identifiants choisis, ex. ["A", "B", "C", "G", "H1"] ;
//            rules, les règles à contrôler, ex. RULES.
// Sortie   : un tableau de noms de règles (string[]), dans l'ordre du
//            tableau rules ; [] si toutes les règles sont respectées.
// Exemple  : findViolatedRules(["A", "B", "C", "G", "H1"], RULES)
//            → ["cardinalite_4", "exclusion_A_B", "activation_G_H"] ;
//            findViolatedRules(["A", "C", "H1", "H2"], RULES) → [].
// Attention: la sélection vide [] viole seulement "cardinalite_4".
// (Indice 5 en fin de fichier.)
function findViolatedRules(selectedIds: string[], rules: Rule[]): string[] {
  return undefined; // ← à remplacer
}

// TODO 6 — Formulation linéaire d'une règle.
// Objectif : évaluer l'INÉGALITÉ LINÉAIRE qui traduit la règle, telle que
//            le solveur la verrait, sur un vecteur de variables 0/1 :
//              exactCardinality : Σ_{id ∈ UNIVERSE} x_id = count
//              exclusion        : x_first + x_second ≤ 1
//              dependency       : x_ifId ≤ x_thenId
//              activation       : Σ_{id ∈ group} x_id ≥ minimum · x_trigger
// Entrée   : rule, une règle de RULES, ex. RULES[3] ;
//            x, la valeur 0/1 de chaque item, ex. { G: 1, H1: 1, H2: 0, H3: 0 }.
// Sortie   : un booléen, true si l'inégalité est satisfaite.
// Exemple  : satisfiesLinearFormulation(RULES[1], { A: 1, B: 1 }) → false (1 + 1 > 1) ;
//            satisfiesLinearFormulation(RULES[3], { G: 1, H1: 1, H2: 0, H3: 0 }) → false (1 < 2·1).
// Attention: n'utilise ici QUE des sommes et des comparaisons (pas de
//            has / includes) : c'est ce que le solveur comprend. La table
//            de vérité doit afficher 0 désaccord pour chaque règle.
// (Indice 6 en fin de fichier.)
function satisfiesLinearFormulation(rule: Rule, x: Decision): boolean {
  switch (rule.type) {
    case "exactCardinality":
      return undefined; // ← à remplacer
    case "exclusion":
      return undefined; // ← à remplacer
    case "dependency":
      return undefined; // ← à remplacer
    case "activation":
      return undefined; // ← à remplacer
    default:
      // Tous les types sont traités : ici, rule est de type never.
      throw new Error(`type de règle inconnu : ${(rule as Rule).type}`);
  }
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
printTitle("Validation de sélections");
const testCases: string[][] = [
  ["A", "C", "H1", "H2"],
  ["A", "B", "C", "H1"],
  ["B", "C", "H1", "H2"],
  ["A", "G", "H1", "H2"],
  ["A", "B", "G", "H1"],
  ["B", "C", "G", "H1"],
  [],
  ["A", "B", "C", "G", "H1"],
  ["H1", "H2", "H3", "A"]
];
console.table(testCases.map(selectedIds => ({
  selectedIds: selectedIds.join(", ") || "(vide)",
  violations: (findViolatedRules(selectedIds, RULES) ?? ["(non calculé)"]).join(", ") || "aucune"
})));

printTitle("Table de vérité : logique JS vs inégalité linéaire (128 cas)");
console.table(RULES.map(rule => ({ rule: rule.name, disagreements: countDisagreements(rule) })));

// QUESTIONS :
//  a) La sélection ["H1","H2","H3","A"] est-elle valide ? Pourquoi la
//     règle d'activation n'exige-t-elle rien ici ?
//  b) Remplace temporairement la formulation de la dépendance par
//     x[rule.thenId] <= x[rule.ifId] (sens inversé). Combien de désaccords obtiens-tu ?
//     Explique ce nombre, puis remets la bonne formulation.

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
printTitle("Auto-vérification");
check("sélection valide", () => findViolatedRules(["A", "C", "H1", "H2"], RULES), []);
check("A et B ensemble", () => findViolatedRules(["A", "B", "C", "H1"], RULES), ["exclusion_A_B"]);
check("C sans A", () => findViolatedRules(["B", "C", "H1", "H2"], RULES), ["dependance_C_A"]);
check("G avec deux H : valide", () => findViolatedRules(["A", "G", "H1", "H2"], RULES), []);
check("G avec un seul H + exclusion", () => findViolatedRules(["A", "B", "G", "H1"], RULES),
  ["exclusion_A_B", "activation_G_H"]);
check("C sans A + G avec un seul H", () => findViolatedRules(["B", "C", "G", "H1"], RULES),
  ["dependance_C_A", "activation_G_H"]);
check("sélection vide", () => findViolatedRules([], RULES), ["cardinalite_4"]);
check("trois violations", () => findViolatedRules(["A", "B", "C", "G", "H1"], RULES),
  ["cardinalite_4", "exclusion_A_B", "activation_G_H"]);
check("H sans G : aucune exigence", () => findViolatedRules(["H1", "H2", "H3", "A"], RULES), []);
check("doublon ne compte pas deux fois", () => findViolatedRules(["A", "A", "C", "H1"], RULES), ["cardinalite_4"]);
check("formulation exclusion : x_A=x_B=1 interdit",
  () => satisfiesLinearFormulation(RULES[1], { A: 1, B: 1 }), false);
check("formulation activation : G=1, un seul H interdit",
  () => satisfiesLinearFormulation(RULES[3], { G: 1, H1: 1, H2: 0, H3: 0 }), false);
check("0 désaccord pour l'exclusion", () => countDisagreements(RULES[1]), 0);
check("0 désaccord pour la dépendance", () => countDisagreements(RULES[2]), 0);
check("0 désaccord pour l'activation", () => countDisagreements(RULES[3]), 0);
printSummary();

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (satisfiesCardinality) — un Set ne garde chaque élément qu'une
//   fois : sa propriété selectedSet.size donne le nombre d'items distincts.
//
// Indice 2 (satisfiesExclusion) — selectedSet.has(rule.first) teste la
//   présence d'un item ; la règle est violée seulement si les DEUX sont présents.
//
// Indice 3 (satisfiesDependency) — rappel logique : P ⇒ Q équivaut à
//   (non P) ou Q.
//
// Indice 4 (satisfiesActivation) — rule.group.filter(id => selectedSet.has(id)).length
//   compte les items du groupe choisis ; combine-le avec l'implication de l'indice 3.
//
// Indice 5 (findViolatedRules) — étapes : construire un Set à partir de
//   selectedIds, garder (filter) les règles pour lesquelles
//   ruleCheckers[rule.type](selectedSet, rule) est faux, puis ne garder
//   (map) que leur nom.
//
// Indice 6 (satisfiesLinearFormulation) — dans chaque case, x[rule.first]
//   lit une variable ; une somme s'écrit
//   UNIVERSE.reduce((sum, id) => sum + x[id], 0) (ou rule.group.reduce…) ;
//   exemple de forme : x[rule.ifId] <= x[rule.thenId].
