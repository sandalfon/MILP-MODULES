/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 4 — Exercice 4.3 : Coût fixe d'ouverture — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-04-modelisation-avancee/module-04-modelisation-avancee.md (§5)
 *  Lancer : node modules/module-04-modelisation-avancee/corriges/ex4-3-cout-fixe.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Formulation complète du problème :
 *     MIN   Σ_k ( F_k · y_k + c_k · q_k )
 *     s.c.  Σ_k q_k = DEMAND                 (satisfaire la demande)
 *           0 ≤ q_k ≤ cap_k · y_k            (liaison Big-M, M = cap_k)
 *           y_k ∈ {0,1}
 *  C'est une MILP : 3 binaires (ouvrir ?) + 3 continues (combien ?).
 *
 *  Stratégie de résolution par décomposition :
 *  1. On énumère les 2³ = 8 vecteurs d'ouverture y.
 *  2. Pour un y FIXÉ, il reste un problème continu :
 *        MIN Σ c_k q_k  s.c.  Σ q_k = D,  0 ≤ q_k ≤ cap_k (usines ouvertes)
 *     Le remplissage glouton par coût unitaire croissant est OPTIMAL ici.
 *     Argument d'échange : si une unité était produite dans une usine
 *     chère alors qu'une usine moins chère a encore de la capacité, la
 *     déplacer ferait baisser le coût. À l'optimum, on remplit donc
 *     d'abord les usines les moins chères. (Attention : ce raisonnement
 *     ne vaut plus s'il y a des minimums techniques QMIN, ou plusieurs
 *     clients avec des coûts de transport différents.)
 *  3. On garde l'ouverture de coût total minimal.
 *
 *  Résultat : ouvrir U2 et U3 pour un coût de 800 €. L'usine U1, la MOINS
 *  chère à l'unité (2 €), n'est PAS ouverte : son coût fixe de 400 € ne
 *  se rentabilise pas sur les 60 unités qu'elle pourrait produire. La
 *  « bonne idée » naïve (ouvrir les usines les moins chères à l'unité,
 *  U1 + U3) coûte 890 € : le coût fixe change complètement la décision.
 *
 *  La vérification indépendante (findViolatedConstraints) recontrôle les
 *  contraintes de la formulation sur la solution retenue : demande
 *  satisfaite, et q_k ≤ cap_k · y_k pour chaque usine.
 *
 *  Pièges fréquents
 *  - Renvoyer une répartition quand la capacité ouverte est insuffisante :
 *    il faut la marquer IRRÉALISABLE (null), sinon on « satisfait » une
 *    demande qu'on ne peut pas produire.
 *  - Oublier le coût fixe d'une usine ouverte qui ne produit rien
 *    (cas « toutes ouvertes ») : y_k = 1 coûte F_k même si q_k = 0.
 *  - Comparer des flottants avec === pour la demande : on utilise une
 *    petite tolérance (1e-9).
 *
 *  Réponses aux questions
 *  a) Avec un coût fixe de U1 abaissé à 300 €, l'ouverture U1 + U2
 *     coûte 300 + 150 + 120 + 200 = 770 € < 800 € : l'optimum bascule.
 *  b) Dans la solution « toutes ouvertes », U2 ne produit rien mais
 *     son coût fixe est payé : le modèle le permet (q ≤ cap·y n'impose
 *     pas q > 0), mais l'optimisation l'évite d'elle-même, car fermer
 *     U2 économise 150 €.
 *  c) Voir le point 2 ci-dessus : argument d'échange. Toute unité
 *     produite dans une usine plus chère qu'une usine ouverte non saturée
 *     pourrait y être déplacée en faisant baisser le coût.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Factory = { id: string; fixedCost: number; unitCost: number; capacity: number };
type Opening = Record<string, number>;    // y = { U1: 0|1, U2: 0|1, U3: 0|1 }
type Production = Record<string, number>;   // q = { U1: q1, U2: q2, U3: q3 }
type Solution = { selectedIds: string[]; production: Production; cost: number }; // selectedIds : usines ouvertes

const FACTORIES: Factory[] = [
  { id: "U1", fixedCost: 400, unitCost: 2, capacity: 60 },
  { id: "U2", fixedCost: 150, unitCost: 5, capacity: 70 },
  { id: "U3", fixedCost: 250, unitCost: 3, capacity: 50 }
];
const DEMAND: number = 100;
const EPS: number = 1e-9;

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────
function enumerateAllOpenings(): Opening[] {
  const openings: Opening[] = [];
  for (let mask = 0; mask < 2 ** FACTORIES.length; mask++) {
    const y: Opening = {};
    FACTORIES.forEach((factory, i) => { y[factory.id] = (mask & (1 << i)) !== 0 ? 1 : 0; });
    openings.push(y);
  }
  return openings;
}
const listOpenFactoryIds = (y: Opening): string[] =>
  FACTORIES.filter(factory => y[factory.id] === 1).map(factory => factory.id);

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Σ cap_k · y_k
function computeOpenCapacity(y: Opening): number {
  return FACTORIES.reduce((sum, factory) => sum + factory.capacity * y[factory.id], 0);
}

