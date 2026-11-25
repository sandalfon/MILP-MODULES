# Module 8 — Application : assembler un test IRT 2PL par MILP

> Niveau : avancé · Durée : 4 à 5 h
> Exemples : `modules/module-08-selection-items-irt/exemples/` · Exercices : `modules/module-08-selection-items-irt/exercices/` · Corrigés : `modules/module-08-selection-items-irt/corriges/`
> Prérequis : modules 1 à 7, en particulier le [module 6](../module-06-glpk/module-06-glpk.md) (glpk.js) et le [module 7](../module-07-diagnostic-qualite/module-07-diagnostic-qualite.md) (validation).

**Objectif pédagogique** : construire une MILP qui sélectionne un test fixe en maximisant l'information 2PL à un ou plusieurs niveaux θ.

## Objectifs

À la fin de ce module, tu sais :

- calculer la probabilité de réussite et l'**information** d'un item dans le modèle **2PL** ;
- expliquer pourquoi un objectif psychométrique non linéaire devient **linéaire** une fois les coefficients pré-calculés ;
- construire avec glpk.js une MILP d'**assemblage de test** : longueur, quotas, exclusions ;
- choisir entre un objectif **moyen** et un objectif **maximin**, et linéariser le maximin avec une variable auxiliaire `z` ;
- viser une **courbe d'information cible** (TIF cible) en minimisant des écarts absolus linéarisés ;
- **valider** de façon indépendante le test produit par le solveur ;
- **estimer la capacité** d'un candidat (MLE, EAP), y compris pendant un **test adaptatif**, et relier son erreur standard à l'information.

### Comment travailler ce module

Lis d'abord les notions (§1 à §9), exécute ensuite les trois exemples commentés (§10) avec Node.js et contrôle leurs sorties (§11), puis réalise les exercices sans regarder les corrigés. Les exemples sont courts et conçus pour être modifiés : change la grille de θ, les poids, la longueur ou la paire exclue, et observe l'effet sur la sélection ; dans le test adaptatif, change la capacité réelle, la longueur ou les règles, et relance plusieurs fois.

---

## 1. Rappel : le modèle IRT 2PL

En théorie de réponse à l'item (IRT), chaque candidat a un niveau latent **θ** (theta). Sur l'échelle usuelle, 0 est un niveau moyen, −1 un niveau plutôt faible et +1 un niveau plutôt fort. Chaque item `i` a deux paramètres, calibrés au préalable sur des données :

| Paramètre | Nom | Interprétation |
|---|---|---|
| `aᵢ` | discrimination | plus a est grand, plus l'item distingue nettement les niveaux autour de b |
| `bᵢ` | difficulté | niveau θ auquel le candidat a une chance sur deux de réussir |

La probabilité de réponse correcte est une courbe logistique :

```
Pᵢ(θ) = 1 / (1 + exp(−aᵢ · (θ − bᵢ)))
```

**Exemple chiffré** (item q01 : a = 1,2, b = −1,0) : à θ = 0, `P = 1 / (1 + e^(−1,2)) ≈ 0,7685`. Un candidat moyen réussit cet item facile environ 77 fois sur 100.

Propriété utile : à θ = b, l'exposant vaut 0, donc `P(b) = 1/2`.

## 2. L'information d'un item

L'**information de Fisher** mesure la précision avec laquelle un item permet d'estimer θ à un niveau donné. Pour un item dichotomique 2PL :

```
Iᵢ(θ) = aᵢ² · Pᵢ(θ) · (1 − Pᵢ(θ))
```

Trois propriétés à connaître :

1. **Maximum en θ = b** : `P(1−P)` est maximal quand P = 1/2. L'information maximale vaut donc `a²/4`. Pour q05 (a = 2) : `I_max = 4/4 = 1`.
2. **Symétrie** : `I(b + δ) = I(b − δ)`. La courbe est une « cloche » centrée sur b.
3. **Rôle de a** : un item très discriminant apporte beaucoup d'information près de b, mais peu ailleurs.

Extrait de la banque synthétique utilisée dans les exercices (12 items, domaines A à D) :

