# Module 5 — Algorithmes de résolution

> Niveau : avancé · Durée : environ 3 h
> Exemple commenté : `modules/module-05-algorithmes-resolution/exemples/` · Exercices : `modules/module-05-algorithmes-resolution/exercices/` · Corrigés : `modules/module-05-algorithmes-resolution/corriges/`

**Objectif pédagogique** : comprendre comment un solveur explore les solutions et comment lire les bornes et le gap.

## Objectifs

À la fin de ce module, tu sais :

- expliquer pourquoi la MILP est difficile et pourquoi un solveur n'énumère pas ;
- calculer une **borne** grâce à la **relaxation** ;
- dérouler à la main un **Branch and Bound** : branchement, élagages, incumbent ;
- calculer et interpréter un **gap**, en connaissant les différentes conventions ;
- comprendre le rôle des **coupes** (exemple : les inégalités de couverture), des **heuristiques** et du **presolve** ;
- lire le journal (log) d'un solveur.

### Comment travailler ce module

Lis d'abord les notions (§1 à §8), exécute ensuite l'exemple commenté (§9) avec Node.js, puis réalise les exercices **sans regarder les corrigés**. L'exemple est volontairement court : modifie les données (capacité, valeurs, coûts) et observe comment la borne évolue.

---

## 1. Pourquoi la MILP est difficile

Avec `n` binaires, l'espace de recherche compte `2ⁿ` décisions (module 1). Pour un LP à variables continues, l'optimum se trouve sur un sommet (module 2) et des algorithmes efficaces le trouvent rapidement, même avec des millions de variables. Avec des variables **entières**, cette belle géométrie disparaît : l'optimum entier n'est en général **pas** un sommet du polyèdre de la relaxation.

Les solveurs MILP combinent donc quatre idées :

1. **Relaxer** pour obtenir des **bornes** rapidement ;
2. **Brancher** pour découper le problème en sous-problèmes ;
3. **Couper** pour resserrer la relaxation ;
4. Utiliser des **heuristiques** pour trouver tôt de bonnes solutions entières.

## 2. Relaxation et borne

On reprend le sac à dos du module 1 :

```
MAX 8A + 12B + 10C + 5D   s.c.  30A + 50B + 40C + 20D ≤ 100,  A,B,C,D ∈ {0,1}
```

La **relaxation continue** remplace `{0,1}` par `[0,1]`. Pour un sac à dos, elle se résout de façon gloutonne : on trie les objets par **ratio valeur/coût** décroissant et on remplit, le dernier objet n'étant pris qu'en partie.

| Objet | Ratio | Pris | Capacité restante |
|---|---|---|---|
| A | 8/30 ≈ 0,267 | 1 | 70 |
| C | 10/40 = 0,250 | 1 | 30 |
| D | 5/20 = 0,250 | 1 | 10 |
| B | 12/50 = 0,240 | 10/50 = **0,2** | 0 |

Valeur : 8 + 10 + 5 + 0,2 × 12 = **25,4**.

**Propriété fondamentale** : pour une maximisation, la valeur de la relaxation est une **borne supérieure** de l'optimum entier. La relaxation autorise *plus* de solutions (toutes les solutions entières, plus les fractionnaires) : son optimum ne peut être que meilleur ou égal. Ici, l'optimum entier vaut 25 ≤ 25,4.

> `B = 0,2` n'est pas « 20 % d'un produit » : c'est un artefact mathématique qui sert à calculer une borne, jamais une décision à appliquer.

## 3. Branch and Bound

### Principe

1. Résoudre la relaxation d'un nœud.
2. Si elle est **irréalisable** → élaguer le nœud (*élagage par infaisabilité*).
3. Si sa borne est **≤ incumbent** (la meilleure solution entière connue) → élaguer (*élagage par borne*) : rien dans ce sous-arbre ne peut faire mieux.
4. Si la solution relâchée est **entière** → c'est une solution candidate ; mettre à jour l'incumbent et élaguer (*élagage par intégralité*).
5. Sinon, choisir une variable **fractionnaire** (ex. `B = 0,2`) et créer deux enfants : `B = 0` et `B = 1`.

### Déroulé sur l'exemple

```
                       Racine : borne 25,4  (A=1 C=1 D=1 B=0,2)
                      /                                      \
             B = 0                                          B = 1
   relaxation A=C=D=1 : 23, ENTIÈRE              borne 25  (B=1 A=1 C=0,5)
   → incumbent = 23 (élagage intégralité)        25 > 23 → brancher sur C
                                                 /                    \
                                            C = 0                    C = 1
                                    A=1 B=1 D=1 : 25 ENTIÈRE    borne 24,67 (A=1/3)
                                    → incumbent = 25           24,67 ≤ 25 → ÉLAGUÉ (borne)
```

Il a suffi de **5 nœuds** pour **prouver** l'optimalité de 25, alors que l'arbre complet en compte 31 (16 feuilles). Sur de grandes instances, l'écart devient gigantesque : c'est tout l'intérêt de la méthode.

