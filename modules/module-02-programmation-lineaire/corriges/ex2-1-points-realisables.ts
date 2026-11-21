/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 2 — Exercice 2.1 : Points réalisables et sommets — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-02-programmation-lineaire/module-02-programmation-lineaire.md (§1 et §4)
 *  Lancer : node modules/module-02-programmation-lineaire/corriges/ex2-1-points-realisables.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  Problème :  MAX 3x + 2y  s.c.  x + y ≤ 4,  x ≤ 2,  y ≤ 3,  x, y ≥ 0.
 *
 *  1. isFeasible(x, y)
 *     Un point est réalisable s'il respecte TOUTES les contraintes : on
 *     les relie par &&. Les bornes x ≥ 0 et y ≥ 0 sont des contraintes
 *     à part entière : les oublier laisserait passer (−1, 0).
 *     Les variables sont CONTINUES : (1.5, 2.5) est un point légitime,
 *     contrairement au module 1 où seules les valeurs 0/1 comptaient.
 *
 *  2. computeObjective(x, y) = 3x + 2y : une simple expression linéaire.
 *
 *  3. evaluatePoints : un map qui produit une ligne par point. On
 *     calcule l'objectif même pour les points irréalisables ; c'est
 *     instructif : (3, 1) vaudrait 11 > 10, mais il viole x ≤ 2.
 *
 *  4. findBestPoint : on filtre d'abord les réalisables, puis on garde
 *     le maximum avec reduce. Sans le filtre, on renverrait (2, 3) qui
 *     vaut 12 mais viole x + y ≤ 4 : c'est l'erreur la plus fréquente.
 *
 *  Réponses aux questions
 *  a) (1, 1) est réalisable (il est à l'intérieur de la région) mais
 *     vaut seulement 5. Un point intérieur n'est jamais optimal pour un
 *     objectif non nul : on peut toujours avancer dans la direction de
 *     l'objectif jusqu'à toucher le bord. D'où l'intérêt des sommets.
 *  b) Les points qui battent l'optimum, (3, 1) = 11 et (2, 3) = 12, sont
 *     tous irréalisables. C'est normal : s'ils étaient réalisables,
 *     (2, 2) ne serait pas optimal.
 *  c) En (2, 2), x + y = 4 et x = 2 : ces deux contraintes sont
 *     SATURÉES. y = 2 < 3 : la contrainte y ≤ 3 ne l'est pas.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// Un point du plan, sous forme de couple [x, y].
type Coordinates = [x: number, y: number];
// Une ligne du tableau d'évaluation.
type PointRow = { x: number; y: number; isFeasible: boolean; objective: number };

// ─── 1. DONNÉES ─────────────────────────────────────────────────
// Sommets de la région réalisable (calculés à la main, cf. cours §4).
const CANDIDATE_VERTICES: Coordinates[] = [[0, 0], [2, 0], [2, 2], [1, 3], [0, 3]];
// Points de test : un intérieur et quelques points hors de la région.
const TEST_POINTS: Coordinates[] = [[1, 1], [3, 1], [2, 3], [-1, 0], [1.5, 2.5]];

// ─── 2. FONCTIONS ───────────────────────────────────────────────

// Vrai si (x, y) respecte toutes les contraintes, bornes comprises.
function isFeasible(x: number, y: number): boolean {
  return (
    x >= 0 &&      // borne inférieure de x
    y >= 0 &&      // borne inférieure de y
    x + y <= 4 &&  // capacité commune
    x <= 2 &&      // borne supérieure de x
    y <= 3         // borne supérieure de y
  );
}

// Fonction objectif à maximiser.
function computeObjective(x: number, y: number): number {
  return 3 * x + 2 * y;
}

// Une ligne de tableau par point : coordonnées, réalisabilité, objectif.
function evaluatePoints(points: Coordinates[]): PointRow[] {
  return points.map(([x, y]) => ({ x, y, isFeasible: isFeasible(x, y), objective: computeObjective(x, y) }));
}

// Meilleur point PARMI LES RÉALISABLES, ou null s'il n'y en a aucun.
function findBestPoint(points: Coordinates[]): PointRow | null {
  const feasibleRows = evaluatePoints(points).filter(row => row.isFeasible);
  if (feasibleRows.length === 0) return null;
  return feasibleRows.reduce((best, row) => (row.objective > best.objective ? row : best));
}

// ─── 3. PROGRAMME PRINCIPAL ─────────────────────────────────────
printTitle("Sommets candidats");
console.table(evaluatePoints(CANDIDATE_VERTICES));
console.log("Optimum parmi les sommets :", findBestPoint(CANDIDATE_VERTICES));

printTitle("Autres points de test");
console.table(evaluatePoints(TEST_POINTS));

// ─── 4. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("(2, 2) réalisable", () => isFeasible(2, 2), true);
check("(1.5, 2.5) réalisable (variables continues)", () => isFeasible(1.5, 2.5), true);
check("(3, 1) viole x ≤ 2", () => isFeasible(3, 1), false);
check("(2, 3) viole x + y ≤ 4", () => isFeasible(2, 3), false);
check("(-1, 0) viole x ≥ 0", () => isFeasible(-1, 0), false);
check("objectif(1, 3) = 9", () => computeObjective(1, 3), 9);
check("objectifs des sommets", () => evaluatePoints(CANDIDATE_VERTICES).map(row => row.objective), [0, 6, 10, 9, 6]);
check("optimum = (2, 2) de valeur 10",
  () => findBestPoint(CANDIDATE_VERTICES), { x: 2, y: 2, isFeasible: true, objective: 10 });
check("le meilleur point de test réalisable est (1.5, 2.5) = 9.5",
  () => findBestPoint(TEST_POINTS)?.objective, 9.5);
check("aucun point réalisable → null", () => findBestPoint([[5, 5], [-1, -1]]), null);
printSummary();