| item | a | b | I(−1) | I(0) | I(+1) | moyenne |
|---|---|---|---|---|---|---|
| q01 | 1,2 | −1,0 | 0,3600 | 0,2562 | 0,1098 | 0,2420 |
| q02 | 1,8 | −0,5 | 0,6658 | 0,6658 | 0,1912 | 0,5076 |
| q05 | 2,0 | 0,8 | 0,1036 | 0,5591 | 0,9610 | 0,5412 |
| q08 | 1,7 | −0,1 | 0,4228 | 0,7173 | 0,3344 | 0,4915 |
| q10 | 1,9 | 0,9 | 0,0926 | 0,4682 | 0,8944 | 0,4851 |

### Convention avec ou sans D = 1,7

Certains logiciels de calibration écrivent `P(θ) = 1 / (1 + exp(−D·a·(θ − b)))` avec **D = 1,7**, pour rapprocher la logistique de la loi normale. L'information devient alors `D²a²P(1−P)`. Avec D = 1,7, l'information maximale de q01 passe de 0,36 à 1,04.

> **Piège majeur** : appliquer la formule sans D à des paramètres calibrés avec D (ou l'inverse) fausse **tous** les coefficients de l'objectif. Vérifie toujours la convention de la banque avant d'optimiser. Les exercices utilisent la convention **sans D**.

### Après le test : estimer θ

L'assemblage choisit les items **avant** la passation. Une fois le test passé, on connaît les réponses du candidat (1 = réussi, 0 = raté) et on estime sa capacité θ. La brique de base est la **vraisemblance** : la probabilité d'observer exactement ces réponses si la capacité vaut θ.

```
L(θ) = Π_i  Pᵢ(θ) si l'item i est réussi,  1 − Pᵢ(θ) sinon
```

Deux estimations classiques :

| Méthode | Principe | Limite |
|---|---|---|
| **MLE** (maximum de vraisemblance) | le θ qui maximise L(θ) | n'existe pas si tout est juste (θ̂ → +∞) ou tout est faux (θ̂ → −∞) |
| **EAP** (espérance a posteriori) | moyenne de θ pondérée par L(θ) × a priori N(0, 1) | toujours finie, mais tirée vers 0 par l'a priori |

L'EAP donne aussi une **erreur standard** (l'écart-type a posteriori). Elle est reliée à l'information du test :

```
SE(θ̂) ≈ 1 / √I(θ̂)
```

C'est la raison pour laquelle on **maximise l'information** à l'assemblage : plus I(θ) est grande, plus la capacité d'un candidat de niveau θ est estimée précisément.

