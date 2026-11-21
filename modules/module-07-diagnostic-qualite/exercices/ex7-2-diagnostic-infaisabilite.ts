/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 7 — Exercice 7.2 : Diagnostiquer une infaisabilité
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-07-diagnostic-qualite/module-07-diagnostic-qualite.md (§4 et §5)
 *  Niveau : ★★★   Durée indicative : 1 h 15
 *  Lancer : node modules/module-07-diagnostic-qualite/exercices/ex7-2-diagnostic-infaisabilite.ts
 *
 *  OBJECTIF
 *  Provoquer volontairement une infaisabilité, puis la diagnostiquer
 *  de deux façons : par retrait progressif des familles de contraintes,
 *  puis par une relaxation élastique qui mesure la violation minimale.
 *
 *  PRÉREQUIS
 *  - Module 6 : modèle glpk.js, statuts (GLP_NOFEAS = 4, GLP_OPT = 5).
 *  - Module 3 : quotas Σ_{i∈d} x_i ≥ m, exclusion x_i + x_j ≤ 1.
 *  - Exercice 7.1 : contrôle « Σ minimums > longueur ».
 *  - TypeScript : Object.entries / fromEntries, flatMap, async/await ;
 *    types LP et Result fournis par glpk.js (renommés Model et SolverOutput), Promise<T>.
 *
 *  CONSIGNE
 *  Règles : longueur exacte 4 ; quotas minimums A ≥ 2, B ≥ 2, C ≥ 1 ;
 *  exclusion a1 / b1. Objectif : MAX Σ score·x.
 *    1. buildFamilies(items, rules) → { testLength: [...], quotas: [...], exclusions: [...] }
 *       noms des contraintes : "longueur", `quota_${domain}`, `exclusion_${idA}_${idB}`.
 *    2. buildModel(families, items, familiesToRemove = []) : modèle complet
 *       SANS les familles dont le nom figure dans familiesToRemove.
 *    3. diagnoseByFamily(families, items) : pour chaque famille, résous le
 *       modèle sans elle → [{ family, isFeasibleWithout }] (faisable =
 *       statut GLP_OPT).
 *    4. buildElasticModel(families, items, weights) : ajoute les
 *       écarts selon le type de chaque contrainte et MINIMISE
 *       Σ weights[famille] · écart. Noms des écarts :
 *         GLP_LO : `ecart_${constraint.name}` coef +1
 *         GLP_UP : `ecart_${constraint.name}` coef −1
 *         GLP_FX : `ecart_plus_${constraint.name}` coef +1 et `ecart_moins_${constraint.name}` coef −1
 *
 *  RÉSULTAT ATTENDU
 *  Modèle complet : statut 4. Sans longueur ou sans quotas : faisable ;
 *  sans exclusions : toujours infaisable. Élastique : violation minimale 1,
 *  portée par un écart de quota.
 */

import GLPK from "glpk.js/node";
import type { LP, Options, Result } from "glpk.js/node";
import { check, checkAsync, printSummary, printTitle } from "../../../lib/verif.ts";

const glpk = await GLPK();

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 3. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Range les contraintes par famille.
// Objectif : écrire les contraintes du modèle sous forme de données glpk.js,
//            rangées en familles nommées (longueur, quotas, exclusions),
//            pour pouvoir ensuite retirer une famille entière d'un coup.
// Entrée   : items, la banque (ITEMS : a1..a3 en A, b1..b3 en B, c1..c2 en C, d1 en D) ;
//            rules, ex. RULES = { testLength: 4, minimums: { A: 2, B: 2, C: 1 },
//            exclusions: [["a1", "b1"]] }.
// Sortie   : un objet AssemblyFamilies { testLength, quotas, exclusions },
//            chaque champ étant un tableau de GlpkConstraint { name, vars, bnds } :
//              testLength : Σ_i x_i = 4 (une contrainte nommée "longueur") ;
//              quotas     : Σ_{i∈d} x_i ≥ minimum, une par domaine des minimums ;
//              exclusions : x_idA + x_idB ≤ 1, une par paire exclue.
// Exemple  : buildFamilies(ITEMS, RULES) → 1 contrainte de longueur,
//            3 quotas, 1 exclusion ; la contrainte "quota_A" porte sur
//            a1, a2, a3 (coef 1) avec bnds { type: glpk.GLP_LO, lb: 2, ub: 0 }.
// Attention: chaque terme a la forme { name: id de l'item, coef: 1 } ;
//            le type de borne dépend du sens : = → GLP_FX (lb = ub),
//            ≥ → GLP_LO, ≤ → GLP_UP.
// (Indice 1 en fin de fichier.)
function buildFamilies(items: Item[], rules: Rules): AssemblyFamilies {
  return undefined; // ← à remplacer
}

