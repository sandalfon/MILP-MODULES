# Module 3 — Programmation entière et binaire

> Niveau : intermédiaire · Durée : 2 à 3 h
> Exemple commenté : `modules/module-03-variables-binaires/exemples/` · Exercices : `modules/module-03-variables-binaires/exercices/` · Corrigés : `modules/module-03-variables-binaires/corriges/`

**Objectif pédagogique** : modéliser les choix indivisibles, les cardinalités, les exclusions, les implications et les quotas.

## Objectifs

À la fin de ce module, tu sais :

- choisir le bon **domaine** pour une variable (continue, entière, binaire) ;
- traduire les règles métier courantes en **contraintes linéaires sur des binaires** : cardinalité, exclusion, implication, OU, ET, quotas ;
- représenter une contrainte comme une **donnée** (coefficients, sens, second membre) plutôt que comme du code ;
- **vérifier** qu'une formulation interdit exactement les cas interdits, grâce à une table de vérité.

### Comment travailler ce module

Lis d'abord les notions (§1 à §6), exécute ensuite l'exemple commenté (§7) dans Node.js, puis réalise les exercices sans regarder les corrigés. Les extraits de code sont volontairement courts : modifie-les pour voir ce qui change.

---

## 1. Domaines des variables

| Domaine | Notation | Quand l'utiliser |
|---|---|---|
| Continu | `x ∈ ℝ`, souvent `x ≥ 0` | quantité divisible : kg, heures, euros |
| Entier | `x ∈ ℤ`, souvent `0 ≤ x ≤ U` | quantité indivisible : nombre de lots, de personnes |
| Binaire | `x ∈ {0, 1}` | décision oui/non : sélectionner, ouvrir, activer |

Une binaire est simplement une entière bornée entre 0 et 1. C'est la **nature de la décision** qui fixe le domaine, pas la commodité de calcul : un nombre de camions est entier même si 2,7 camions « arrangerait » le modèle.

## 2. Pourquoi les binaires sont si puissantes

Comme `x ∈ {0, 1}`, une somme de binaires **compte** : `x₁ + x₂ + x₃` est le nombre d'éléments choisis. Et une inégalité entre binaires exprime une **règle logique**. Presque toute règle « si… alors… », « au moins un… », « pas les deux… » se traduit en une ou quelques inégalités linéaires.

Dans la suite, `xᵢ = 1` signifie « l'élément i est sélectionné ».

## 3. Catalogue de traductions

### Comptage

| Règle | Contrainte |
|---|---|
| Au plus K éléments | `Σ xᵢ ≤ K` |
| Au moins K éléments | `Σ xᵢ ≥ K` |
| Exactement K éléments | `Σ xᵢ = K` |
| Exactement 40 items dans le test | `Σ xᵢ = 40` |

### Règles entre deux éléments A et B

| Règle | Contrainte | Cas interdit(s) |
|---|---|---|
| **Exclusion** : pas A et B ensemble | `x_A + x_B ≤ 1` | (1,1) |
| **Au moins un** (OU) : A ou B | `x_A + x_B ≥ 1` | (0,0) |
| **Exactement un** (OU exclusif) | `x_A + x_B = 1` | (0,0) et (1,1) |
| **Implication** : B ⇒ A (B exige A) | `x_B ≤ x_A`, soit `x_B − x_A ≤ 0` | B=1, A=0 |
| **Équivalence** : A ⇔ B | `x_A = x_B`, soit `x_A − x_B = 0` | (1,0) et (0,1) |

Vérifions l'implication `x_B ≤ x_A` sur les quatre cas :

| x_A | x_B | x_B ≤ x_A ? | Règle « B ⇒ A » |
|---|---|---|---|
| 0 | 0 | 0 ≤ 0 ✔ | permis |
| 1 | 0 | 0 ≤ 1 ✔ | permis |
| 0 | 1 | 1 ≤ 0 ✘ | **interdit** |
| 1 | 1 | 1 ≤ 1 ✔ | permis |

La contrainte interdit exactement le cas interdit. C'est le critère d'une **formulation correcte**.

> **Piège** : l'implication n'est pas symétrique. « B exige A » (`x_B ≤ x_A`) n'interdit pas de prendre A sans B.

### Implication vers un groupe

« Si B est choisi, au moins un élément du groupe G doit l'être » : `x_B ≤ Σ_{j∈G} xⱼ`.

### ET logique : linéariser un produit

On a parfois besoin d'une variable `z` qui vaut 1 **si et seulement si** A et B sont tous deux choisis, c'est-à-dire `z = x_A · x_B`. Ce produit n'est pas linéaire (module 2). On le remplace par trois contraintes :

```
z ≤ x_A            (si A n'est pas pris, z = 0)
z ≤ x_B            (si B n'est pas pris, z = 0)
z ≥ x_A + x_B − 1  (si A et B sont pris, z ≥ 1, donc z = 1)
```