**Test adaptatif** : on peut aussi choisir les items **pendant** le test. Après chaque réponse, on met à jour θ̂, puis on pose l'item le plus informatif à ce niveau, parmi ceux que les règles du test autorisent encore. L'exemple du §10.3 simule ainsi un candidat de capacité réelle 0,4 : après 11 questions sur 22, l'erreur standard de l'EAP est passée de 1 (l'a priori seul) à environ 0,4.

> **Repère** : en 2PL, L(θ) ne dépend des réponses qu'à travers Σ aᵢ·rᵢ (la somme des discriminations des items réussis). Deux candidats qui réussissent des items différents mais de même discrimination totale reçoivent le même θ̂. Dans un vrai projet, on estime θ avec une bibliothèque validée (par exemple `mirt` ou `catR` en R), avec les paramètres et la convention D de la calibration.

## 3. Information du test et linéarité

Pour un test composé des items sélectionnés, l'information du test (TIF, *Test Information Function*) est la **somme** des informations des items :

```
TIF(θ) = Σᵢ Iᵢ(θ) · xᵢ        avec xᵢ = 1 si l'item i est retenu
```

`Iᵢ(θ)` est une fonction **non linéaire** de aᵢ, bᵢ et θ. Mais dans la MILP, aᵢ, bᵢ et θ sont des **données** : seuls les xᵢ sont des variables. Pour un θ fixé, `Iᵢ(θ)` est donc un simple **nombre**, calculé **avant** l'optimisation. L'expression `Σ Iᵢ(θ)·xᵢ` est alors exactement de la forme `Σ coef·x` vue dès le module 1 : elle est **linéaire**.

> **Idée clé** : on pré-calcule tout ce qui est non linéaire mais ne dépend que des données. Le solveur ne voit que des coefficients.

## 4. Une grille de θ : objectif moyen

Un test doit souvent être précis sur une **plage** de niveaux, pas en un seul point. On choisit une grille, par exemple `θ ∈ {−1, 0, +1}`, et des poids `w_t` (ici 1/3 chacun). Le coefficient de l'item i est alors :

```
cᵢ = Σₜ w_t · Iᵢ(θ_t)
```

Le modèle **moyen** est :

```
MAX   Σᵢ cᵢ · xᵢ
s.c.  Σᵢ xᵢ = 6                          (longueur)
      Σ_{i ∈ domaine k} xᵢ ≥ 1   ∀ k     (quotas)
      x_q02 + x_q05 ≤ 1                  (exclusion)
      xᵢ ∈ {0, 1}
```

Sur la banque synthétique, l'optimum retient q02, q04, q07, q08, q10 et q12, pour une information moyenne de **≈ 2,6602**.

**Limite** : une moyenne peut masquer un trou. Un test très informatif à θ = +1 mais faible à θ = −1 peut avoir une bonne moyenne tout en mesurant mal les candidats faibles.

## 5. L'objectif maximin

On veut plutôt **maximiser l'information au pire niveau de la grille** :

```
MAX  min_t  Σᵢ Iᵢ(θ_t) · xᵢ
```

Le `min` n'est pas linéaire. On le **linéarise** avec une variable auxiliaire **continue** `z` :

```
MAX   z
s.c.  z ≤ Σᵢ Iᵢ(θ_t) · xᵢ     pour chaque θ_t de la grille
      (+ longueur, quotas, exclusions)
      xᵢ ∈ {0, 1},  z ≥ 0
```

Pourquoi ça marche : `z` doit être inférieur à **chacune** des informations, donc à leur minimum. Comme on maximise z, le solveur le pousse jusqu'à ce minimum exactement.

Pour glpk.js, on passe tout à gauche : `z − Σᵢ Iᵢ(θ_t)·xᵢ ≤ 0`, soit une contrainte `GLP_UP` avec `ub = 0`. Le coefficient de chaque xᵢ est **négatif**.

**Ce que montrent les données** (exercice 8.3, quotas de 1 à 2 items par domaine) :

| grille | modèle | items | TIF | minimum | moyenne |
|---|---|---|---|---|---|
| −1 ; 0 ; 1 | moyen | q02 q04 q07 q08 q10 q12 | 2,20 / 3,37 / 2,41 | 2,2011 | 2,6602 |
| −1 ; 0 ; 1 | maximin | même test | même TIF | 2,2011 | 2,6602 |
| −1,5 ; 0 ; 1,5 | moyen | q02 q04 q07 q08 q10 q12 | 1,33 / 3,37 / 1,51 | 1,3312 | 2,0701 |
| −1,5 ; 0 ; 1,5 | maximin | q01 q02 q04 q07 q10 q12 | 1,44 / 2,90 / 1,41 | 1,4109 | 1,9173 |

Sur la grille étroite, les deux objectifs coïncident. Sur la grille large, le maximin échange q08 (b = −0,1) contre q01 (b = −1). Il sacrifie de l'information au centre pour relever les extrémités : la TIF est plus « plate ».

> **Piège** : ne déclare pas `z` dans `binaries`. C'est une variable continue ; on lui donne une borne avec `bounds: [{ name: "z", type: GLP_LO, lb: 0, ub: 0 }]`.

## 6. Les contraintes d'un vrai test

| Règle métier | Formulation linéaire | Type glpk.js |
|---|---|---|
| Longueur exacte L | `Σ xᵢ = L` | `GLP_FX` (lb = ub = L) |
| Au moins m items du domaine k | `Σ_{i∈k} xᵢ ≥ m` | `GLP_LO` |
| Entre m et M items du domaine k | `m ≤ Σ_{i∈k} xᵢ ≤ M` | `GLP_DB` |
| Items « ennemis » (l'un donne la réponse de l'autre) | `xᵢ + xⱼ ≤ 1` | `GLP_UP` |
| Au plus un item d'un groupe d'ennemis E | `Σ_{i∈E} xᵢ ≤ 1` | `GLP_UP` |
| Testlet (items liés à un même support s) tout ou rien | `xᵢ = y_s` pour chaque i de s | `GLP_FX` sur `xᵢ − y_s` = 0 |
| Exposition : item déjà trop utilisé | `xᵢ = 0`, ou pénalité dans l'objectif | borne ou coefficient |
| Durée totale limitée | `Σ tempsᵢ · xᵢ ≤ T_max` | `GLP_UP` |

Pour un **testlet**, on introduit une binaire `y_s` (« le support s est utilisé »). Les égalités `xᵢ = y_s` forcent tous les items du support à entrer ou sortir ensemble.

## 7. Viser une courbe d'information cible (TIF cible)

Dans les tests parallèles (plusieurs formes équivalentes), on ne cherche pas l'information **maximale** mais une information **proche d'une cible** `T_t` à chaque θ_t. On minimise donc l'écart absolu `|Σᵢ Iᵢ(θ_t)·xᵢ − T_t|`.

La valeur absolue n'est pas linéaire. On la linéarise avec deux variables continues **positives** par point de grille :

```
Σᵢ Iᵢ(θ_t) · xᵢ − d⁺_t + d⁻_t = T_t       (GLP_FX)
d⁺_t ≥ 0,  d⁻_t ≥ 0
MIN  Σₜ (d⁺_t + d⁻_t)
```

- `d⁺_t` mesure l'**excès** au-dessus de la cible et `d⁻_t` le **manque** en dessous.
- À l'optimum, au plus l'un des deux est non nul : les rendre tous les deux positifs ne ferait qu'augmenter l'objectif.
- On peut pondérer différemment excès et manque si un manque d'information est plus grave qu'un excès.

**Exemple** (exercice 8.4) : avec la cible T = [2,0 ; 2,5 ; 2,0], le modèle retient q01 q02 q06 q07 q10 q12. Sa TIF ≈ [2,010 ; 2,591 ; 2,026] donne un écart total de **≈ 0,127**. Le test « information maximale » du §4 est, lui, à ≈ 1,48 de la cible : **maximiser n'est pas viser**.

## 8. Valider après résolution

Le solveur répond au **modèle**, pas au **cahier des charges**. Une erreur de formulation (signe inversé, domaine oublié, mauvais type de borne) produit une solution « optimale » mais fausse. Après chaque résolution :

1. Vérifier le **statut** (`GLP_OPT = 5`, `GLP_FEAS = 2`, `GLP_NOFEAS = 4`…).
2. Lire les xᵢ avec un **seuil** (`> 0.5`) pour absorber les petites erreurs numériques.
3. **Recalculer de façon indépendante** : longueur, quotas, exclusions, et la TIF à chaque θ à partir des paramètres bruts (a, b), pas des coefficients du modèle.
4. Comparer la valeur de l'objectif annoncée par le solveur au recalcul.

## 9. Passage à l'échelle et limites

- **Banques réelles** : des milliers d'items, des dizaines de domaines et de nombreuses règles. La structure du modèle reste identique : on génère les contraintes **à partir des données** (boucles sur les domaines, sur les paires d'ennemis…), jamais à la main.
- **Grille** : 3 à 7 points suffisent généralement ; chaque point ajoute une contrainte, pas de variable binaire.
- **Performance** : GLPK convient pour des modèles pédagogiques et moyens. Au-delà, on utilise des solveurs plus puissants (HiGHS, CBC, CP-SAT, solveurs commerciaux), on accepte un **gap** (module 5) et on fixe une limite de temps.
- **Test fixe vs CAT** : ici on assemble un test **fixe**, identique pour tous. Un test adaptatif (CAT) choisit les items un par un selon les réponses. L'assemblage MILP s'y retrouve sous la forme de *shadow tests*, mais les objectifs et les contraintes d'exposition diffèrent.
- **Validation psychométrique** : un bon test au sens de la MILP doit encore être revu par des experts (contenu, biais, qualité de la calibration).

