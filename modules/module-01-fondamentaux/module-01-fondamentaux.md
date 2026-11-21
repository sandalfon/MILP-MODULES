# Module 1 — Fondamentaux de l'optimisation

> Niveau : débutant · Durée : 2 à 3 h
> Exemple commenté : `modules/module-01-fondamentaux/exemples/` · Exercices : `modules/module-01-fondamentaux/exercices/` · Corrigés : `modules/module-01-fondamentaux/corriges/`

**Objectif pédagogique** : reconnaître une décision, un objectif et une contrainte, puis évaluer toutes les solutions d'un petit problème.

## Objectifs

À la fin de ce module, tu sais :

- distinguer **données**, **variables de décision**, **fonction objectif** et **contraintes** ;
- écrire la **formulation mathématique** d'un petit problème de sélection ;
- évaluer une décision (réalisable ou non, quelle valeur) ;
- trouver l'optimum d'un petit problème en **énumérant** toutes les décisions possibles ;
- expliquer pourquoi l'énumération ne passe pas à l'échelle.

### Comment travailler ce module

Lis d'abord les notions (§1 à §7), exécute ensuite l'exemple commenté (§8) avec Node.js, puis réalise les exercices **sans regarder les corrigés**. Les scripts sont courts et conçus pour être modifiés : change une donnée (le budget, un coût…), relance, et observe l'effet sur l'optimum.

---

## 1. Optimiser, c'est choisir sous contraintes

Un problème d'optimisation pose une question de la forme :

> *Parmi toutes les décisions **autorisées**, laquelle est la **meilleure** ?*

Tout modèle d'optimisation a quatre ingrédients.

| Ingrédient | Rôle | Exemple fil rouge |
|---|---|---|
| **Données** (paramètres) | Valeurs connues, fixées avant de résoudre | coûts, valeurs, budget |
| **Variables de décision** | Ce que l'on choisit ; c'est l'inconnue | « prendre A ? », « prendre B ? »… |
| **Fonction objectif** | Ce que l'on maximise ou minimise | valeur totale des produits pris |
| **Contraintes** | Règles que toute décision doit respecter | coût total ≤ budget |

> **Piège classique** : confondre données et variables. Le budget (100 €) est une **donnée**. Le fait de prendre ou non le produit A est une **variable**. Le solveur ne modifie jamais les données ; il choisit les valeurs des variables.

## 2. L'exemple fil rouge : choisir des produits

Tu disposes de 100 € et de quatre produits :

| Produit | Coût (€) | Valeur (satisfaction) |
|---|---|---|
| A | 30 | 8 |
| B | 50 | 12 |
| C | 40 | 10 |
| D | 20 | 5 |

Chaque produit est soit pris, soit laissé : on ne peut pas en acheter la moitié.

### Variables de décision binaires

On associe à chaque produit une variable **binaire** :

```
x_A = 1 si A est choisi, 0 sinon
```

et de même pour `x_B`, `x_C` et `x_D`. Une **décision** est un vecteur de quatre valeurs 0/1, par exemple `(x_A, x_B, x_C, x_D) = (1, 1, 0, 1)` : « je prends A, B et D ».

### Formulation mathématique

```
MAX   8·x_A + 12·x_B + 10·x_C + 5·x_D          (valeur totale)
s.c.  30·x_A + 50·x_B + 40·x_C + 20·x_D ≤ 100   (budget)
      x_A, x_B, x_C, x_D ∈ {0, 1}               (domaine binaire)
```

(« s.c. » signifie « sous contraintes ».)

Remarque que la valeur totale et le coût total sont des **sommes de produits coefficient × variable**. Une telle expression est dite **linéaire**. Toute la suite du cours repose sur cette propriété.

## 3. Vocabulaire essentiel

- **Solution réalisable** (ou *admissible*) : une décision qui respecte **toutes** les contraintes. `(1,1,0,1)` coûte 30+50+20 = 100 ≤ 100, elle est donc réalisable.
- **Solution irréalisable** : elle viole au moins une contrainte. `(1,1,1,0)` coûte 120 > 100.
- **Valeur objectif** : le résultat de la fonction objectif pour une décision donnée. Pour `(1,1,0,1)` : 8+12+5 = 25.
- **Solution optimale** : une solution réalisable dont la valeur objectif est la meilleure possible. Il peut y en avoir plusieurs, à égalité.
- **Valeur optimale** : la valeur objectif de l'optimum. Elle est unique, même s'il existe plusieurs solutions optimales.

## 4. Traduire en TypeScript

### Représenter les données

