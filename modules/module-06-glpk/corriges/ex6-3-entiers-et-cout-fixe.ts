/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 6 — Exercice 6.3 : Variables entières et coût fixe — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-06-glpk/module-06-glpk.md (§4 et §7) + module 4 (Big-M)
 *  Lancer : node modules/module-06-glpk/corriges/ex6-3-entiers-et-cout-fixe.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Deux familles de variables pour chaque usine u :
 *    y_u ∈ {0,1}  ouverture         → binaries
 *    q_u ∈ ℤ, ≥ 0 unités produites  → generals
 *  On les nomme "y_U1", "q_U1"… : un préfixe par famille évite toute
 *  collision de noms et rend le texte LP lisible.
 *
 *  Formulation
 *    MIN  Σ_u fixe_u · y_u + unitaire_u · q_u
 *    s.c. Σ_u q_u = demande                       (GLP_FX)
 *         q_u − cap_u · y_u ≤ 0   pour chaque u   (GLP_UP, ub 0)
 *         q_u − min_u · y_u ≥ 0   pour chaque u   (GLP_LO, lb 0)
 *  Les deux dernières lignes traduisent « y_u = 0 ⇒ q_u = 0 » et
 *  « y_u = 1 ⇒ min_u ≤ q_u ≤ cap_u ». La capacité sert de « M » dans
 *  la formulation Big-M. C'est le M le plus serré possible : aucune
 *  usine ne peut produire plus que sa capacité.
 *
 *  Passer les variables à gauche
 *  GLPK n'accepte qu'une CONSTANTE à droite. « q ≤ 80·y » devient
 *  donc « 1·q + (−80)·y ≤ 0 » : le coefficient de y est NÉGATIF.
 *
 *  Résultat : ouvrir U1 et U3, produire 80 en U1 et 40 en U3, pour un
 *  coût de 760. Détail : fixes 300 + 100, variables 80×2 + 40×5.
 *  L'énumération des 8 combinaisons d'ouverture (fournie) donne le
 *  même optimum. U1 + U2 coûte 780 ; U2 + U3 et U1 seule ne peuvent pas
 *  couvrir la demande.
 *
 *  Pièges fréquents
 *  - Oublier le signe moins devant cap·y : la contrainte devient
 *    q + 80y ≤ 0, ce qui force q = y = 0. Le modèle devient infaisable.
 *  - Déclarer q dans binaries : q ne pourrait valoir que 0 ou 1.
 *  - Lire q avec un seuil 0,5 : pour un entier, on utilise Math.round.
 *
 *  Réponses aux questions
 *  a) Pourquoi l'usine U3, la plus chère à l'unité, est-elle ouverte ?
 *     Son coût fixe (100) est le plus faible. Il faut 40 unités en plus
 *     de la capacité de U1. Les produire en U3 coûte 100 + 40×5 = 300,
 *     contre 200 + 40×3 = 320 en U2. Le coût FIXE change le classement.
 *  b) Si q était continue (retirée de generals), on obtiendrait ici la
 *     même solution, car les données sont entières. Le caractère
 *     « mixte » vient des y : ce sont eux qui rendent le problème
 *     combinatoire.
 */

import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

const glpk = await GLPK();

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Factory = { id: string; capacity: number; fixedCost: number; unitCost: number; minimum: number };
// Production : identifiant de l'usine → unités produites.
type Production = Record<string, number>;
type Plan = { openIds: string[]; production: Production };
// Plan lu dans la solution du solveur, avec son coût z.
type Solution = Plan & { cost: number };
// Ligne de l'énumération : réalisable (avec coût et production) ou non.
type EnumeratedPlan =
  | { openIds: string[]; isFeasible: false; cost: null; production?: undefined }
  | { openIds: string[]; isFeasible: true; cost: number; production: Production };
// Modèle glpk.js dont les binaires et les entières sont toujours renseignés.
type Model = LP & { binaries: string[]; generals: string[] };
type GlpkConstraint = LP["subjectTo"][number];
// Réponse de glpk.solve (type fourni par glpk.js).
type SolverOutput = Result;

