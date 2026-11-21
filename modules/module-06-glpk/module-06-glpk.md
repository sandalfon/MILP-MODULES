# Module 6 — Implémenter une MILP avec glpk.js

> Niveau : intermédiaire · Durée : 3 à 4 h
> Exemple commenté : `modules/module-06-glpk/exemples/` · Exercices : `modules/module-06-glpk/exercices/` · Corrigés : `modules/module-06-glpk/corriges/`

**Objectif pédagogique** : construire et résoudre un véritable modèle MILP avec `glpk.js` sous Node.js. C'est le premier module où le solveur MILP prend effectivement la décision.

## Objectifs

À la fin de ce module, tu sais :

- distinguer le **modèle** (ce que tu décris) du **solveur** (ce qui calcule) ;
- installer et initialiser `glpk.js` sous Node.js ;
- écrire un modèle `glpk.js` : objectif, contraintes, bornes, variables binaires et entières ;
- lancer la résolution, lire le **statut**, la valeur `z` et les valeurs des variables ;
- **construire le modèle à partir des données** plutôt que de l'écrire à la main ;
- **vérifier indépendamment** la solution renvoyée par le solveur.

### Comment travailler ce module

Lis d'abord les notions (§1 à §8), exécute ensuite l'exemple commenté (§9) dans Node.js, puis réalise les exercices sans regarder les corrigés. Les extraits de code sont courts : modifie-les (un coefficient, une borne, un type de contrainte) et relance pour observer l'effet.

---

## 1. Modèle et solveur

Jusqu'ici, tu as trouvé les optimums **toi-même** : par énumération (modules 1 et 3) ou avec un Branch and Bound simplifié (module 5). À partir de maintenant, c'est un **solveur** qui prend la décision.

| | Rôle | Qui l'écrit ? |
|---|---|---|
| **Modèle** | Décrit les variables, l'objectif et les contraintes | Toi |
| **Solveur** | Calcule une solution optimale du modèle | La bibliothèque (GLPK) |

**GLPK** (*GNU Linear Programming Kit*) est un solveur libre de programmation linéaire et en nombres entiers. **glpk.js** est GLPK compilé en WebAssembly : il tourne dans Node.js et dans le navigateur. Il utilise en interne le simplexe (module 2) et le Branch and Bound avec coupes (module 5).

> Le solveur ne connaît **que** ce que tu écris dans le modèle. Une règle métier oubliée dans le modèle n'existe pas pour lui. D'où l'importance de la vérification indépendante (§8).

## 2. Installation et initialisation

```bash
npm init -y
npm install glpk.js
```

Dans `package.json`, ajoute `"type": "module"` pour pouvoir écrire `import`.

```ts
import GLPK from "glpk.js/node";
import type { LP, Result } from "glpk.js/node";   // types fournis par la bibliothèque

type Model = LP;               // un modèle glpk.js
type SolverOutput = Result;    // la réponse de glpk.solve

const glpk = await GLPK();   // initialisation asynchrone (chargement du WebAssembly)
```

### Pourquoi `"glpk.js/node"` et pas `"glpk.js"` ?

Le paquet contient deux versions :

- `glpk.js` : la version **navigateur**, qui lance le calcul dans un *Web Worker* ;
- `glpk.js/node` : la version **Node.js**.

Node.js n'a pas d'objet `Worker` de navigateur. Importer `"glpk.js"` depuis Node produit donc l'erreur :

```
ReferenceError: Worker is not defined
```

Sous Node, il faut toujours importer `"glpk.js/node"`.

## 3. Structure d'un modèle

Reprenons le sac à dos du module 1 :

```
MAX   8·xA + 12·xB + 10·xC + 5·xD
s.c.  30·xA + 50·xB + 40·xC + 20·xD ≤ 100
      xA, xB, xC, xD ∈ {0, 1}
```

En `glpk.js`, cela donne :

