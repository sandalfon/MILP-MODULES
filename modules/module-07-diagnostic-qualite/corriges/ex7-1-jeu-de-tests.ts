/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 7 — Exercice 7.1 : Validateur et jeu de tests — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-07-diagnostic-qualite/module-07-diagnostic-qualite.md (§4 et §6)
 *  Lancer : node modules/module-07-diagnostic-qualite/corriges/ex7-1-jeu-de-tests.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Trois niveaux de contrôle, du plus général au plus particulier :
 *
 *  1. validateBank(items) — qualité des DONNÉES, avant tout modèle.
 *     Un id dupliqué ferait apparaître deux variables de même nom ; un
 *     domaine manquant ferait sortir l'item de tous les quotas. On
 *     utilise un Set des id déjà vus pour repérer les doublons en un
 *     seul passage.
 *
 *  2. validateRuleConsistency(rules, items) — cohérence des RÈGLES entre
 *     elles, sans solveur. De simples sommes suffisent à prouver
 *     certaines infaisabilités :
 *       Σ minimums > longueur          → impossible
 *       Σ maximums < longueur          → impossible, mais seulement si
 *                                        TOUS les domaines ont un maximum
 *                                        (sinon un domaine sans plafond
 *                                        peut compléter)
 *       minimum_d > items disponibles  → impossible
 *       minimum_d > maximum_d          → impossible
 *
 *  3. validateSelection(selectedIds, items, rules) — validateur
 *     INDÉPENDANT d'une solution. Il renvoie TOUTES les violations, et
 *     pas seulement la première : on corrige plus vite quand on voit
 *     tout. Les quotas se comptent sur les id DISTINCTS et connus : un
 *     doublon est signalé une fois et n'est pas compté deux fois dans
 *     un quota.
 *
 *  La suite de tests associe à chaque cas un NOM, une CATÉGORIE et le
 *  résultat ATTENDU. Toute modification future du validateur est
 *  ainsi re-testée en une commande. C'est le filet de sécurité qui
 *  permet de faire évoluer le modèle sans régression.
 *
 *  Pièges fréquents
 *  - Utiliser `if (minimum)` au lieu de comparer : un minimum de 0 est une
 *    règle redondante, mais valide. Elle ne doit produire aucune erreur.
 *  - `(countByDomain[domain] || 0)` : un domaine absent de la sélection
 *    compte 0, pas undefined (undefined < 1 vaut false, et l'erreur
 *    passerait inaperçue).
 *  - Arrêter la fonction à la première erreur (`return` prématuré).
 *
 *  Réponses aux questions
 *  a) Les contrôles de cohérence détectent l'infaisabilité AVANT le
 *     solveur, avec un message précis (« minimums 5 > longueur 4 »).
 *     Le solveur, lui, dirait seulement NOFEAS.
 *  b) Un item sans domaine n'entre dans aucun quota. Si ces quotas
 *     sont serrés, le modèle peut devenir infaisable, ou au contraire
 *     sélectionner des items « hors plan de test ».
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
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

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Qualité des données de la banque.
function validateBank(items: RawItem[]): string[] {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  items.forEach((item, position) => {
    if (!item.id) {
      errors.push(`id manquant (position ${position})`);
      return; // sans id, les autres contrôles n'ont pas de sens
    }
    if (seenIds.has(item.id)) errors.push(`id dupliqué : ${item.id}`);
    seenIds.add(item.id);
    if (!item.domain) errors.push(`domaine manquant : ${item.id}`);
  });
  return errors;
}

