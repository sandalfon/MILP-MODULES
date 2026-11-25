# Module 9 — Projet : résoudre un sudoku par MILP

> Niveau : avancé (module bonus) · Durée : 2 à 3 h
> Exemples : `modules/module-09-sudoku/exemples/` · Exercices : `modules/module-09-sudoku/exercices/` · Corrigés : `modules/module-09-sudoku/corriges/`
> Prérequis : le [module 3](../module-03-variables-binaires/module-03-variables-binaires.md) (variables binaires) et le [module 6](../module-06-glpk/module-06-glpk.md) (glpk.js).

**Objectif pédagogique** : modéliser un problème de **satisfaction** (trouver une solution, sans rien optimiser) avec des variables binaires, le résoudre avec GLPK, puis vérifier que la solution est **unique**.

## Objectifs

À la fin de ce module, tu sais :

- choisir des variables **binaires indicatrices** x_{l,c,v} plutôt qu'une variable entière par case ;
- traduire « tous différents » en contraintes **Σ x = 1**, générées à partir des données ;
- écrire un modèle **sans objectif** et lire son statut ;
- **vérifier** une grille avec un code indépendant du modèle ;
- **interdire** une solution trouvée (coupe « no-good ») pour savoir s'il en existe une autre.

### Comment travailler ce module

Lis les notions (§1 à §7), exécute l'exemple commenté sur une grille 4×4 (§8), puis fais l'exercice 9.1 (le solveur 9×9) avant l'exercice 9.2 (l'unicité), qui réutilise le solveur.

---

## 1. Le problème

Une grille de sudoku a 9 lignes, 9 colonnes et 9 blocs de 3×3 cases. Certaines cases contiennent déjà un chiffre. Il faut remplir les autres avec les chiffres 1 à 9 de sorte que chaque chiffre apparaisse **une seule fois** :

- dans chaque ligne ;
- dans chaque colonne ;
- dans chaque bloc.

Il n'y a **rien à optimiser** : toutes les grilles valides se valent. C'est un problème de **satisfaction de contraintes**. Un solveur MILP sait aussi le traiter : il suffit de lui donner un objectif sans effet.

Dans le code, lignes, colonnes et blocs sont numérotés de **0 à 8**. Les blocs sont numérotés ligne par ligne :

```
0 | 1 | 2
3 | 4 | 5
6 | 7 | 8
```

## 2. Les variables : une binaire par (case, chiffre)

L'idée naturelle, une variable entière par case (`n_{l,c}` ∈ {1, …, 9}), est une impasse : « n_{0,0} ≠ n_{0,1} » n'est pas une contrainte linéaire, et il faudrait des Big-M (module 4) pour chaque paire de cases.

On choisit plutôt une variable **binaire** pour chaque case **et** chaque chiffre :

> x_{l,c,v} = 1 si la case (ligne l, colonne c) contient le chiffre v, 0 sinon.

Cela fait 9 × 9 × 9 = **729 variables binaires**. Dans le code, leur nom est `x_${l}_${c}_${v}`, par exemple `x_0_2_4` pour « la case (0, 2) contient 4 ».

| Question | Lecture avec les x |
|---|---|
| Quel chiffre en (l, c) ? | le v tel que x_{l,c,v} = 1 |
| Combien de 7 dans la ligne l ? | Σ_c x_{l,c,7} |
| La case (l, c) est-elle remplie une seule fois ? | Σ_v x_{l,c,v} = 1 |

C'est le même principe que les indicatrices du module 3 : une décision « lequel parmi plusieurs » devient une liste de binaires dont **exactement une** vaut 1.

## 3. Les règles : quatre familles de Σ x = 1

Chaque règle fixe deux indices et somme sur le troisième :

| Famille | Indices fixés | Somme sur | Contrainte | Nombre |
|---|---|---|---|---|
| case | (l, c) | les chiffres v | Σ_v x_{l,c,v} = 1 | 81 |
| ligne | (l, v) | les colonnes c | Σ_c x_{l,c,v} = 1 | 81 |
| colonne | (c, v) | les lignes l | Σ_l x_{l,c,v} = 1 | 81 |
| bloc | (b, v) | les 9 cases du bloc b | Σ_{(l,c)∈b} x_{l,c,v} = 1 | 81 |

Soit **324 contraintes**, toutes de la même forme. Avec glpk.js, « Σ x = 1 » s'écrit avec une borne fixe (module 6, §4) :

```ts
{ name, vars: variableNames.map(variable => ({ name: variable, coef: 1 })), bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 } }
```

Aucune contrainte n'est écrite à la main : elles sont **générées** à partir des listes de lignes, de colonnes, de chiffres et des cases de chaque bloc. Le bloc b commence à la ligne ⌊b / 3⌋ × 3 et à la colonne (b mod 3) × 3.

