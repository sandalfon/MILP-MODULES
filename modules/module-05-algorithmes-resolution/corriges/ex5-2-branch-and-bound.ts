/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 5 — Exercice 5.2 : Branch and Bound — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-05-algorithmes-resolution/module-05-algorithmes-resolution.md (§3 et §4)
 *  Lancer : node modules/module-05-algorithmes-resolution/corriges/ex5-2-branch-and-bound.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  1. Relaxation d'un nœud (computeNodeBound)
 *     Un nœud est défini par les variables déjà FIXÉES (objet
 *     { id: 0|1 }). On commence par « payer » les objets fixés à 1 :
 *     s'ils dépassent déjà la capacité, le nœud est IRRÉALISABLE (null).
 *     Sinon, on applique le glouton fractionnaire aux seuls objets
 *     LIBRES. On renvoie la borne, la solution relâchée x, et l'id de la
 *     variable fractionnaire (null si x est entière). Avec le glouton,
 *     il y a au plus UNE variable fractionnaire.
 *
 *  2. Récursion (exploreNode)
 *     À chaque nœud, dans cet ordre :
 *       a) irréalisable                  → élagage par infaisabilité
 *       b) borne ≤ incumbent             → élagage par borne
 *       c) solution relâchée entière     → nouvel incumbent si meilleur,
 *                                          élagage par intégralité
 *       d) sinon, brancher sur la variable fractionnaire : enfant « 0 »
 *          puis enfant « 1 »
 *     L'ordre b) avant c) est important : une solution entière dont la
 *     valeur ne bat pas l'incumbent n'apporte rien.
 *     On utilise une petite tolérance EPS dans la comparaison de b) pour
 *     ne pas brancher inutilement à cause d'erreurs d'arrondi flottant.
 *
 *  3. Résultats
 *     Petite instance : 5 nœuds (comme l'arbre du cours), contre
 *     2⁵ − 1 = 31 nœuds pour l'arbre complet. Élagages : 2 par
 *     intégralité, 1 par borne.
 *     Instance de 20 objets : la force brute évalue 2²⁰ = 1 048 576
 *     sélections ; le B&B explore 671 nœuds (515 en commençant par
 *     l'enfant « 1 ») et trouve la MÊME valeur optimale, 331. Sans
 *     élagage par borne, il en faut 321 677. C'est l'effet des bornes.
 *
 *  Réponses aux questions
 *  a) Aucun ordre n'est meilleur dans l'absolu : tout dépend de
 *     l'instance. Sur la petite instance, « 1 d'abord » explore 9 nœuds
 *     (dont 2 irréalisables) contre 5. Sur l'instance de 20 objets,
 *     c'est l'inverse : 515 nœuds contre 671. Les solveurs utilisent des
 *     règles adaptatives pour choisir l'ordre.
 *  b) Sans élagage par borne (b), on n'élague que par infaisabilité
 *     et intégralité : le nombre de nœuds explose (voir la ligne
 *     « sans élagage par borne » du tableau : 321 677 nœuds au lieu de
 *     671). C'est la borne qui fait l'essentiel du travail.
 *
 *  Pièges fréquents
 *  - Modifier l'objet `fixedValues` du parent au lieu d'en créer une copie
 *    ({ ...fixedValues, [id]: 0 }) : les deux branches se marchent dessus.
 *  - Oublier de compter le coût des objets fixés à 1 dans la relaxation.
 *  - Élaguer avec `<` au lieu de `≤` : correct, mais on explore des
 *    nœuds qui ne peuvent au mieux qu'égaler l'incumbent.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type KnapsackItem = { id: string; cost: number; value: number };
type Instance = { items: KnapsackItem[]; capacity: number };
type Decision = Record<string, number>;               // id → valeur de x (0, 1 ou fraction)
type FixedValues = Partial<Record<string, 0 | 1>>;    // id → valeur imposée
type Relaxation = { bound: number; x: Decision; fractionalId: string | null };
type Incumbent = { value: number; x: Decision };
type Stats = { nodes: number; prunedByInfeasibility: number; prunedByBound: number; prunedByIntegrality: number };
type Options = { useBoundPruning?: boolean; exploreOneFirst?: boolean };
type BranchAndBoundResult = { value: number | null; selectedIds: string[]; stats: Stats };

