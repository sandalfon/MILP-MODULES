/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 4 — Exercice 4.3 : Coût fixe d'ouverture
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-04-modelisation-avancee/module-04-modelisation-avancee.md (§5)
 *  Niveau : ★★★   Durée indicative : 60 min
 *  Lancer : node modules/module-04-modelisation-avancee/exercices/ex4-3-cout-fixe.ts
 *
 *  OBJECTIF
 *  Résoudre un petit problème d'ouverture d'usines avec coûts fixes,
 *  en combinant énumération des binaires et calcul de la production.
 *
 *  PRÉREQUIS
 *  - Exercice 4.2 : liaison q_k ≤ cap_k · y_k.
 *  - Module 1 : énumération de 2ⁿ décisions binaires (outil fourni).
 *  - TypeScript : sort, Math.min, Object.fromEntries, type « T | null »
 *    pour un résultat qui peut ne pas exister.
 *
 *  CONSIGNE
 *  Il faut produire exactement DEMAND = 100 unités. Chaque usine k a
 *  un coût fixe F_k (payé si elle est ouverte), un coût unitaire c_k
 *  et une capacité cap_k.
 *     MIN   Σ_k ( F_k · y_k + c_k · q_k )
 *     s.c.  Σ_k q_k = DEMAND ;  0 ≤ q_k ≤ cap_k · y_k ;  y_k ∈ {0,1}
 *    1. computeOpenCapacity(y) : Σ cap_k · y_k.
 *    2. allocateProduction(y) : si la capacité ouverte est insuffisante,
 *       renvoie null ; sinon remplis les usines OUVERTES par coût unitaire
 *       croissant et renvoie la production { U1: q1, U2: q2, U3: q3 }
 *       (0 pour les fermées).
 *    3. computeTotalCost(y, production) : Σ F_k · y_k + c_k · q_k.
 *    4. findViolatedConstraints(y, production) : liste des contraintes violées :
 *       "liaison_Uk" si q_k < 0 ou q_k > cap_k · y_k, et "demande" si
 *       Σ q_k ≠ DEMAND (avec la tolérance EPS).
 *    5. findBestOpening() : parcourt les 8 ouvertures, ignore les
 *       irréalisables, renvoie { selectedIds, production, cost } minimal
 *       (selectedIds = identifiants des usines ouvertes).
 *  Les indices sont regroupés en fin de fichier.
 *
 *  RÉSULTAT ATTENDU
 *  Optimum : ouvrir U2 et U3, coût total 800 €. Surprise : l'usine la
 *  moins chère à l'unité reste fermée.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Capacité ouverte.
// Objectif : calculer Σ_k cap_k · y_k, la production maximale possible avec
//            les usines ouvertes par la décision y (une usine fermée ne
//            compte pas).
// Entrée   : y, l'ouverture (0 ou 1) de chaque usine, ex. { U1: 1, U2: 1, U3: 0 }.
// Sortie   : un nombre, la capacité totale des usines ouvertes.
// Exemple  : computeOpenCapacity({ U1: 1, U2: 1, U3: 0 }) → 60 + 70 = 130.
// Attention: aucune usine ouverte → 0.
// (Indice 1 en fin de fichier.)
function computeOpenCapacity(y: Opening): number {
  return undefined; // ← à remplacer
}

// TODO 2 — Répartition de coût minimal pour une ouverture fixée.
// Objectif : une fois y fixé, il reste un problème continu : produire
//            exactement DEMAND unités au moindre coût unitaire, sans
//            dépasser la capacité des usines OUVERTES (q_k ≤ cap_k · y_k).
//            On remplit d'abord les usines les moins chères à l'unité.
// Entrée   : y, l'ouverture de chaque usine, ex. { U1: 0, U2: 1, U3: 1 }.
// Sortie   : la production de chaque usine { U1: q1, U2: q2, U3: q3 }
//            (0 pour une usine fermée), ou null si l'ouverture est
//            irréalisable (capacité ouverte < DEMAND).
// Exemple  : allocateProduction({ U1: 0, U2: 1, U3: 1 }) → { U1: 0, U2: 50, U3: 50 } (U3, à 3 €, d'abord) ;
//            allocateProduction({ U1: 1, U2: 1, U3: 1 }) → { U1: 60, U2: 0, U3: 40 } ;
//            allocateProduction({ U1: 1, U2: 0, U3: 0 }) → null (60 < 100).
// Attention: ne modifie pas l'ordre du tableau FACTORIES lui-même.
// (Indice 2 en fin de fichier.)
function allocateProduction(y: Opening): Production | null {
  return undefined; // ← à remplacer
}

