// Module 8 — Exemple commenté : estimer la capacité d'un candidat pendant un test adaptatif
// Lancer : npm run tp8-capacite
// Sous Node.js, importer « glpk.js/node » (« glpk.js » charge la version navigateur).
//
// On simule un candidat dont la capacité réelle est connue, REFERENCE_CAPACITY,
// et on lui fait passer un test de TEST_LENGTH questions choisies parmi 22, avec
// les MÊMES règles que l'assemblage (08-assemblage-irt-glpk.ts) : longueur exacte,
// au moins un item par domaine, q02 et q05 jamais ensemble. À chaque étape :
//   1. on cherche les items ÉLIGIBLES : non encore posés, et tels qu'un test complet
//      respectant toutes les règles existe encore avec eux. GLPK le vérifie en
//      résolvant le modèle d'assemblage, items déjà posés et item candidat fixés à 1 ;
//   2. parmi eux, on pose le plus INFORMATIF au niveau θ̂ estimé jusque-là
//      (au départ, θ̂ = INITIAL_THETA) ;
//   3. on calcule sa probabilité de réussite pour la capacité réelle ;
//   4. on simule la réponse : juste si cette probabilité dépasse un tirage uniforme ;
//   5. on met à jour l'estimation θ̂ (méthode EAP) avec toutes les réponses reçues.
//
// La banque compte 22 items : les 12 du module (domaines A à D) et 10 items
// supplémentaires (domaines E, F, G).
//
// Toutes les fonctions de calcul sont pures : elles reçoivent les tirages uniformes
// et les constantes de GLPK en paramètre. Le hasard (Math.random) n'intervient que
// dans le programme principal : chaque lancement simule un nouveau passage.
import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";

// Item de la banque : a = discrimination, b = difficulté.
type Item = { id: string; a: number; b: number; domain: string };

// Item enrichi de son coefficient dans la fonction objectif.
type ScoredItem = Item & { score: number };

// Format de modèle attendu par glpk.solve, et réponse du solveur (types de glpk.js).
type Model = LP;
type SolverOutput = Result;

// Contrainte linéaire : lb <= somme(coef * variable) <= ub, selon bnds.type.
type GlpkConstraint = LP["subjectTo"][number];

// Terme coef * variable d'une expression linéaire.
type Term = GlpkConstraint["vars"][number];

// Constantes de GLPK utilisées pour construire le modèle et lire le statut.
type GlpkConstants = {
  GLP_MAX: number;  // Maximisation.
  GLP_FX: number;   // Contrainte « = lb ».
  GLP_LO: number;   // Contrainte « >= lb ».
  GLP_UP: number;   // Contrainte « <= ub ».
  GLP_OPT: number;  // Statut : solution optimale.
  GLP_FEAS: number; // Statut : solution réalisable.
};

// Résolution d'un modèle : la seule opération qui appelle le solveur.
type SolveModel = (model: Model) => Promise<SolverOutput>;

type Responses = Record<string, 0 | 1>;   // id de l'item → 1 réussi, 0 raté
type AbilityEstimate = { theta: number; standardError: number };
// Une étape du test : les items éligibles, l'item posé, la réponse simulée, l'estimation après coup.
type TestStep = {
  eligibleItems: Item[];        // items qui pouvaient encore être posés
  item: Item;
  thetaBefore: number;          // estimation utilisée pour choisir l'item
  probability: number;          // P(réussite) pour la capacité réelle
  uniformDraw: number;          // tirage uniforme entre 0 et 1
  response: 0 | 1;
  estimate: AbilityEstimate;    // estimation après la réponse
};

// ─── Données ────────────────────────────────────────────────────

// Banque de 22 items : les 12 items synthétiques du module (q01 à q12, domaines
// A à D), puis 10 items supplémentaires (q13 à q22, domaines E, F, G) dont a et b
// ont été tirés une fois pour toutes, a dans [0,8 ; 2] et b dans [−2 ; 2].
const TEST_ITEMS: Item[] = [
  { id: "q01", a: 1.2, b: -1.0, domain: "A" },
  { id: "q02", a: 1.8, b: -0.5, domain: "A" },
  { id: "q03", a: 0.9, b: 0.0, domain: "A" },
  { id: "q04", a: 1.5, b: 0.4, domain: "B" },
  { id: "q05", a: 2.0, b: 0.8, domain: "B" },
  { id: "q06", a: 1.1, b: 1.2, domain: "B" },
  { id: "q07", a: 1.4, b: -0.8, domain: "C" },
  { id: "q08", a: 1.7, b: -0.1, domain: "C" },
  { id: "q09", a: 0.8, b: 0.3, domain: "C" },
  { id: "q10", a: 1.9, b: 0.9, domain: "D" },
  { id: "q11", a: 1.3, b: 1.4, domain: "D" },
  { id: "q12", a: 1.6, b: 0.1, domain: "D" },
  { id: "q13", a: 1.6, b: -0.6, domain: "E" },
  { id: "q14", a: 1.5, b: -0.6, domain: "F" },
  { id: "q15", a: 1.9, b: 1.4, domain: "G" },
  { id: "q16", a: 2.0, b: -0.6, domain: "E" },
  { id: "q17", a: 1.9, b: 1.2, domain: "F" },
  { id: "q18", a: 1.7, b: 1.0, domain: "G" },
  { id: "q19", a: 1.1, b: 0.0, domain: "E" },
  { id: "q20", a: 1.9, b: 1.9, domain: "F" },
  { id: "q21", a: 1.8, b: -0.3, domain: "G" },
  { id: "q22", a: 1.7, b: 0.3, domain: "E" }
];