avec `z ∈ {0,1}`. Les deux premières seules **ne suffisent pas** : elles autorisent `z = 0` quand A et B sont choisis. L'exercice 3.3 le démontre.

### Quotas et couverture

Si `C_k` est l'ensemble des items du domaine k :

| Règle | Contrainte |
|---|---|
| Au moins m items du domaine k | `Σ_{i∈C_k} xᵢ ≥ m` |
| Au plus M items du domaine k | `Σ_{i∈C_k} xᵢ ≤ M` |
| Chaque domaine représenté | une contrainte `Σ_{i∈C_k} xᵢ ≥ 1` **par domaine** |

Une règle comme « chaque domaine est représenté » ne donne pas une contrainte, mais une **famille** de contraintes, générée à partir des données. Ajouter un domaine ajoute une contrainte, sans changer le code.

**Catégories chevauchantes** : si un item appartient à plusieurs catégories (ex. domaine « Algèbre » ET niveau « difficile »), il apparaît dans plusieurs sommes et compte pour chacune. C'est voulu, mais il faut le savoir : 3 items peuvent satisfaire à la fois un quota de 2 en algèbre et un quota de 2 en difficile. Vérifie toujours la définition des ensembles `C_k` dans les données.

## 4. Une contrainte est une donnée

Toutes ces contraintes ont la même forme :

```
Σ coefᵢ · xᵢ   (sens)   rhs        avec sens ∈ { ≤, ≥, = }
```

On retrouve les trois parties vues au [module 2 (§1)](../module-02-programmation-lineaire/module-02-programmation-lineaire.md) : le **membre de gauche** `Σ coefᵢ · xᵢ` (il dépend de la décision), le **sens**, et le **second membre** `rhs` (*right-hand side*), une constante qui ne contient jamais de variable. Pour les règles de ce module, le second membre est presque toujours un petit entier qui se lit directement : `= 3` pour « exactement 3 items », `≤ 1` pour une exclusion, `≥ 1` pour « au moins un par domaine », `≤ 0` pour une implication `x_A − x_B ≤ 0`.

On peut donc stocker chaque contrainte comme un objet :

```ts
type Constraint = { name: string; coefs: Record<string, number>; sense: "<=" | ">=" | "="; rhs: number };

const exclusion: Constraint = { name: "exclusion_i1_i2", coefs: { i1: 1, i2: 1 }, sense: "<=", rhs: 1 };
```

Avantages :

- **un seul évaluateur** générique pour toutes les contraintes ;
- des contraintes **générées** depuis les données (une par domaine) ;
- des messages d'erreur lisibles (le `name` de la contrainte violée) ;
- c'est presque exactement le format attendu par le solveur GLPK (module 6).

Pour évaluer une contrainte sur une décision x, on calcule le membre de gauche `lhs = Σ coefᵢ · xᵢ`, puis on le compare à `rhs` selon le sens.

## 5. Vérifier une formulation par table de vérité

Une formulation peut être :

- **trop permissive** : elle laisse passer un cas interdit ;
- **trop restrictive** : elle interdit un cas permis, ce qui fait perdre de bonnes solutions sans qu'on s'en aperçoive.

Avec k variables binaires, il y a `2ᵏ` affectations. Pour une règle locale (2 ou 3 variables), on peut toutes les tester et comparer :

```
pour chaque affectation (x_A, x_B, …) :
    la règle logique dit : permis ? 
    les contraintes disent : respectées ?
    si les deux réponses diffèrent → erreur de formulation
```

C'est le même principe que l'énumération du module 1, appliqué non pas pour **résoudre**, mais pour **tester** une formulation.

## 6. Exemple : formulaire de 3 questions

| Item | Domaine | Score |
|---|---|---|
| i1 | A | 8 |
| i2 | A | 7 |
| i3 | B | 9 |
| i4 | B | 6 |
| i5 | C | 5 |

Règles :

```
MAX   8x₁ + 7x₂ + 9x₃ + 6x₄ + 5x₅
s.c.  x₁ + x₂ + x₃ + x₄ + x₅ = 3      (exactement 3 items)
      x₁ + x₂ ≥ 1                      (domaine A représenté)
      x₃ + x₄ ≥ 1                      (domaine B représenté)
      x₅ ≥ 1                           (domaine C représenté)
      x₁ + x₂ ≤ 1                      (i1 et i2 incompatibles)
      xᵢ ∈ {0,1}
```

Solutions valides : {i1,i3,i5} = 22, {i2,i3,i5} = 21, {i1,i4,i5} = 19, {i2,i4,i5} = 18. Si l'on ajoute « i5 exige i3 » (`x₅ − x₃ ≤ 0`), seules les deux premières restent.

## 7. Exemple commenté : règles de sélection par énumération

