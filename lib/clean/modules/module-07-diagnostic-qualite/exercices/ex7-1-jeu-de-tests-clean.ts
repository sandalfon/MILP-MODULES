/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 7 — Exercice 7.1 : Validateur et jeu de tests
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-07-diagnostic-qualite/module-07-diagnostic-qualite.md (§4 et §6)
 *  Niveau : ★★☆   Durée indicative : 1 h
 *  Lancer : node modules/module-07-diagnostic-qualite/exercices/ex7-1-jeu-de-tests.ts
 *
 *  OBJECTIF
 *  Fiabiliser une chaîne d'assemblage de test AVANT et APRÈS le
 *  solveur, en quatre étapes :
 *  - AVANT le modèle, contrôler les DONNÉES de la banque : id manquant,
 *    id dupliqué, domaine manquant (TODO 1) ;
 *  - AVANT le solveur, détecter les RÈGLES contradictoires par simple
 *    arithmétique, sans résoudre quoi que ce soit (TODO 2) ;
 *  - APRÈS le solveur, VALIDER une sélection de façon indépendante et
 *    lister toutes ses violations (TODO 3) ;
 *  - FIGER ce comportement dans une suite de 8 tests nommés, rangés en
 *    6 catégories, pour repérer toute régression (TODO 4).
 *
 *  PRÉREQUIS
 *  - Module 4 (exemple commenté 04-verificateur-contraintes.ts) et exemple
 *    commenté du module 7 (exemples/07-validation.ts) : validateSelection.
 *  - TypeScript : Set, Map, Object.entries, reduce, spread { ...obj } ;
 *    types objet, propriétés optionnelles (?:), Record<string, number>.
 *
 *  CONSIGNE
 *  Une règle est un objet { testLength, minimums?: {domaine: nombre}, maximums?: {domaine: nombre} }.
 *    1. validateBank(items) — messages, dans l'ordre de parcours :
 *         `id manquant (position ${position})`   (et on passe à l'item suivant)
 *         `id dupliqué : ${id}`
 *         `domaine manquant : ${id}`
 *    2. validateRuleConsistency(rules, items) — messages, dans cet ordre :
 *         `quotas minimums (${minimumsTotal}) > longueur (${testLength})`
 *         `quotas maximums (${maximumsTotal}) < longueur (${testLength})`
 *             (seulement si CHAQUE domaine de la banque a un maximum)
 *         puis pour chaque domaine des minimums :
 *         `domaine ${domain} : minimum ${minimum} > ${availableCount} items disponibles`
 *         `domaine ${domain} : minimum ${minimum} > maximum ${maximum}`
 *    3. validateSelection(selectedIds, items, rules) — messages, dans cet ordre :
 *         `item en double : ${id}`        (une fois par id dupliqué)
 *         `item inconnu : ${id}`
 *         `longueur incorrecte : ${selectedIds.length} ≠ ${testLength}`
 *         `quota min ${domain} : ${observedCount} < ${minimum}`
 *         `quota max ${domain} : ${observedCount} > ${maximum}`
 *       (observedCount = nombre d'items du domaine dans la sélection)
 *       Les quotas se comptent sur les id DISTINCTS et connus.
 *    4. Complète la suite de tests : 8 cas au total (2 fournis, 6 à
 *       écrire), couvrant les 6 catégories "faisable", "infaisable",
 *       "données manquantes", "doublons", "redondance", "extrême".
 *       La liste des cas attendus est détaillée au-dessus de testSuite.
 *
 *  RÉSULTAT ATTENDU
 *  Tous les cas de ta suite passent, et l'auto-vérification est entièrement ✔.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
// Un item « brut » peut avoir perdu son id ou son domaine (banque abîmée).
type RawItem = { id?: string; domain?: string };
type Item = { id: string; domain: string };
type Quotas = Record<string, number>; // domaine → nombre d'items
type Rules = { testLength: number; minimums?: Quotas; maximums?: Quotas };
type TestCase = {
  name: string;
  category: string;
  selectedIds: string[];
  rules: Rules;
  expected: string[];
};

const ITEMS: Item[] = [
  { id: "a1", domain: "A" }, { id: "a2", domain: "A" }, { id: "a3", domain: "A" },
  { id: "b1", domain: "B" }, { id: "b2", domain: "B" },
  { id: "c1", domain: "C" }, { id: "c2", domain: "C" }
];

const RULES: Rules = {
  testLength: 4,
  minimums: { A: 1, B: 1, C: 1 },
  maximums: { A: 2 }
};

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────

// Exécute chaque cas { name, category, selectedIds, rules, expected } et
// compare le résultat de validateSelection à `expected`.
function runTestSuite(testCases: TestCase[]): { passedCount: number; failedCount: number } {
  let passedCount = 0;
  for (const testCase of testCases) {
    let actual: string[] | string;
    try {
      actual = validateSelection(testCase.selectedIds, ITEMS, testCase.rules);
    } catch (error) {
      actual = `erreur : ${(error as Error).message}`;
    }
    const isPassed = JSON.stringify(actual) === JSON.stringify(testCase.expected);
    if (isPassed) passedCount++;
    console.log(`  ${isPassed ? "✔" : "✘"} [${testCase.category}] ${testCase.name}`);
    if (!isPassed) console.log(`      attendu ${JSON.stringify(testCase.expected)} / obtenu ${JSON.stringify(actual)}`);
  }
  return { passedCount, failedCount: testCases.length - passedCount };
}

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Qualité des données de la banque.
// Objectif : contrôler la banque AVANT tout modèle : un id manquant ou
//            dupliqué créerait des variables ambiguës, un domaine manquant
//            ferait sortir l'item de tous les quotas.
// Entrée   : items, des items « bruts » dont id et domain peuvent manquer,
//            ex. [{ id: "a1", domain: "A" }, { id: "a1", domain: "A" }, { id: "b1" }, { domain: "C" }].
// Sortie   : un tableau de messages (string[]) dans l'ordre de parcours,
//            [] si la banque est propre (format des messages : CONSIGNE 1).
// Exemple  : validateBank(ITEMS) → [] ;
//            validateBank(la banque abîmée ci-dessus)
//              → ["id dupliqué : a1", "domaine manquant : b1", "id manquant (position 3)"].
// Attention: un item sans id ne produit QUE le message « id manquant » ;
//            un id dupliqué n'est signalé qu'à partir de sa 2e apparition.
// (Indice 1 en fin de fichier.)
function validateBank(items: RawItem[]): string[] {
  return undefined; // ← à remplacer (renvoie un tableau de messages)
}

// TODO 2 — Contradictions détectables sans solveur.
// Objectif : prouver par de simples sommes que des règles sont
//            contradictoires, avec un message précis, avant d'appeler le
//            solveur. Quatre contrôles, dans cet ordre :
//            - Σ minimums > longueur du test ;
//            - Σ maximums < longueur du test (si tous les domaines ont un maximum) ;
//            puis, pour chaque domaine qui a un minimum :
//            - minimum > nombre d'items du domaine dans la banque ;
//            - minimum > maximum du même domaine.
// Entrée   : rules, ex. { testLength: 4, minimums: { A: 2, B: 2, C: 1 } } ;
//            items, la banque (ITEMS : 3 items A, 2 items B, 2 items C).
// Sortie   : un tableau de messages (string[]) dans l'ordre de la
//            CONSIGNE 2, [] si aucune contradiction n'est détectée.
// Exemple  : validateRuleConsistency({ testLength: 4, minimums: { A: 2, B: 2, C: 1 } }, ITEMS)
//              → ["quotas minimums (5) > longueur (4)"] ;
//            validateRuleConsistency({ testLength: 6, minimums: { C: 3 }, maximums: { A: 2, B: 1, C: 2 } }, ITEMS)
//              → ["quotas maximums (5) < longueur (6)", "domaine C : minimum 3 > 2 items disponibles",
//                 "domaine C : minimum 3 > maximum 2"].
// Attention: minimums et maximums sont optionnels ; le test Σ maximums ne
//            s'applique que si CHAQUE domaine de la banque a un maximum
//            (sinon un domaine sans plafond peut compléter) ; avec RULES
//            (maximum sur A seulement), la sortie est [].
// (Indice 2 en fin de fichier.)
function validateRuleConsistency(rules: Rules, items: Item[]): string[] {
  return undefined; // ← à remplacer
}

// TODO 3 — Validateur indépendant : renvoie TOUTES les violations.
// Objectif : confronter une sélection aux règles sans réutiliser le code du
//            modèle, et lister toutes les violations (pas seulement la
//            première) pour corriger plus vite. Cinq contrôles, dans cet ordre :
//            - id présents plusieurs fois dans la sélection ;
//            - id absents de la banque ;
//            - longueur de la sélection ≠ longueur du test ;
//            - domaines sous leur minimum ;
//            - domaines au-dessus de leur maximum.
// Entrée   : selectedIds, les id retenus, ex. ["a1", "a1", "a2", "a3", "x"] ;
//            items, la banque (ITEMS) ;
//            rules, ex. RULES
//              (longueur 4, au moins 1 A, 1 B, 1 C, au plus 2 A).
// Sortie   : un tableau de messages (string[]) dans l'ordre de la
//            CONSIGNE 3, [] si la sélection est conforme.
// Exemple  : validateSelection(["a1", "a2", "b1", "c1"], ITEMS, RULES) → [] ;
//            validateSelection(["a1", "a1", "a2", "a3", "x"], ITEMS, RULES)
//              → ["item en double : a1", "item inconnu : x", "longueur incorrecte : 5 ≠ 4",
//                 "quota min B : 0 < 1", "quota min C : 0 < 1", "quota max A : 3 > 2"].
// Attention: un id dupliqué est signalé une seule fois et compté une seule
//            fois dans les quotas ; la longueur se mesure sur la sélection
//            brute ; un domaine absent de la sélection compte 0 ; un
//            minimum de 0 ne doit produire aucune erreur.
// (Indice 3 en fin de fichier.)
function validateSelection(selectedIds: string[], items: Item[], rules: Rules): string[] {
  return undefined; // ← à remplacer
}

// TODO 4 — Complète la suite (8 cas, 6 catégories).
// Objectif : figer le comportement du validateur dans des tests nommés,
//            pour qu'une régression se voie dès qu'on modifie le code.
//            Les 8 cas attendus (rules = RULES sauf mention contraire) :
//            - [faisable] « sélection conforme » : a1, a2, b1, c1
//              → aucune violation (fourni) ;
//            - [infaisable] « domaine C absent » : a1, a2, b1, b2
//              → minimum de C non atteint (fourni) ;
//            - [infaisable] « trop d'items du domaine A » : a1, a2, a3, b1
//              → maximum de A dépassé (et un autre quota manqué) ;
//            - [données manquantes] « item absent de la banque » : a1, b1, c1
//              et un id qui n'existe pas, par exemple z9 ;
//            - [doublons] « même item deux fois » : a1, a1, b1, c1 ;
//            - [redondance] « minimum 0 sans effet » : a1, a2, b1, c1, avec les
//              règles de base plus un minimum de 0 sur un domaine D inexistant
//              → aucune violation : une règle redondante ne gêne pas ;
//            - [extrême] « sélection vide, longueur 0 » : aucun id,
//              règles { testLength: 0 } → aucune violation ;
//            - [extrême] « sélection vide avec quotas » : aucun id, règles de
//              base → la longueur et les trois minimums sont violés.
// Entrée   : aucune ; chaque cas est un objet TestCase
//            { name, category, selectedIds, rules, expected }.
// Sortie   : le tableau testSuite complété avec les 6 cas manquants.
// Exemple  : { name: "domaine C absent", category: "infaisable",
//              selectedIds: ["a1", "a2", "b1", "b2"], rules: RULES,
//              expected: ["quota min C : 0 < 1"] }  (déjà fourni ci-dessous).
// Attention: `expected` est à écrire toi-même, en appliquant la CONSIGNE 3 à
//            la main : EXACTEMENT les messages de validateSelection, dans le
//            même ordre. Le programme principal affiche ✔ ou ✘ pour chaque cas.
// (Indice 4 en fin de fichier.)
const testSuite: TestCase[] = [
  {
    name: "sélection conforme",
    category: "faisable",
    selectedIds: ["a1", "a2", "b1", "c1"], rules: RULES, expected: []
  },
  {
    name: "domaine C absent",
    category: "infaisable",
    selectedIds: ["a1", "a2", "b1", "b2"], rules: RULES, expected: ["quota min C : 0 < 1"]
  }
  // ... à compléter
];

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
printTitle("Qualité de la banque");
console.log("banque propre :", validateBank(ITEMS));
console.log("banque abîmée :", validateBank([
  { id: "a1", domain: "A" }, { id: "a1", domain: "A" }, { id: "b1" }, { domain: "C" }
]));

printTitle("Cohérence des règles (sans solveur)");
console.log("règles de base       :", validateRuleConsistency(RULES, ITEMS));
console.log("longueur 4, min 2+2+1:", validateRuleConsistency(
  { testLength: 4, minimums: { A: 2, B: 2, C: 1 } }, ITEMS));

printTitle("Suite de tests du validateur");
const { passedCount, failedCount } = runTestSuite(testSuite);
console.log(`  → ${passedCount} cas réussis, ${failedCount} en échec`);

// QUESTIONS :
//  a) Quel avantage les contrôles de cohérence ont-ils sur un appel au
//     solveur qui renverrait « infaisable » ?
//  b) Quel risque fait courir un item sans domaine dans la banque ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
printTitle("Auto-vérification");
check("banque propre : aucune erreur", () => validateBank(ITEMS), []);
check("banque abîmée : doublon, domaine et id manquants", () => validateBank([
  { id: "a1", domain: "A" }, { id: "a1", domain: "A" }, { id: "b1" }, { domain: "C" }
]), ["id dupliqué : a1", "domaine manquant : b1", "id manquant (position 3)"]);
check("cohérence : règles de base OK", () => validateRuleConsistency(RULES, ITEMS), []);
check("cohérence : minimums 5 > longueur 4", () =>
  validateRuleConsistency({ testLength: 4, minimums: { A: 2, B: 2, C: 1 } }, ITEMS),
  ["quotas minimums (5) > longueur (4)"]);
check("cohérence : maximums trop bas et min > max", () =>
  validateRuleConsistency({ testLength: 6, minimums: { C: 3 }, maximums: { A: 2, B: 1, C: 2 } }, ITEMS),
  ["quotas maximums (5) < longueur (6)", "domaine C : minimum 3 > 2 items disponibles",
   "domaine C : minimum 3 > maximum 2"]);
check("sélection conforme", () => validateSelection(["a1", "a2", "b1", "c1"], ITEMS, RULES), []);
check("toutes les violations à la fois", () =>
  validateSelection(["a1", "a1", "a2", "a3", "x"], ITEMS, RULES),
  ["item en double : a1", "item inconnu : x", "longueur incorrecte : 5 ≠ 4",
   "quota min B : 0 < 1", "quota min C : 0 < 1", "quota max A : 3 > 2"]);
check("la suite contient au moins 8 cas", () => testSuite.length >= 8, true);
check("les 6 catégories du cours sont couvertes", () =>
  ["faisable", "infaisable", "données manquantes", "doublons", "redondance", "extrême"]
    .every(category => testSuite.some(testCase => testCase.category === category)), true);
check("tous les cas de la suite passent", () => failedCount === 0 && passedCount === testSuite.length, true);
printSummary();

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (validateBank) — items.forEach((item, position) => { ... }) et un
//   Set des id déjà vus ; un `return` dans le forEach passe à l'item suivant.
//
// Indice 2 (validateRuleConsistency) —
//   - const minimums = rules.minimums ?? {};  (idem pour maximums)
//   - somme des minimums : Object.values(minimums).reduce(...)
//   - domaines de la banque : [...new Set(items.map(item => item.domain))]
//   - « tous plafonnés » : domains.every(domain => maximums[domain] !== undefined)
//   - items disponibles d'un domaine : items.filter(item => item.domain === domain).length
//
// Indice 3 (validateSelection) — étapes :
//   1. parcourir selectedIds avec un Set `seenIds` et un Set `duplicateIds` ;
//   2. pour chaque id de `seenIds` : inconnu → erreur, sinon countByDomain[domain]++ ;
//   3. longueur sur selectedIds.length ;
//   4. minimums puis 5. maximums, avec (countByDomain[domain] || 0).
//   Une Map id → item (new Map(items.map(item => [item.id, item]))) retrouve vite un item.
//
// Indice 4 (testSuite) — idées : trop d'items du domaine A ; item absent de
//   la banque ; même item deux fois ; minimum 0 sur un domaine D (redondant :
//   { ...RULES, minimums: { ...RULES.minimums, D: 0 } }) ; sélection vide avec
//   longueur 0 ; sélection vide avec les règles de base...