## 10. Exemple commenté

Deux scripts reprennent la banque synthétique de 12 items (domaines A à D). Ils sont volontairement pédagogiques : sur un vrai projet, remplace `ITEMS` par un extrait **validé** de la banque réelle.

### 10.1 Pré-calculer l'information : `08-information-irt.ts`

Ce premier script ne résout rien : il montre l'étape « hors solveur » du §3 et du §4. Pour chaque item, il calcule l'information 2PL sur la grille θ ∈ {−1, 0, 1} et sa moyenne pondérée `cᵢ = Σₜ w_t · Iᵢ(θ_t)`, qui deviendra le coefficient de xᵢ dans l'objectif.

```ts
// Moyenne pondérée de l'information d'un item sur une grille de theta.
// weights doit avoir la même longueur que thetaGrid.
const computeWeightedInformation = (item: Item, thetaGrid: number[], weights: number[]): number =>
  thetaGrid.reduce((total, theta, thetaIndex) =>
    total + weights[thetaIndex] * information2PL(item.a, item.b, theta), 0);
```

```bash
npm run tp8
# ou : node modules/module-08-selection-items-irt/exemples/08-information-irt.ts
```

Le script affiche un tableau `id / domain / score` : on y retrouve la colonne « moyenne » du §2 (q01 ≈ 0,2420, q05 ≈ 0,5412…).

