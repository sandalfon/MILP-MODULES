# Module 2 — Programmation linéaire (LP)

> Niveau : débutant · Durée : 2 à 3 h
> Exemple commenté : `modules/module-02-programmation-lineaire/exemples/` · Exercices : `modules/module-02-programmation-lineaire/exercices/` · Corrigés : `modules/module-02-programmation-lineaire/corriges/`

**Objectif pédagogique** : comprendre les variables continues, les contraintes linéaires et la relaxation d'un modèle entier.

## Objectifs

À la fin de ce module, tu sais :

- reconnaître un **programme linéaire** (LP) et dire si une expression est linéaire ou non ;
- décomposer une contrainte en **membre de gauche**, **sens** et **second membre**, et la mettre sous forme standard ;
- distinguer variables **continues** et variables **entières** ;
- lire la **géométrie** d'un LP à deux variables : demi-plans, région réalisable, sommets ;
- trouver l'optimum d'un petit LP en évaluant ses **sommets** ;
- reconnaître un LP **infaisable** ou **non borné** ;
- construire la **relaxation linéaire** d'un problème en nombres entiers et expliquer pourquoi **arrondir** sa solution est trompeur.

### Comment travailler ce module

Lis d'abord les notions (§1 à §7), exécute ensuite l'exemple commenté (§8) avec Node.js, puis réalise les exercices sans regarder les corrigés. Les extraits de code sont volontairement courts : modifie-les (une contrainte, un coefficient de l'objectif) et observe l'effet sur l'optimum.

---

## 1. Forme générale d'un programme linéaire

Un programme linéaire s'écrit :

```
MAX (ou MIN)   c₁·x₁ + c₂·x₂ + … + cₙ·xₙ
s.c.           a₁₁·x₁ + … + a₁ₙ·xₙ ≤ b₁
               …
               aₘ₁·x₁ + … + aₘₙ·xₙ ≤ bₘ
               bornes : lᵢ ≤ xᵢ ≤ uᵢ
```

En notation matricielle : `MAX cᵀx  s.c.  Ax ≤ b`.

- Les **cᵢ** sont les coefficients de l'objectif (données).
- Chaque ligne de **A** donne le **membre de gauche** d'une contrainte, et chaque **bᵢ** son **second membre** (données, voir ci-dessous).
- Les **xᵢ** sont les variables, ici **continues** : elles peuvent prendre n'importe quelle valeur réelle compatible avec les contraintes, par exemple 1,5 ou 2,37.

### Anatomie d'une contrainte : membre de gauche, sens, second membre

Toute contrainte linéaire a trois parties. Sur la contrainte de budget du module 1 :

```
30·xA + 50·xB + 40·xC + 20·xD      ≤        100
└──────── membre de gauche ───────┘  sens   └ second membre ┘
```

| Partie | Contenu | Dépend des décisions ? | Nom dans le code |
|---|---|---|---|
| **Membre de gauche** | somme `coefficient × variable` | **oui** : il change avec x | `lhs` (*left-hand side*), calculé par une fonction comme `computeLinearValue` |
| **Sens** | `≤`, `≥` ou `=` | non | `sense` |
| **Second membre** | une **constante** | **non** : c'est une donnée du problème | `rhs` (*right-hand side*) |

Le second membre est le **seuil** auquel on compare le membre de gauche. Son sens métier dépend du sens de la contrainte :

| Sens | Le second membre est… | Exemples du cours |
|---|---|---|
| `≤` | un **plafond** : une ressource disponible, une limite à ne pas dépasser | budget `≤ 100` (module 1), capacité `x + y ≤ 4`, « au plus 2 produits » |
| `≥` | un **minimum** à atteindre : une exigence, un quota | « au moins 1 item par domaine » `≥ 1` (module 8) |
| `=` | une **valeur imposée** exactement | longueur du test `= 6` (module 8) |

#### Mettre une contrainte sous forme standard

La forme attendue, par le cours comme par les solveurs, est **variables à gauche, constante à droite** : `Σ coefᵢ·xᵢ (sens) constante`. Une règle métier n'arrive pas toujours ainsi ; on la réécrit comme une équation, en faisant passer chaque terme de l'autre côté avec le signe opposé :

```
x + 3 ≤ 2·y + 7     →   x − 2·y ≤ 4         (y passe à gauche, 3 passe à droite)
q ≤ 80·y            →   q − 80·y ≤ 0        (second membre nul)
x_C ≤ x_A           →   x_C − x_A ≤ 0       (implication « C exige A », module 3)
```

Trois remarques :

- **Le second membre ne contient jamais de variable.** « Au plus 80 si l'usine est ouverte » (`q ≤ 80·y`) a l'air d'avoir un second membre `80·y`, mais `y` est une décision : il faut le passer à gauche. Le vrai second membre est `0` (modules 4 et 6).
- **Un second membre nul est très fréquent** : c'est la signature des contraintes de **liaison** entre variables (implications, Big-M).
- **Multiplier par −1 inverse le sens et change le signe du second membre** : `xA + xB ≥ 1` équivaut à `−xA − xB ≤ −1`. Un second membre négatif est donc parfaitement normal. De même `x ≥ 0` équivaut à `−x ≤ 0`, et une égalité `=` équivaut à deux inégalités, `≤` et `≥`, avec le même second membre.

#### Pourquoi le distinguer

Le second membre est la donnée que l'on fait **le plus souvent varier** : « et si le budget passait à 120 ? », « et si l'on exigeait 2 items par domaine ? ». Changer cette seule valeur ne touche ni aux variables ni aux coefficients. Toute la suite du module s'appuie sur lui :

- **Géométrie (§4)** : changer le second membre **déplace** la droite frontière **parallèlement** à elle-même (la pente ne change pas), alors que changer un coefficient du membre de gauche la fait **pivoter**. Avec `x + y ≤ 5` au lieu de 4, la droite `x + y = 5` reste parallèle à l'ancienne mais s'éloigne de l'origine : la région réalisable s'agrandit.
- **Écart (§4)** : `écart = second membre − membre de gauche` mesure la marge restante.
- **Valeur marginale (§4)** : c'est le gain sur l'objectif quand on augmente le second membre d'une unité.
- **Dans GLPK (module 6)** : le membre de gauche va dans `vars`, le second membre dans les bornes `bnds` (`ub` pour `≤`, `lb` pour `≥`, les deux pour `=`).

> En dimension 2, on écrit souvent une contrainte `a·x + b·y ≤ c` (§4) : là, c'est `c` qui joue le rôle du second membre.

## 2. Continu ou entier ?

| Type | Domaine | Exemple de décision |
|---|---|---|
| Continue | ℝ (réels) | litres de carburant, heures de travail, proportion d'un budget |
| Entière | ℤ (entiers) | nombre de camions, de lots, de postes |
| Binaire | {0, 1} | prendre ou non un item, ouvrir ou non un site |

Le module 1 n'utilisait que des binaires. Un **LP** n'a que des variables continues. Une **MILP** (*Mixed Integer Linear Program*) mélange continues et entières/binaires.

## 3. Qu'est-ce qui est linéaire ?

Une expression est **linéaire** si c'est une somme de termes `constante × variable` (plus une constante éventuelle).

| Expression | Linéaire ? | Pourquoi |
|---|---|---|
| `3x + 2y − 5` | oui | somme de constante × variable |
| `0,5·x₁ + 12·x₂` | oui | idem, coefficients non entiers autorisés |
| `x · y` | **non** | produit de deux variables |
| `x²` | **non** | puissance d'une variable |
| `|x|` | **non** | valeur absolue (cassure en 0) |
| `max(x, y)` | **non** | maximum de variables |
| `x / y` | **non** | division par une variable |
| `a² · x` (a donnée) | **oui** | `a²` est une constante calculée à l'avance |

La dernière ligne est essentielle pour le module 8 : un calcul non linéaire **sur les données** (ex. une information IRT calculée à partir de paramètres) donne simplement un coefficient. Seules les opérations **entre variables** posent problème.

> Certaines expressions non linéaires peuvent être **reformulées** linéairement à l'aide de variables auxiliaires (produit de deux binaires, maximin…). C'est l'objet des modules 3, 4 et 8.

## 4. Géométrie d'un LP à deux variables

Exemple fil rouge du module :

```
MAX  3x + 2y
s.c. x + y ≤ 4
     x     ≤ 2
         y ≤ 3
     x, y  ≥ 0
```

- Chaque contrainte `a·x + b·y ≤ c` définit un **demi-plan** : la droite `a·x + b·y = c` coupe le plan en deux, et on garde un côté.
- La **région réalisable** est l'intersection de tous ces demi-plans. C'est un **polygone convexe** (sans « creux »).
- Ses coins s'appellent les **sommets**. Chaque sommet est l'intersection de deux droites de contraintes.

```
 y
 4 ┤
 3 ┤■■■■●(1,3)
 2 ┤■■■■■■■■●(2,2)
 1 ┤■■■■■■■■■
 0 ●────────●──────── x
  (0,0)   (2,0)
```

Sommets : (0,0), (2,0), (2,2), (1,3), (0,3).

### Théorème fondamental (intuition)

Les lignes de niveau de l'objectif `3x + 2y = k` sont des droites parallèles. Augmenter k les fait glisser dans la même direction. La dernière droite qui touche encore la région la touche en un **sommet** (ou le long d'un côté entier, en cas d'égalité).

> **Si un LP a un optimum, il existe un sommet optimal.**

Il suffit donc, pour un petit LP, d'évaluer l'objectif aux sommets :

| Sommet | 3x + 2y |
|---|---|
| (0,0) | 0 |
| (2,0) | 6 |
| (2,2) | **10** ← optimum |
| (1,3) | 9 |
| (0,3) | 6 |

L'algorithme du **simplexe**, utilisé par les solveurs, passe de sommet en sommet en améliorant l'objectif, sans les énumérer tous.

### Calculer un sommet : intersection de deux droites

Les droites `a₁x + b₁y = c₁` et `a₂x + b₂y = c₂` se coupent, par la **règle de Cramer**, en :

```
det = a₁·b₂ − a₂·b₁
x   = (c₁·b₂ − c₂·b₁) / det
y   = (a₁·c₂ − a₂·c₁) / det
```

Si `det = 0`, les droites sont parallèles : pas d'intersection unique. Une intersection n'est un sommet que si elle respecte **toutes** les autres contraintes.

### Contrainte saturée

#### Définition

Une contrainte d'inégalité `a·x + b·y ≤ c` est **saturée** (on dit aussi *active* ou *serrée*) en un point si elle y est vérifiée **avec égalité** : `a·x + b·y = c`. Le point est alors exactement **sur** la droite frontière, et non à l'intérieur du demi-plan.

On mesure cela par l'**écart** (en anglais *slack*), ou **marge** :

```
écart = c − (a·x + b·y)        (second membre − membre de gauche)
```

| Écart | Situation | Interprétation |
|---|---|---|
| `> 0` | contrainte respectée **avec de la marge** | non saturée : la ressource n'est pas entièrement utilisée |
| `= 0` | contrainte respectée **tout juste** | **saturée** : la ressource est entièrement consommée |
| `< 0` | contrainte **violée** | le point est irréalisable |

Pour une contrainte `≥`, on définit l'écart dans l'autre sens, `(a·x + b·y) − c`, de façon que « écart ≥ 0 » signifie toujours « respectée ». Une contrainte d'égalité `=` est, par définition, saturée en tout point réalisable.

#### Exemple à l'optimum (2, 2)

| Contrainte | Valeur en (2,2) | Second membre | Écart | Saturée ? |
|---|---|---|---|---|
| `x + y ≤ 4` (capacité) | 4 | 4 | 0 | **oui** |
| `x ≤ 2` | 2 | 2 | 0 | **oui** |
| `y ≤ 3` | 2 | 3 | 1 | non |
| `x ≥ 0` | 2 | 0 | 2 | non |
| `y ≥ 0` | 2 | 0 | 2 | non |

En TypeScript, à cause des arrondis en virgule flottante, on ne teste jamais `=== 0` mais `Math.abs(slack) <= TOLERANCE` avec une petite tolérance (exercice 2.2) :

```ts
type Coefs = { x: number; y: number };
type Constraint = { name: string; coefs: Coefs; rhs: number }; // coefs.x·x + coefs.y·y ≤ rhs
const computeLinearValue = (coefs: Coefs, point: Point): number => coefs.x * point.x + coefs.y * point.y;
const computeSlack = (constraint: Constraint, point: Point): number =>
  constraint.rhs - computeLinearValue(constraint.coefs, point);
const bindingConstraints: Constraint[] = CONSTRAINTS.filter(constraint => Math.abs(computeSlack(constraint, point)) <= 1e-9);
```

#### Pourquoi un sommet est défini par ses contraintes saturées

En dimension 2, un sommet est l'intersection de **deux** droites frontières : il y a donc au moins deux contraintes saturées en chaque sommet. C'est exactement ce que l'on fait pour calculer les sommets : on choisit deux contraintes, on les **force à l'égalité** (on les sature), on résout le système, puis on vérifie que les autres contraintes sont respectées.

Plus généralement, avec n variables, un sommet sature au moins n contraintes. Si plus de n contraintes sont saturées au même point (par exemple trois droites qui se croisent au même endroit en 2D), on parle de sommet **dégénéré**. C'est sans gravité ici, mais cela peut ralentir le simplexe.

#### Ce que la saturation dit de l'optimum

À l'optimum, les contraintes saturées sont celles qui **empêchent d'aller plus loin**. Les contraintes non saturées, elles, ne jouent localement aucun rôle. Vérifions-le en desserrant chaque contrainte d'une unité, c'est-à-dire en augmentant son **second membre** de 1 :

| Modification | Nouvel optimum | Valeur | Gain |
|---|---|---|---|
| aucune | (2, 2) | 10 | — |
| `x + y ≤ 5` au lieu de 4 | (2, 3) | 12 | **+2** |
| `x ≤ 3` au lieu de 2 | (3, 1) | 11 | **+1** |
| `y ≤ 4` au lieu de 3 | (2, 2) | 10 | **0** |

- Desserrer une contrainte **saturée** améliore l'optimum.
- Desserrer une contrainte **non saturée** ne change rien : elle avait déjà de la marge.

Le gain obtenu par unité ajoutée au second membre s'appelle la **valeur marginale** de la contrainte (en anglais *shadow price*, ou *variable duale*). Ici, une unité de capacité supplémentaire vaut 2, une unité de plus sur la borne de x vaut 1, et la borne de y vaut 0.

> **Règle des écarts complémentaires** : à l'optimum d'un LP, pour chaque contrainte, **soit l'écart est nul, soit la valeur marginale est nulle**. Une contrainte qui a de la marge ne « coûte » rien.

Cette valeur marginale n'est valable qu'**au voisinage** de l'optimum. Si l'on desserre trop, une autre contrainte devient saturée et le gain par unité change. Avec `x + y ≤ 6`, par exemple, on atteint (2, 3) puis `y ≤ 3` bloque : on gagne +2 pour la première unité, puis 0.

#### Utilité pratique

- **Expliquer une solution** : « l'optimum est limité par le budget et par la borne sur x » est plus parlant qu'une liste de valeurs.
- **Décider où investir** : si l'on peut augmenter une seule ressource, on choisit la contrainte saturée de plus forte valeur marginale.
- **Diagnostiquer** : une contrainte métier qu'on croyait importante mais qui n'est jamais saturée est peut-être mal écrite ou redondante (module 7).

#### Et dans un problème entier ?

La notion d'écart reste la même. On l'a déjà vue au module 1 :

| Modèle | Optimum | Budget (≤ 100) | Cardinalité (≤ 2) |
|---|---|---|---|
| budget seul | (A, B, D), valeur 25 | coût 100, écart **0**, saturée | — |
| budget + cardinalité | (B, C), valeur 22 | coût 90, écart **10**, non saturée | 2 produits, écart **0**, saturée |

Ajouter la cardinalité a **déplacé** la contrainte qui bloque : ce n'est plus le budget, c'est le nombre de produits. Augmenter le budget n'apporterait d'ailleurs rien tant que la règle « au plus deux » reste en place.

En revanche, en nombres entiers, la valeur marginale n'a plus de sens simple, car les gains se font **par paliers**. Dans le modèle « budget seul », passer le budget de 100 à 101 ne rapporte rien (aucune nouvelle combinaison ne devient possible), alors que le passer à 110 rend (B, C, D) réalisable, de valeur 27, soit +2 d'un coup. Les valeurs duales affichées par certains solveurs pour une MILP proviennent de la relaxation linéaire ou du dernier sous-problème : elles sont à interpréter avec prudence.

## 5. Les trois issues possibles d'un LP

| Issue | Description | Exemple |
|---|---|---|
| **Optimum fini** | la région est non vide et l'objectif est borné | l'exemple ci-dessus |
| **Infaisable** | aucune solution ne respecte toutes les contraintes | `x ≤ 1` et `x ≥ 3` |
| **Non borné** | l'objectif peut croître indéfiniment | `MAX x` avec seulement `x ≥ 0` |

Un solveur renvoie toujours un **statut** qui indique laquelle des trois issues s'est produite. Il faut le lire avant d'utiliser les valeurs des variables (module 6).

## 6. Relaxation linéaire d'un problème entier

La **relaxation linéaire** d'une MILP s'obtient en remplaçant :

- `x ∈ {0, 1}` par `0 ≤ x ≤ 1` ;
- `x ∈ ℤ` par `x ∈ ℝ`.

On garde toutes les autres contraintes. La relaxation a **plus** de solutions que le problème entier, car toute solution entière est aussi une solution continue. Conséquence :

> En maximisation, **optimum de la relaxation ≥ optimum entier**. La relaxation fournit une **borne supérieure**.

Cette borne est le moteur des solveurs MILP (module 5) : si une branche de recherche a une borne inférieure à la meilleure solution entière déjà trouvée, inutile de l'explorer.

Une valeur comme `x = 0,4` dans une relaxation **n'est pas une décision** : on ne prend pas « 40 % d'un item ». C'est un intermédiaire de calcul.

## 7. Pourquoi arrondir est trompeur

Exemple de l'exercice 2.3 :

```
MAX  5x + 4y
s.c. 6x + 4y ≤ 24
      x + 2y ≤ 6
     x, y ≥ 0 et entiers
```

- Optimum de la relaxation : (3 ; 1,5), valeur **21**.
- Arrondi au plus proche : (3 ; 2) → 6·3 + 4·2 = 26 > 24 : **irréalisable**.
- Arrondi vers le bas : (3 ; 1) → valeur 19 : réalisable mais **pas optimal**.
- Vrai optimum entier : (4 ; 0), valeur **20**, assez loin du point fractionnaire.

Moralité : l'optimum entier n'est pas forcément « à côté » de l'optimum continu. Il faut un algorithme dédié (Branch and Bound, [module 5](../module-05-algorithmes-resolution/module-05-algorithmes-resolution.md)) ou un solveur MILP ([module 6](../module-06-glpk/module-06-glpk.md)).

## 8. Exemple commenté : évaluer les sommets d'un LP

Le script `exemples/02-sommets-lp.ts` reprend l'exemple fil rouge du §4 (`MAX 3x + 2y` sous `x + y ≤ 4`, `x ≤ 2`, `y ≤ 3`, `x, y ≥ 0`). Il part de la liste des sommets candidats, élimine ceux qui violent une contrainte, évalue l'objectif sur les autres et garde le meilleur. Cette résolution « à la main » montre en petit ce que le solveur fera à plus grande échelle.

```bash
npm run tp2
# ou
node modules/module-02-programmation-lineaire/exemples/02-sommets-lp.ts
```

Le cœur du script tient en trois fonctions pures :

```ts
// Cette fonction renvoie true si un point respecte TOUTES les contraintes.
const isFeasible = ({ x, y }: Point): boolean =>
  x >= 0 &&                 // borne inférieure de x
  y >= 0 &&                 // borne inférieure de y
  x + y <= 4 &&             // contrainte de capacité
  x <= 2 &&                 // borne supérieure de x
  y <= 3;                   // borne supérieure de y

const evaluateFeasibleVertices = (vertices: Point[]): EvaluatedVertex[] =>
  vertices
    .filter(isFeasible)
    .map(vertex => ({ ...vertex, objective: computeObjectiveValue(vertex) }));

const findOptimum = (evaluatedVertices: EvaluatedVertex[]): EvaluatedVertex => {
  if (evaluatedVertices.length === 0) {
    throw new Error("Aucun sommet réalisable : le LP est infaisable, il n'a pas d'optimum.");
  }
  return evaluatedVertices.reduce((bestVertex, vertex) =>
    vertex.objective > bestVertex.objective ? vertex : bestVertex
  );
};
```

Sortie attendue : un tableau des cinq sommets (colonnes `x`, `y`, `objective` ; objectifs 0, 6, 10, 9 et 6) puis `Optimum : { x: 2, y: 2, objective: 10 }`.

Ici, les sommets candidats sont **écrits à la main**. L'exercice 2.2 va plus loin : il les **calcule** à partir des contraintes (règle de Cramer). La comparaison entre un LP et la relaxation d'un problème entier est traitée dans l'exercice 2.3.

## 9. Vérification et points de vigilance

- **Contrôle de l'exemple** : le point (2, 2) donne bien `3·2 + 2·2 = 10`, et c'est le meilleur des cinq sommets.
- **`reduce` sans valeur initiale** : il exige une liste non vide. `findOptimum` le vérifie d'abord et lève une erreur explicite si la région réalisable est vide (LP infaisable) ; l'exercice 2.2 renvoie alors `null`.
- **Région bornée** : évaluer les sommets ne suffit que si la région est bornée ; sinon l'objectif peut croître indéfiniment (§5).
- **Tolérances** : un sommet calculé peut valoir `4.000000000001` au lieu de 4. On compare toujours avec une tolérance, jamais avec `===` (§4, exercice 2.2).
- **Valeurs fractionnaires d'une relaxation** : une relaxation peut produire `x = 0,4`. Cela ne représente pas un choix d'item (« 40 % d'un item »), mais une **borne mathématique** (§6).

---

## Exercices

| Fichier | Thème | Niveau |
|---|---|---|
| `ex2-1-points-realisables.ts` | Tester des points, évaluer l'objectif aux sommets | ★☆☆ |
| `ex2-2-calcul-sommets.ts` | Calculer les sommets par intersection de droites, déplacer une contrainte | ★★☆ |
| `ex2-3-relaxation-arrondi.ts` | Relaxation linéaire, optimum entier, piège de l'arrondi | ★★☆ |
| `ex2-4-contraintes-saturees.ts` | Écarts, contraintes saturées, valeurs marginales, paliers en entier | ★★☆ |

Lance un exercice avec `node modules/module-02-programmation-lineaire/exercices/ex2-1-points-realisables.ts` (même chemin avec `corriges/` pour le corrigé).

> **À toi de jouer** (exercice du cours d'origine) : remplacer la contrainte `x ≤ 2` par `x ≤ 1,5`, recalculer les sommets pertinents et expliquer pourquoi l'optimum se déplace. C'est exactement la partie « Variante » et les QUESTIONS de l'**exercice 2.2** : les sommets deviennent (0,0), (1,5 ; 0), (1,5 ; 2,5), (1,3) et (0,3), et l'optimum glisse le long de la droite `x + y = 4` jusqu'en **(1,5 ; 2,5), valeur 9,5**.

## Ce qu'il faut retenir

1. Un LP a des variables continues, un objectif et des contraintes **linéaires**.
   Une contrainte s'écrit « membre de gauche (variables) — sens — second membre (constante) » : le second membre ne contient jamais de variable, et c'est la donnée que l'on fait varier pour étudier la sensibilité de l'optimum.
2. Produits, carrés, valeurs absolues et max **de variables** ne sont pas linéaires ; un calcul non linéaire sur des **données** l'est.
3. La région réalisable est un polygone convexe ; s'il existe un optimum, un sommet est optimal.
   Un sommet est le point où au moins n contraintes sont **saturées** (écart nul). À l'optimum, ce sont elles qui bloquent : desserrer une contrainte saturée peut améliorer l'objectif, desserrer une contrainte non saturée ne change rien.
4. Un LP peut être optimal, infaisable ou non borné : toujours lire le statut.
5. La relaxation linéaire donne une borne (supérieure en MAX) de l'optimum entier.
6. Arrondir une solution fractionnaire peut donner une solution irréalisable ou sous-optimale.

## À la fin du module

Tu comprends la géométrie d'un LP et l'intérêt de la relaxation. Le [module 3](../module-03-variables-binaires/module-03-variables-binaires.md) revient aux variables binaires pour traduire des règles logiques en contraintes linéaires.