**Pourquoi la famille « case » est indispensable** : sans elle, rien n'empêche une case de contenir deux chiffres, ou aucun. Les familles ligne, colonne et bloc ne parlent que de la position de chaque chiffre.

## 4. Chiffres donnés et objectif

Un chiffre déjà écrit, par exemple 5 en (0, 0), est une contrainte à **une seule variable** : x_{0,0,5} = 1. On réutilise la même brique Σ x = 1, avec une liste d'une variable. La grille du cours a 30 chiffres donnés : le modèle a donc 324 + 30 = **354 contraintes**.

glpk.js exige un objectif. On en écrit un **sans effet** : une seule variable, avec un coefficient 0.

```ts
objective: { direction: glpk.GLP_MAX, name: "aucun", vars: [{ name: "x_0_0_1", coef: 0 }] }
```

Toutes les grilles valides ont la même valeur, 0. La première grille trouvée est donc prouvée optimale : le statut attendu est `GLP_OPT`. Si la grille est contradictoire (deux 5 sur la même ligne, par exemple), le statut est `GLP_NOFEAS`.

## 5. Résoudre, relire, vérifier

Trois étapes, comme au module 6 :

1. **Tester le statut** : sans `GLP_OPT`, les variables ne veulent rien dire (elles valent toutes 0).
2. **Relire la grille** : pour chaque case, le chiffre v dont la variable dépasse 0,5. Un binaire peut revenir sous la forme 0,9999999.
3. **Vérifier la grille sans le modèle** (module 7) : cases vides, chiffres donnés modifiés, doublons dans une ligne, une colonne ou un bloc.

La vérification indépendante n'est pas une formalité. Si une famille de contraintes manque (souvent les blocs), GLPK renvoie sans erreur une grille « optimale » qui n'est **pas** un sudoku. Seul un contrôle qui repart des règles du jeu, et non du modèle, peut le voir.

## 6. Unicité : interdire une solution trouvée

Un vrai sudoku n'a qu'**une** solution. GLPK en renvoie une, sans dire s'il en existe d'autres. Pour le savoir, on **interdit** la grille trouvée g et on relance.

Une grille complète met à 1 exactement 81 variables, une par case : x_{l,c,g[l][c]}. Toute **autre** grille diffère de g sur au moins une case, donc au moins une de ces 81 variables y vaut 0. D'où la contrainte :

> Σ_{(l,c)} x_{l,c,g[l][c]} ≤ 80

Elle exclut g (sa somme vaut 81) et **seulement** g. On l'appelle une coupe « no-good ». Avec glpk.js : `bnds: { type: glpk.GLP_UP, lb: 0, ub: 80 }`.

L'algorithme :

```
solutions ← []
tant que nombre de solutions < limite :
    résoudre le modèle + une coupe par solution déjà trouvée
    si le statut n'est pas GLP_OPT : arrêter
    ajouter la grille relue à solutions
```

- Si on trouve 1 solution puis `GLP_NOFEAS`, la grille est **unique**.
- Pour décider de l'unicité, une **limite de 2** suffit : dès la deuxième solution, on sait que la grille est ambiguë.
- Sans limite, la grille vide (environ 6,7 × 10²¹ solutions) ne s'arrêterait jamais en pratique.

**Exemple** (exercice 9.2) : dans la solution de la grille du cours, les cases (0,3) (0,4) (3,3) (3,4) valent 6 7 / 7 6. Elles forment un rectangle à cheval sur deux blocs. Si on vide ces 4 cases et elles seules, les 6 et les 7 peuvent s'échanger : la grille a exactement **2** solutions.

**Bonne pratique** : la fonction qui ajoute les coupes renvoie un **nouveau** modèle (`{ ...model, subjectTo: [...model.subjectTo, ...coupes] }`) au lieu de modifier celui qu'elle reçoit. Le modèle de départ reste intact et peut être réutilisé à chaque tour.

## 7. Pourquoi c'est rapide, et les limites

729 binaires représentent 2^729 combinaisons, mais GLPK n'en énumère presque aucune :

- les chiffres donnés **fixent** des variables, et chaque variable fixée à 1 en force d'autres à 0 (si la case (0,0) vaut 5, aucune autre case de la ligne 0 ne peut valoir 5) ;
- la **relaxation** continue (module 5) des contraintes Σ x = 1 est serrée : une fois ces variables fixées, elle laisse peu de place aux valeurs fractionnaires, et le Branch and Bound n'a que peu de nœuds à explorer.

**Limites** :

