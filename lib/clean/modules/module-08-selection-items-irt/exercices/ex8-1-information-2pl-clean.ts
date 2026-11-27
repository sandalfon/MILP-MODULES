/**
 * ══════════════════════════════════════════════════════════════
 *  MODULE 8 — Exercice 8.1 : Information d'un item 2PL
 * ══════════════════════════════════════════════════════════════
 *  Cours : modules/module-08-selection-items-irt/module-08-selection-items-irt.md (§1 à §4)
 *  Niveau : ★★☆   Durée indicative : 45 min
 *  Lancer : node modules/module-08-selection-items-irt/exercices/ex8-1-information-2pl.ts
 *
 *  OBJECTIF
 *  Calculer les coefficients d'information qui serviront d'objectif à
 *  la MILP d'assemblage de test (exercices 8.2 à 8.4), en trois étapes :
 *  - pour UN item, la probabilité de réussite P(θ) du modèle 2PL, puis
 *    l'information de Fisher I(θ) qu'il apporte (TODO 1 et 2) ;
 *  - pour toute la BANQUE, la matrice des I_i(θ_t) (un item par ligne,
 *    un θ par colonne), puis le coefficient moyen pondéré de chaque
 *    item (TODO 3 et 4) ;
 *  - pour un TEST déjà choisi, son information totale TIF(θ) à un
 *    niveau θ donné (TODO 5).
 *
 *  PRÉREQUIS
 *  - Cours : formules P(θ) et I(θ) du modèle 2PL, convention D.
 *  - TypeScript : Math.exp, map imbriqués (number[][]), reduce avec index.
 *
 *  CONSIGNE
 *  Complète les fonctions marquées TODO, dans l'ordre :
 *    1. probability2PL(a, b, theta, scaleFactorD = 1) → 1 / (1 + exp(−D·a·(θ − b)))
 *    2. information2PL(a, b, theta, scaleFactorD = 1) → (D·a)² · P · (1 − P)
 *    3. buildInformationMatrix(items, thetaGrid) → informationMatrix[i][t] = I_i(θ_t)
 *    4. computeMeanCoefficient(row, weights)       → Σ_t weights[t] · row[t]
 *    5. computeTestInformation(selectedIds, theta) → Σ des I(θ) des items dont l'id est dans selectedIds
 *  (scaleFactorD est le facteur d'échelle D des formules.)
 *  Puis réponds aux QUESTIONS en bas du programme principal.
 *
 *  RÉSULTAT ATTENDU
 *  Ligne q01 : 0.3600 / 0.2562 / 0.1098, moyenne 0.2420.
 *  I(b) = a²/4. Toutes les lignes de l'auto-vérification marquées ✔.
 */

import { check, printSummary, printTitle } from "../../../lib/verif.ts";

// ─── 1. DONNÉES (fournies, ne pas modifier) ─────────────────────
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

// ─── 2. FONCTIONS À COMPLÉTER ───────────────────────────────────

// TODO 1 — Probabilité de réponse correcte (modèle 2PL).
// Objectif : calculer P(θ) = 1 / (1 + exp(−D · a · (θ − b))), la probabilité qu'un
//            candidat de niveau θ réussisse un item de discrimination a et de difficulté b.
// Entrée   : a, la discrimination (ex. 1.2) ;
//            b, la difficulté (ex. −1.0) ;
//            theta, le niveau du candidat (ex. 0) ;
//            scaleFactorD, le facteur d'échelle D
//              (1 par défaut, 1.7 dans l'autre convention).
// Sortie   : un nombre entre 0 et 1.
// Exemple  : probability2PL(1.2, -1.0, 0) → ≈ 0.7685 ; probability2PL(1.5, 0.4, 0.4) → 0.5 (θ = b).
// Attention: les parenthèses comptent : c'est −D·a·(θ − b), pas −D·a·θ − b.
// (Indice 1 en fin de fichier.)
function probability2PL(a: number, b: number, theta: number, scaleFactorD = 1): number {
  return undefined; // ← à remplacer
}

// TODO 2 — Information de Fisher d'un item 2PL.
// Objectif : calculer I(θ) = (D·a)² · P(θ) · (1 − P(θ)), la précision qu'apporte
//            l'item pour estimer un niveau θ (cours §2).
// Entrée   : mêmes paramètres que probability2PL :
//            a, ex. 2.0 ;
//            b, ex. 0.8 ;
//            theta, ex. 0.8 ;
//            scaleFactorD, ex. 1.
// Sortie   : un nombre ≥ 0, maximal en θ = b où il vaut (D·a)²/4.
// Exemple  : information2PL(2.0, 0.8, 0.8) → 1 (= 2²/4) ;
//            information2PL(1.2, -1.0, -1.0, 1.7) → ≈ 1.0404 (= (1.7·1.2)²/4).
// Attention: le carré porte sur D·a, pas seulement sur a ; P doit être calculée
//            avec le même facteur D.
// (Indice 2 en fin de fichier.)
function information2PL(a: number, b: number, theta: number, scaleFactorD = 1): number {
  return undefined; // ← à remplacer
}

