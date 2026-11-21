/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 4 — Exercice 4.2 : Big-M et activation — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-04-modelisation-avancee/module-04-modelisation-avancee.md (§3 et §4)
 *  Lancer : node modules/module-04-modelisation-avancee/corriges/ex4-2-big-m-activation.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  1. La liaison  QMIN·y ≤ q ≤ M·y
 *     satisfiesLinking() n'utilise que des inégalités linéaires (plus le
 *     domaine y ∈ {0,1}, q ≥ 0) : c'est ce que voit le solveur.
 *     satisfiesBusinessLogic() écrit la règle « en français » avec un
 *     if/else. La comparaison des deux sur une série de couples (y, q)
 *     montre qu'ils sont d'accord : la formulation est exacte.
 *
 *  2. Le M serré
 *     M doit majorer TOUTE production légitime. La production est
 *     limitée à la fois par la machine (12,5 u/h × 8 h = 100) et par ce
 *     que le client peut acheter (150). La plus petite de ces bornes
 *     reste valide : M = min(100, 150) = 100. Prendre 150 serait valide
 *     mais moins serré ; prendre 80 serait INVALIDE (on interdirait de
 *     produire 90, ce qui est légitime).
 *
 *  3. Effet de M sur la relaxation
 *     Dans la relaxation, y devient continu dans [0, 1]. Pour produire
 *     q = 40, la contrainte q ≤ M·y impose seulement y ≥ q / M.
 *     Le solveur, qui minimise les coûts, choisit le plus petit y
 *     possible et ne « paie » que FIXED_COST × q / M :
 *        M = 100    → y = 0,4   → coût fixe compté 200 €  (réel : 500 €)
 *        M = 1 000  → y = 0,04  → 20 €
 *        M = 10 000 → y = 0,004 → 2 €
 *     Plus M est grand, plus la relaxation sous-estime le coût réel :
 *     la borne qu'elle fournit est faible, et le Branch and Bound
 *     (module 5) élague moins.
 *
 *  4. Effet numérique
 *     Un solveur accepte qu'une binaire vaille 1e-6 au lieu de 0
 *     (tolérance d'intégralité). Avec M = 1e9, y = 1e-6 autorise
 *     q ≤ 1 000 : la machine « éteinte » produit, sans coût fixe !
 *
 *  Pièges fréquents
 *  - Oublier la borne basse QMIN·y ≤ q : (y = 1, q = 5) serait accepté.
 *  - Calculer M avec Math.max au lieu de Math.min : valide, mais pas serré.
 *  - Écrire q ≤ M·y avec M = Infinity : Infinity × 0 = NaN en JavaScript,
 *    et la contrainte n'a plus aucun sens. Les solveurs refusent aussi
 *    les coefficients infinis.
 *
 *  Réponses aux questions
 *  a) (y = 1, q = 0) est interdit : une machine allumée doit produire
 *     au moins 10. Si l'on voulait l'autoriser, on supprimerait la
 *     borne basse… et on perdrait la règle du minimum technique.
 *  b) Avec M = 80, le couple légitime (1, 90) serait refusé : M n'est
 *     plus valide. C'est une erreur silencieuse : le solveur trouve une
 *     solution, mais elle est moins bonne que la vraie.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
const QMIN: number = 10;                // minimum technique si la machine tourne
const HOURLY_CAPACITY: number = 12.5;  // unités par heure
const SHIFT_HOURS: number = 8;               // durée du poste
const MAX_CUSTOMER_DEMAND: number = 150; // le client n'achète jamais plus
const FIXED_COST: number = 500;          // coût d'allumage (€)
const INTEGRALITY_TOLERANCE: number = 1e-6;

// ─── 2. FONCTIONS ───────────────────────────────────────────────

// M serré : la plus petite borne supérieure LÉGITIME de la quantité q.
function computeTightM(): number {
  const machineCapacity = HOURLY_CAPACITY * SHIFT_HOURS; // 100
  return Math.min(machineCapacity, MAX_CUSTOMER_DEMAND);
}

// Formulation linéaire (q = quantity) : y ∈ {0,1}, q ≥ 0, QMIN·y ≤ q ≤ M·y.
function satisfiesLinking(y: number, quantity: number, M: number): boolean {
  const isInDomain = (y === 0 || y === 1) && quantity >= 0;
  return isInDomain && QMIN * y <= quantity && quantity <= M * y;
}

// Logique métier écrite « en clair », sans inégalité astucieuse.
function satisfiesBusinessLogic(y: number, quantity: number, capacity: number): boolean {
  if (y === 0) return quantity === 0;                         // éteinte → rien
  if (y === 1) return quantity >= QMIN && quantity <= capacity; // allumée → plage
  return false;                                               // y non binaire
}

// Relaxation : y ∈ [0,1]. Plus petit y compatible avec quantity ≤ M·y.
function computeMinimalRelaxedY(quantity: number, M: number): number {
  return quantity / M;
}

// Coût fixe « vu » par la relaxation pour produire quantity.
function computeRelaxedFixedCost(quantity: number, M: number): number {
  return FIXED_COST * computeMinimalRelaxedY(quantity, M);
}

// Production permise à une machine « éteinte » à cause de la tolérance.
function computePhantomProduction(M: number): number {
  return M * INTEGRALITY_TOLERANCE;
}

// ─── 3. PROGRAMME PRINCIPAL ─────────────────────────────────────
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

// ─── 4. AUTO-VÉRIFICATION ───────────────────────────────────────
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
