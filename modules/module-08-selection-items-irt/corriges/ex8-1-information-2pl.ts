/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 8 — Exercice 8.1 : Information d'un item 2PL — CORRIGÉ
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-08-selection-items-irt/module-08-selection-items-irt.md (§1 à §4)
 *  Lancer : node modules/module-08-selection-items-irt/corriges/ex8-1-information-2pl.ts
 *
 *  EXPLICATIONS
 *  ------------
 *  1. probability2PL(a, b, theta, scaleFactorD)
 *     P(θ) = 1 / (1 + exp(−D·a·(θ − b))). Le paramètre scaleFactorD (le D
 *     de la formule) vaut 1 par défaut (convention SANS facteur
 *     d'échelle). Avec D = 1.7, on retrouve la convention « normal
 *     ogive » de certains logiciels.
 *
 *  2. information2PL(a, b, theta, scaleFactorD)
 *     I(θ) = (D·a)² · P · (1 − P). Le carré porte sur D·a : avec
 *     D = 1.7, l'information est multipliée par environ 2,89 à θ = b.
 *     En θ = b, P = 1/2, donc I(b) = (D·a)²/4 : c'est le maximum.
 *
 *  3. buildInformationMatrix(items, thetaGrid)
 *     Une ligne par item, une colonne par θ. C'est le tableau des
 *     COEFFICIENTS que l'on donnera au solveur : le calcul non linéaire
 *     est fait ici, une fois pour toutes, avant l'optimisation.
 *
 *  4. computeMeanCoefficient(row, weights)
 *     c_i = Σ_t w_t · I_i(θ_t). Avec des poids 1/3, c'est la moyenne.
 *     Les poids doivent sommer à 1 si l'on veut une vraie moyenne. Ce
 *     n'est pas obligatoire pour optimiser : multiplier tous les
 *     coefficients par une constante ne change pas la solution optimale.
 *
 *  5. computeTestInformation(selectedIds, theta)
 *     La TIF est la SOMME des informations des items retenus. C'est
 *     exactement Σ I_i(θ)·x_i avec x_i ∈ {0, 1}.
 *
 *  Pièges fréquents
 *  - Écrire exp(−a·θ − b) au lieu de exp(−a·(θ − b)) : les parenthèses
 *    sont essentielles.
 *  - Oublier le carré de a (ou de D·a) dans l'information.
 *  - Mélanger les conventions : des paramètres calibrés AVEC D = 1.7
 *    utilisés dans la formule SANS D sous-estiment toutes les
 *    informations, et peuvent changer l'ordre des items.
 *
 *  Réponses aux questions
 *  a) À θ = 1, l'item le plus informatif est q05 (a = 2, b = 0.8, donc
 *     proche de 1 et très discriminant) : I ≈ 0,961.
 *  b) q02 a la même information à θ = −1 et θ = 0 (0,6658). Ces deux
 *     points sont symétriques par rapport à b = −0,5, à une distance
 *     de 0,5 de chaque côté.
 *  c) D = 1,7 multiplie tous les coefficients, mais pas tous du même
 *     facteur hors de θ = b, car D modifie aussi la pente de P. Le
 *     classement des items à un θ donné peut donc changer : il faut
 *     connaître la convention de calibration.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES ─────────────────────────────────────────────────
// Banque synthétique : a = discrimination, b = difficulté.
type Item = { id: string; a: number; b: number; domain: string };

const ITEMS: Item[] = [
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
  { id: "q12", a: 1.6, b: 0.1, domain: "D" }
];
const THETA_GRID: number[] = [-1, 0, 1];
const WEIGHTS: number[] = [1 / 3, 1 / 3, 1 / 3];

// ─── 2. FONCTIONS ───────────────────────────────────────────────

// P(θ) : probabilité de réponse correcte.
function probability2PL(a: number, b: number, theta: number, scaleFactorD = 1): number {
  return 1 / (1 + Math.exp(-scaleFactorD * a * (theta - b)));
}

// I(θ) = (D·a)² · P · (1 − P).
function information2PL(a: number, b: number, theta: number, scaleFactorD = 1): number {
  const probability = probability2PL(a, b, theta, scaleFactorD);
  return (scaleFactorD * a) ** 2 * probability * (1 - probability);
}

