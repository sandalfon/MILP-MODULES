# Module 7 — Performance, diagnostic et qualité

> Niveau : avancé · Durée : environ 3 h
> Exemple commenté : `modules/module-07-diagnostic-qualite/exemples/` · Exercices : `modules/module-07-diagnostic-qualite/exercices/` · Corrigés : `modules/module-07-diagnostic-qualite/corriges/`

**Objectif pédagogique** : évaluer une formulation, diagnostiquer une infaisabilité et améliorer la qualité des données et des contraintes.

## Objectifs

À la fin de ce module, tu sais :

- expliquer pourquoi deux formulations **équivalentes** peuvent avoir des performances très différentes ;
- reconnaître une formulation **forte** et une formulation **faible** ;
- citer le rôle du **presolve** et le problème des **symétries** ;
- diagnostiquer un modèle **infaisable** avec une méthode reproductible ;
- construire un **validateur indépendant** et une **suite de tests automatisés**.

### Comment travailler ce module

Lis d'abord les notions (§1 à §6), exécute ensuite l'exemple commenté (§7) avec Node.js, puis réalise les exercices **sans regarder les corrigés**. Les extraits de code sont courts : modifie-les (règles, banque, sélection) pour voir comment le diagnostic réagit.

---

## 1. La formulation compte

Deux modèles sont **équivalents** s'ils ont exactement les mêmes solutions entières réalisables. Ils peuvent pourtant demander des temps de calcul très différents au solveur.

Pourquoi ? Le module 5 l'a montré : un solveur MILP s'appuie sur la **relaxation continue** (on remplace `x ∈ {0,1}` par `0 ≤ x ≤ 1`) pour obtenir des **bornes** et élaguer des branches. Plus la relaxation est **proche** de l'enveloppe des solutions entières, plus les bornes sont précises et moins le solveur explore de nœuds.

- Formulation **forte** (ou *serrée*) : la relaxation colle aux solutions entières, et la borne est proche de l'optimum.
- Formulation **faible** : la relaxation autorise beaucoup de solutions fractionnaires, et la borne est lâche.

### Exemple : agrégée ou désagrégée

Un entrepôt `j` doit être ouvert (`y_j = 1`) pour servir des clients (`x_ij = 1`). Il y a deux façons d'écrire « pas de client servi par un entrepôt fermé » :

| Formulation | Contraintes | Nombre de lignes |
|---|---|---|
| **Agrégée** | `Σ_i x_ij ≤ n · y_j` (une par entrepôt, n = nombre de clients) | peu |
| **Désagrégée** | `x_ij ≤ y_j` (une par couple client/entrepôt) | beaucoup |

En nombres entiers, les deux disent la même chose. Mais dans la relaxation, la version agrégée accepte `y_j = 1/n` dès qu'un seul client est servi. Le coût fixe de l'entrepôt n'est alors compté qu'à `1/n` de sa valeur, ce qui donne une borne beaucoup trop optimiste. La version désagrégée impose `y_j ≥ x_ij`, donc `y_j = 1` pour un client entièrement servi.

> **À retenir** : plus de contraintes ne veut pas dire plus lent. Une contrainte qui **resserre la relaxation** aide souvent le solveur.

Le même raisonnement explique pourquoi le **M** des formulations Big-M (module 4) doit être aussi petit que possible : un M énorme rend `q ≤ M·y` presque inactive dans la relaxation.

## 2. Presolve

Avant de résoudre, le solveur **simplifie** le modèle : il supprime les contraintes redondantes, fixe les variables dont la valeur est forcée, resserre les bornes et détecte certaines infaisabilités évidentes. Dans glpk.js, c'est l'option `presol: true`.

Le presolve ne remplace pas une bonne formulation. Mais il rattrape beaucoup de maladresses : variables inutiles, contraintes dupliquées…

## 3. Symétries

Si plusieurs variables sont **interchangeables** (dix salles identiques, par exemple), une même solution existe sous de nombreuses formes permutées. Le Branch and Bound explore alors des branches équivalentes inutilement.