// Règles d'assemblage, les mêmes que dans 08-assemblage-irt-glpk.ts, étendues
// aux nouveaux domaines : longueur exacte TEST_LENGTH (= nombre de questions),
// au moins un item par domaine, q02 et q05 jamais ensemble.
const TEST_LENGTH = 11;
const REQUIRED_DOMAINS: string[] = ["A", "B", "C", "D", "E", "F", "G"];
const EXCLUDED_PAIR: [string, string] = ["q02", "q05"];

// Capacité réelle du candidat simulé : c'est elle que le test doit retrouver.
const REFERENCE_CAPACITY = 0.4;
// Estimation de départ, avant toute réponse. C'est aussi la moyenne de l'a priori
// N(INITIAL_THETA, 1) de l'EAP : sans réponse, θ̂ = INITIAL_THETA et SE = 1.
const INITIAL_THETA = -1;

// Grille de calcul de l'EAP : θ de −4 à +4 par pas de 0,01 (801 points).
const THETA_POINTS: number[] = Array.from({ length: 801 }, (_, i) => -4 + i * 0.01);

// ─── Calculs IRT (fonctions pures) ──────────────────────────────

// Probabilité de réussite 2PL (convention sans facteur D, comme dans tout le module).
function probability2PL(discrimination: number, difficulty: number, theta: number): number {
  return 1 / (1 + Math.exp(-discrimination * (theta - difficulty)));
}

// Fonction d'information d'un item dichotomique 2PL : a² · P · (1 − P).
function information2PL(discrimination: number, difficulty: number, theta: number): number {
  const probability = probability2PL(discrimination, difficulty, theta);
  return discrimination ** 2 * probability * (1 - probability);
}

// Vraisemblance : produit sur les items DÉJÀ POSÉS de P (réussi) ou 1 − P (raté).
const likelihood = (items: Item[], responses: Responses, theta: number): number =>
  items.reduce((product, item) => {
    const probability = probability2PL(item.a, item.b, theta);
    return product * (responses[item.id] === 1 ? probability : 1 - probability);
  }, 1);

// A priori N(INITIAL_THETA, 1), à une constante près : elle disparaît à la normalisation.
const priorDensity = (theta: number): number => Math.exp(-((theta - INITIAL_THETA) ** 2) / 2);

// EAP (Expected a Posterior): moyenne de θ pondérée par la loi a posteriori w(θ) = L(θ) · φ(θ).
// La racine de la variance pondérée donne l'erreur standard. Sans aucune
// réponse, L vaut 1 partout : on retrouve l'a priori, θ̂ = INITIAL_THETA et SE = 1.
const estimateAbilityEAP = (items: Item[], responses: Responses): AbilityEstimate => {
  const weights = THETA_POINTS.map(theta => likelihood(items, responses, theta) * priorDensity(theta));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const theta = THETA_POINTS.reduce((sum, point, i) => sum + point * weights[i], 0) / totalWeight;
  const variance = THETA_POINTS.reduce((sum, point, i) => sum + (point - theta) ** 2 * weights[i], 0) / totalWeight;
  return { theta, standardError: Math.sqrt(variance) };
};

// ─── Modèle d'assemblage (repris de 08-assemblage-irt-glpk.ts) ──

// Ajoute à chaque item son coefficient d'objectif, sans modifier la banque d'origine.
// Ici, la grille se réduit au θ̂ courant : l'objectif est l'information à ce niveau.
const scoreItems = (items: Item[], thetaGrid: number[], weights: number[]): ScoredItem[] =>
  items.map(item => ({
    ...item,
    score: thetaGrid.reduce((total, theta, thetaIndex) =>
      total + weights[thetaIndex] * information2PL(item.a, item.b, theta), 0)
  }));

