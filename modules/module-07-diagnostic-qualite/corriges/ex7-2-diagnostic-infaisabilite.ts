/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 7 — Exercice 7.2 : Diagnostiquer une infaisabilité — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-07-diagnostic-qualite/module-07-diagnostic-qualite.md (§4 et §5)
 *  Lancer : node modules/module-07-diagnostic-qualite/corriges/ex7-2-diagnostic-infaisabilite.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  1. Organiser les contraintes en FAMILLES
 *     buildFamilies renvoie un objet { testLength: [...], quotas:
 *     [...], exclusions: [...] }. Chaque contrainte porte un nom
 *     explicite (longueur, quota_A, exclusion_a1_b1…). Le modèle
 *     s'assemble en concaténant les familles conservées : retirer une
 *     famille revient à ne pas la concaténer.
 *
 *  2. Retrait progressif
 *     Le modèle complet est infaisable : 4 items ne peuvent pas
 *     satisfaire des quotas qui en exigent 2 + 2 + 1 = 5. On relance
 *     le solveur sans chaque famille, puis sans chaque contrainte :
 *       sans testLength  → faisable
 *       sans quotas      → faisable
 *       sans exclusions  → TOUJOURS infaisable : elles sont innocentes
 *     Au niveau des contraintes, retirer la longueur OU n'importe quel
 *     quota suffit. Le conflit implique ces 4 contraintes ENSEMBLE ; on
 *     parle de sous-système irréductible infaisable (IIS).
 *
 *  3. Relaxation élastique
 *     Chaque contrainte reçoit une ou deux variables d'écart continues
 *     (≥ 0 par défaut dans GLPK), selon son type :
 *       ≥  (GLP_LO) : Σ + s       ≥ b   (s comble un manque)
 *       ≤  (GLP_UP) : Σ − s       ≤ b   (s autorise un excès)
 *       =  (GLP_FX) : Σ + s⁺ − s⁻ = b   (les deux sens)
 *     On MINIMISE Σ weights[famille] · s. Le modèle élastique est toujours
 *     faisable. Sa valeur optimale (ici 1) est la violation MINIMALE :
 *     il manque exactement un item pour tout satisfaire.
 *     Avec le poids 10 sur la longueur et 1 sur les quotas, le solveur
 *     préfère manquer UN quota d'une unité plutôt que d'allonger le test.
 *     Les poids traduisent les priorités métier.
 *     Remarque : l'objectif élastique ne porte QUE sur les écarts. Les
 *     items retenus ne maximisent donc plus le score. Une seconde phase
 *     (fixer la violation à 1, puis maximiser le score) donnerait le
 *     meilleur test parmi les « moins mauvais ».
 *
 *  Pièges fréquents
 *  - Créer les écarts dans `binaries` : ils doivent rester continus
 *    (ou entiers), sinon un écart ne pourrait pas dépasser 1.
 *  - Mettre le même nom de variable d'écart sur deux contraintes : les
 *    deux contraintes partageraient alors un seul écart.
 *  - Lire les variables x du modèle complet alors que son statut est
 *    NOFEAS : elles valent toutes 0, et ce n'est pas une solution.
 *
 *  Réponses aux questions
 *  a) Les exclusions ne participent pas au conflit : sans elles, le
 *     modèle reste infaisable.
 *  b) Le retrait progressif dit QUELLES contraintes sont en conflit.
 *     La relaxation élastique dit DE COMBIEN il faut les assouplir, et
 *     LAQUELLE assouplir en priorité, selon les poids.
 *  c) Le contrôle arithmétique du 7.1 (Σ minimums 5 > longueur 4)
 *     détectait cette contradiction sans aucun solveur.
 */