// TODO 3 — Matrice d'information de la banque.
// Objectif : pré-calculer I_i(θ_t) pour chaque item i et chaque θ_t de la grille
//            (convention sans D) : ce sont les coefficients que recevra le solveur.
// Entrée   : items, la banque (ex. ITEMS, 12 items) ;
//            thetaGrid, les niveaux θ (ex. THETA_GRID = [-1, 0, 1]).
// Sortie   : un tableau number[][] avec une ligne par item (même ordre que items)
//            et une colonne par θ (même ordre que thetaGrid).
// Exemple  : buildInformationMatrix(ITEMS, THETA_GRID) → 12 lignes de 3 valeurs ;
//            la ligne de q01 vaut ≈ [0.3600, 0.2562, 0.1098].
// (Indice 3 en fin de fichier.)
function buildInformationMatrix(items: Item[], thetaGrid: number[]): number[][] {
  return undefined; // ← à remplacer
}

// TODO 4 — Coefficient moyen pondéré d'un item.
// Objectif : calculer c_i = Σ_t w_t · I_i(θ_t), le coefficient de x_i dans l'objectif
//            « information moyenne » (cours §4).
// Entrée   : row, la ligne de la matrice pour un item, ex. [0.3600, 0.2562, 0.1098] ;
//            weights, un poids par θ, ex. WEIGHTS = [1/3, 1/3, 1/3].
// Sortie   : un nombre, la somme des produits weights[t] · row[t].
// Exemple  : computeMeanCoefficient([0.3600, 0.2562, 0.1098], WEIGHTS) → ≈ 0.2420 ;
//            pour la ligne de q02 → ≈ 0.5076.
// Attention: row et weights ont la même longueur ; associe chaque valeur au poids
//            de même position.
// (Indice 4 en fin de fichier.)
function computeMeanCoefficient(row: number[], weights: number[]): number {
  return undefined; // ← à remplacer
}

// TODO 5 — Information d'un test (TIF) à un niveau θ.
// Objectif : calculer TIF(θ) = Σ I_i(θ) sur les items retenus, c'est-à-dire
//            Σ I_i(θ)·x_i avec x_i = 1 pour les items choisis (cours §3).
// Entrée   : selectedIds, les identifiants des items du test, ex. ["q02", "q08"] ;
//            theta, le niveau, ex. 0. Les paramètres a et b se lisent dans ITEMS.
// Sortie   : un nombre, la somme des informations (sans facteur D).
// Exemple  : computeTestInformation(["q02", "q08"], 0) → ≈ 1.3831 (0.6658 + 0.7173).
// Attention: un test vide a une information nulle : computeTestInformation([], 0) → 0.
// (Indice 5 en fin de fichier.)
function computeTestInformation(selectedIds: string[], theta: number): number {
  return undefined; // ← à remplacer
}

// ─── 3. PROGRAMME PRINCIPAL (fourni) ────────────────────────────
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

// QUESTIONS :
//  a) Quel item est le plus informatif à θ = 1 ? Pourquoi (regarde a et b) ?
//  b) Pourquoi q02 a-t-il exactement la même information à θ = −1 et θ = 0 ?
//  c) Avec D = 1.7, le classement des items à un θ donné peut-il changer ?
//     Qu'en conclure avant d'utiliser une banque réelle ?

// ─── 4. AUTO-VÉRIFICATION (ne pas modifier) ─────────────────────
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

// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (probability2PL) — Math.exp(v) calcule e^v ; écris d'abord l'exposant
//   −scaleFactorD · a · (theta − b), puis 1 / (1 + Math.exp(exposant)).
//
// Indice 2 (information2PL) — réutilise probability2PL(a, b, theta, scaleFactorD)
//   avec le même scaleFactorD, puis multiplie par (scaleFactorD * a) ** 2.
//
// Indice 3 (buildInformationMatrix) — deux map imbriqués :
//   items.map(item => thetaGrid.map(theta => ...)).
//
// Indice 4 (computeMeanCoefficient) — un reduce qui utilise l'index :
//   row.reduce((sum, information, thetaIndex) => ..., 0).
//
// Indice 5 (computeTestInformation) — ITEMS.filter(item => selectedIds.includes(item.id))
//   puis reduce sur information2PL(item.a, item.b, theta).