// Petite instance : les produits A–D du fil rouge, vus comme des objets de sac à dos.
const PRODUCTS: KnapsackItem[] = [
  { id: "A", cost: 30, value: 8 },
  { id: "B", cost: 50, value: 12 },
  { id: "C", cost: 40, value: 10 },
  { id: "D", cost: 20, value: 5 }
];
const CAPACITY: number = 100;
const EPS: number = 1e-9;

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────

// Générateur pseudo-aléatoire « mulberry32 » : même graine → mêmes nombres.
function createRandomGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return function (): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

// Instance déterministe : itemCount objets, valeur corrélée au coût.
function generateInstance(itemCount: number, seed: number): Instance {
  const random = createRandomGenerator(seed);
  const items: KnapsackItem[] = [];
  for (let i = 0; i < itemCount; i++) {
    const cost = 10 + Math.floor(random() * 51);              // 10 à 60
    const value = Math.round(cost * (0.8 + random() * 0.4)); // ±20 %
    items.push({ id: `o${String(i + 1).padStart(2, "0")}`, cost, value });
  }
  const capacity = Math.floor(items.reduce((sum, item) => sum + item.cost, 0) / 2);
  return { items, capacity };
}

// Force brute optimisée (masques + sommes incrémentales) : référence.
function solveByBruteForce(items: KnapsackItem[], capacity: number): number {
  let bestValue = 0;
  for (let mask = 0; mask < 2 ** items.length; mask++) {
    let cost = 0;
    let value = 0;
    for (let i = 0; i < items.length; i++) {
      if (mask & (1 << i)) { cost += items[i].cost; value += items[i].value; }
    }
    if (cost <= capacity && value > bestValue) bestValue = value;
  }
  return bestValue;
}

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Relaxation d'un nœud : renvoie null (irréalisable) ou
// { bound, x, fractionalId } où fractionalId est un id ou null.
function computeNodeBound(items: KnapsackItem[], capacity: number, fixedValues: FixedValues): Relaxation | null {
  let remainingCapacity = capacity;
  let bound = 0;
  const x: Decision = {};
  for (const item of items) {
    if (fixedValues[item.id] === 1) { remainingCapacity -= item.cost; bound += item.value; x[item.id] = 1; }
    else if (fixedValues[item.id] === 0) { x[item.id] = 0; }
  }
  if (remainingCapacity < 0) return null; // les objets imposés ne tiennent pas

  const freeItems = items
    .filter(item => fixedValues[item.id] === undefined)
    .sort((first, second) => second.value / second.cost - first.value / first.cost);
  let fractionalId: string | null = null;
  for (const item of freeItems) {
    const fraction = remainingCapacity <= 0 ? 0 : Math.min(1, remainingCapacity / item.cost);
    x[item.id] = fraction;
    bound += fraction * item.value;
    remainingCapacity -= fraction * item.cost;
    if (fraction > EPS && fraction < 1 - EPS) fractionalId = item.id;
  }
  return { bound, x, fractionalId };
}