```ts
type Product = { id: string; cost: number; value: number };

const PRODUCTS: Product[] = [
  { id: "A", cost: 30, value: 8 },
  { id: "B", cost: 50, value: 12 },
  { id: "C", cost: 40, value: 10 },
  { id: "D", cost: 20, value: 5 }
];
const BUDGET: number = 100;
```

### Représenter une décision

Un objet qui associe chaque identifiant à 0 ou 1 :

```ts
type Decision = Record<string, number>;

const x: Decision = { A: 1, B: 1, C: 0, D: 1 };
```

### Évaluer une expression linéaire

La somme `Σ coefᵢ · xᵢ` se traduit directement par `reduce` :

```ts
const totalCost: number = PRODUCTS.reduce((sum, product) => sum + product.cost * x[product.id], 0);
```

Garde ce schéma en tête : **toutes** les contraintes et tous les objectifs linéaires du cours s'évaluent ainsi.

## 5. Énumérer toutes les décisions

Avec `n` variables binaires, il existe `2ⁿ` décisions possibles. Pour n = 4, cela fait 16. On peut toutes les générer avec un **masque binaire** : l'entier `mask`, de 0 à 15, écrit en base 2, donne directement les valeurs de x.

| `mask` | binaire (D C B A) | décision |
|---|---|---|
| 0 | 0000 | rien |
| 1 | 0001 | A |
| 5 | 0101 | A, C |
| 11 | 1011 | A, B, D |
| 15 | 1111 | tout |

En JavaScript, le bit `i` de `mask` vaut 1 si `(mask & (1 << i)) !== 0`.

- `1 << i` est l'entier dont seul le bit i vaut 1 (1, 2, 4, 8…).
- `&` est le « ET » bit à bit : le résultat est non nul seulement si le bit i de `mask` est allumé.

L'algorithme d'énumération est alors :

```
meilleure ← aucune
pour chaque décision x parmi les 2ⁿ :
    si x est réalisable et (meilleure = aucune ou valeur(x) > valeur(meilleure)) :
        meilleure ← x
```

## 6. Pourquoi on ne peut pas tout énumérer

| n (variables binaires) | 2ⁿ décisions | temps à 1 milliard/seconde |
|---|---|---|
| 4 | 16 | instantané |
| 20 | ≈ 1 million | 1 ms |
| 40 | ≈ 10¹² | ≈ 18 minutes |
| 60 | ≈ 10¹⁸ | ≈ 36 ans |
| 100 | ≈ 10³⁰ | bien plus que l'âge de l'univers |

C'est l'**explosion combinatoire**. Un test de 40 items choisis dans une banque de 1 000 questions met en jeu 1 000 variables binaires : aucune énumération n'est envisageable. Les **solveurs MILP** (module 6) résolvent ces problèmes en évitant d'explorer la plupart des combinaisons, grâce aux relaxations et aux bornes (modules 2 et 5).

L'énumération reste cependant très utile **pour apprendre** et **pour tester** : sur un petit jeu de données, elle donne une réponse de référence à laquelle comparer un solveur.

## 7. Ajouter une contrainte

Ajoutons une règle : *au plus deux produits*. Elle s'écrit :

```
x_A + x_B + x_C + x_D ≤ 2
```

C'est une contrainte de **cardinalité**. Elle est linéaire elle aussi, avec tous ses coefficients égaux à 1.

### Contrainte saturée : quelle règle bloque l'optimum ?

À l'optimum (A, B, D), le coût vaut exactement 100 : le budget est entièrement consommé. On dit que la contrainte de budget est **saturée**. Sa **marge** (ou *écart*), c'est-à-dire `100 − coût`, vaut 0.

Avec la règle « au plus deux produits », l'optimum devient (B, C) pour un coût de 90. Le budget a maintenant une marge de 10 : il n'est plus saturé. C'est la cardinalité qui l'est (2 produits pour 2 autorisés).

Repérer la contrainte saturée dit **ce qui limite** la solution, donc ce qu'il faudrait assouplir pour faire mieux. Ici, augmenter le budget ne servirait à rien tant que la limite de deux produits reste en place. Le module 2 (§4, *Contrainte saturée*) approfondit cette notion.

> **À retenir** : ajouter une contrainte ne peut jamais **améliorer** l'optimum. L'ensemble des solutions réalisables ne peut que rétrécir, donc la meilleure valeur reste égale ou se dégrade.

## 8. Exemple commenté : énumérer les 16 choix

Le script `exemples/01-enumeration.ts` met en œuvre l'algorithme du §5 sur l'exemple fil rouge : il énumère les 16 combinaisons, calcule pour chacune le coût et la valeur, rejette celles qui dépassent 100 €, puis affiche la meilleure solution.

