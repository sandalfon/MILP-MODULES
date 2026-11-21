/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 4 — Exercice 4.2 : Big-M et activation
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-04-modelisation-avancee/module-04-modelisation-avancee.md (§3 et §4)
 *  Niveau : ★★☆   Durée indicative : 40 min
 *  Lancer : node modules/module-04-modelisation-avancee/exercices/ex4-2-big-m-activation.ts
 *
 *  OBJECTIF
 *  Lier une production continue q à une décision binaire y avec
 *  QMIN·y ≤ q ≤ M·y, choisir un M serré à partir des données et
 *  mesurer l'effet d'un M trop grand sur la relaxation.
 *
 *  PRÉREQUIS
 *  - Module 2 : la relaxation remplace y ∈ {0,1} par 0 ≤ y ≤ 1.
 *  - Cours §3–§4 : liaison activité/quantité, Big-M.
 *  - TypeScript : Math.min, opérateurs logiques, console.table,
 *    tuples [number, number].
 *
 *  CONSIGNE
 *  Une machine peut être allumée (y = 1) ou éteinte (y = 0). Éteinte,
 *  elle ne produit rien ; allumée, elle produit entre QMIN et sa capacité.
 *    1. computeTightM() : déduis M des données (capacité machine ET demande max).
 *    2. satisfiesLinking(y, quantity, M) : formulation LINÉAIRE + domaine.
 *    3. satisfiesBusinessLogic(y, quantity, capacity) : la même règle en if/else.
 *    4. computeMinimalRelaxedY(quantity, M) : plus petit y ∈ [0,1] tel que
 *       quantity ≤ M·y.
 *    5. computeRelaxedFixedCost(quantity, M) : FIXED_COST × ce y minimal.
 *    6. computePhantomProduction(M) : quantité maximale autorisée si y vaut
 *       seulement INTEGRALITY_TOLERANCE (une « presque zéro » acceptée par
 *       le solveur).
 *  Les indices sont regroupés en fin de fichier.
 *
 *  RÉSULTAT ATTENDU
 *  M = 100 ; formulation et logique d'accord sur tous les couples ;
 *  pour q = 40 : y = 0,4 et 200 € avec M = 100, mais y = 0,004 et 2 €
 *  avec M = 10 000.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
const QMIN: number = 10;                // minimum technique si la machine tourne
const HOURLY_CAPACITY: number = 12.5;  // unités par heure
const SHIFT_HOURS: number = 8;               // durée du poste
const MAX_CUSTOMER_DEMAND: number = 150; // le client n'achète jamais plus
const FIXED_COST: number = 500;          // coût d'allumage (€)
const INTEGRALITY_TOLERANCE: number = 1e-6;

// ─── 2. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — M serré déduit des données.
// Objectif : calculer le Big-M de la liaison q ≤ M·y : la plus petite borne
//            supérieure LÉGITIME de la quantité q (M valide ET serré, cours §4).
//            La production est limitée par la machine (HOURLY_CAPACITY par
//            heure pendant SHIFT_HOURS heures) et par la demande du client
//            (MAX_CUSTOMER_DEMAND).
// Entrée   : aucune ; la fonction lit les constantes de la section 1.
// Sortie   : un nombre, la valeur de M.
// Exemple  : computeTightM() → 100.
// Attention: un M trop petit interdit des productions légitimes ; un M trop
//            grand affaiblit la relaxation.
// (Indice 1 en fin de fichier.)
function computeTightM(): number {
  return undefined; // ← à remplacer
}