Un remède est le **bris de symétrie** : imposer un ordre arbitraire entre éléments identiques, par exemple `y_1 ≥ y_2 ≥ … ≥ y_k` (on ouvre les salles dans l'ordre). Cela supprime les copies sans perdre de solution utile. À manier avec soin : une contrainte de symétrie mal choisie peut **éliminer** l'optimum.

## 4. Infaisabilité : causes fréquentes

Un statut **infaisable** (`GLP_NOFEAS`) signifie qu'**aucune** décision ne respecte toutes les contraintes à la fois. Les causes typiques :

| Cause | Exemple |
|---|---|
| Exigences contradictoires | longueur exacte 4, mais quotas minimums totalisant 5 |
| Bornes erronées | `GLP_LO` au lieu de `GLP_UP`, `lb > ub` |
| Ensembles mal définis | un domaine sans aucun item dans la banque, mais un quota de 1 |
| Unités incohérentes | budget en k€ et coûts en € |
| Données manquantes | item sans domaine : il n'est compté dans aucun quota |

> Le solveur dit **que** le modèle est infaisable, pas **pourquoi**. Le diagnostic est ton travail.

### Contrôles de cohérence avant résolution

Beaucoup de contradictions se détectent **sans solveur**, par simple arithmétique :

- `Σ minimums > longueur` → infaisable ;
- `Σ maximums < longueur` → infaisable ;
- un minimum de domaine > nombre d'items disponibles dans ce domaine → infaisable.

Ces contrôles sont rapides et donnent un message **précis**. Fais-les toujours avant d'appeler le solveur.

## 5. Protocole de diagnostic

1. **Organise les contraintes en familles** : longueur, quotas, exclusions, budget… Donne à chaque contrainte un nom explicite.
2. **Retrait progressif** : retire une famille à la fois et relance. Si le modèle redevient faisable, cette famille participe au conflit. Si le modèle reste infaisable, le conflit est ailleurs.
3. **Ajout progressif** (variante) : pars d'un modèle minimal faisable et ajoute les familles une par une. La première qui rend le modèle infaisable est en conflit avec les précédentes.
4. **Relaxation élastique** : ajoute à chaque contrainte « molle » une **variable d'écart** `s_k ≥ 0` qui l'autorise à être violée, et **minimise** la somme des écarts :

   ```
   quota A :  Σ_{i∈A} x_i + s_A ≥ 2
   ...
   MIN  Σ_k poids_k · s_k
   ```

   Le modèle élastique est **toujours faisable**. Sa valeur optimale mesure la **violation minimale** nécessaire, et les `s_k > 0` désignent les contraintes à assouplir. Les **poids** expriment les priorités : un poids élevé sur la longueur protège la longueur au détriment des quotas.
5. **Vérifie unités, bornes et données** (valeurs manquantes, doublons).
6. **Compare** toujours la solution finale à un **vérificateur indépendant**.

> Un conflit implique souvent **plusieurs** contraintes ensemble. Avec « longueur = 4 » et des quotas A ≥ 2, B ≥ 2, C ≥ 1, retirer **n'importe laquelle** de ces quatre contraintes rend le modèle faisable. Aucune n'est « la » coupable : c'est leur combinaison qui est impossible. En revanche, retirer une exclusion entre deux items ne change rien : elle ne participe pas au conflit.

### Et le statut « non borné » ?

`GLP_UNBND` signifie que l'objectif peut s'améliorer indéfiniment. C'est presque toujours une **borne oubliée** (une variable continue sans maximum dans un problème de maximisation). Avec des variables binaires, ce cas ne se produit pas : elles sont bornées par construction.

## 6. Validateur indépendant et tests automatisés

Un **validateur** prend une sélection et les données, puis renvoie la **liste** de toutes les règles violées : toutes, pas seulement la première. Il ne doit pas réutiliser le code de construction du modèle.

Une **suite de tests** couvre au minimum :

| Catégorie | Exemple de cas |
|---|---|
| Cas faisable | sélection conforme → aucune erreur |
| Cas infaisable | quota manquant, longueur incorrecte |
| Données manquantes | item inconnu, item sans domaine |
| Doublons | même item sélectionné deux fois, id dupliqué dans la banque |
| Contraintes redondantes | min 0 sur un domaine : ne doit rien changer |
| Paramètres extrêmes | longueur 0, quota égal à la longueur, sélection vide |

Chaque test porte un **nom** lisible et le **résultat attendu**. Ainsi, une régression se voit immédiatement quand on modifie le code.

## 7. Exemple commenté : un vérificateur de sélection

Le script `exemples/07-validation.ts` (le « TP 7 » de la version d'origine du cours) est le point de départ d'un jeu de tests automatisés : il confronte une sélection d'items à des règles métier, **sans solveur**, et renvoie la liste des violations. Un tableau vide signifie qu'aucune règle contrôlée n'est violée.

```bash
npm run tp7
# ou
node modules/module-07-diagnostic-qualite/exemples/07-validation.ts
```

Le vérificateur est découpé en petits contrôles indépendants, un par famille de règles, dont on concatène les messages :

```ts
// Tableau vide = aucune violation détectée par ces règles.
function validateSelection(selectedIds: string[], items: Item[], rules: Rules): string[] {
  const itemsById = new Map(items.map(item => [item.id, item]));
  return [
    ...validateLength(selectedIds, rules),
    ...validateKnownIds(selectedIds, itemsById),
    ...validateMinimums(countItemsByDomain(selectedIds, itemsById), rules)
  ];
}
```

Avec une banque `ITEMS` de cinq items (`a1`, `a2` en A ; `b1`, `b2` en B ; `c1` en C) et les règles `RULES` « exactement 3 items, au moins un par domaine », le script affiche :

```
[]
[ 'item inconnu : zz', 'quota min C : 0 < 1' ]
```

Les messages ont la même forme que ceux du validateur de l'exercice 7.1 (`item inconnu : …`, `quota min … : observé < minimum`, `longueur incorrecte : … ≠ …`).

La première sélection `["a1", "b1", "c1"]` est conforme. La seconde `["a1", "b1", "zz"]` cumule deux problèmes : une **erreur de données** (identifiant absent de la banque) et une **violation de quota** (l'identifiant inconnu n'est compté dans aucun domaine). Remarque que la longueur, elle, est correcte : le vérificateur signale **toutes** les violations, pas seulement la première.

Pour aller vers une vraie suite de tests (§6), il reste à couvrir les doublons, les maximums, les items sans domaine et les paramètres extrêmes : c'est l'objet de l'exercice 7.1.

## 8. Vérification et points de vigilance

- Un statut **infaisable** ne dit pas automatiquement **quelle** règle est fautive : c'est souvent une **combinaison** de contraintes, d'où l'intérêt du diagnostic par familles (§5).
- Un **vérificateur indépendant** aide à repérer les erreurs de modélisation **et** de données : il ne doit pas réutiliser le code qui construit le modèle, sinon il reproduit les mêmes erreurs.
- Fais les **contrôles arithmétiques** (sommes des quotas, items disponibles par domaine) avant tout appel au solveur.
- Une contrainte de **bris de symétrie** mal choisie peut éliminer l'optimum : vérifie que l'optimum est inchangé avec et sans elle sur un petit cas.

---

## Exercices

Chaque exercice se lance depuis la racine du projet, par exemple :

```bash
node modules/module-07-diagnostic-qualite/exercices/ex7-1-jeu-de-tests.ts
```

Le corrigé correspondant porte le même nom dans `modules/module-07-diagnostic-qualite/corriges/`.

| Fichier | Thème | Niveau |
|---|---|---|
| `ex7-1-jeu-de-tests.ts` | Validateur enrichi, contrôles de cohérence, suite de tests nommés | ★★☆ |
| `ex7-2-diagnostic-infaisabilite.ts` | Infaisabilité provoquée, retrait par familles, relaxation élastique (= « À toi de jouer » d'origine) | ★★★ |
| `ex7-3-formulation-forte-faible.ts` | Agrégée ou désagrégée : même optimum, bornes différentes | ★★★ |

### À toi de jouer

L'énoncé d'origine : *« Provoque volontairement une infaisabilité (longueur 4 mais quotas minimums totalisant 5). Décris une méthode de diagnostic par retrait progressif des familles de contraintes. »*

Ce travail correspond à l'**exercice 7.2** (`ex7-2-diagnostic-infaisabilite.ts`), qui reprend exactement ces règles (longueur 4 ; A ≥ 2, B ≥ 2, C ≥ 1), constate le statut infaisable avec glpk.js, puis automatise le retrait progressif par familles et par contrainte avant de passer à la relaxation élastique. Le contrôle arithmétique « Σ minimums (5) > longueur (4) », qui détecte la contradiction **sans solveur**, est quant à lui la fonction `validateRuleConsistency` de l'**exercice 7.1**.

Méthode attendue, en résumé : remarque d'abord que 2 + 2 + 1 = 5 > 4 ; puis retire une famille à la fois (longueur, quotas, exclusions) et relance. Le modèle redevient faisable sans la longueur ou sans les quotas, mais reste infaisable sans les exclusions : le conflit oppose la longueur aux quotas. Enfin, fais vérifier toute sélection candidate par le validateur indépendant : par exemple, `["a1", "a2", "b1", "c1"]` respecte la longueur mais le validateur de l'exercice 7.1 signale `quota min B : 1 < 2` (elle viole aussi l'exclusion a1 / b1 de l'exercice 7.2, que ce validateur ne contrôle pas : pense à l'ajouter si tu réutilises ce validateur).

## Ce qu'il faut retenir

1. Formulations équivalentes ≠ performances équivalentes : la **force de la relaxation** compte.
2. Une contrainte désagrégée (`x_ij ≤ y_j`) donne souvent une relaxation plus serrée qu'une contrainte agrégée.
3. Un statut infaisable ne désigne pas la règle fautive : diagnostique par **familles**, puis par **relaxation élastique**.
4. Fais les contrôles de cohérence arithmétiques **avant** le solveur.
5. Valide chaque solution avec un **vérificateur indépendant**, couvert par des **tests nommés**.

## À la fin du module

Tu disposes d'une méthode reproductible pour fiabiliser un modèle. Le [module 8](../module-08-selection-items-irt/module-08-selection-items-irt.md) la met en œuvre sur un cas complet de sélection d'items.