- un solveur dédié (retour arrière avec propagation) est plus rapide sur le sudoku seul. L'intérêt du MILP est de ne programmer que les **règles** : une variante (sudoku diagonal, régions irrégulières, contraintes « pair / impair ») s'ajoute en quelques lignes ;
- pour **compter** des milliers de solutions, une résolution par solution est trop coûteuse.

## 8. Exemple commenté : un mini-sudoku 4×4

Le script `exemples/09-mini-sudoku.ts` applique toute la méthode à une grille 4×4 (blocs 2×2, chiffres 1 à 4), assez petite pour afficher le modèle :

- 4 × 4 × 4 = **64 binaires** ;
- 4 familles de 16 contraintes, plus 4 chiffres donnés : **68 contraintes** ;
- toutes les fonctions sont **pures** (`exactlyOne`, `boxCells`, `buildRuleConstraints`, `buildGivenConstraints`, `buildSudokuModel`, `readGrid`) ; seul le programme principal appelle le solveur et affiche.

```ts
// Les règles du jeu : 4 familles. Chaque famille fixe deux indices et somme sur le troisième.
const buildRuleConstraints = (): GlpkConstraint[] => [
  // (ligne, colonne) fixées, somme sur les chiffres : un chiffre par case
  ...INDICES.flatMap(row => INDICES.map(col =>
    exactlyOne(`case_${row}_${col}`, DIGITS.map(digit => variableName(row, col, digit))))),
  // (ligne, chiffre) fixés, somme sur les colonnes : chiffre une fois par ligne
  ...INDICES.flatMap(row => DIGITS.map(digit =>
    exactlyOne(`ligne_${row}_${digit}`, INDICES.map(col => variableName(row, col, digit))))),
  // … colonnes et blocs sur le même modèle
];
```

```bash
npm run tp9
# ou : node modules/module-09-sudoku/exemples/09-mini-sudoku.ts
```

Sortie attendue :

```
Grille de départ :
1 . . .
. . 3 .
. 4 . .
. . . 2

Modèle : 64 binaires, 68 contraintes (4 × 16 règles + 4 chiffres donnés)
…
Grille résolue :
1 3 2 4
4 2 3 1
2 4 1 3
3 1 4 2
```

## 9. Vérification et points de vigilance

- **Nombre de contraintes** : 324 règles + 1 par chiffre donné. Un autre total signale une famille oubliée ou en double.
- **Chaque règle a 9 termes**, sauf les chiffres donnés (1 terme).
- **`boxCells`** : vérifie au moins les blocs 0 et 5 à la main. Une erreur de calcul de la ligne ou de la colonne de départ donne 9 cases qui ne forment pas un carré.
- **Statut avant lecture** : une grille contradictoire renvoie `GLP_NOFEAS` et des variables toutes nulles.
- **Coupe d'unicité** : 81 termes (pas 729), `GLP_UP` (pas `GLP_LO`), `ub = 80`.
- **Pas de mutation** : ne jamais faire `model.subjectTo.push(…)` sur le modèle reçu.

## Exercices

| Fichier | Thème | Niveau |
|---|---|---|
| `ex9-1-solveur-sudoku.ts` | Variables x_{l,c,v}, 324 contraintes générées, chiffres donnés, relecture, vérification indépendante | ★★★ |
| `ex9-2-unicite.ts` | Coupe « no-good », modèle augmenté sans mutation, énumération limitée, verdict d'unicité | ★★★ |

Lancer un exercice depuis la racine du projet, par exemple :

```bash
node modules/module-09-sudoku/exercices/ex9-1-solveur-sudoku.ts
```

Les corrigés portent le même nom dans `modules/module-09-sudoku/corriges/`.

## Ce qu'il faut retenir

1. « Lequel parmi plusieurs » se modélise par des **binaires indicatrices** dont exactement une vaut 1 : Σ x = 1.
2. Le sudoku, ce sont **4 familles** de Σ x = 1 (case, ligne, colonne, bloc), plus une contrainte par chiffre donné.
3. Un problème de satisfaction se résout avec un **objectif sans effet** (coefficient 0).
4. Une grille renvoyée par le solveur se **vérifie** sans le modèle.
5. Pour l'unicité : **interdire** la solution trouvée (Σ ≤ 80) et relancer ; une limite de 2 suffit.

## À la fin du module

Tu sais modéliser un problème de satisfaction combinatoire, le résoudre avec un solveur MILP et prouver que sa solution est unique. La même méthode s'applique à d'autres puzzles (Kakuro, carrés latins, emplois du temps) : choisir les indicatrices, écrire chaque règle comme une somme, vérifier indépendamment.

Reviens au [sommaire du cours](../../README.md) pour revoir un module ou relancer toutes les vérifications.