// Contradictions détectables par arithmétique, sans solveur.
function validateRuleConsistency(rules: Rules, items: Item[]): string[] {
  const errors: string[] = [];
  const minimums = rules.minimums ?? {};
  const maximums = rules.maximums ?? {};

  const minimumsTotal = Object.values(minimums).reduce((sum, minimum) => sum + minimum, 0);
  if (minimumsTotal > rules.testLength) {
    errors.push(`quotas minimums (${minimumsTotal}) > longueur (${rules.testLength})`);
  }

  // Σ maximums n'a de sens que si chaque domaine de la banque est plafonné.
  const domains = [...new Set(items.map(item => item.domain))];
  if (domains.every(domain => maximums[domain] !== undefined)) {
    const maximumsTotal = domains.reduce((sum, domain) => sum + maximums[domain], 0);
    if (maximumsTotal < rules.testLength) {
      errors.push(`quotas maximums (${maximumsTotal}) < longueur (${rules.testLength})`);
    }
  }

  for (const [domain, minimum] of Object.entries(minimums)) {
    const availableCount = items.filter(item => item.domain === domain).length;
    if (minimum > availableCount) errors.push(`domaine ${domain} : minimum ${minimum} > ${availableCount} items disponibles`);
    const maximum = maximums[domain];
    if (maximum !== undefined && minimum > maximum) {
      errors.push(`domaine ${domain} : minimum ${minimum} > maximum ${maximum}`);
    }
  }
  return errors;
}

// Validateur indépendant d'une sélection : renvoie TOUTES les violations.
function validateSelection(selectedIds: string[], items: Item[], rules: Rules): string[] {
  const errors: string[] = [];
  const itemsById = new Map(items.map(item => [item.id, item]));

  // 1. Doublons (chacun signalé une seule fois).
  const seenIds = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const id of selectedIds) {
    if (seenIds.has(id)) duplicateIds.add(id);
    seenIds.add(id);
  }
  for (const id of duplicateIds) errors.push(`item en double : ${id}`);

  // 2. Items inconnus, et comptage par domaine sur les id distincts connus.
  const countByDomain: Record<string, number> = {};
  for (const id of seenIds) {
    const item = itemsById.get(id);
    if (!item) {
      errors.push(`item inconnu : ${id}`);
      continue;
    }
    countByDomain[item.domain] = (countByDomain[item.domain] || 0) + 1;
  }

  // 3. Longueur (sur la sélection brute : un doublon la fausse aussi).
  if (selectedIds.length !== rules.testLength) {
    errors.push(`longueur incorrecte : ${selectedIds.length} ≠ ${rules.testLength}`);
  }

  // 4. Quotas minimums, puis 5. quotas maximums.
  for (const [domain, minimum] of Object.entries(rules.minimums ?? {})) {
    const observedCount = countByDomain[domain] || 0;
    if (observedCount < minimum) errors.push(`quota min ${domain} : ${observedCount} < ${minimum}`);
  }
  for (const [domain, maximum] of Object.entries(rules.maximums ?? {})) {
    const observedCount = countByDomain[domain] || 0;
    if (observedCount > maximum) errors.push(`quota max ${domain} : ${observedCount} > ${maximum}`);
  }
  return errors;
}

// Suite de tests nommés : une ou plusieurs entrées par catégorie du cours.
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
  },
  {
    name: "trop d'items du domaine A",
    category: "infaisable",
    selectedIds: ["a1", "a2", "a3", "b1"], rules: RULES,
    expected: ["quota min C : 0 < 1", "quota max A : 3 > 2"]
  },
  {
    name: "item absent de la banque",
    category: "données manquantes",
    selectedIds: ["a1", "b1", "c1", "z9"], rules: RULES, expected: ["item inconnu : z9"]
  },
  {
    name: "même item deux fois",
    category: "doublons",
    selectedIds: ["a1", "a1", "b1", "c1"], rules: RULES, expected: ["item en double : a1"]
  },
  {
    name: "minimum 0 sans effet",
    category: "redondance",
    selectedIds: ["a1", "a2", "b1", "c1"],
    rules: { ...RULES, minimums: { ...RULES.minimums, D: 0 } }, expected: []
  },
  {
    name: "sélection vide, longueur 0",
    category: "extrême",
    selectedIds: [], rules: { testLength: 0 }, expected: []
  },
  {
    name: "sélection vide avec quotas",
    category: "extrême",
    selectedIds: [], rules: RULES,
    expected: ["longueur incorrecte : 0 ≠ 4", "quota min A : 0 < 1", "quota min B : 0 < 1", "quota min C : 0 < 1"]
  }
];

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
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

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
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