// TODO 2 — Formulation linéaire de la liaison activité/quantité.
// Objectif : dire si le couple (y, quantity) respecte la formulation vue
//            par le solveur : domaine y ∈ {0,1} et q ≥ 0, puis
//            liaison QMIN·y ≤ q ≤ M·y (cours §3).
// Entrée   : y, l'indicatrice « la machine tourne », ex. 1 ;
//            quantity, la quantité produite q, ex. 40 ;
//            M, la borne de la liaison, ex. 100.
// Sortie   : un booléen, true si toutes les contraintes sont satisfaites.
// Exemple  : satisfiesLinking(1, 40, 100) → true ; satisfiesLinking(0, 5, 100) → false ;
//            satisfiesLinking(1, 5, 100) → false (sous QMIN).
// Attention: y = 0.5 n'est pas dans le domaine : satisfiesLinking(0.5, 30, 100) → false.
// (Indice 2 en fin de fichier.)
function satisfiesLinking(y: number, quantity: number, M: number): boolean {
  return undefined; // ← à remplacer
}

// TODO 3 — Même règle, écrite « en clair » (logique métier).
// Objectif : écrire la règle métier SANS inégalité astucieuse, pour
//            contrôler la formulation : machine éteinte → elle ne produit
//            rien ; machine allumée → elle produit entre QMIN et capacity
//            (bornes incluses) ; toute autre valeur de y est refusée.
// Entrée   : y, ex. 1 ; quantity, ex. 40 ; capacity, la production maximale, ex. 100.
// Sortie   : un booléen, true si le couple (y, quantity) est permis.
// Exemple  : satisfiesBusinessLogic(1, 40, 100) → true ; satisfiesBusinessLogic(0, 0, 100) → true ;
//            satisfiesBusinessLogic(1, 120, 100) → false.
// Attention: elle doit donner la même réponse que satisfiesLinking sur tous
//            les couples de testPairs.
// (Indice 3 en fin de fichier.)
function satisfiesBusinessLogic(y: number, quantity: number, capacity: number): boolean {
  return undefined; // ← à remplacer
}

// TODO 4 — Plus petit y de la relaxation.
// Objectif : dans la relaxation, y devient continu dans [0, 1] ; calculer
//            le plus petit y compatible avec la contrainte q ≤ M·y, celui
//            que choisit un solveur qui minimise les coûts.
// Entrée   : quantity, la production q, ex. 40 ; M, ex. 100.
// Sortie   : un nombre entre 0 et 1, le y minimal.
// Exemple  : computeMinimalRelaxedY(40, 100) → 0.4 ; computeMinimalRelaxedY(40, 10000) → 0.004.
// (Indice 4 en fin de fichier.)
function computeMinimalRelaxedY(quantity: number, M: number): number {
  return undefined; // ← à remplacer
}

// TODO 5 — Coût fixe « vu » par la relaxation.
// Objectif : calculer la part du coût d'allumage FIXED_COST que la
//            relaxation compte pour produire quantity, quand y vaut son
//            minimum relaxé (et non 1).
// Entrée   : quantity, ex. 40 ; M, ex. 100.
// Sortie   : un nombre, le coût fixe compté (€).
// Exemple  : computeRelaxedFixedCost(40, 100) → 200 ; computeRelaxedFixedCost(40, 10000) → 2.
// Attention: le coût réel d'une machine allumée reste 500 € : l'écart
//            mesure la faiblesse de la relaxation.
// (Indice 5 en fin de fichier.)
function computeRelaxedFixedCost(quantity: number, M: number): number {
  return undefined; // ← à remplacer
}

// TODO 6 — Production fantôme due à la tolérance d'intégralité.
// Objectif : un solveur accepte qu'une binaire vaille INTEGRALITY_TOLERANCE
//            au lieu de 0 ; calculer la quantité maximale que q ≤ M·y laisse
//            alors produire à une machine « éteinte ».
// Entrée   : M, la borne de la liaison, ex. 1e9.
// Sortie   : un nombre, la production permise.
// Exemple  : computePhantomProduction(1e9) → 1000 (à 1e-6 près) ;
//            computePhantomProduction(100) → environ 0,0001.
// (Indice 6 en fin de fichier.)
function computePhantomProduction(M: number): number {
  return undefined; // ← à remplacer
}

// ─── 3. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
const M = computeTightM();
console.log("M serré déduit des données :", M);