// Branch and Bound. Options : useBoundPruning = false désactive l'élagage par
// borne ; exploreOneFirst = true explore l'enfant « x = 1 » avant « x = 0 ».
function branchAndBound(items: KnapsackItem[], capacity: number, { useBoundPruning = true, exploreOneFirst = false }: Options = {}): BranchAndBoundResult {
  const stats: Stats = { nodes: 0, prunedByInfeasibility: 0, prunedByBound: 0, prunedByIntegrality: 0 };
  // Meilleure solution entière connue, remplacée par exploreNode pendant la récursion.
  // Elle est rangée dans un objet : TypeScript sait ainsi qu'elle peut changer
  // (une simple variable `let` serait vue comme toujours null après exploreNode).
  const search: { incumbent: Incumbent | null } = { incumbent: null };

  function exploreNode(fixedValues: FixedValues): void {
    stats.nodes++;
    const relaxation = computeNodeBound(items, capacity, fixedValues);
    const incumbent = search.incumbent;

    if (relaxation === null) { stats.prunedByInfeasibility++; return; }    // a)
    if (useBoundPruning && incumbent !== null && relaxation.bound <= incumbent.value + EPS) {
      stats.prunedByBound++; return;                                        // b)
    }
    if (relaxation.fractionalId === null) {                                 // c)
      stats.prunedByIntegrality++;
      if (incumbent === null || relaxation.bound > incumbent.value + EPS) {
        search.incumbent = { value: relaxation.bound, x: relaxation.x };
      }
      return;
    }
    const id = relaxation.fractionalId;                                     // d)
    const childOrder: (0 | 1)[] = exploreOneFirst ? [1, 0] : [0, 1];
    for (const fixedValue of childOrder) exploreNode({ ...fixedValues, [id]: fixedValue });
  }

  exploreNode({});
  const incumbent = search.incumbent;
  if (incumbent === null) return { value: null, selectedIds: [], stats }; // aucune solution entière
  const selectedIds = items.filter(item => incumbent.x[item.id] === 1).map(item => item.id);
  return { value: incumbent.value, selectedIds, stats };
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Petite instance (capacité 100)");
console.log("Relaxation racine :", computeNodeBound(PRODUCTS, CAPACITY, {}));
const smallInstanceResult = branchAndBound(PRODUCTS, CAPACITY);
console.log("Branch and Bound :", smallInstanceResult);
console.log(`Nœuds explorés : ${smallInstanceResult.stats.nodes} (arbre complet : ${2 ** (PRODUCTS.length + 1) - 1})`);

printTitle("Instance de 20 objets (graine 42)");
const largeInstance = generateInstance(20, 42);
console.log(`Capacité : ${largeInstance.capacity}`);
const startTime = Date.now();
const reference = solveByBruteForce(largeInstance.items, largeInstance.capacity);
const bruteForceDuration = Date.now() - startTime;
const variants: [string, BranchAndBoundResult][] = [
  ["B&B, enfant 0 d'abord", branchAndBound(largeInstance.items, largeInstance.capacity)],
  ["B&B, enfant 1 d'abord", branchAndBound(largeInstance.items, largeInstance.capacity, { exploreOneFirst: true })],
  ["sans élagage par borne", branchAndBound(largeInstance.items, largeInstance.capacity, { useBoundPruning: false })]
];
console.table([
  { method: "force brute", value: reference, nodesOrCases: 2 ** 20, ms: bruteForceDuration },
  ...variants.map(([method, variantResult]) => ({ method, value: variantResult.value, nodesOrCases: variantResult.stats.nodes }))
]);

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");

// Relaxation d'un nœud de la petite instance qui DOIT être réalisable :
// si computeNodeBound renvoie null, le test échoue avec ce message.
function getFeasibleRelaxation(fixedValues: FixedValues): Relaxation {
  const relaxation = computeNodeBound(PRODUCTS, CAPACITY, fixedValues);
  if (relaxation === null) throw new Error("nœud jugé irréalisable alors que les objets fixés à 1 tiennent dans le sac");
  return relaxation;
}

check("racine : borne 25.4", () => getFeasibleRelaxation({}).bound, 25.4);
check("racine : B est fractionnaire", () => getFeasibleRelaxation({}).fractionalId, "B");
check("nœud B=1 : borne 25, C fractionnaire", () => {
  const relaxation = getFeasibleRelaxation({ B: 1 });
  return [relaxation.bound, relaxation.fractionalId];
}, [25, "C"]);
check("nœud B=0 : relaxation entière (23)", () => {
  const relaxation = getFeasibleRelaxation({ B: 0 });
  return [relaxation.bound, relaxation.fractionalId];
}, [23, null]);
check("nœud A=B=C=1 : irréalisable", () => computeNodeBound(PRODUCTS, CAPACITY, { A: 1, B: 1, C: 1 }), null);
check("B&B petite instance : valeur 25, choix A B D", () => {
  const smallResult = branchAndBound(PRODUCTS, CAPACITY);
  return [smallResult.value, smallResult.selectedIds];
}, [25, ["A", "B", "D"]]);
check("B&B petite instance : 5 nœuds", () => branchAndBound(PRODUCTS, CAPACITY).stats,
  { nodes: 5, prunedByInfeasibility: 0, prunedByBound: 1, prunedByIntegrality: 2 });
check("instance 20 objets : B&B = force brute",
  () => branchAndBound(largeInstance.items, largeInstance.capacity).value, reference);
check("instance 20 objets : bien moins de nœuds que 2^20", () => {
  const nodes = branchAndBound(largeInstance.items, largeInstance.capacity).stats.nodes;
  return nodes > 10 && nodes < 2 ** 20 / 100;
}, true);
check("petite instance, enfant 1 d'abord : 9 nœuds",
  () => branchAndBound(PRODUCTS, CAPACITY, { exploreOneFirst: true }).stats.nodes, 9);
check("sans élagage par borne : même optimum",
  () => branchAndBound(largeInstance.items, largeInstance.capacity, { useBoundPruning: false }).value, reference);
printSummary();