const FACTORIES: Factory[] = [
  { id: "U1", capacity: 80, fixedCost: 300, unitCost: 2, minimum: 20 },
  { id: "U2", capacity: 60, fixedCost: 200, unitCost: 3, minimum: 20 },
  { id: "U3", capacity: 50, fixedCost: 100, unitCost: 5, minimum: 20 }
];
const DEMAND: number = 120;

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────

// Énumération de référence : pour chaque combinaison d'usines ouvertes,
// on donne d'abord à chaque usine ouverte son minimum, puis on remplit
// le reste de la demande par coût unitaire croissant.
// À ouvertures fixées, cette répartition est optimale.
function enumerateOpenings(factories: Factory[], demand: number): EnumeratedPlan[] {
  const plans: EnumeratedPlan[] = [];
  for (let mask = 0; mask < 2 ** factories.length; mask++) {
    // Le bit i du masque indique si l'usine i est ouverte.
    const openFactories = factories.filter((_, i) => (mask & (1 << i)) !== 0);
    const openIds = openFactories.map(factory => factory.id);
    const totalMinimum = openFactories.reduce((sum, factory) => sum + factory.minimum, 0);
    const totalCapacity = openFactories.reduce((sum, factory) => sum + factory.capacity, 0);
    if (totalMinimum > demand || totalCapacity < demand) {
      plans.push({ openIds, isFeasible: false, cost: null });
      continue;
    }
    const production: Production = Object.fromEntries(openFactories.map(factory => [factory.id, factory.minimum]));
    let remaining = demand - totalMinimum;
    const byUnitCost = [...openFactories].sort((firstFactory, secondFactory) => firstFactory.unitCost - secondFactory.unitCost);
    for (const factory of byUnitCost) {
      const addedUnits = Math.min(remaining, factory.capacity - factory.minimum);
      production[factory.id] += addedUnits;
      remaining -= addedUnits;
    }
    const cost = openFactories.reduce((sum, factory) => sum + factory.fixedCost + factory.unitCost * production[factory.id], 0);
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
  return factories.reduce((sum, factory) =>
    sum + (plan.openIds.includes(factory.id) ? factory.fixedCost : 0)
      + factory.unitCost * (plan.production[factory.id] ?? 0), 0);
}

// ─── 3. FONCTIONS ───────────────────────────────────────────────

function buildModel(factories: Factory[], demand: number): Model {
  // Objectif : coût fixe sur y, coût unitaire sur q.
  const objectiveTerms = factories.flatMap(factory => [
    { name: `y_${factory.id}`, coef: factory.fixedCost },
    { name: `q_${factory.id}`, coef: factory.unitCost }
  ]);

  const subjectTo: GlpkConstraint[] = [
    {
      name: "demande",
      vars: factories.map(factory => ({ name: `q_${factory.id}`, coef: 1 })),
      bnds: { type: glpk.GLP_FX, lb: demand, ub: demand }
    }
  ];

  for (const factory of factories) {
    // q_u − cap_u · y_u ≤ 0  (fermée ⇒ rien ; ouverte ⇒ au plus cap)
    subjectTo.push({
      name: `capacite_${factory.id}`,
      vars: [{ name: `q_${factory.id}`, coef: 1 }, { name: `y_${factory.id}`, coef: -factory.capacity }],
      bnds: { type: glpk.GLP_UP, lb: 0, ub: 0 }
    });
    // q_u − min_u · y_u ≥ 0  (ouverte ⇒ au moins min)
    subjectTo.push({
      name: `minimum_${factory.id}`,
      vars: [{ name: `q_${factory.id}`, coef: 1 }, { name: `y_${factory.id}`, coef: -factory.minimum }],
      bnds: { type: glpk.GLP_LO, lb: 0, ub: 0 }
    });
  }

  return {
    name: "usines_cout_fixe",
    objective: { direction: glpk.GLP_MIN, name: "cout_total", vars: objectiveTerms },
    subjectTo,
    binaries: factories.map(factory => `y_${factory.id}`),
    generals: factories.map(factory => `q_${factory.id}`)
  };
}

// Traduit les variables du solveur en un plan lisible.
function readSolution(factories: Factory[], solverOutput: SolverOutput): Solution {
  const vars = solverOutput.result.vars;
  return {
    openIds: factories.filter(factory => (vars[`y_${factory.id}`] ?? 0) > 0.5).map(factory => factory.id),
    production: Object.fromEntries(
      factories.map(factory => [factory.id, Math.round(vars[`q_${factory.id}`] ?? 0)])
    ),
    cost: solverOutput.result.z
  };
}

// Vérification indépendante d'un plan { openIds, production }.
function validatePlan(factories: Factory[], demand: number, plan: Plan): string[] {
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

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Référence : énumération des 8 combinaisons d'ouverture");
const plans = enumerateOpenings(FACTORIES, DEMAND);
console.table(plans.map(enumeratedPlan => ({
  openIds: enumeratedPlan.openIds.join("+") || "(aucune)",
  isFeasible: enumeratedPlan.isFeasible,
  cost: enumeratedPlan.cost ?? "—",
  production: enumeratedPlan.production ? JSON.stringify(enumeratedPlan.production) : "—"
})));
const bestEnumerated = plans
  .filter(enumeratedPlan => enumeratedPlan.isFeasible)
  .reduce((best, candidate) => (candidate.cost < best.cost ? candidate : best));
console.log("Optimum par énumération :", bestEnumerated.openIds, bestEnumerated.cost);

printTitle("Résolution avec GLPK");
let glpkPlan: Solution | null = null;
try {
  const solverOutput = await solveModel(buildModel(FACTORIES, DEMAND));
  if (solverOutput?.result.status === glpk.GLP_OPT) {
    glpkPlan = readSolution(FACTORIES, solverOutput);
    console.log("Plan GLPK :", glpkPlan);
    console.log("Vérification :", validatePlan(FACTORIES, DEMAND, glpkPlan).join(" ; ") || "OK");
    console.log("Coût recalculé :", computePlanCost(FACTORIES, glpkPlan));
  } else {
    console.log("Pas de solution optimale. Statut :", solverOutput?.result.status);
  }
} catch (error) {
  console.log("Erreur de résolution :", (error as Error).message);
}

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("6 variables dans l'objectif", () => buildModel(FACTORIES, DEMAND).objective.vars.length, 6);
check("3 binaires y et 3 entières q", () => {
  const model = buildModel(FACTORIES, DEMAND);
  return [model.binaries, model.generals];
}, [["y_U1", "y_U2", "y_U3"], ["q_U1", "q_U2", "q_U3"]]);
check("7 contraintes (demande + 2 par usine)",
  () => buildModel(FACTORIES, DEMAND).subjectTo.length, 7);
check("capacité U1 : q_U1 − 80·y_U1 ≤ 0", () => {
  const capacityU1 = buildModel(FACTORIES, DEMAND).subjectTo
    .find(constraint => constraint.name === "capacite_U1");
  if (!capacityU1) throw new Error("contrainte « capacite_U1 » absente du modèle");
  return [capacityU1.vars, capacityU1.bnds.type, capacityU1.bnds.ub];
}, [[{ name: "q_U1", coef: 1 }, { name: "y_U1", coef: -80 }], glpk.GLP_UP, 0]);
check("vérif : U2 fermée mais produit",
  () => validatePlan(FACTORIES, DEMAND, { openIds: ["U1"], production: { U1: 80, U2: 40 } }),
  ["U2 fermée mais produit 40"]);
check("vérif : demande et minimum",
  () => validatePlan(FACTORIES, DEMAND, { openIds: ["U1", "U3"], production: { U1: 80, U3: 10 } }),
  ["demande non couverte : 90 ≠ 120", "U3 sous son minimum"]);
await checkAsync("GLPK : U1 + U3 ouvertes, coût 760", async () => {
  const solverOutput = await solveModel(buildModel(FACTORIES, DEMAND));
  if (!solverOutput) throw new Error("modèle incomplet : buildModel ne renvoie pas encore de variables");
  const solution = readSolution(FACTORIES, solverOutput);
  return [solution.openIds, solution.production, solution.cost];
}, [["U1", "U3"], { U1: 80, U2: 0, U3: 40 }, 760]);
check("GLPK et énumération donnent le même coût", () => glpkPlan?.cost === bestEnumerated.cost, true);
check("plan GLPK validé indépendamment",
  () => (glpkPlan ? validatePlan(FACTORIES, DEMAND, glpkPlan) : ["pas de plan GLPK"]), []);
printSummary();
