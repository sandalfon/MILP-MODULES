// Module 2 — Exemple commenté : évaluer les sommets candidats d'un programme linéaire.
// Lancer : npm run tp2   (ou node modules/module-02-programmation-lineaire/exemples/02-sommets-lp.ts)
// Le problème est : maximiser 3x + 2y avec x+y<=4, x<=2, y<=3, x>=0, y>=0.

// Un point du plan (x, y). Les variables sont continues : x=1,5 est autorisé.
type Point = {
  x: number;
  y: number;
};

// Un sommet réalisable accompagné de sa valeur objectif.
type EvaluatedVertex = Point & { objective: number };

// ─── Données ────────────────────────────────────────────────────
// Pour ce petit exemple, les intersections des droites de contraintes
// donnent les sommets candidats de la région réalisable.
const CANDIDATE_VERTICES: Point[] = [
  { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 1, y: 3 }, { x: 0, y: 3 }
];

// ─── Calculs (fonctions pures) ──────────────────────────────────
// Cette fonction renvoie true si un point respecte TOUTES les contraintes.
const isFeasible = ({ x, y }: Point): boolean =>
  x >= 0 &&                 // borne inférieure de x
  y >= 0 &&                 // borne inférieure de y
  x + y <= 4 &&             // contrainte de capacité
  x <= 2 &&                 // borne supérieure de x
  y <= 3;                   // borne supérieure de y

// Fonction objectif à maximiser.
const computeObjectiveValue = ({ x, y }: Point): number => 3 * x + 2 * y;

// filter élimine les points qui ne respectent pas toutes les contraintes.
// map calcule ensuite la valeur de l'objectif pour chaque point restant.
const evaluateFeasibleVertices = (vertices: Point[]): EvaluatedVertex[] =>
  vertices
    .filter(isFeasible)
    .map(vertex => ({ ...vertex, objective: computeObjectiveValue(vertex) }));

// reduce conserve le sommet dont la valeur objectif est la plus élevée.
// reduce sans valeur initiale exige un tableau non vide : on le vérifie avant.
const findOptimum = (evaluatedVertices: EvaluatedVertex[]): EvaluatedVertex => {
  if (evaluatedVertices.length === 0) {
    throw new Error("Aucun sommet réalisable : le LP est infaisable, il n'a pas d'optimum.");
  }
  return evaluatedVertices.reduce((bestVertex, vertex) =>
    vertex.objective > bestVertex.objective ? vertex : bestVertex
  );
};

// ─── Affichage ──────────────────────────────────────────────────
const evaluatedVertices = evaluateFeasibleVertices(CANDIDATE_VERTICES);

// console.table facilite la comparaison des points et de leurs objectifs.
console.table(evaluatedVertices);
console.log("Optimum :", findOptimum(evaluatedVertices));