Le script `exemples/03-regles-binaires.ts` code exactement le formulaire du §6 (sans la dépendance) : exactement 3 items, au moins un item par domaine, i1 et i2 incompatibles. Il énumère les `2⁵ = 32` sélections possibles par masque binaire (comme au module 1), garde celles qui respectent toutes les règles et affiche leur score.

```bash
npm run tp3
# ou
node modules/module-03-variables-binaires/exemples/03-regles-binaires.ts
```

Chaque règle métier est une petite fonction booléenne, et une sélection est valide si elle les respecte toutes :

```ts
// Règle 3 : les deux items incompatibles ne peuvent coexister.
function satisfiesIncompatibility(selectedItems: Item[]): boolean {
  const selectedIds = selectedItems.map(item => item.id);
  return !INCOMPATIBLE_PAIR.every(id => selectedIds.includes(id));
}

const satisfiesAllRules = (selectedItems: Item[]): boolean =>
  hasRequiredItemCount(selectedItems) &&
  hasAllRequiredDomains(selectedItems) &&
  satisfiesIncompatibility(selectedItems);
```

Le tableau affiché (colonnes `selectedIds` et `value`, le score total) contient les quatre solutions du §6 : {i1,i3,i5} = 22, {i2,i3,i5} = 21, {i1,i4,i5} = 19, {i2,i4,i5} = 18.

Ici, les règles sont encore écrites **en code** (une fonction par règle, identifiants en dur dans les constantes). L'exercice 3.1 fait le pas suivant du §4 : les mêmes règles deviennent des **données** `{ name, coefs, sense, rhs }`, évaluées par un seul vérificateur générique.

## 8. Vérification et points de vigilance

- **Teste les cas limites à la main** : sélection vide, sélection contenant les deux items incompatibles, sélection où un domaine est absent. Chacune doit être rejetée par au moins une contrainte, et tu dois savoir dire laquelle.
- Une bonne formulation interdit **exactement** les cas interdits : ni plus (trop restrictive), ni moins (trop permissive). Pour une règle locale, la table de vérité du §5 le prouve.
- Vérifie le **sens** des implications (`x_B ≤ x_A` n'est pas `x_A ≤ x_B`) et la définition des ensembles `C_k` quand les catégories se chevauchent.

> **Repère** : les scripts de ce cours sont des supports pédagogiques. Pour un vrai projet, ajoute des tests automatisés, contrôle les données en entrée et conserve la formulation mathématique à côté du code.

---

## Exercices

| Fichier | Thème | Niveau |
|---|---|---|
| `ex3-1-contraintes-en-donnees.ts` | Représenter et évaluer des contraintes comme des données | ★★☆ |
| `ex3-2-selection-questions.ts` | Énumérer les formulaires valides, ajouter une dépendance (« À toi de jouer » ci-dessous) | ★★☆ |
| `ex3-3-table-de-verite.ts` | Prouver qu'une formulation est correcte (ou la prendre en défaut) | ★★★ |

Les fichiers sont dans `modules/module-03-variables-binaires/exercices/` (corrigés de même nom dans `modules/module-03-variables-binaires/corriges/`). Lance un exercice avec `node modules/module-03-variables-binaires/exercices/ex3-1-contraintes-en-donnees.ts` : tant que les `TODO` ne sont pas complétés, l'auto-vérification affiche des ✘.

> **À toi de jouer** : ajoute à l'exemple commenté (§7) une contrainte de dépendance : **i5 ne peut être sélectionné que si i3 l'est**. Traduis-la d'abord en inégalité, puis adapte le contrôle des sélections.
>
> Cet exercice du cours d'origine est traité par l'**exercice 3.2** (`ex3-2-selection-questions.ts`, fonction `buildImplication`) : la dépendance s'écrit `x_i5 ≤ x_i3`, soit `x_i5 − x_i3 ≤ 0`, et il ne reste que {i1,i3,i5} = 22 et {i2,i3,i5} = 21.

## Ce qu'il faut retenir

1. Le domaine d'une variable découle de la nature de la décision.
2. Une somme de binaires compte ; une inégalité entre binaires encode une règle logique.
3. Exclusion `x_A + x_B ≤ 1`, OU `x_A + x_B ≥ 1`, implication B ⇒ A `x_B ≤ x_A`.
4. Le produit `z = x_A · x_B` se linéarise avec trois contraintes, pas deux.
5. Une contrainte linéaire = `{ coefs, sense, rhs }` : la stocker comme une donnée rend le modèle générique et testable.
6. Une bonne formulation interdit **exactement** les cas interdits : on le vérifie par table de vérité.

## À la fin du module

Tu sais traduire des règles de sélection en contraintes linéaires sur des variables binaires. Le [module 4](../module-04-modelisation-avancee/module-04-modelisation-avancee.md) va plus loin : variables indicatrices, contraintes Big-M, coûts fixes et activations conditionnelles.
