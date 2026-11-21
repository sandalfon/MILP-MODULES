// Module 8 — Exemple commenté : information d'un item selon le modèle logistique 2PL
// et coefficients d'objectif moyens sur une grille de theta.
// Lancer : npm run tp8
// Convention utilisée ici : pas de facteur d'échelle D dans l'exposant.

// Item de la banque : a = discrimination, b = difficulté, domain = contenu.
type Item = {
  id: string;
  a: number;
  b: number;
  domain: string;
};

// Item enrichi de son coefficient d'objectif pour la MILP.
type ScoredItem = Item & { score: number };

// ─── Données ────────────────────────────────────────────────────

// Banque synthétique.
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

// Grille de niveaux theta à couvrir et poids associés (ici poids égaux).
const THETA_GRID = [-1, 0, 1];
const WEIGHTS = [1 / 3, 1 / 3, 1 / 3];

// ─── Calculs (fonctions pures) ──────────────────────────────────

// Probabilité de réponse correcte P(theta) dans le modèle 2PL (entre 0 et 1).
// discrimination = paramètre a, difficulty = paramètre b, theta = niveau de compétence.
const probability2PL = (discrimination: number, difficulty: number, theta: number): number =>
  1 / (1 + Math.exp(-discrimination * (theta - difficulty)));

// Information de Fisher pour un item dichotomique : a² * P * (1-P).
function information2PL(discrimination: number, difficulty: number, theta: number): number {
  const probability = probability2PL(discrimination, difficulty, theta);
  return discrimination ** 2 * probability * (1 - probability);
}

// Moyenne pondérée de l'information d'un item sur une grille de theta.
// weights doit avoir la même longueur que thetaGrid.
const computeWeightedInformation = (item: Item, thetaGrid: number[], weights: number[]): number =>
  thetaGrid.reduce((total, theta, thetaIndex) =>
    total + weights[thetaIndex] * information2PL(item.a, item.b, theta), 0);

// Pré-calcul des coefficients : l'objectif de la MILP devient linéaire.
// map crée de nouveaux objets : la banque d'origine n'est pas modifiée.
const scoreItems = (items: Item[], thetaGrid: number[], weights: number[]): ScoredItem[] =>
  items.map(item => ({ ...item, score: computeWeightedInformation(item, thetaGrid, weights) }));

// ─── Affichage ──────────────────────────────────────────────────

// Affiche les coefficients à utiliser dans la fonction objectif.
const scoredItems = scoreItems(ITEMS, THETA_GRID, WEIGHTS);
console.table(scoredItems.map(({ id, domain, score }) => ({ id, domain, score })));