// TODO 3 — Coût total d'une ouverture et d'une production.
// Objectif : calculer l'objectif Σ_k ( F_k · y_k + c_k · q_k ) : coût fixe
//            des usines ouvertes plus coût unitaire de chaque unité produite.
// Entrée   : y, l'ouverture, ex. { U1: 1, U2: 1, U3: 0 } ;
//            production, la quantité de chaque usine, ex. { U1: 60, U2: 40, U3: 0 }.
// Sortie   : un nombre, le coût total (€).
// Exemple  : computeTotalCost({ U1: 1, U2: 1, U3: 0 }, { U1: 60, U2: 40, U3: 0 })
//            → 400 + 150 + 60·2 + 40·5 = 870.
// Attention: une usine ouverte paie son coût fixe même si elle ne produit
//            rien : computeTotalCost({ U1: 1, U2: 1, U3: 1 }, { U1: 60, U2: 0, U3: 40 }) → 1040.
// (Indice 3 en fin de fichier.)
function computeTotalCost(y: Opening, production: Production): number {
  return undefined; // ← à remplacer
}

// TODO 4 — Contrôle indépendant d'une solution.
// Objectif : recontrôler, sans faire confiance à allocateProduction, les
//            contraintes de la formulation : liaison 0 ≤ q_k ≤ cap_k · y_k
//            pour chaque usine, et demande Σ_k q_k = DEMAND.
// Entrée   : y, l'ouverture, ex. { U1: 0, U2: 1, U3: 1 } ;
//            production, ex. { U1: 10, U2: 40, U3: 50 }.
// Sortie   : un tableau de noms de contraintes violées (string[]) : d'abord
//            "liaison_" + id pour chaque usine fautive, dans l'ordre de
//            FACTORIES, puis "demande" ; [] si tout est respecté.
// Exemple  : findViolatedConstraints({ U1: 0, U2: 1, U3: 1 }, { U1: 10, U2: 40, U3: 50 }) → ["liaison_U1"] ;
//            findViolatedConstraints({ U1: 0, U2: 1, U3: 1 }, { U1: 0, U2: 40, U3: 50 }) → ["demande"].
// Attention: compare des nombres à virgule avec la tolérance EPS, jamais avec ===.
// (Indice 4 en fin de fichier.)
function findViolatedConstraints(y: Opening, production: Production): string[] {
  const violations: string[] = [];
  // ... à compléter
  return undefined; // ← à remplacer par : return violations;
}

// TODO 5 — Meilleure ouverture par énumération.
// Objectif : parcourir les 2³ = 8 ouvertures possibles, calculer pour
//            chacune la répartition optimale et son coût total, et garder
//            la solution de coût minimal (résolution exacte de la MILP).
// Entrée   : aucune ; la fonction utilise les outils fournis et les TODO 2 et 3.
// Sortie   : une Solution { selectedIds, production, cost } (selectedIds =
//            identifiants des usines ouvertes), ou null si aucune ouverture
//            n'est réalisable.
// Exemple  : findBestOpening() → { selectedIds: ["U2", "U3"], production: { U1: 0, U2: 50, U3: 50 }, cost: 800 }.
// Attention: une ouverture irréalisable ne doit jamais être retenue.
// (Indice 5 en fin de fichier.)
function findBestOpening(): Solution | null {
  let bestSolution: Solution | null = null;
  // ... à compléter
  return undefined; // ← à remplacer par : return bestSolution;
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Si le coût fixe de U1 passe de 400 € à 300 €, quelle ouverture
//     devient optimale et pour quel coût ? (modifie la donnée, relance,
//     puis remets 400.)
//  b) Dans la ligne « U1, U2, U3 », une usine ne produit rien mais paie
//     son coût fixe. Le modèle l'autorise-t-il ? Pourquoi l'optimum
//     l'évite-t-il quand même ?
//  c) Pourquoi le remplissage glouton par coût unitaire est-il optimal
//     une fois l'ouverture fixée ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (computeOpenCapacity) — FACTORIES.reduce((sum, factory) => …, 0) ;
//   y[factory.id] vaut 0 ou 1.
//
// Indice 2 (allocateProduction) — étapes :
//   a) si computeOpenCapacity(y) < DEMAND - EPS → return null ;
//   b) production = { U1: 0, U2: 0, U3: 0 }, remainingDemand = DEMAND ;
//   c) trier les usines ouvertes par unitCost croissant
//      (copie : FACTORIES.filter(...).sort(...) ne modifie pas FACTORIES) ;
//   d) pour chacune : production[factory.id] = Math.min(factory.capacity, remainingDemand) ;
//      remainingDemand -= production[factory.id].
//
// Indice 3 (computeTotalCost) — un seul reduce sur FACTORIES ; pour chaque
//   usine, ajoute factory.fixedCost * y[factory.id] + factory.unitCost * production[factory.id].
//
// Indice 4 (findViolatedConstraints) — pour chaque usine (boucle for…of) :
//   violations.push(`liaison_${factory.id}`) si sa production est < 0 ou
//   > capacity · y + EPS ; puis "demande" si
//   Math.abs(Σ production − DEMAND) > EPS.
//
// Indice 5 (findBestOpening) — for (const y of enumerateAllOpenings()) ;
//   ignore y si allocateProduction(y) renvoie null (continue) ; remplace
//   bestSolution quand elle vaut null ou que le coût est plus petit.
//   Forme du résultat : { selectedIds: listOpenFactoryIds(y), production, cost }.