### Choix du nœud et de la variable

- **Exploration en profondeur** : trouve vite des solutions entières (incumbent) et consomme peu de mémoire.
- **Meilleure borne d'abord** : fait baisser rapidement la borne globale, mais consomme plus de mémoire.
- **Variable de branchement** : la plus fractionnaire, celle de plus fort impact (*pseudo-coûts*), ou *strong branching*. Les solveurs combinent ces stratégies.

## 4. Incumbent, borne duale et gap

À tout instant de la recherche (maximisation) :

```
incumbent  ≤  optimum  ≤  borne duale (meilleure borne des nœuds ouverts)
```

- L'**incumbent** est la meilleure solution entière **trouvée**. C'est une borne *primale*, inférieure ici.
- La **borne duale** est le maximum des bornes des nœuds non encore élagués. Elle est supérieure ici.
- Le **gap** mesure l'écart entre les deux. Quand il vaut 0, l'optimalité est prouvée.

### Conventions de gap

| Convention | Formule | Sur l'exemple |
|---|---|---|
| Gap absolu | `borne − incumbent` | 25,4 − 25 = 0,4 |
| Relatif à l'incumbent (GLPK, CPLEX, Gurobi…) | `|borne − incumbent| / |incumbent|` | 0,4 / 25 = 1,6 % |
| Relatif à la borne (utilisée dans ce cours) | `|borne − incumbent| / |borne|` | 0,4 / 25,4 ≈ 1,575 % |

Les solveurs ajoutent souvent un petit ε au dénominateur pour éviter de diviser par 0. Un solveur s'arrête quand le gap passe sous une **tolérance** (souvent 0,01 % ou 1e-4 par défaut). « Optimal » signifie donc souvent « optimal à la tolérance près ».

> Si tu arrêtes un solveur au bout de 60 s avec un gap de 3 %, tu sais que ta solution est au pire à 3 % de l'optimum. C'est une **garantie**, que n'offre pas une heuristique pure.

## 5. Les coupes (Branch and Cut)

Une **coupe** est une inégalité :

- **valide** : satisfaite par **toutes** les solutions entières réalisables ;
- **violée** par la solution fractionnaire courante.

En l'ajoutant, on resserre la relaxation sans perdre aucune solution entière, et la borne s'améliore.

### Exemple : inégalités de couverture du sac à dos

Une **couverture** est un ensemble d'objets C dont le poids total **dépasse** la capacité : on ne peut pas tous les prendre. D'où la coupe :

```
Σ_{i∈C} x_i ≤ |C| − 1
```

Une couverture est **minimale** si retirer n'importe lequel de ses objets la fait repasser sous la capacité. Ce sont les coupes les plus fortes.

Sur notre exemple (capacité 100), on a `A+B+C` = 120 > 100 et `B+C+D` = 110 > 100. Ce sont les deux couvertures minimales, d'où les deux coupes :

```
x_A + x_B + x_C ≤ 2        x_B + x_C + x_D ≤ 2
```

La solution relâchée `(A=1, B=0,2, C=1, D=1)` donne 2,2 pour chacune : elle est **coupée**. L'optimum entier `(A, B, D)` donne 2 et 2 : il est **conservé**.

D'autres familles de coupes existent : Gomory, *mixed-integer rounding*, *clique*, *flow cover*… Les solveurs les génèrent automatiquement.

## 6. Heuristiques primales

Pour élaguer efficacement, il faut un bon incumbent **tôt**. Les solveurs emploient :

- l'**arrondi** de la solution relâchée, puis une réparation ;
- le **diving** : fixer successivement des variables et re-résoudre la relaxation ;
- la **recherche locale** autour de l'incumbent (*RINS*, *local branching*) ;
- la *feasibility pump*.

Tu peux aussi aider le solveur en lui fournissant une **solution de départ** (*warm start*) : par exemple le test de l'an dernier, ou une solution gloutonne.

## 7. Le presolve

Avant de commencer, le solveur **simplifie** le modèle :

- suppression des contraintes redondantes et des variables fixées ;
- resserrement des bornes : par exemple, si `30·x_A ≤ 100`, la contrainte ne limite pas `x_A` ;
- réduction de coefficients, en particulier pour les Big-M trop grands (module 4) ;
- détection d'infaisabilité évidente.

Dans `glpk.js`, l'option `presol: true` active cette étape.

## 8. Lire un journal de solveur

Exemple schématique, dans le style du journal de GLPK pour une maximisation :

```
+     5: mip =     2.300000000e+01 <=     2.540000000e+01  10.4% (2; 0)
+     9: mip =     2.500000000e+01 <=     2.500000000e+01   0.0% (0; 3)
INTEGER OPTIMAL SOLUTION FOUND
```

| Champ | Sens |
|---|---|
| `5`, `9` | nombre d'itérations du simplexe cumulées |
| `mip = …` | valeur de l'**incumbent** |
| `<= …` | **borne duale** (pour une maximisation) |
| `10.4%` | gap relatif **à l'incumbent** (convention de GLPK, §4) : (25,4 − 23) / 23 ≈ 10,4 % ; relatif à la borne, on aurait ≈ 9,4 % |
| `(2; 0)` | nœuds actifs ; nœuds déjà traités |