// Terme x_i avec un coefficient 1 : sert aux contraintes de comptage.
const toUnitTerm = (item: Item): Term => ({ name: item.id, coef: 1 });

// Fonction pure : construit toutes les contraintes linéaires du modèle.
function buildConstraints(glpk: GlpkConstants, items: Item[]): GlpkConstraint[] {
  // La contrainte de longueur impose exactement TEST_LENGTH items.
  const lengthConstraint: GlpkConstraint = {
    name: `longueur_exacte_${TEST_LENGTH}`,
    vars: items.map(toUnitTerm),
    bnds: { type: glpk.GLP_FX, lb: TEST_LENGTH, ub: TEST_LENGTH }
  };

  // Pour chaque domaine, impose au moins un item.
  const domainConstraints: GlpkConstraint[] = REQUIRED_DOMAINS.map(domain => ({
    name: `quota_${domain}`,
    vars: items.filter(item => item.domain === domain).map(toUnitTerm),
    bnds: { type: glpk.GLP_LO, lb: 1, ub: 0 }
  }));

  // Exclusion : x_q02 + x_q05 <= 1.
  const exclusionConstraint: GlpkConstraint = {
    name: `exclusion_${EXCLUDED_PAIR.join("_")}`,
    vars: EXCLUDED_PAIR.map(id => ({ name: id, coef: 1 })),
    bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
  };

  return [lengthConstraint, ...domainConstraints, exclusionConstraint];
}

// Assemble la formulation mathématique :
// max somme(score_i * x_i), sous contraintes, avec x_i binaire.
const buildAssemblyModel = (glpk: GlpkConstants, scoredItems: ScoredItem[]): Model => ({
  name: "assemblage_irt_2pl",
  objective: {
    direction: glpk.GLP_MAX,
    name: "information_au_theta_courant",
    vars: scoredItems.map(item => ({ name: item.id, coef: item.score }))
  },
  subjectTo: buildConstraints(glpk, scoredItems),
  binaries: scoredItems.map(item => item.id)
});

// Une solution n'est exploitable que si GLPK la déclare optimale ou réalisable.
const hasUsableSolution = (glpk: GlpkConstants, solverOutput: SolverOutput): boolean =>
  [glpk.GLP_OPT, glpk.GLP_FEAS].includes(solverOutput.result.status);

// ─── Test adaptatif ─────────────────────────────────────────────

// Nouveau modèle où chaque item de fixedItems est imposé (x_i = 1).
// Le modèle reçu n'est pas modifié.
const withFixedItems = (glpk: GlpkConstants, model: Model, fixedItems: Item[]): Model => ({
  ...model,
  subjectTo: [
    ...model.subjectTo,
    ...fixedItems.map(item => ({
      name: `impose_${item.id}`,
      vars: [toUnitTerm(item)],
      bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 }
    }))
  ]
});

// Items éligibles : non encore posés, et compatibles avec un test complet valide.
// Pour chaque candidat, GLPK cherche un test qui contient les items posés ET lui.
async function findEligibleItems(
  glpk: GlpkConstants, solveModel: SolveModel, items: Item[], askedItems: Item[], theta: number
): Promise<Item[]> {
  const model = buildAssemblyModel(glpk, scoreItems(items, [theta], [1]));
  const remainingItems = items.filter(item => !askedItems.includes(item));
  const feasibility = await Promise.all(remainingItems.map(async candidate =>
    hasUsableSolution(glpk, await solveModel(withFixedItems(glpk, model, [...askedItems, candidate])))));
  return remainingItems.filter((_, i) => feasibility[i]);
}

// L'item qui apporte le plus d'information au niveau theta.
const selectMostInformativeItem = (candidateItems: Item[], theta: number): Item =>
  candidateItems.reduce((bestItem, item) =>
    information2PL(item.a, item.b, theta) > information2PL(bestItem.a, bestItem.b, theta) ? item : bestItem);

// Réponse simulée : juste si la probabilité de réussite dépasse le tirage uniforme.
// Un candidat qui a 70 % de chances de réussir réussit donc 70 % du temps.
const simulateResponse = (probability: number, uniformDraw: number): 0 | 1 =>
  probability > uniformDraw ? 1 : 0;