import GLPK from "glpk.js/node";
import type { LP, Options, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

const glpk = await GLPK();

// ─── 1. DONNÉES ─────────────────────────────────────────────────
type Item = { id: string; domain: string; score: number };
type Rules = {
  testLength: number;
  minimums: Record<string, number>;
  exclusions: [string, string][];
};
// Modèle et réponse de glpk.js, réutilisés sous leurs noms du glossaire.
type Model = LP;
type SolverOutput = Result;
// Contrainte et terme linéaire : les formes attendues par glpk.js.
type GlpkConstraint = Model["subjectTo"][number];
type Term = GlpkConstraint["vars"][number];
// Contraintes rangées par nom de famille.
type Families = Record<string, GlpkConstraint[]>;
type AssemblyFamilies = {
  testLength: GlpkConstraint[];
  quotas: GlpkConstraint[];
  exclusions: GlpkConstraint[];
};
type DiagnosticRow = { family: string; isFeasibleWithout: boolean };
type SlackValue = { slackName: string; value: number };

const ITEMS: Item[] = [
  { id: "a1", domain: "A", score: 9 }, { id: "a2", domain: "A", score: 7 },
  { id: "a3", domain: "A", score: 5 }, { id: "b1", domain: "B", score: 8 },
  { id: "b2", domain: "B", score: 6 }, { id: "b3", domain: "B", score: 4 },
  { id: "c1", domain: "C", score: 7 }, { id: "c2", domain: "C", score: 3 },
  { id: "d1", domain: "D", score: 5 }
];
const RULES: Rules = {
  testLength: 4,
  minimums: { A: 2, B: 2, C: 1 },     // total 5 > 4 : contradiction volontaire
  exclusions: [["a1", "b1"]]           // a1 et b1 incompatibles
};

// ─── 2. OUTILS FOURNIS ──────────────────────────────────────────

const OPTIONS: Options = { msglev: glpk.GLP_MSG_OFF, presol: true };

// Transforme { famille: [contraintes] } en une famille par contrainte,
// pour diagnostiquer au niveau le plus fin.
function splitFamilies(families: Families): Families {
  return Object.fromEntries(
    Object.values(families ?? {}).flat().map(constraint => [constraint.name, [constraint]])
  );
}

// Résout un modèle en se protégeant d'un modèle vide (GLPK planterait).
// Renvoie null si le modèle est vide (par exemple tant qu'un TODO renvoie undefined).
async function solveModel(model: Model): Promise<SolverOutput | null> {
  if (!model?.objective?.vars?.length) return null;
  return glpk.solve(model, OPTIONS);
}

// Lève une erreur explicite quand solveModel n'a rien pu résoudre.
function requireSolverOutput(solverOutput: SolverOutput | null): SolverOutput {
  if (!solverOutput) throw new Error("modèle vide : aucune variable dans l'objectif (TODO incomplet ?)");
  return solverOutput;
}

// Extrait les écarts non nuls : [{ slackName, value }].
function readNonZeroSlacks(solverOutput: SolverOutput): SlackValue[] {
  return Object.entries(solverOutput.result.vars)
    .filter(([variableName, value]) => variableName.startsWith("ecart_") && value > 1e-6)
    .map(([variableName, value]) => ({ slackName: variableName, value }));
}

// ─── 3. FONCTIONS ───────────────────────────────────────────────

// Contraintes rangées par famille, chacune avec un nom explicite.
function buildFamilies(items: Item[], rules: Rules): AssemblyFamilies {
  const unitTerms = (concernedItems: Item[]): Term[] =>
    concernedItems.map(item => ({ name: item.id, coef: 1 }));
  return {
    testLength: [{
      name: "longueur",
      vars: unitTerms(items),
      bnds: { type: glpk.GLP_FX, lb: rules.testLength, ub: rules.testLength }
    }],
    quotas: Object.entries(rules.minimums).map(([domain, minimum]) => ({
      name: `quota_${domain}`,
      vars: unitTerms(items.filter(item => item.domain === domain)),
      bnds: { type: glpk.GLP_LO, lb: minimum, ub: 0 }
    })),
    exclusions: rules.exclusions.map(([idA, idB]) => ({
      name: `exclusion_${idA}_${idB}`,
      vars: [{ name: idA, coef: 1 }, { name: idB, coef: 1 }],
      bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 }
    }))
  };
}

// Modèle MAX Σ score·x avec toutes les familles sauf celles de `familiesToRemove`.
function buildModel(families: Families, items: Item[], familiesToRemove: string[] = []): Model {
  return {
    name: "assemblage",
    objective: {
      direction: glpk.GLP_MAX,
      name: "score",
      vars: items.map(item => ({ name: item.id, coef: item.score }))
    },
    subjectTo: Object.entries(families)
      .filter(([familyName]) => !familiesToRemove.includes(familyName))
      .flatMap(([, constraints]) => constraints),
    binaries: items.map(item => item.id)
  };
}

// Retire chaque famille à tour de rôle et note si le modèle redevient faisable.
async function diagnoseByFamily(families: Families, items: Item[]): Promise<DiagnosticRow[]> {
  const rows: DiagnosticRow[] = [];
  for (const familyName of Object.keys(families)) {
    const solverOutput = requireSolverOutput(await solveModel(buildModel(families, items, [familyName])));
    rows.push({ family: familyName, isFeasibleWithout: solverOutput.result.status === glpk.GLP_OPT });
  }
  return rows;
}