```ts
const model: Model = {
  name: "sac_a_dos",
  objective: {
    direction: glpk.GLP_MAX,          // ou glpk.GLP_MIN
    name: "valeur",
    vars: [                           // Σ coef · variable
      { name: "A", coef: 8 }, { name: "B", coef: 12 },
      { name: "C", coef: 10 }, { name: "D", coef: 5 }
    ]
  },
  subjectTo: [                        // une entrée par contrainte (ligne)
    {
      name: "budget",
      vars: [
        { name: "A", coef: 30 }, { name: "B", coef: 50 },
        { name: "C", coef: 40 }, { name: "D", coef: 20 }
      ],
      bnds: { type: glpk.GLP_UP, lb: 0, ub: 100 }   // Σ ≤ 100
    }
  ],
  binaries: ["A", "B", "C", "D"]      // variables à valeurs dans {0, 1}
};
```

Correspondance entre l'écriture mathématique et le modèle :

| Mathématiques | glpk.js |
|---|---|
| MAX / MIN | `objective.direction` = `GLP_MAX` / `GLP_MIN` |
| Σ cᵢ xᵢ (objectif) | `objective.vars` : liste de `{ name, coef }` |
| une contrainte Σ aᵢ xᵢ (≤, ≥, =) b | une entrée de `subjectTo` : le membre de gauche Σ aᵢ xᵢ dans `vars`, le sens et le second membre b dans `bnds` |
| xᵢ ∈ {0,1} | nom de la variable dans `binaries` |
| xᵢ ∈ ℤ (entier) | nom dans `generals` |
| l ≤ xᵢ ≤ u | entrée de `bounds` : `{ name, type, lb, ub }` |

Une variable qui n'apparaît **ni** dans `binaries` **ni** dans `generals` est **continue**. Sans entrée dans `bounds`, elle est bornée par **0 ≤ x** : une variable n'est jamais négative par défaut.

## 4. Types de bornes

Le champ `bnds` (pour une contrainte) et les entrées de `bounds` (pour une variable) utilisent le même type :

| Constante | Valeur | Sens | Champs utilisés |
|---|---|---|---|
| `GLP_FR` | 1 | libre : −∞ < expr < +∞ | aucun |
| `GLP_LO` | 2 | expr ≥ lb | `lb` |
| `GLP_UP` | 3 | expr ≤ ub | `ub` |
| `GLP_DB` | 4 | lb ≤ expr ≤ ub (double borne) | `lb`, `ub` |
| `GLP_FX` | 5 | expr = lb (fixée, avec lb = ub) | `lb`, `ub` |

> **Piège** : avec `GLP_LO`, le champ `ub` est **ignoré**. Écrire `{ type: GLP_LO, lb: 1, ub: 0 }` est donc correct et signifie « ≥ 1 ». À l'inverse, `{ type: GLP_UP, lb: 5, ub: 10 }` signifie seulement « ≤ 10 » : le `lb` est ignoré. Pour encadrer une expression des deux côtés, utilise `GLP_DB`.

Exemples :

- au plus 2 produits : `vars` à coefficients 1, `bnds: { type: GLP_UP, ub: 2 }` ;
- exactement 2 produits : `bnds: { type: GLP_FX, lb: 2, ub: 2 }` ;
- entre 2 et 3 produits : `bnds: { type: GLP_DB, lb: 2, ub: 3 }`.

### Variables au membre de droite

GLPK attend la forme standard du [module 2 (§1)](../module-02-programmation-lineaire/module-02-programmation-lineaire.md) : **membre de gauche** (variables, dans `vars`) **sens et second membre** (une constante, dans `bnds`). Il n'y a aucun champ pour une variable à droite : le **second membre ne peut être qu'un nombre**. Une contrainte comme `q ≤ 80·y` doit donc être réécrite en passant tout à gauche ; son second membre devient `0` :

```
q − 80·y ≤ 0   →   vars: [{ name: "q", coef: 1 }, { name: "y", coef: -80 }],
                   bnds: { type: GLP_UP, ub: 0 }
```

## 5. Résoudre et lire le résultat

```ts
const solverOutput: SolverOutput = await glpk.solve(model, {
  msglev: glpk.GLP_MSG_OFF,   // pas de journal (GLP_MSG_ALL pour tout voir)
  presol: true,               // active le presolve (simplification du modèle)
  tmlim: 10,                  // limite de temps en secondes (optionnel)
  mipgap: 0                   // gap relatif toléré (0 = optimum prouvé)
});
```