```bash
npm run tp1
# ou
node modules/module-01-fondamentaux/exemples/01-enumeration.ts
```

Résultat attendu :

```
{ selectedIds: [ 'A', 'B', 'D' ], cost: 100, value: 25 }
```

Le script reprend les noms des exercices (`Product`, `PRODUCTS`, `BUDGET`, `Solution`) et n'utilise que des fonctions pures. Le cœur de l'énumération tient en deux fonctions : le test du bit `index` du masque, et la génération des `2ⁿ` sélections.

```ts
const isSelectedInMask = (mask: number, index: number): boolean =>
  (mask & (1 << index)) !== 0;

const enumerateSelections = <T>(elements: T[]): T[][] =>
  Array.from({ length: 2 ** elements.length }, (_, mask) =>
    elements.filter((_, index) => isSelectedInMask(mask, index))
  );
```

La recherche de l'optimum enchaîne ensuite évaluation (coût, valeur, avec `evaluateSelection`), filtre de réalisabilité et sélection du meilleur :

```ts
function findBestSolution(products: Product[], budget: number): Solution | null {
  return enumerateSelections(products)
    .map(evaluateSelection)
    .filter(solution => solution.cost <= budget)
    .reduce<Solution | null>((best, solution) =>
      best === null || solution.value > best.value
        ? solution
        : best,
      null
    );
}
```

Comme la comparaison est **stricte** (`>`), en cas d'égalité c'est la première solution rencontrée qui est conservée. La fonction renvoie `null` si aucune sélection ne respecte le budget (impossible ici : la sélection vide coûte 0).

> **Pour expérimenter** : passe `BUDGET` à 90 ou à 60, relance et vérifie à la main que la solution affichée respecte bien le budget. Les exercices 1.1 à 1.3 reprennent la même démarche, pas à pas.

## 9. Vérification et points de vigilance

- **La solution doit toujours respecter le budget.** Une « solution » qui dépasse 100 € n'est pas une solution, quelle que soit sa valeur.
- **Vérifie indépendamment** le coût et la valeur de la sélection affichée : recalcule-les à partir des seuls identifiants retenus (à la main ou avec un `reduce` séparé). Un bug dans l'évaluation fausse tout le reste sans message d'erreur.
- **L'énumération est pédagogique** : elle devient vite impraticable quand le nombre de variables binaires augmente (§6). Elle sert de référence sur de petits jeux de données, pas de méthode de résolution.

---

## Exercices

| Fichier | Thème | Niveau |
|---|---|---|
| `ex1-1-evaluer-decision.ts` | Coût, valeur, réalisabilité d'une décision | ★☆☆ |
| `ex1-2-enumeration.ts` | Générer les 2ⁿ décisions, trouver l'optimum | ★★☆ |
| `ex1-3-cardinalite.ts` | Ajouter « au plus deux produits », comparer | ★★☆ |

Lance un exercice avec `node modules/module-01-fondamentaux/exercices/ex1-1-evaluer-decision.ts`. La section *Auto-vérification* t'indique ce qui est juste (✔) et ce qui reste à corriger (✘). Les corrigés, de mêmes noms, se lancent avec `node modules/module-01-fondamentaux/corriges/<fichier>.ts`.

> **À toi de jouer** : l'exercice de la version originale du cours (« ajoute une contrainte : au plus deux produits peuvent être choisis, puis compare la solution optimale avec et sans cette règle ») correspond exactement à l'**exercice 1.3** (`ex1-3-cardinalite.ts`). Résultat attendu : (A, B, D) = 25 avec le budget seul, (B, C) = 22 pour un coût de 90 avec la cardinalité.

## Ce qu'il faut retenir

1. Un modèle se compose de données, de variables, d'un objectif et de contraintes.
2. Une variable binaire encode un choix « oui/non ».
3. Coût et valeur sont des sommes `Σ coef·x` : des expressions **linéaires**.
4. L'énumération de 2ⁿ décisions est exacte mais explose avec n.
5. Plus il y a de contraintes, plus l'optimum est égal ou moins bon.

## À la fin du module

Tu sais désormais distinguer données, décisions, objectif, contraintes, solution réalisable et optimum. Le [module 2](../module-02-programmation-lineaire/module-02-programmation-lineaire.md) passe aux variables continues et à la programmation linéaire.

> **Repère** : les scripts sont des supports pédagogiques. Pour un vrai projet, ajoute des tests automatisés, contrôle les données en entrée et conserve la formulation mathématique à côté du code.