// Le test adaptatif complet : une étape par tirage uniforme. Chaque étape repart
// des items et réponses des étapes précédentes, sans rien modifier.
async function runAdaptiveTest(
  glpk: GlpkConstants, solveModel: SolveModel, items: Item[], referenceCapacity: number, uniformDraws: number[]
): Promise<TestStep[]> {
  return uniformDraws.reduce<Promise<TestStep[]>>(async (previousSteps, uniformDraw) => {
    const steps = await previousSteps;
    const askedItems = steps.map(step => step.item);
    const responses: Responses = Object.fromEntries(steps.map(step => [step.item.id, step.response]));
    const thetaBefore = steps.length === 0 ? INITIAL_THETA : steps[steps.length - 1].estimate.theta;
    const eligibleItems = await findEligibleItems(glpk, solveModel, items, askedItems, thetaBefore);
    if (eligibleItems.length === 0) throw new Error("aucun item éligible : les règles sont contradictoires");
    const item = selectMostInformativeItem(eligibleItems, thetaBefore);
    const probability = probability2PL(item.a, item.b, referenceCapacity);
    const response = simulateResponse(probability, uniformDraw);
    const estimate = estimateAbilityEAP([...askedItems, item], { ...responses, [item.id]: response });
    return [...steps, { eligibleItems, item, thetaBefore, probability, uniformDraw, response, estimate }];
  }, Promise.resolve([]));
}

// ─── Résolution et affichage ────────────────────────────────────

// Nombre d'items éligibles affichés par question ; les autres sont seulement comptés.
const DISPLAYED_ELIGIBLE_COUNT = 8;

// Les DISPLAYED_ELIGIBLE_COUNT premiers identifiants, suivis du nombre d'items non affichés.
const formatEligibleItems = (eligibleItems: Item[]): string => {
  const hiddenCount = eligibleItems.length - DISPLAYED_ELIGIBLE_COUNT;
  const shownIds = eligibleItems.slice(0, DISPLAYED_ELIGIBLE_COUNT).map(item => item.id).join(" ");
  return hiddenCount > 0 ? `${shownIds} … (+${hiddenCount})` : shownIds;
};

// Initialise GLPK (solveur MILP compilé en WebAssembly).
const glpk = await GLPK();
const solveModel: SolveModel = async model => glpk.solve(model, { msglev: glpk.GLP_MSG_OFF, presol: true });

// Le hasard : un tirage uniforme entre 0 et 1 par question.
const uniformDraws = Array.from({ length: TEST_LENGTH }, () => Math.random());
const steps = await runAdaptiveTest(glpk, solveModel, TEST_ITEMS, REFERENCE_CAPACITY, uniformDraws);

console.log(`Candidat simulé : capacité réelle θ = ${REFERENCE_CAPACITY}`);
console.log(`Test adaptatif : ${TEST_LENGTH} questions parmi ${TEST_ITEMS.length}, estimation EAP (a priori N(${INITIAL_THETA}, 1))`);
console.log(`Règles : longueur ${TEST_LENGTH}, au moins un item par domaine (${REQUIRED_DOMAINS.join(", ")}),`
  + ` ${EXCLUDED_PAIR.join(" et ")} jamais ensemble`);
console.log(`Avant la première question : θ̂ = ${INITIAL_THETA.toFixed(2)}, erreur standard 1,00 (l'a priori seul)\n`);

console.table(steps.map((step, i) => ({
  question: i + 1,
  "éligibles": formatEligibleItems(step.eligibleItems),
  "choisi pour θ̂": step.thetaBefore.toFixed(2),
  "item (a ; b ; domaine)": `${step.item.id} (${step.item.a} ; ${step.item.b} ; ${step.item.domain})`,
  "P(réussite)": step.probability.toFixed(2),
  tirage: step.uniformDraw.toFixed(2),
  "réponse": step.response === 1 ? "juste" : "fausse",
  "θ̂ après": step.estimate.theta.toFixed(2),
  "erreur std": step.estimate.standardError.toFixed(2)
})));

// Contrôle du test passé : les règles d'assemblage sont-elles respectées ?
const askedItems = steps.map(step => step.item);
const askedIds = askedItems.map(item => item.id);
console.log(`Test passé : ${askedIds.join(" ")} ; domaines ${askedItems.map(item => item.domain).join(" ")} ;`
  + ` ${EXCLUDED_PAIR.every(id => askedIds.includes(id)) ? "exclusion VIOLÉE" : "exclusion respectée"}`);

const finalEstimate = steps[steps.length - 1].estimate;
const gap = finalEstimate.theta - REFERENCE_CAPACITY;
console.log(`Estimation finale : θ̂ = ${finalEstimate.theta.toFixed(2)} ± ${finalEstimate.standardError.toFixed(2)}`
  + ` (capacité réelle ${REFERENCE_CAPACITY}, écart ${gap >= 0 ? "+" : ""}${gap.toFixed(2)},`
  + ` soit ${(Math.abs(gap) / finalEstimate.standardError).toFixed(1)} erreur standard)`);