printTitle("Formulation linéaire vs logique métier");
const testPairs: [number, number][] = [[0, 0], [0, 5], [1, 0], [1, 5], [1, 10], [1, 40], [1, 100], [1, 120], [0.5, 30]];
console.table(testPairs.map(([y, quantity]) => ({
  y, quantity,
  formulation: satisfiesLinking(y, quantity, M),
  businessLogic: satisfiesBusinessLogic(y, quantity, M)
})));

printTitle("Relaxation : coût fixe compté pour produire q = 40");
console.table([100, 1000, 10000].map(mValue => ({
  M: mValue,
  yMin: computeMinimalRelaxedY(40, mValue),
  countedFixedCost: computeRelaxedFixedCost(40, mValue),
  underestimation: FIXED_COST - computeRelaxedFixedCost(40, mValue)
})));

printTitle("Tolérance d'intégralité (y = 1e-6 considéré comme 0)");
console.table([100, 1e4, 1e9].map(mValue => ({ M: mValue, phantomProduction: computePhantomProduction(mValue) })));

// QUESTIONS :
//  a) Pourquoi (y = 1, q = 0) est-il interdit ? Que faudrait-il changer
//     pour l'autoriser, et que perdrait-on ?
//  b) Que se passerait-il avec M = 80 pour le couple (1, 90) ?
//     Pourquoi est-ce une erreur particulièrement dangereuse ?

// ─── 4. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
printTitle("Auto-vérification");
check("M serré = 100", () => computeTightM(), 100);
check("(0, 0) autorisé", () => satisfiesLinking(0, 0, 100), true);
check("(0, 5) interdit : éteinte mais produit", () => satisfiesLinking(0, 5, 100), false);
check("(1, 5) interdit : sous le minimum technique", () => satisfiesLinking(1, 5, 100), false);
check("(1, 40) autorisé", () => satisfiesLinking(1, 40, 100), true);
check("(1, 120) interdit : au-delà de M", () => satisfiesLinking(1, 120, 100), false);
check("(0.5, 30) interdit : y non binaire", () => satisfiesLinking(0.5, 30, 100), false);
check("formulation = logique sur tous les couples", () =>
  testPairs.every(([y, quantity]) => {
    const formulation = satisfiesLinking(y, quantity, 100);
    return typeof formulation === "boolean" && formulation === satisfiesBusinessLogic(y, quantity, 100);
  }), true);
check("y minimal relaxé (q=40, M=100) = 0.4", () => computeMinimalRelaxedY(40, 100), 0.4);
check("y minimal relaxé (q=40, M=10000) = 0.004", () => computeMinimalRelaxedY(40, 10000), 0.004);
check("coût fixe compté (M=100) = 200 €", () => computeRelaxedFixedCost(40, 100), 200);
check("coût fixe compté (M=10000) = 2 €", () => computeRelaxedFixedCost(40, 10000), 2);
check("production fantôme avec M=1e9 = 1000", () => computePhantomProduction(1e9), 1000, 1e-6);
printSummary();

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (computeTightM) — la machine produit au plus
//   HOURLY_CAPACITY × SHIFT_HOURS, et le client n'achète jamais plus de
//   MAX_CUSTOMER_DEMAND. Les deux bornes sont valides : laquelle est la
//   plus serrée ? (Math.min ou Math.max ?)
//
// Indice 2 (satisfiesLinking) — domaine : (y === 0 || y === 1) && quantity >= 0 ;
//   liaison : QMIN * y <= quantity  ET  quantity <= M * y.
//
// Indice 3 (satisfiesBusinessLogic) — trois cas avec des if :
//   si y === 0 → quantity doit valoir 0 ;
//   si y === 1 → quantity entre QMIN et capacity (inclus) ;
//   sinon      → false (y non binaire).
//
// Indice 4 (computeMinimalRelaxedY) — résous quantity ≤ M·y en y.
//
// Indice 5 (computeRelaxedFixedCost) — FIXED_COST × y minimal : réutilise
//   computeMinimalRelaxedY.
//
// Indice 6 (computePhantomProduction) — remplace y par
//   INTEGRALITY_TOLERANCE dans quantity ≤ M·y.