### 10.2 Assembler le test avec glpk.js : `08-assemblage-irt-glpk.ts`

Le second script construit et résout le **modèle moyen** du §4 : longueur exacte 6 (`GLP_FX`), au moins un item par domaine (`GLP_LO`), exclusion q02/q05 (`GLP_UP`), objectif `MAX Σ cᵢ·xᵢ`. Les contraintes sont générées à partir des données, par la fonction pure `buildConstraints` :

```ts
  // Pour chaque domaine, impose au moins un item.
  // Chaque ligne est une contrainte linéaire indépendante.
  const domainConstraints: GlpkConstraint[] = REQUIRED_DOMAINS.map(domain => ({
    name: `quota_${domain}`,
    vars: items.filter(item => item.domain === domain).map(toUnitTerm),
    bnds: { type: glpk.GLP_LO, lb: 1, ub: 0 }
  }));
```

Après la résolution, il vérifie le statut (`hasUsableSolution` : `GLP_OPT` ou `GLP_FEAS`) et lit les xᵢ avec le seuil 0,5 (`extractSelectedItems`, §8).

```bash
npm run tp8-solveur
# ou : node modules/module-08-selection-items-irt/exemples/08-assemblage-irt-glpk.ts
```

Résultat attendu : items q02, q04, q07, q08, q10, q12 (domaines A, B, C, C, D, D) et une information moyenne ≈ 2,6602, comme au §4.

### 10.3 Estimer la capacité pendant un test adaptatif : `08-estimation-capacite.ts`

Le troisième script simule un candidat dont on connaît la capacité réelle, `REFERENCE_CAPACITY = 0.4`, et lui fait passer un test **adaptatif** de `TEST_LENGTH = 11` questions (« Après le test : estimer θ », §2). La banque compte **22 items** : les 12 du module (domaines A à D), et 10 items q13 à q22, répartis sur 3 nouveaux domaines E, F, G, dont a et b ont été tirés une fois au hasard (a dans [0,8 ; 2], b dans [−2 ; 2]) puis écrits dans le fichier. Le test respecte les **mêmes règles** que l'assemblage du §10.2, dont il reprend le code (`scoreItems`, `buildConstraints`, `buildAssemblyModel`, `hasUsableSolution`), étendues aux nouveaux domaines : longueur exacte 11, au moins un item par domaine (A à G), q02 et q05 jamais ensemble. À chaque question :

1. il cherche les items **éligibles** : non encore posés, et tels qu'un test complet respectant toutes les règles existe encore avec eux. GLPK le vérifie en résolvant le modèle d'assemblage où les items déjà posés et le candidat sont imposés (`x_i = 1`, fonction `withFixedItems`) ;
2. parmi eux, il pose le plus **informatif** au niveau θ̂ estimé jusque-là. Au départ, θ̂ = `INITIAL_THETA = -1` : on suppose le candidat plutôt faible, et l'a priori de l'EAP est centré sur cette valeur, N(−1, 1) ;
3. il calcule la probabilité de réussite pour la capacité réelle : `probability2PL(item.a, item.b, REFERENCE_CAPACITY)` ;
4. il simule la réponse : juste si cette probabilité dépasse un **tirage uniforme** entre 0 et 1 ;
5. il met à jour θ̂ et son erreur standard par la méthode **EAP**, avec toutes les réponses reçues.

Les fonctions de calcul sont pures : elles reçoivent les constantes de GLPK, la fonction de résolution et les tirages uniformes en paramètre. Le hasard (`Math.random()`) n'intervient que dans le programme principal, si bien que **chaque lancement simule un nouveau passage** du même candidat.

