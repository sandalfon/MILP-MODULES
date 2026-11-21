/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 6 — Exercice 6.3 : Variables entières et coût fixe
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-06-glpk/module-06-glpk.md (§4 et §7) + module 4 (Big-M)
 *  Niveau : ★★★   Durée indicative : 1 h
 *  Lancer : node modules/module-06-glpk/exercices/ex6-3-entiers-et-cout-fixe.ts
 *
 *  OBJECTIF
 *  Écrire une vraie MILP « mixte » : des binaires d'activation (ouvrir
 *  une usine) liés à des variables entières (quantités produites),
 *  puis comparer la solution de GLPK à une énumération de référence.
 *
 *  PRÉREQUIS
 *  - Module 4 : lier activité et quantité, min·y ≤ q ≤ cap·y (Big-M).
 *  - Exercices 6.1 et 6.2 : modèle glpk.js, types de bornes, lecture.
 *  - Cours §4 : passer les variables à gauche (q − cap·y ≤ 0).
 *  - TypeScript : flatMap, Object.fromEntries, gabarits `y_${id}`,
 *    type Result de glpk.js, union discriminée (EnumeratedPlan).
 *
 *  CONSIGNE
 *  Trois usines doivent produire ensemble exactement DEMAND unités, au
 *  coût total minimal (coûts fixes d'ouverture + coûts unitaires).
 *  Variables : y_U (binaire, usine ouverte) et q_U (entière, unités).
 *    1. buildModel(factories, demand) :
 *         MIN  Σ fixedCost·y_U + unitCost·q_U
 *         s.c. "demande"     : Σ q_U = demand                  (GLP_FX)
 *              "capacite_U"  : q_U − capacity·y_U ≤ 0          (GLP_UP, ub 0)
 *              "minimum_U"   : q_U − minimum·y_U  ≥ 0          (GLP_LO, lb 0)
 *         binaries : les y_U ; generals : les q_U.
 *       Respecte les noms : "y_U1", "q_U1", "capacite_U1", "minimum_U1"…
 *       L'objectif liste, pour chaque usine, y puis q (6 entrées).
 *    2. readSolution(factories, solverOutput) → { openIds, production, cost } :
 *       y lu avec le seuil 0,5, q arrondi à l'entier le plus proche, cost = z.
 *    3. validatePlan(factories, demand, plan) → liste d'erreurs, messages :
 *         `demande non couverte : ${total} ≠ ${demand}`
 *         `${id} fermée mais produit ${quantity}`
 *         `${id} dépasse sa capacité`
 *         `${id} sous son minimum`
 *
 *  RÉSULTAT ATTENDU
 *  U1 et U3 ouvertes, production { U1: 80, U2: 0, U3: 40 }, coût 760,
 *  identique à l'énumération.
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import {
  check,
  checkAsync,
  printSummary,
  printTitle,
} from "../../../lib/verif.ts";

const glpk = await GLPK();

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
type Factory = {
  id: string;
  capacity: number;
  fixedCost: number;
  unitCost: number;
  minimum: number;
};
// Production : identifiant de l'usine → unités produites.
type Production = Record<string, number>;
type Plan = { openIds: string[]; production: Production };
// Plan lu dans la solution du solveur, avec son coût z.
type Solution = Plan & { cost: number };
// Ligne de l'énumération : réalisable (avec coût et production) ou non.
type EnumeratedPlan =
  | { openIds: string[]; isFeasible: false; cost: null; production?: undefined }
  | {
      openIds: string[];
      isFeasible: true;
      cost: number;
      production: Production;
    };
// Modèle glpk.js dont les binaires et les entières sont toujours renseignés.
type Model = LP & { binaries: string[]; generals: string[] };
type GlpkConstraint = LP["subjectTo"][number];
// Réponse de glpk.solve (type fourni par glpk.js).
type SolverOutput = Result;

const FACTORIES: Factory[] = [
  { id: "U1", capacity: 80, fixedCost: 300, unitCost: 2, minimum: 20 },
  { id: "U2", capacity: 60, fixedCost: 200, unitCost: 3, minimum: 20 },
  { id: "U3", capacity: 50, fixedCost: 100, unitCost: 5, minimum: 20 },
];
const DEMAND: number = 120;

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────

// Énumération de référence : pour chaque combinaison d'usines ouvertes,
// on donne d'abord à chaque usine ouverte son minimum, puis on remplit
// le reste de la demande par coût unitaire croissant.
// À ouvertures fixées, cette répartition est optimale.
function enumerateOpenings(
  factories: Factory[],
  demand: number,
): EnumeratedPlan[] {
  const plans: EnumeratedPlan[] = [];
  for (let mask = 0; mask < 2 ** factories.length; mask++) {
    // Le bit i du masque indique si l'usine i est ouverte.
    const openFactories = factories.filter((_, i) => (mask & (1 << i)) !== 0);
    const openIds = openFactories.map((factory) => factory.id);
    const totalMinimum = openFactories.reduce(
      (sum, factory) => sum + factory.minimum,
      0,
    );
    const totalCapacity = openFactories.reduce(
      (sum, factory) => sum + factory.capacity,
      0,
    );
    if (totalMinimum > demand || totalCapacity < demand) {
      plans.push({ openIds, isFeasible: false, cost: null });
      continue;
    }
    const production: Production = Object.fromEntries(
      openFactories.map((factory) => [factory.id, factory.minimum]),
    );
    let remaining = demand - totalMinimum;
    const byUnitCost = [...openFactories].sort(
      (firstFactory, secondFactory) =>
        firstFactory.unitCost - secondFactory.unitCost,
    );
    for (const factory of byUnitCost) {
      const addedUnits = Math.min(
        remaining,
        factory.capacity - factory.minimum,
      );
      production[factory.id] += addedUnits;
      remaining -= addedUnits;
    }
    const cost = openFactories.reduce(
      (sum, factory) =>
        sum + factory.fixedCost + factory.unitCost * production[factory.id],
      0,
    );
    plans.push({ openIds, isFeasible: true, cost, production });
  }
  return plans;
}

// Garde-fou : un modèle sans variable fait planter GLPK (« Aborted() »).
async function solveModel(model: Model): Promise<SolverOutput | null> {
  if (!model?.objective?.vars?.length) return null;
  return glpk.solve(model, { msglev: glpk.GLP_MSG_OFF, presol: true });
}

// Recalcul du coût à partir du plan seul.
function computePlanCost(factories: Factory[], plan: Plan): number {
  return factories.reduce(
    (sum, factory) =>
      sum +
      (plan.openIds.includes(factory.id) ? factory.fixedCost : 0) +
      factory.unitCost * (plan.production[factory.id] ?? 0),
    0,
  );
}

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Construire la MILP « usines à coût fixe ».
// Objectif : écrire un modèle mixte où la binaire y_U (usine U ouverte)
//            active la variable entière q_U (unités produites par U) :
//              MIN  Σ fixedCost·y_U + unitCost·q_U
//              s.c. "demande"      : Σ q_U = demand
//                   "capacite_<id>" : q_U − capacity·y_U ≤ 0  (fermée ⇒ q = 0)
//                   "minimum_<id>"  : q_U − minimum·y_U  ≥ 0  (ouverte ⇒ q ≥ minimum)
//            GLPK n'accepte qu'une constante à droite : les variables y sont
//            donc passées à gauche.
// Entrée   : factories, ex. FACTORIES (U1 : capacité 80, coût fixe 300,
//            coût unitaire 2, minimum 20…) ; demand, ex. DEMAND = 120.
// Sortie   : un Model en minimisation avec :
//            - objective.vars : pour chaque usine, `y_<id>` (coef fixedCost)
//              puis `q_<id>` (coef unitCost), soit 6 termes ;
//            - subjectTo : "demande" (type GLP_FX), puis pour chaque usine
//              `capacite_<id>` (GLP_UP, ub 0) et `minimum_<id>` (GLP_LO, lb 0),
//              soit 7 contraintes ;
//            - binaries : les y (["y_U1", "y_U2", "y_U3"]) ;
//              generals : les q (["q_U1", "q_U2", "q_U3"]).
// Exemple  : la contrainte "capacite_U1" de buildModel(FACTORIES, DEMAND) a pour
//            vars [{ name: "q_U1", coef: 1 }, { name: "y_U1", coef: -80 }],
//            type GLP_UP et ub 0 ; une fois résolu : coût optimal 760.
// Attention: le coefficient de y est NÉGATIF (q − 80·y ≤ 0) ; sans le signe
//            moins, le modèle force q = y = 0 et devient infaisable. Les q vont
//            dans generals, pas dans binaries.
// (Indice 1 en fin de fichier.)
function buildModel(factories: Factory[], demand: number): Model {
  const objectiveTerms = factories.flatMap((factory) => [
    { name: `y_${factory.id}`, coef: factory.fixedCost },
    { name: `q_${factory.id}`, coef: factory.unitCost },
  ]);
  const subjectTo: GlpkConstraint[] = [
    {
      name: "demande",
      vars: factories.map((factory) => ({ name: `q_${factory.id}`, coef: 1 })),
      bnds: { type: glpk.GLP_FX, ub: demand, lb: demand },
    },
  ];
  for (const factory of factories) {
    subjectTo.push({
        name: `capacite_${factory.id}`,
      vars: [{ name: `q_${factory.id}`, coef: 1 }, { name: `y_${factory.id}`, coef: -factory.capacity }],
         bnds:{ type: glpk.GLP_UP, lb: 0, ub: 0 }})



  subjectTo.push({
    name: `minimum_${factory.id}`,
    vars: [{ name: `q_${factory.id}`, coef: 1 }, { name: `y_${factory.id}`, coef: -factory.minimum }],
    bnds:{ type: glpk.GLP_LO, lb: 0, ub: 0 }});

  };
  const binaries = factories.map(factory => `y_${factory.id}`)
  const generals = factories.map(factory => `q_${factory.id}`)
  return   {
    name: "usines_cout_fixe",
    objective: { direction: glpk.GLP_MIN, name: "cout_total", vars: objectiveTerms },
    subjectTo,
    binaries,
    generals
  }; // ← à remplacer
}

// TODO 2 — Lire la solution du solveur.
// Objectif : traduire les variables renvoyées par GLPK en un plan lisible :
//            quelles usines sont ouvertes, combien chacune produit, et à quel coût.
// Entrée   : factories, ex. FACTORIES ; solverOutput, la réponse de glpk.solve,
//            dont on lit solverOutput.result.vars, ex. { y_U1: 1, q_U1: 80,
//            y_U2: 0, q_U2: 0, y_U3: 1, q_U3: 40 }, et solverOutput.result.z (ex. 760).
// Sortie   : une Solution { openIds, production, cost } :
//            - openIds : les id des usines dont y_<id> > 0.5, dans l'ordre de factories ;
//            - production : id → q_<id> arrondi à l'entier le plus proche,
//              pour TOUTES les usines (0 si la variable est absente) ;
//            - cost : la valeur z de l'objectif.
// Exemple  : avec la réponse ci-dessus → { openIds: ["U1", "U3"],
//            production: { U1: 80, U2: 0, U3: 40 }, cost: 760 }.
// Attention: une binaire se lit avec le seuil 0,5, une entière s'arrondit
//            (le solveur peut renvoyer 79.9999999).
// (Indice 2 en fin de fichier.)
function readSolution(
  factories: Factory[],
  solverOutput: SolverOutput,
): Solution {
   const vars = solverOutput.result.vars;
  const openIds = factories.filter(factory => (vars[`y_${factory.id}`] ?? 0) > 0.5).map(factory => factory.id)
  const production = Object.fromEntries(factories.map(factory => [factory.id, Math.round(vars[`q_${factory.id}`] ??0)]))
  const cost = solverOutput.result.z
  return { openIds, production, cost }; // ← à remplacer
}

// TODO 3 — Vérification indépendante d'un plan.
// Objectif : contrôler un plan { openIds, production } sans réutiliser le
//            modèle : la demande est-elle couverte, chaque usine respecte-t-elle
//            son état (fermée ⇒ rien), sa capacité et son minimum ?
// Entrée   : factories, ex. FACTORIES ; demand, ex. 120 ; plan, ex.
//            { openIds: ["U1"], production: { U1: 80, U2: 40 } }.
// Sortie   : la liste des messages d'erreur (string[]), vide si le plan est
//            valide. Dans l'ordre : d'abord la demande, puis pour chaque usine
//            (dans l'ordre de factories) : fermée mais quantité > 0 ; ouverte
//            et quantité > capacity ; ouverte et quantité < minimum.
// Exemple  : validatePlan(FACTORIES, 120, { openIds: ["U1"], production: { U1: 80, U2: 40 } })
//            → ["U2 fermée mais produit 40"] ;
//            validatePlan(FACTORIES, 120, { openIds: ["U1", "U3"], production: { U1: 80, U3: 10 } })
//            → ["demande non couverte : 90 ≠ 120", "U3 sous son minimum"].
// Attention: une usine absente de plan.production produit 0 (ici U2 dans le
//            second exemple) ; les textes des messages sont ceux de la consigne.
// (Indice 3 en fin de fichier.)
function validatePlan(
  factories: Factory[],
  demand: number,
  plan: Plan,
): string[] {
  const errors: string[] = [];
  const total = factories.reduce((sum, factory) => sum + (plan.production[factory.id] ?? 0), 0);
  if (total !== demand) errors.push(`demande non couverte : ${total} ≠ ${demand}`);
  for (const factory of factories) {
    const quantity = plan.production[factory.id] ?? 0;
    const isOpen = plan.openIds.includes(factory.id);
    if (!isOpen && quantity > 0) errors.push(`${factory.id} fermée mais produit ${quantity}`);
    if (isOpen && quantity > factory.capacity) errors.push(`${factory.id} dépasse sa capacité`);
     if (isOpen && quantity < factory.minimum) errors.push(`${factory.id} sous son minimum`);
  }

  return errors;
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
printTitle("Référence : énumération des 8 combinaisons d'ouverture");
const plans = enumerateOpenings(FACTORIES, DEMAND);
console.table(
  plans.map((enumeratedPlan) => ({
    openIds: enumeratedPlan.openIds.join("+") || "(aucune)",
    isFeasible: enumeratedPlan.isFeasible,
    cost: enumeratedPlan.cost ?? "—",
    production: enumeratedPlan.production
      ? JSON.stringify(enumeratedPlan.production)
      : "—",
  })),
);
const bestEnumerated = plans
  .filter((enumeratedPlan) => enumeratedPlan.isFeasible)
  .reduce((best, candidate) => (candidate.cost < best.cost ? candidate : best));
console.log(
  "Optimum par énumération :",
  bestEnumerated.openIds,
  bestEnumerated.cost,
);

printTitle("Résolution avec GLPK");
let glpkPlan: Solution | null = null;
try {
  const solverOutput = await solveModel(buildModel(FACTORIES, DEMAND));
  if (solverOutput?.result.status === glpk.GLP_OPT) {
    glpkPlan = readSolution(FACTORIES, solverOutput);
    console.log("Plan GLPK :", glpkPlan);
    console.log(
      "Vérification :",
      validatePlan(FACTORIES, DEMAND, glpkPlan).join(" ; ") || "OK",
    );
    console.log("Coût recalculé :", computePlanCost(FACTORIES, glpkPlan));
  } else {
    console.log(
      "Pas de solution optimale. Statut :",
      solverOutput?.result.status,
    );
  }
} catch (error) {
  console.log("Erreur de résolution :", (error as Error).message);
}

// QUESTIONS :
//  a) L'usine U3 a le coût unitaire le plus élevé. Pourquoi est-elle
//     pourtant ouverte dans la solution optimale ?
//  b) Retire les q de `generals` (ils deviennent continus). La solution
//     change-t-elle ? Qu'est-ce qui rend ce problème combinatoire ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
printTitle("Auto-vérification");
check(
  "6 variables dans l'objectif",
  () => buildModel(FACTORIES, DEMAND).objective.vars.length,
  6,
);
check(
  "3 binaires y et 3 entières q",
  () => {
    const model = buildModel(FACTORIES, DEMAND);
    return [model.binaries, model.generals];
  },
  [
    ["y_U1", "y_U2", "y_U3"],
    ["q_U1", "q_U2", "q_U3"],
  ],
);
check(
  "7 contraintes (demande + 2 par usine)",
  () => buildModel(FACTORIES, DEMAND).subjectTo.length,
  7,
);
check(
  "capacité U1 : q_U1 − 80·y_U1 ≤ 0",
  () => {
    const capacityU1 = buildModel(FACTORIES, DEMAND).subjectTo.find(
      (constraint) => constraint.name === "capacite_U1",
    );
    if (!capacityU1)
      throw new Error("contrainte « capacite_U1 » absente du modèle");
    return [capacityU1.vars, capacityU1.bnds.type, capacityU1.bnds.ub];
  },
  [
    [
      { name: "q_U1", coef: 1 },
      { name: "y_U1", coef: -80 },
    ],
    glpk.GLP_UP,
    0,
  ],
);
check(
  "vérif : U2 fermée mais produit",
  () =>
    validatePlan(FACTORIES, DEMAND, {
      openIds: ["U1"],
      production: { U1: 80, U2: 40 },
    }),
  ["U2 fermée mais produit 40"],
);
check(
  "vérif : demande et minimum",
  () =>
    validatePlan(FACTORIES, DEMAND, {
      openIds: ["U1", "U3"],
      production: { U1: 80, U3: 10 },
    }),
  ["demande non couverte : 90 ≠ 120", "U3 sous son minimum"],
);
await checkAsync(
  "GLPK : U1 + U3 ouvertes, coût 760",
  async () => {
    const solverOutput = await solveModel(buildModel(FACTORIES, DEMAND));
    if (!solverOutput)
      throw new Error(
        "modèle incomplet : buildModel ne renvoie pas encore de variables",
      );
    const solution = readSolution(FACTORIES, solverOutput);
    return [solution.openIds, solution.production, solution.cost];
  },
  [["U1", "U3"], { U1: 80, U2: 0, U3: 40 }, 760],
);
check(
  "GLPK et énumération donnent le même coût",
  () => glpkPlan?.cost === bestEnumerated.cost,
  true,
);
check(
  "plan GLPK validé indépendamment",
  () =>
    glpkPlan ? validatePlan(FACTORIES, DEMAND, glpkPlan) : ["pas de plan GLPK"],
  [],
);
printSummary();

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (buildModel) — structure possible :
//   const objectiveTerms = factories.flatMap(factory => [
//     { name: `y_${factory.id}`, coef: … }, { name: `q_${factory.id}`, coef: … } ]);
//   const subjectTo: GlpkConstraint[] = [
//     { name: "demande", vars: …, bnds: { type: glpk.GLP_FX, … } } ];
//   for (const factory of factories) {
//     subjectTo.push({ name: `capacite_${factory.id}`, vars: [q coef 1, y coef −capacity], bnds: ≤ 0 });
//     subjectTo.push({ name: `minimum_${factory.id}`,  vars: [q coef 1, y coef −minimum],  bnds: ≥ 0 });
//   }
//   return { name, objective: { direction: glpk.GLP_MIN, … }, subjectTo, binaries, generals };
//
// Indice 2 (readSolution) — factories.filter(…).map(factory => factory.id) pour
//   openIds ; Object.fromEntries(factories.map(factory => [factory.id, Math.round(…)]))
//   pour production ; (vars[`q_${factory.id}`] ?? 0) remplace une valeur absente par 0.
//
// Indice 3 (validatePlan) — total = factories.reduce((sum, factory) => sum + (plan.production[factory.id] ?? 0), 0) ;
//   puis une boucle for…of sur factories, avec plan.openIds.includes(factory.id)
//   pour savoir si l'usine est ouverte.