// Pour une ouverture y fixée : répartition de coût minimal, ou null.
function allocateProduction(y: Opening): Production | null {
  if (computeOpenCapacity(y) < DEMAND - EPS) return null; // irréalisable
  const production: Production = {};
  FACTORIES.forEach(factory => { production[factory.id] = 0; });   // fermées → 0
  let remainingDemand = DEMAND;
  const openFactoriesByUnitCost = FACTORIES
    .filter(factory => y[factory.id] === 1)
    .sort((firstFactory, secondFactory) => firstFactory.unitCost - secondFactory.unitCost); // moins chère d'abord
  for (const factory of openFactoriesByUnitCost) {
    production[factory.id] = Math.min(factory.capacity, remainingDemand);
    remainingDemand -= production[factory.id];
  }
  return production;
}

// Σ F_k · y_k + c_k · q_k
function computeTotalCost(y: Opening, production: Production): number {
  return FACTORIES.reduce(
    (sum, factory) => sum + factory.fixedCost * y[factory.id] + factory.unitCost * production[factory.id],
    0
  );
}

// Contrôle indépendant des contraintes de la formulation.
function findViolatedConstraints(y: Opening, production: Production): string[] {
  const violations: string[] = [];
  for (const factory of FACTORIES) {
    const quantity = production[factory.id];
    if (quantity < 0 || quantity > factory.capacity * y[factory.id] + EPS) {
      violations.push(`liaison_${factory.id}`);
    }
  }
  const total = FACTORIES.reduce((sum, factory) => sum + production[factory.id], 0);
  if (Math.abs(total - DEMAND) > EPS) violations.push("demande");
  return violations;
}

// Énumère les 8 ouvertures, garde la moins chère.
function findBestOpening(): Solution | null {
  let bestSolution: Solution | null = null;
  for (const y of enumerateAllOpenings()) {
    const production = allocateProduction(y);
    if (production === null) continue;                 // ouverture irréalisable
    const cost = computeTotalCost(y, production);
    if (bestSolution === null || cost < bestSolution.cost) {
      bestSolution = { selectedIds: listOpenFactoryIds(y), production, cost };
    }
  }
  return bestSolution;
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Les 8 ouvertures possibles");
console.table(enumerateAllOpenings().map(y => {
  const production = allocateProduction(y);
  return {
    openFactories: listOpenFactoryIds(y).join(", ") || "(aucune)",
    capacity: computeOpenCapacity(y),
    production: production
      ? FACTORIES.map(factory => `${factory.id}=${production[factory.id]}`).join(" ")
      : "irréalisable",
    cost: production ? computeTotalCost(y, production) : "—"
  };
}));

const optimum = findBestOpening();
console.log("Optimum :", optimum);
if (optimum) {
  const optimalOpening = Object.fromEntries(FACTORIES.map(factory => [factory.id, optimum.selectedIds.includes(factory.id) ? 1 : 0]));
  console.log("Contrôle indépendant :", findViolatedConstraints(optimalOpening, optimum.production), "(vide = OK)");
}

const naiveOpening: Opening = { U1: 1, U2: 0, U3: 1 };
const naiveProduction = allocateProduction(naiveOpening);
console.log("Heuristique naïve (les moins chères à l'unité : U1 + U3) :",
  naiveProduction === null ? "irréalisable" : computeTotalCost(naiveOpening, naiveProduction), "€");

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("capacité ouverte U1+U2 = 130", () => computeOpenCapacity({ U1: 1, U2: 1, U3: 0 }), 130);
check("U1 seule : irréalisable", () => allocateProduction({ U1: 1, U2: 0, U3: 0 }), null);
check("répartition U2+U3 : U3 d'abord", () => allocateProduction({ U1: 0, U2: 1, U3: 1 }),
  { U1: 0, U2: 50, U3: 50 });
check("répartition toutes ouvertes", () => allocateProduction({ U1: 1, U2: 1, U3: 1 }),
  { U1: 60, U2: 0, U3: 40 });
check("coût U1+U2 = 870", () => computeTotalCost({ U1: 1, U2: 1, U3: 0 }, { U1: 60, U2: 40, U3: 0 }), 870);
check("coût fixe payé même si q = 0", () => computeTotalCost({ U1: 1, U2: 1, U3: 1 }, { U1: 60, U2: 0, U3: 40 }), 1040);
check("vérif : production dans une usine fermée",
  () => findViolatedConstraints({ U1: 0, U2: 1, U3: 1 }, { U1: 10, U2: 40, U3: 50 }), ["liaison_U1"]);
check("vérif : demande non satisfaite",
  () => findViolatedConstraints({ U1: 0, U2: 1, U3: 1 }, { U1: 0, U2: 40, U3: 50 }), ["demande"]);
check("vérif : dépassement de capacité",
  () => findViolatedConstraints({ U1: 0, U2: 1, U3: 1 }, { U1: 0, U2: 40, U3: 60 }), ["liaison_U3"]);
check("optimum : U2 + U3 pour 800 €", () => findBestOpening(),
  { selectedIds: ["U2", "U3"], production: { U1: 0, U2: 50, U3: 50 }, cost: 800 });
printSummary();