```ts
// Items éligibles : non encore posés, et compatibles avec un test complet valide.
// Pour chaque candidat, GLPK cherche un test qui contient les items posés ET lui.
async function findEligibleItems(
  glpk: GlpkConstants, solveModel: SolveModel, items: Item[], askedItems: Item[], theta: number
): Promise<Item[]> {
  const model = buildAssemblyModel(glpk, scoreItems(items, [theta], [1]));
  const remainingItems = items.filter(item => !askedItems.includes(item));
  const feasibility = await Promise.all(remainingItems.map(async candidate =>
    hasUsableSolution(glpk, await solveModel(withFixedItems(glpk, model, [...askedItems, candidate])))));
  return remainingItems.filter((_, i) => feasibility[i]);
}
```

```bash
npm run tp8-capacite
# ou : node modules/module-08-selection-items-irt/exemples/08-estimation-capacite.ts
```

Exemple de sortie (elle change à chaque lancement) :

Exemple de sortie (elle change à chaque lancement, car les réponses sont tirées au hasard) :

| question | éligibles | choisi pour θ̂ | item (a ; b ; domaine) | P(réussite) | tirage | réponse | θ̂ après | erreur std |
|---|---|---|---|---|---|---|---|---|
| 1 | les 22 items | −1,00 | q16 (2,0 ; −0,6 ; E) | 0,88 | 0,44 | juste | −0,24 | 0,78 |
| 2 | 21 items | −0,24 | q21 (1,8 ; −0,3 ; G) | 0,78 | 0,48 | juste | 0,14 | 0,69 |
| 3 | 20 items | 0,14 | q22 (1,7 ; 0,3 ; E) | 0,54 | 0,62 | fausse | −0,14 | 0,59 |
| 4 | 19 items | −0,14 | q02 (1,8 ; −0,5 ; A) | 0,83 | 0,50 | juste | 0,05 | 0,54 |
| 5 | 17 items (q05 exclu) | 0,05 | q08 (1,7 ; −0,1 ; C) | 0,70 | 0,58 | juste | 0,23 | 0,51 |
| 6 | 16 items | 0,23 | q12 (1,6 ; 0,1 ; D) | 0,62 | 0,39 | juste | 0,40 | 0,50 |
| 7 | 15 items | 0,40 | q10 (1,9 ; 0,9 ; D) | 0,28 | 0,15 | juste | 0,68 | 0,48 |
| 8 | 14 items | 0,68 | q17 (1,9 ; 1,2 ; F) | 0,18 | 0,23 | fausse | 0,56 | 0,44 |
| 9 | 13 items | 0,56 | q18 (1,7 ; 1,0 ; G) | 0,27 | 0,96 | fausse | 0,46 | 0,41 |
| 10 | 12 items | 0,46 | q04 (1,5 ; 0,4 ; B) | 0,50 | 0,45 | juste | 0,57 | 0,40 |
| 11 | 11 items | 0,57 | q15 (1,9 ; 1,4 ; G) | 0,13 | 1,00 | fausse | 0,52 | 0,38 |

Test passé : q16 q21 q22 q02 q08 q12 q10 q17 q18 q04 q15 (les 7 domaines sont couverts, exclusion respectée) ; estimation finale θ̂ = 0,52 ± 0,38, pour une capacité réelle de 0,4. Relance le script plusieurs fois et observe :

- les **règles réduisent les items éligibles** : une fois q02 posé, q05 disparaît (exclusion) ; quand il ne reste plus assez de questions pour couvrir tous les domaines, seuls les items des domaines manquants restent éligibles, quel que soit leur intérêt au niveau θ̂ ;
- le **point de départ** compte : partant de θ̂ = −1, le test pose d'abord un item facile (q02), puis remonte vers la capacité réelle au fil des réponses justes ;
- θ̂ **oscille** autour de la capacité réelle : une réponse juste le fait monter, une fausse le fait descendre, de moins en moins à mesure que les réponses s'accumulent ;
- l'**erreur standard diminue** à chaque question (1 → environ 0,4) : chaque item apporte de l'information ;
- tant que les règles le permettent, les items choisis ont une difficulté b **proche de θ̂** au moment du choix : c'est là que leur information est maximale (§2) ;
- d'un lancement à l'autre, θ̂ final varie : avec 11 questions, l'erreur standard descend vers 0,4, et l'écart à la capacité réelle est le plus souvent inférieur à une erreur standard, mais pas toujours.

## 11. Vérification et points de vigilance

