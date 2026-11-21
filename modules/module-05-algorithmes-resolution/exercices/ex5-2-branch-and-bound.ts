/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 5 — Exercice 5.2 : Branch and Bound
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-05-algorithmes-resolution/module-05-algorithmes-resolution.md (§3 et §4)
 *  Niveau : ★★★   Durée indicative : 75 min
 *  Lancer : node modules/module-05-algorithmes-resolution/exercices/ex5-2-branch-and-bound.ts
 *
 *  OBJECTIF
 *  Programmer un Branch and Bound récursif pour le sac à dos, compter
 *  les nœuds explorés et les élagages, et constater qu'il trouve le
 *  même optimum que la force brute en explorant beaucoup moins de cas.
 *
 *  PRÉREQUIS
 *  - Exercice 5.1 : borne fractionnaire (glouton par ratio).
 *  - Cours §3 : les trois élagages (infaisabilité, borne, intégralité).
 *  - TypeScript : récursion, fonction imbriquée (closure), copie
 *    d'objet avec propriété calculée { ...fixedValues, [id]: 0 }, types
 *    union (Relaxation | null, 0 | 1).
 *
 *  CONSIGNE
 *  Un NŒUD est décrit par `fixedValues`, un objet { id: 0|1 } des variables
 *  déjà fixées par les branchements (les autres sont libres).
 *    1. computeNodeBound : relaxation d'un nœud (borne, solution relâchée,
 *       variable fractionnaire), ou null si le nœud est irréalisable.
 *    2. branchAndBound : complète les étapes 2a à 2d de la fonction
 *       récursive exploreNode (le reste est fourni).
 *  Chaque bloc TODO détaille l'entrée, la sortie et un exemple ; si tu
 *  bloques, la section INDICES en fin de fichier donne des pistes.
 *
 *  RÉSULTAT ATTENDU
 *  Petite instance : valeur 25 (A, B, D) en 5 nœuds (2 élagages par
 *  intégralité, 1 par borne). Instance de 20 objets : même valeur que
 *  la force brute (331) avec quelques centaines de nœuds.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Relaxation d'un nœud de l'arbre.
// Objectif : calculer la borne d'un NŒUD du Branch and Bound, c'est-à-dire la
//            relaxation continue du sac à dos quand certaines variables ont déjà
//            été fixées à 0 ou à 1 par les branchements (§3 du cours).
// Entrée   : items, les objets { id, cost, value }, ex. PRODUCTS ;
//            capacity, ex. 100 ;
//            fixedValues, les variables déjà fixées, ex. { B: 1 } (les autres
//            sont libres ; {} pour la racine).
// Sortie   : null si le nœud est IRRÉALISABLE (les objets fixés à 1 dépassent
//            déjà la capacité) ; sinon un objet Relaxation { bound, x, fractionalId } :
//            bound la valeur de la relaxation, x la valeur (0, 1 ou fraction) de
//            CHAQUE objet, fractionalId l'id de la variable strictement entre
//            0 et 1, ou null si x est entière.
// Exemple  : computeNodeBound(PRODUCTS, 100, {}) → bound 25.4, fractionalId "B" ;
//            { B: 1 } → bound 25, fractionalId "C" ; { B: 0 } → bound 23, fractionalId null ;
//            { A: 1, B: 1, C: 1 } → null (coût 120 > 100).
// Attention: la valeur des objets fixés à 1 compte dans la borne ; une part
//            fractionnaire se compare avec la tolérance EPS (0.2000000001 n'est
//            pas « entier ») ; ne modifie pas l'ordre du tableau items.
// (Indice 1 en fin de fichier.)
function computeNodeBound(items: KnapsackItem[], capacity: number, fixedValues: FixedValues): Relaxation | null {
  return undefined; // ← à remplacer
}