> **`await` : où est-il vraiment nécessaire ?** Seule l'initialisation `GLPK()` est asynchrone : sans `await`, `glpk` serait une Promise et `glpk.solve` n'existerait pas. Sous Node.js (`"glpk.js/node"`, version 5.0), `glpk.solve(...)` est **synchrone** : il renvoie directement un `SolverOutput`. Le `await` placé devant est simplement toléré (attendre une valeur qui n'est pas une Promise la renvoie telle quelle). On le garde dans les exemples, car il rend le code compatible avec la version navigateur (`"glpk.js"`), où `solve()` renvoie une Promise.

Forme du résultat (vérifiée avec glpk.js 5.0) :

```ts
{
  name: "sac_a_dos",
  time: 0.001,
  result: {
    status: 5,                           // statut numérique
    z: 25,                               // valeur de l'objectif
    vars: { A: 1, B: 1, C: 0, D: 1 }     // valeurs des variables
  }
}
```

Pour un problème **continu** (sans `binaries` ni `generals`), `result` contient aussi `dual` : les valeurs duales des contraintes.

### Statuts

| Constante | Valeur | Signification |
|---|---|---|
| `GLP_UNDEF` | 1 | solution indéfinie |
| `GLP_FEAS` | 2 | solution réalisable, optimalité **non prouvée** (limite de temps, `mipgap`…) |
| `GLP_INFEAS` | 3 | solution irréalisable |
| `GLP_NOFEAS` | 4 | **aucune** solution réalisable : le modèle est infaisable |
| `GLP_OPT` | 5 | solution **optimale** |
| `GLP_UNBND` | 6 | problème non borné |

> **Observation pratique (glpk.js 5.0)** : pour un modèle en nombres entiers infaisable, le statut renvoyé est bien `GLP_NOFEAS` (4). En revanche, pour un modèle **purement continu** infaisable ou non borné, la bibliothèque renvoie `GLP_UNDEF` (1). Dans les deux cas, la règle est la même : **teste toujours le statut avant de lire `vars`**. Les variables valent alors 0 par défaut, et une sélection vide n'est pas une solution.

> Réciproquement, une solution absente n'est pas forcément un « échec métier » : un statut `GLP_NOFEAS` signifie que **les règles écrites dans le modèle** sont incompatibles entre elles (ou avec les données). C'est une information à diagnostiquer, pas un plantage du programme (voir le [module 7](../module-07-diagnostic-qualite/module-07-diagnostic-qualite.md)).

### Lire une variable binaire : le seuil 0,5

Le solveur calcule en nombres à virgule flottante. Une variable binaire peut donc revenir sous la forme `0.9999999` ou `1e-10`. On lit une décision avec un seuil :

```ts
const selectedProducts: Product[] = PRODUCTS.filter(product => (solverOutput.result.vars[product.id] ?? 0) > 0.5);
```

Ne teste jamais `=== 1`. Pour une variable entière, utilise `Math.round(value)`.

## 6. Construire le modèle à partir des données

Écrire le modèle à la main ne fonctionne que pour 4 produits. Avec 1 000 items, on le **génère** à partir des données, avec `map` :

```ts
const objectiveTerms = products.map(product => ({ name: product.id, coef: product.value }));
const budgetTerms    = products.map(product => ({ name: product.id, coef: product.cost }));
const unitTerms      = products.map(product => ({ name: product.id, coef: 1 }));   // cardinalité
```

Chaque règle métier devient une fonction qui produit une ou plusieurs contraintes. Le modèle s'assemble alors comme un jeu de briques. C'est la même idée qu'au module 3, où chaque règle était une contrainte linéaire séparée.

Pour relire le modèle généré, `glpk.write(model)` renvoie son texte au **format CPLEX LP**, lisible par un humain :

```
Maximize
 obj: + 8 A + 12 B + 10 C + 5 D
Subject To
 budget: + 30 A + 50 B + 40 C + 20 D <= 100
...
```

(`glpk.write` écrit un fichier temporaire dans le dossier courant puis l'efface, et affiche une ligne « Writing problem data… » dans la console.)

## 7. Variables entières et coût fixe

Toutes les variables ne sont pas binaires. Prenons l'exemple de trois usines qui doivent produire ensemble exactement 120 unités :

| Usine | Capacité | Coût fixe d'ouverture | Coût unitaire | Production minimale si ouverte |
|---|---|---|---|---|
| U1 | 80 | 300 | 2 | 20 |
| U2 | 60 | 200 | 3 | 20 |
| U3 | 50 | 100 | 5 | 20 |

- `y_u ∈ {0,1}` : l'usine u est ouverte (variable dans `binaries`) ;
- `q_u ∈ ℤ, q_u ≥ 0` : les unités produites par l'usine u (variable dans `generals`).

Le modèle reprend les contraintes d'activation du module 4 (`min·y ≤ q ≤ cap·y`) :

```
MIN   Σ (fixe_u · y_u + unitaire_u · q_u)
s.c.  Σ q_u = 120                       (demande)
      q_u − cap_u · y_u ≤ 0              (pas de production si fermée)
      q_u − min_u · y_u ≥ 0              (production minimale si ouverte)
```

La capacité joue ici le rôle du « M » de la formulation Big-M : c'est le M le plus **serré** possible, car tiré directement des données.

## 8. Vérification indépendante

Après la résolution, **recalcule** toi-même, à partir des seules décisions lues, chaque contrainte et l'objectif :

1. le statut est-il `GLP_OPT` (ou `GLP_FEAS`, si une solution non prouvée optimale est acceptée) ?
2. chaque contrainte est-elle respectée ? (coût ≤ budget, cardinalité…)
3. l'objectif recalculé est-il égal à `z` (à une tolérance près) ?

Le vérificateur ne doit **pas** réutiliser le code qui a construit le modèle. Sinon, une même erreur fausserait à la fois le modèle et la vérification, et passerait inaperçue.

## 9. Exemple commenté : le sac à dos résolu par GLPK

Le script `exemples/06-sac-a-dos-glpk.ts` résout le sac à dos des quatre produits (§3) avec un vrai solveur. Il illustre trois idées du module :

- les **données** (`PRODUCTS`, `BUDGET`) sont séparées du **modèle** ;
- le modèle est **généré** par une fonction pure, `buildKnapsackModel`, qui ne lit `glpk` que pour ses constantes (§6) ;
- la résolution elle-même se fait en dehors de cette fonction.

Les types `Model`, `Term` et `SolverOutput` reprennent ceux de la bibliothèque (`type Model = LP`, `type Term = LP["objective"]["vars"][number]`, `type SolverOutput = Result`) ; `GlpkConstants` ne décrit que les deux constantes lues (`GLP_MAX`, `GLP_UP`).

```ts
function buildKnapsackModel(glpk: GlpkConstants, products: Product[], budget: number): Model {
  // Fonction objectif : maximiser la somme des valeurs des produits choisis.
  const objectiveTerms: Term[] = products.map(product => ({ name: product.id, coef: product.value }));
  // Coefficients des coûts dans la contrainte 30A+50B+40C+20D <= 100.
  const budgetTerms: Term[] = products.map(product => ({ name: product.id, coef: product.cost }));

  return {
    name: "selection_produits",
    objective: { direction: glpk.GLP_MAX, name: "satisfaction", vars: objectiveTerms },

    // Contraintes : ici une seule contrainte de budget.
    // GLP_UP signifie que la somme doit être inférieure ou égale à ub.
    subjectTo: [{
      name: "budget",
      vars: budgetTerms,
      bnds: { type: glpk.GLP_UP, ub: budget, lb: 0 }
    }],

    // Déclare toutes les variables comme binaires (0 ou 1).
    binaries: products.map(product => product.id)
  };
}

const glpk = await GLPK();
const solverOutput: SolverOutput = await glpk.solve(buildKnapsackModel(glpk, PRODUCTS, BUDGET), {
  msglev: glpk.GLP_MSG_OFF,
  presol: true
});
console.log(solverOutput);
```

Lancer depuis la racine du projet :

```bash
npm run tp6
# ou
node modules/module-06-glpk/exemples/06-sac-a-dos-glpk.ts
```

Sortie attendue (le champ `time` varie) :

```
{
  name: 'selection_produits',
  time: 0.007,
  result: { vars: { A: 1, B: 1, C: 0, D: 1 }, z: 25, status: 5 }
}
```

Statut 5 = `GLP_OPT` ; z = 25 avec A, B et D : c'est la solution trouvée par énumération au [module 1](../module-01-fondamentaux/module-01-fondamentaux.md).

## 10. Vérification et points de vigilance

- La documentation de `glpk.js` décrit l'API et les types de variables. **Vérifie la version installée** (`npm ls glpk.js`) : les objets de résultat peuvent évoluer d'une version à l'autre. Les formes et statuts donnés dans ce module ont été observés avec glpk.js 5.0.
- **Contrôle toujours le statut** renvoyé par ton exécution avant d'interpréter `z` ou `vars` (§5).
- Sous Node.js, importe `"glpk.js/node"` (§2), et n'oublie pas le `await` devant `GLPK()`.
- Les scripts du cours sont des supports pédagogiques. Dans un vrai projet, ajoute des tests automatisés, contrôle les données en entrée et conserve la formulation mathématique à côté du code.

Documentation technique : dépôt et README de GLPK.js, [github.com/jvail/glpk.js](https://github.com/jvail/glpk.js). Le dépôt décrit la structure `objective` / `subjectTo` / `binaries` et l'appel `solve()`.

---

## Exercices

| Fichier | Thème | Niveau |
|---|---|---|
| `ex6-1-premier-modele.ts` | Écrire le sac à dos à la main, résoudre, lire statut et variables | ★☆☆ |
| `ex6-2-modele-depuis-donnees.ts` | Générer le modèle depuis les données, cardinalités (= « À toi de jouer »), vérification | ★★☆ |
| `ex6-3-entiers-et-cout-fixe.ts` | Variables entières + binaires d'activation, comparaison à l'énumération | ★★★ |

> **« À toi de jouer » du cours d'origine** — « Ajoute à ce modèle la contrainte de cardinalité A + B + C + D ≤ 2. Impose ensuite **exactement** deux produits avec `GLP_FX`, `lb = 2` et `ub = 2`. Vérifie les valeurs retournées. » : c'est exactement l'**exercice 6.2** (`ex6-2-modele-depuis-donnees.ts`), options `maxCardinality: 2` (contrainte `GLP_UP`) et `exactCardinality: 2` (contrainte `GLP_FX`, lb = ub = 2). Résultat attendu dans les deux cas : statut optimal, B et C choisis, z = 22. La contrainte ≤ 2 étant saturée à l'optimum, imposer = 2 ne change rien ici.

Lancer un exercice depuis la racine du projet, par exemple :

```bash
node modules/module-06-glpk/exercices/ex6-1-premier-modele.ts
```

Les corrigés portent le même nom dans `modules/module-06-glpk/corriges/`.

## Ce qu'il faut retenir

1. Sous Node.js : `import GLPK from "glpk.js/node"`, puis `await GLPK()`.
2. Un modèle = `objective` + `subjectTo` + `binaries` / `generals` / `bounds`.
3. Toute contrainte s'écrit **Σ coef·var** comparée à une **constante** : `GLP_UP` (≤), `GLP_LO` (≥), `GLP_FX` (=), `GLP_DB` (encadrée).
4. Teste le **statut** avant de lire les variables ; lis un binaire avec `> 0.5`.
5. Génère le modèle avec `map` à partir des données, et vérifie la solution avec un code indépendant.

## À la fin du module

Tu sais construire une MILP en TypeScript et appeler un solveur réel. Au [module 7](../module-07-diagnostic-qualite/module-07-diagnostic-qualite.md), tu apprendras à diagnostiquer un modèle infaisable et à contrôler la qualité d'une solution.