// Version élastique : chaque contrainte peut être violée, moyennant une
// pénalité weights[famille] par unité de violation.
function buildElasticModel(families: Families, items: Item[], weights: Record<string, number>): Model {
  const subjectTo: GlpkConstraint[] = [];
  const objectiveTerms: Term[] = [];
  for (const [family, constraints] of Object.entries(families)) {
    for (const constraint of constraints) {
      const vars = [...constraint.vars];
      const addSlack = (slackName: string, coef: number): void => {
        vars.push({ name: slackName, coef });
        objectiveTerms.push({ name: slackName, coef: weights[family] });
      };
      if (constraint.bnds.type === glpk.GLP_LO) addSlack(`ecart_${constraint.name}`, 1);
      if (constraint.bnds.type === glpk.GLP_UP) addSlack(`ecart_${constraint.name}`, -1);
      if (constraint.bnds.type === glpk.GLP_FX) {
        addSlack(`ecart_plus_${constraint.name}`, 1);
        addSlack(`ecart_moins_${constraint.name}`, -1);
      }
      subjectTo.push({ ...constraint, vars });
    }
  }
  return {
    name: "assemblage_elastique",
    objective: { direction: glpk.GLP_MIN, name: "violation", vars: objectiveTerms },
    subjectTo,
    binaries: items.map(item => item.id) // les écarts restent continus ≥ 0
  };
}

// ─── 4. PROGRAMME PRINCIPAL ─────────────────────────────────────
try {
  const families = buildFamilies(ITEMS, RULES);

  printTitle("1. Modèle complet");
  const fullOutput = await solveModel(buildModel(families, ITEMS));
  console.log("Statut :", fullOutput?.result.status, `(${glpk.GLP_NOFEAS} = GLP_NOFEAS, infaisable)`);

  printTitle("2. Retrait d'une famille à la fois");
  console.table(await diagnoseByFamily(families, ITEMS));

  printTitle("3. Retrait d'une contrainte à la fois");
  console.table(await diagnoseByFamily(splitFamilies(families), ITEMS));

  printTitle("4. Relaxation élastique (poids : longueur 10, quotas 1, exclusions 10)");
  const elasticOutput = await solveModel(
    buildElasticModel(families, ITEMS, { testLength: 10, quotas: 1, exclusions: 10 }));
  if (elasticOutput) {
    console.log("Statut :", elasticOutput.result.status, "— violation minimale :", elasticOutput.result.z);
    console.log("Écarts non nuls :", readNonZeroSlacks(elasticOutput));
    console.log("Items retenus :", ITEMS.filter(item => elasticOutput.result.vars[item.id] > 0.5).map(item => item.id));
  }
} catch (error) {
  console.log("Programme principal interrompu (TODO incomplet ?) :", (error as Error).message);
}

// ─── 5. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("familles : 1 longueur, 3 quotas, 1 exclusion", () => {
  const families = buildFamilies(ITEMS, RULES);
  return [families.testLength.length, families.quotas.length, families.exclusions.length];
}, [1, 3, 1]);
check("quota_A : ≥ 2 sur a1, a2, a3", () => {
  const quotaA = buildFamilies(ITEMS, RULES).quotas.find(constraint => constraint.name === "quota_A");
  return [quotaA?.vars.map(term => term.name), quotaA?.bnds.type, quotaA?.bnds.lb];
}, [["a1", "a2", "a3"], glpk.GLP_LO, 2]);
check("sans la famille quotas : restent longueur + exclusion", () =>
  buildModel(buildFamilies(ITEMS, RULES), ITEMS, ["quotas"]).subjectTo.length, 2);
await checkAsync("modèle complet infaisable (GLP_NOFEAS)", async () =>
  requireSolverOutput(await solveModel(buildModel(buildFamilies(ITEMS, RULES), ITEMS))).result.status,
  glpk.GLP_NOFEAS);
await checkAsync("diagnostic par familles", async () =>
  diagnoseByFamily(buildFamilies(ITEMS, RULES), ITEMS), [
  { family: "testLength", isFeasibleWithout: true },
  { family: "quotas", isFeasibleWithout: true },
  { family: "exclusions", isFeasibleWithout: false }
]);
await checkAsync("diagnostic par contrainte : seule l'exclusion est innocente", async () =>
  (await diagnoseByFamily(splitFamilies(buildFamilies(ITEMS, RULES)), ITEMS))
    .map(row => row.isFeasibleWithout), [true, true, true, true, false]);
await checkAsync("élastique : violation minimale = 1", async () =>
  requireSolverOutput(await solveModel(buildElasticModel(buildFamilies(ITEMS, RULES), ITEMS,
    { testLength: 10, quotas: 1, exclusions: 10 }))).result.z, 1);
await checkAsync("élastique : c'est un quota qui est assoupli d'une unité", async () => {
  const solverOutput = requireSolverOutput(await solveModel(buildElasticModel(buildFamilies(ITEMS, RULES), ITEMS,
    { testLength: 10, quotas: 1, exclusions: 10 })));
  const slacks = readNonZeroSlacks(solverOutput);
  return [slacks.length, slacks[0]?.slackName.startsWith("ecart_quota_"), slacks[0]?.value];
}, [1, true, 1]);
await checkAsync("élastique : à poids égaux, la violation minimale reste 1", async () =>
  requireSolverOutput(await solveModel(buildElasticModel(buildFamilies(ITEMS, RULES), ITEMS,
    { testLength: 1, quotas: 1, exclusions: 1 }))).result.z, 1);
printSummary();
