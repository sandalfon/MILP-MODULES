/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 4 — Exercice 4.1 : Validateur de règles — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-04-modelisation-avancee/module-04-modelisation-avancee.md (§1, §6 et §8)
 *  Lancer : node modules/module-04-modelisation-avancee/corriges/ex4-1-validateur-regles.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  1. Rendre le validateur générique
 *     Le TP 4 d'origine codait les règles « en dur » (A, B, C). Ici,
 *     chaque règle est une DONNÉE : { type, name, ...paramètres }. Un
 *     dictionnaire `ruleCheckers` associe à chaque type une fonction
 *     (selectedSet, rule) → booléen. Pour ajouter une règle, on ajoute une
 *     ligne dans `RULES` sans toucher au code du validateur. C'est
 *     exactement ainsi qu'on construira les contraintes GLPK au module 6.
 *
 *  2. Les quatre vérifications (logique « métier »)
 *     - cardinalité exacte : selectedSet.size === count
 *     - exclusion          : !(first ∈ selectedSet && second ∈ selectedSet)
 *     - dépendance ifId ⇒ thenId : !(ifId ∈ selectedSet) || thenId ∈ selectedSet
 *       (une implication P ⇒ Q est fausse SEULEMENT si P est vrai et Q faux)
 *     - activation G ⇒ au moins m de H :
 *       !(G ∈ selectedSet) || |H ∩ selectedSet| ≥ m
 *
 *  3. findViolatedRules() renvoie la LISTE des noms violés, dans l'ordre
 *     des règles, au lieu de s'arrêter à la première erreur : un diagnostic complet
 *     est bien plus utile pour corriger une sélection ou un modèle.
 *
 *  4. Formulation linéaire (ce que verrait le solveur)
 *     Avec x[id] ∈ {0,1} :
 *     - cardinalité : Σ x = count
 *     - exclusion   : x_first + x_second ≤ 1
 *     - dépendance  : x_ifId ≤ x_thenId
 *     - activation  : Σ_{j∈H} x_j ≥ m · x_G
 *     La table de vérité compare, sur les 2⁷ = 128 sélections possibles,
 *     la logique JS et l'inégalité linéaire. 0 désaccord prouve que la
 *     traduction est EXACTE : elle interdit tous les cas interdits et
 *     seulement eux.
 *
 *  Pièges fréquents
 *  - Écrire la dépendance x_thenId ≤ x_ifId (sens inversé) : la table de
 *    vérité le détecte immédiatement (désaccords > 0).
 *  - Activation écrite Σ_H x ≥ m (sans le facteur x_G) : la règle
 *    s'appliquerait même quand G n'est pas choisi.
 *  - Utiliser selectedIds.length au lieu de la taille du Set : un doublon
 *    ["A", "A", ...] fausserait la cardinalité.
 *
 *  Réponses aux questions
 *  a) ["H1","H2","H3","A"] est valide : la règle d'activation n'exige
 *     rien quand G est absent (Σ_H x ≥ 2·0 = 0). Choisir H sans G est
 *     permis.
 *  b) Si l'on inverse la dépendance (x_thenId ≤ x_ifId, soit x_A ≤ x_C),
 *     la table de vérité affiche 64 désaccords : toutes les sélections
 *     où exactement l'un de A et C est présent sont mal classées
 *     (2 configurations de (A, C) × 2⁵ = 32 combinaisons des autres
 *     items, soit 64). La table de vérité est donc un excellent test
 *     automatique de traduction.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
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

// ─── 3. FONCTIONS ───────────────────────────────────────────────
// Chaque vérification reçoit `selectedSet` (un Set) et la règle, et
// renvoie true si la règle est RESPECTÉE.

function satisfiesCardinality(selectedSet: Set<string>, rule: CardinalityRule): boolean {
  return selectedSet.size === rule.count;
}

function satisfiesExclusion(selectedSet: Set<string>, rule: ExclusionRule): boolean {
  return !(selectedSet.has(rule.first) && selectedSet.has(rule.second));
}

function satisfiesDependency(selectedSet: Set<string>, rule: DependencyRule): boolean {
  // ifId ⇒ thenId  ≡  (non ifId) ou thenId
  return !selectedSet.has(rule.ifId) || selectedSet.has(rule.thenId);
}

function satisfiesActivation(selectedSet: Set<string>, rule: ActivationRule): boolean {
  const selectedInGroupCount = rule.group.filter(id => selectedSet.has(id)).length;
  return !selectedSet.has(rule.trigger) || selectedInGroupCount >= rule.minimum;
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

// Renvoie les noms des règles violées, dans l'ordre du tableau `rules`.
function findViolatedRules(selectedIds: string[], rules: Rule[]): string[] {
  const selectedSet = new Set(selectedIds);
  return rules
    .filter(rule => !ruleCheckers[rule.type](selectedSet, rule))
    .map(rule => rule.name);
}

// Formulation linéaire (ce que verrait le solveur), x = { A: 0|1, B: 0|1, ... }.
function satisfiesLinearFormulation(rule: Rule, x: Decision): boolean {
  switch (rule.type) {
    case "exactCardinality":
      // Σ x = count
      return UNIVERSE.reduce((sum, id) => sum + x[id], 0) === rule.count;
    case "exclusion":
      return x[rule.first] + x[rule.second] <= 1;     // x_first + x_second ≤ 1
    case "dependency":
      return x[rule.ifId] <= x[rule.thenId];                // x_ifId ≤ x_thenId
    case "activation":
      return rule.group.reduce((sum, id) => sum + x[id], 0)
        >= rule.minimum * x[rule.trigger];           // Σ_H x ≥ m·x_G
    default:
      // Tous les types sont traités : ici, rule est de type never.
      throw new Error(`type de règle inconnu : ${(rule as Rule).type}`);
  }
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
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

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
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