Quand le gap reste bloqué longtemps, demande-toi d'où vient le problème. Si la **borne** ne bouge pas, la relaxation est faible : revois tes Big-M (module 4) et la formulation (module 7). Si l'**incumbent** ne bouge pas, il manque de bonnes heuristiques ou une solution de départ.

## 9. Exemple commenté

Le script TypeScript `modules/module-05-algorithmes-resolution/exemples/05-borne-relaxation.ts` calcule la **borne de la relaxation continue** du sac à dos du §2 par la méthode gloutonne (tri par ratio valeur/coût décroissant, dernier objet pris en partie). Il ne réimplémente pas un solveur : il illustre la première brique du Branch and Bound, celle qui fournit la borne de chaque nœud.

```bash
npm run tp5
# ou
node modules/module-05-algorithmes-resolution/exemples/05-borne-relaxation.ts
```

Le cœur du calcul est un `reduce` qui transporte un état immuable (capacité restante, borne, fractions) :

```ts
const sortByDecreasingRatio = (products: Product[]): Product[] =>
  [...products].sort((first, second) => computeValueCostRatio(second) - computeValueCostRatio(first));

function solveFractionalRelaxation(products: Product[], capacity: number): RelaxationState {
  const initialState: RelaxationState = { remainingCapacity: capacity, bound: 0, fractions: [] };

  return sortByDecreasingRatio(products).reduce((state, product) => {
    if (state.remainingCapacity <= 0) return state;
    const fraction = Math.min(1, state.remainingCapacity / product.cost);
    return {
      remainingCapacity: state.remainingCapacity - fraction * product.cost,
      bound: state.bound + fraction * product.value,
      fractions: [...state.fractions, { id: product.id, fraction }]
    };
  }, initialState);
}
```

Sortie attendue :

```
Borne relaxation : 25.4
```

À observer :

- `[...products]` trie une **copie** : l'ordre des données d'origine n'est pas modifié ;
- `Math.min(1, …)` empêche de prendre plus de 100 % d'un produit ;
- la valeur 25,4 est une **borne**, pas une sélection réalisable (`B` est pris à 0,2).

Pour aller plus loin, l'exercice 5.1 compare cette borne à l'optimum entier et calcule le gap, et l'exercice 5.2 utilise la même borne dans un Branch and Bound complet.

## 10. Vérification et points de vigilance

- La borne fractionnaire est une **borne supérieure** pour une maximisation (une borne inférieure pour une minimisation) : vérifie toujours `optimum entier ≤ borne`.
- Le gap calculé dans ce module est **pédagogique** : les solveurs peuvent employer d'autres conventions (§4) et d'autres **tolérances** d'arrêt.
- Une valeur fractionnaire de la relaxation n'est jamais une décision à appliquer.

---

## Exercices

Lance chaque exercice depuis la racine du projet, par exemple :

```bash
node modules/module-05-algorithmes-resolution/exercices/ex5-1-borne-et-gap.ts
```

Les corrigés portent le même nom dans `modules/module-05-algorithmes-resolution/corriges/`.

| Fichier | Thème | Niveau |
|---|---|---|
| `ex5-1-borne-et-gap.ts` | Borne fractionnaire, optimum entier, gaps | ★★☆ |
| `ex5-2-branch-and-bound.ts` | Branch and Bound récursif, comptage des nœuds | ★★★ |
| `ex5-3-coupes-couverture.ts` | Couvertures minimales et coupes valides | ★★☆ |

> **« À toi de jouer » du cours d'origine** — « Calcule par énumération l'optimum entier du même exemple, compare-le à la borne fractionnaire et calcule un gap relatif indicatif » : c'est exactement l'**exercice 5.1** (`ex5-1-borne-et-gap.ts`). Résultat attendu : optimum entier 25 avec (A, B, D), borne 25,4, gap relatif à la borne ≈ 1,575 % (≈ 1,6 % relatif à l'incumbent).

## Ce qu'il faut retenir

1. La relaxation fournit une **borne** (supérieure en maximisation) rapidement.
2. Le Branch and Bound élague par **infaisabilité**, par **borne** et par **intégralité**.
3. `incumbent ≤ optimum ≤ borne duale` : le **gap** mesure la distance restante ; gap = 0 prouve l'optimalité.
4. Les conventions de gap varient : regarde toujours la documentation du solveur.
5. Une **coupe** est valide pour toutes les solutions entières et viole la solution fractionnaire.
6. Une bonne formulation (relaxation forte) compte souvent plus qu'un solveur plus rapide.

## À la fin du module

Tu sais interpréter l'intuition du Branch and Bound, l'incumbent, la borne et le gap. Le [module 6](../module-06-glpk/module-06-glpk.md) te fait passer à un vrai solveur, `glpk.js`.