// TODO 2 — Exploration récursive d'un nœud (fonction exploreNode de branchAndBound).
// Objectif : traiter un nœud selon les règles du §3 du cours, dans cet ordre :
//            élagage par infaisabilité, élagage par borne, élagage par
//            intégralité, sinon branchement sur la variable fractionnaire.
//            Tout le reste de branchAndBound est fourni : complète seulement
//            les étapes 2a à 2d dans le corps de exploreNode.
// Entrée   : fixedValues, les variables fixées du nœud courant (exploreNode
//            commence à la racine {}) ; options useBoundPruning (défaut true :
//            false désactive l'étape 2b) et exploreOneFirst (défaut false :
//            true explore l'enfant « 1 » avant l'enfant « 0 »).
// Sortie   : exploreNode ne renvoie rien : elle met à jour stats (un compteur
//            par élagage) et search.incumbent (meilleure solution entière connue).
//            branchAndBound renvoie { value, selectedIds, stats }.
// Exemple  : branchAndBound(PRODUCTS, 100) → value 25, selectedIds ["A", "B", "D"],
//            stats { nodes: 5, prunedByInfeasibility: 0, prunedByBound: 1, prunedByIntegrality: 2 } ;
//            avec { exploreOneFirst: true } → 9 nœuds.
// Attention: l'élagage par borne passe AVANT l'intégralité ; on ne remplace
//            l'incumbent que par une solution STRICTEMENT meilleure (à EPS près) ;
//            chaque enfant reçoit sa PROPRE copie de fixedValues.
// (Indice 2 en fin de fichier.)
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
    if (relaxation === undefined) return; // (sécurité tant que le TODO 1 n'est pas fait)

    // Étape 2a — Élagage par INFAISABILITÉ : le nœud n'a aucune solution
    //            (relaxation === null) ; on le compte et on s'arrête.

    // Étape 2b — Élagage par BORNE (seulement si useBoundPruning) : il existe
    //            un incumbent et la borne du nœud ne peut pas le battre ;
    //            on le compte et on s'arrête.

    // Étape 2c — Élagage par INTÉGRALITÉ : la solution relâchée est entière ;
    //            on le compte, on met à jour search.incumbent si elle est
    //            meilleure (ou s'il n'y en a pas encore), et on s'arrête.

    // Étape 2d — BRANCHEMENT sur la variable fractionnaire : on explore les
    //            deux enfants (variable fixée à 0 et à 1), dans l'ordre choisi
    //            par exploreOneFirst.
  }

  exploreNode({});
  const incumbent = search.incumbent;
  if (incumbent === null) return { value: null, selectedIds: [], stats }; // aucune solution entière
  const selectedIds = items.filter(item => incumbent.x[item.id] === 1).map(item => item.id);
  return { value: incumbent.value, selectedIds, stats };
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Compare « enfant 0 d'abord » et « enfant 1 d'abord » sur les deux
//     instances. Un ordre est-il toujours meilleur ?
//  b) Que devient le nombre de nœuds sans élagage par borne ? Qu'en
//     conclus-tu sur le rôle de la relaxation ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (computeNodeBound) — Deux passes sur items :
//   let remainingCapacity = capacity, bound = 0; const x: Decision = {};
//   1re passe, objets FIXÉS :
//     fixedValues[item.id] === 1 → remainingCapacity -= item.cost ; bound += item.value ; x[item.id] = 1
//     fixedValues[item.id] === 0 → x[item.id] = 0
//   si remainingCapacity < 0 → return null
//   2e passe, objets LIBRES (fixedValues[item.id] === undefined), filtrés puis
//   triés par ratio value / cost décroissant (filter crée déjà une copie) :
//     let fractionalId: string | null = null;
//     fraction = remainingCapacity <= 0 ? 0 : Math.min(1, remainingCapacity / item.cost)
//     x[item.id] = fraction ; bound += fraction * item.value ; remainingCapacity -= fraction * item.cost
//     si EPS < fraction < 1 − EPS → fractionalId = item.id
//   return { bound, x, fractionalId };
//
// Indice 2 (branchAndBound) — Les quatre étapes de exploreNode :
//   2a : if (relaxation === null) { stats.prunedByInfeasibility++; return; }
//   2b : si useBoundPruning, incumbent !== null et
//        relaxation.bound <= incumbent.value + EPS → stats.prunedByBound++ ; return
//   2c : si relaxation.fractionalId === null → stats.prunedByIntegrality++ ;
//        si incumbent === null ou relaxation.bound > incumbent.value + EPS,
//        search.incumbent = { value: relaxation.bound, x: relaxation.x } ; return
//   2d : const id = relaxation.fractionalId ;
//        const childOrder: (0 | 1)[] = exploreOneFirst ? [1, 0] : [0, 1] ;
//        pour chaque fixedValue de childOrder : exploreNode({ ...fixedValues, [id]: fixedValue })