// informationMatrix[i][t] = I_i(θ_t) : une ligne par item, une colonne par θ.
function buildInformationMatrix(items: Item[], thetaGrid: number[]): number[][] {
  return items.map(item => thetaGrid.map(theta => information2PL(item.a, item.b, theta)));
}

// c_i = Σ_t w_t · I_i(θ_t).
function computeMeanCoefficient(row: number[], weights: number[]): number {
  return row.reduce((sum, information, thetaIndex) => sum + weights[thetaIndex] * information, 0);
}

// TIF(θ) = Σ_{i retenu} I_i(θ).
function computeTestInformation(selectedIds: string[], theta: number): number {
  return ITEMS
    .filter(item => selectedIds.includes(item.id))
    .reduce((sum, item) => sum + information2PL(item.a, item.b, theta), 0);
}

// ─── 3. PROGRAMME PRINCIPAL ─────────────────────────────────────
// Les `?.` évitent un plantage tant que les TODO ne sont pas faits.
printTitle("Matrice d'information (items × θ) et coefficient moyen");
const informationMatrix = buildInformationMatrix(ITEMS, THETA_GRID) ?? [];
console.table(ITEMS.map((item, i) => ({
  id: item.id,
  domain: item.domain,
  "I(-1)": informationMatrix[i]?.[0]?.toFixed(4),
  "I(0)": informationMatrix[i]?.[1]?.toFixed(4),
  "I(+1)": informationMatrix[i]?.[2]?.toFixed(4),
  mean: informationMatrix[i] && computeMeanCoefficient(informationMatrix[i], WEIGHTS)?.toFixed(4)
})));

printTitle("Effet de la convention D = 1.7 sur l'item q01");
console.table(THETA_GRID.map(theta => ({
  theta,
  "sans D": information2PL(1.2, -1.0, theta)?.toFixed(4),
  "D = 1.7": information2PL(1.2, -1.0, theta, 1.7)?.toFixed(4)
})));

printTitle("Information d'un petit test {q02, q08}");
for (const theta of THETA_GRID) {
  console.log(`  TIF(${theta}) = ${computeTestInformation(["q02", "q08"], theta)?.toFixed(4)}`);
}

// ─── 4. AUTO-VÉRIFICATION ───────────────────────────────────────
printTitle("Auto-vérification");
check("P(θ = b) = 0.5", () => probability2PL(1.5, 0.4, 0.4), 0.5);
check("P de q01 à θ = 0 ≈ 0.7685", () => probability2PL(1.2, -1.0, 0), 0.7685, 1e-4);
check("I(b) = a²/4 pour q05 (= 1)", () => information2PL(2.0, 0.8, 0.8), 1);
check("symétrie I(b + 0.7) = I(b − 0.7)",
  () => information2PL(1.4, -0.8, -0.1) - information2PL(1.4, -0.8, -1.5), 0);
check("ligne de q01 dans la matrice",
  () => buildInformationMatrix(ITEMS, THETA_GRID)[0].map(information => +information.toFixed(4)),
  [0.36, 0.2562, 0.1098]);
check("matrice de taille 12 × 3", () => {
  const checkedMatrix = buildInformationMatrix(ITEMS, THETA_GRID);
  return [checkedMatrix.length, checkedMatrix[0].length];
}, [12, 3]);
check("coefficient moyen de q02 ≈ 0.5076",
  () => computeMeanCoefficient(buildInformationMatrix(ITEMS, THETA_GRID)[1], WEIGHTS), 0.5076, 1e-4);
check("avec D = 1.7, I_max de q01 = (1.7·1.2)²/4 ≈ 1.0404",
  () => information2PL(1.2, -1.0, -1.0, 1.7), 1.0404, 1e-4);
check("TIF de {q02, q08} à θ = 0 ≈ 1.3831",
  () => computeTestInformation(["q02", "q08"], 0), 1.3831, 1e-3);
check("item le plus informatif à θ = 1 : q05", () => {
  const checkedMatrix = buildInformationMatrix(ITEMS, THETA_GRID);
  let bestIndex = 0;
  checkedMatrix.forEach((row, i) => { if (row[2] > checkedMatrix[bestIndex][2]) bestIndex = i; });
  return ITEMS[bestIndex].id;
}, "q05");
printSummary();