- **Avant l'optimisation**, valide les données : paramètres a et b plausibles (a > 0), **convention de paramétrisation** (avec ou sans D, §2), **unités de θ** (même échelle que la calibration) et **statut des items** (retirer les items périmés, en révision ou surexposés).
- **Après la résolution**, vérifie le statut, puis la longueur, les quotas, les exclusions et l'**information obtenue à chaque θ** de la grille, pas seulement la valeur de l'objectif (§8).
- **Contrôle croisé des exemples** : `npm run tp8` doit redonner la colonne « moyenne » du §2 (q01 ≈ 0,2420, q05 ≈ 0,5412) et `npm run tp8-solveur` le statut 5 (`GLP_OPT`) avec une information moyenne ≈ 2,6602, et `npm run tp8-capacite` une erreur standard qui diminue à chaque question jusqu'à ≈ 0,4 (θ̂, lui, change à chaque lancement). Un écart signale une erreur de formule (parenthèses, carré de a, convention D) ou de modèle.

---

## Exercices

| Fichier | Thème | Niveau |
|---|---|---|
| `ex8-1-information-2pl.ts` | P(θ), I(θ), matrice d'information, coefficients moyens, effet de D | ★★☆ |
| `ex8-2-assemblage-moyenne.ts` | MILP glpk.js : longueur, quotas, exclusion, objectif moyen, validation | ★★☆ |
| `ex8-3-maximin.ts` | Variable auxiliaire z, quotas min/max, comparaison moyen vs maximin | ★★★ |
| `ex8-4-tif-cible.ts` (bonus) | Écarts absolus d⁺/d⁻, minimisation de l'écart à une TIF cible | ★★★ |

Lance un exercice avec `node modules/module-08-selection-items-irt/exercices/ex8-1-information-2pl.ts` (même chemin dans `corriges/` pour le corrigé).

> **« À toi de jouer » du cours d'origine** : « remplacer l'objectif moyen par un maximin sur θ = [−1, 0, 1] avec une variable auxiliaire z, puis ajouter des bornes de quotas et une exclusion entre deux items » correspond à l'**exercice 8.3** (`ex8-3-maximin.ts`). Il part du modèle moyen de l'exercice 8.2 (qui reprend l'exemple `08-assemblage-irt-glpk.ts`), ajoute z, des quotas bornés de 1 à 2 items par domaine (`GLP_DB`) et l'exclusion q02/q05. Sur cette grille, on obtient z ≈ 2,2011 avec le même test que le modèle moyen.

## Ce qu'il faut retenir

1. `I(θ) = a²P(1−P)` est maximale en θ = b et vaut alors a²/4. Vérifie la convention D.
2. La TIF d'un test est la somme des informations de ses items.
3. Les informations sont pré-calculées : pour le solveur, ce sont des coefficients, donc l'objectif est linéaire.
4. Maximin : une variable continue z et une contrainte `z ≤ TIF(θ_t)` par point de grille.
5. Écart à une cible : deux variables d⁺, d⁻ ≥ 0 par point, et on minimise leur somme.
6. Les règles métier (longueur, quotas, ennemis, testlets) sont toutes des contraintes linéaires sur les xᵢ.
7. On valide toujours la solution du solveur avec un contrôle indépendant.
8. Après la passation, on estime θ par MLE ou EAP ; l'erreur standard vaut environ 1/√I(θ) : c'est pour elle qu'on maximise l'information.

## À la fin du module

Tu sais construire un premier assemblage MILP d'un test fixe IRT 2PL. Pour une banque réelle de plusieurs milliers d'items, il faudra traiter **séparément** la performance, les contraintes métier et la validation psychométrique.

C'est le dernier module du parcours principal. Pour aller plus loin, le [module 9](../module-09-sudoku/module-09-sudoku.md) (bonus) applique les mêmes outils à un problème de satisfaction : résoudre un sudoku et prouver que sa solution est unique. Tu peux aussi revenir au [sommaire du cours](../../README.md) pour revoir un module ou relancer toutes les vérifications.

## Références et prolongements

- glpk.js : documentation du solveur JavaScript (dépôt `jvail/glpk.js`).
- Columbia University (Mailman School of Public Health) : *Item Response Theory*, introduction à l'IRT et à l'information des items.
- MOSEK Modeling Cookbook : chapitre *Mixed-integer optimization*.

> **Repère** : les scripts sont des supports pédagogiques. Pour un vrai projet, ajoute des tests automatisés, contrôle les données en entrée et conserve la formulation mathématique à côté du code.