// TODO 2 — Modèle MAX Σ score·x, toutes variables binaires.
// Objectif : assembler le modèle glpk.js à partir des familles conservées ;
//            retirer une famille revient simplement à ne pas la concaténer.
// Entrée   : families, ex. buildFamilies(ITEMS, RULES) ; items, ex. ITEMS ;
//            familiesToRemove, les noms de familles à exclure, ex. ["quotas"]
//            (par défaut [] : modèle complet).
// Sortie   : un Model : objectif MAX Σ score_i · x_i, subjectTo = les
//            contraintes des familles conservées, binaries = les id des items.
// Exemple  : buildModel(buildFamilies(ITEMS, RULES), ITEMS, ["quotas"]).subjectTo.length
//              → 2 (longueur + exclusion) ;
//            le modèle complet (sans retrait) est infaisable : statut GLP_NOFEAS.
// (Indice 2 en fin de fichier.)
function buildModel(families: Families, items: Item[], familiesToRemove: string[] = []): Model {
  return undefined; // ← à remplacer
}

// TODO 3 — Retrait progressif, une famille à la fois.
// Objectif : retirer chaque famille à tour de rôle et noter si le modèle
//            redevient faisable : une famille dont le retrait rend le
//            modèle faisable participe au conflit.
// Entrée   : families, ex. buildFamilies(ITEMS, RULES) (ou
//            splitFamilies(...) pour une famille par contrainte) ; items, ex. ITEMS.
// Sortie   : une promesse de tableau DiagnosticRow, une ligne
//            { family, isFeasibleWithout } par famille, dans l'ordre des clés ;
//            « faisable » signifie statut glpk.GLP_OPT.
// Exemple  : await diagnoseByFamily(buildFamilies(ITEMS, RULES), ITEMS)
//              → [{ family: "testLength", isFeasibleWithout: true },
//                 { family: "quotas", isFeasibleWithout: true },
//                 { family: "exclusions", isFeasibleWithout: false }].
// Attention: solveModel peut renvoyer null (modèle vide) : il faut traiter
//            ce cas avant de lire le statut.
// (Indice 3 en fin de fichier.)
async function diagnoseByFamily(families: Families, items: Item[]): Promise<DiagnosticRow[]> {
  const rows: DiagnosticRow[] = [];
  // ... à compléter
  return rows;
}

// TODO 4 — Modèle élastique.
// Objectif : rendre chaque contrainte « molle » en lui ajoutant une ou deux
//            variables d'écart ≥ 0, et MINIMISER la violation pondérée
//            Σ weights[famille] · écart : la valeur optimale mesure la
//            violation minimale, les écarts non nuls désignent les
//            contraintes à assouplir.
// Entrée   : families, ex. buildFamilies(ITEMS, RULES) ; items, ex. ITEMS ;
//            weights, le poids de chaque famille,
//            ex. { testLength: 10, quotas: 1, exclusions: 10 }.
// Sortie   : un Model en minimisation (toujours faisable) dont l'objectif ne
//            contient que les écarts (noms et signes : CONSIGNE 4).
// Exemple  : résolu avec les poids ci-dessus → z = 1, et un seul écart non
//            nul, un écart de quota (« ecart_quota_… ») valant 1 ;
//            avec des poids tous égaux à 1, z vaut encore 1.
// Attention: les écarts NE doivent PAS figurer dans binaries (sinon un écart
//            ne pourrait pas dépasser 1) ; chaque contrainte a ses propres
//            écarts (noms distincts) ; ne pas modifier les contraintes
//            d'origine, en construire des copies.
// (Indice 4 en fin de fichier.)
function buildElasticModel(families: Families, items: Item[], weights: Record<string, number>): Model {
  return undefined; // ← à remplacer
}

// ─── 4. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Que t'apprend le fait que le modèle reste infaisable sans les exclusions ?
//  b) Qu'apporte la relaxation élastique par rapport au retrait progressif ?
//  c) Quel contrôle de l'exercice 7.1 aurait détecté le problème sans solveur ?

// ─── 5. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (buildFamilies) — const unitTerms = (concernedItems: Item[]): Term[] =>
//            concernedItems.map(item => ({ name: item.id, coef: 1 }));
//   testLength : [{ name: "longueur", vars: unitTerms(items), bnds: GLP_FX lb=ub=rules.testLength }]
//   quotas     : Object.entries(rules.minimums).map(([domain, minimum]) => ({ name: `quota_${domain}`, ... GLP_LO ... }))
//   exclusions : rules.exclusions.map(([idA, idB]) => ({ name: `exclusion_${idA}_${idB}`, ... GLP_UP ub 1 }))
//
// Indice 2 (buildModel) — subjectTo : Object.entries(families)
//               .filter(([familyName]) => /* familyName absent de familiesToRemove */)
//               .flatMap(([, constraints]) => constraints)
//
// Indice 3 (diagnoseByFamily) — boucle for...of sur Object.keys(families) ;
//   requireSolverOutput(await solveModel(...)) lève une erreur si solveModel
//   renvoie null ; empile { family: familyName, isFeasibleWithout: statut === glpk.GLP_OPT }.
//
// Indice 4 (buildElasticModel) — pour chaque [family, constraints] puis chaque constraint :
//   - copier constraint.vars, y ajouter le ou les écarts selon constraint.bnds.type ;
//   - ajouter chaque écart à l'objectif avec le coefficient weights[family] ;
//   - pousser { ...constraint, vars } dans subjectTo.
//   Retourner { name, objective: { direction: glpk.GLP_MIN, ... }, subjectTo,
//              binaries: les id des items (les écarts restent continus) }.
