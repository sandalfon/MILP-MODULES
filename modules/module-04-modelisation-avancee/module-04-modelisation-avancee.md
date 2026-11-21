# Module 4 — Modélisation avancée des contraintes

> Niveau : intermédiaire · Durée : environ 3 h
> Exemple commenté : `modules/module-04-modelisation-avancee/exemples/` · Exercices : `modules/module-04-modelisation-avancee/exercices/` · Corrigés : `modules/module-04-modelisation-avancee/corriges/`

**Objectif pédagogique** : encoder des règles conditionnelles et comprendre les formulations Big-M sans les utiliser abusivement.

## Objectifs

À la fin de ce module, tu sais :

- utiliser une **variable indicatrice** binaire pour « allumer » ou « éteindre » une partie du modèle ;
- **lier** une quantité continue à une décision binaire (`qmin·y ≤ q ≤ qmax·y`) ;
- écrire une contrainte **Big-M** et choisir un M **valide et serré** à partir des bornes métier ;
- modéliser un **coût fixe** d'ouverture ;
- traduire une **activation conditionnelle** (« si G alors au moins 2 de H ») et une **disjonction** (« soit… soit… ») ;
- distinguer un **validateur TypeScript** (qui teste une solution) de la **formulation** transmise au solveur.

### Comment travailler ce module

Lis d'abord les notions (§1 à §8), exécute ensuite l'exemple commenté (§9) avec Node.js, puis réalise les exercices sans regarder les corrigés. Les extraits sont courts et faits pour être modifiés : change une règle, relance, observe.

---

## 1. Rappel : les règles logiques simples

Le module 3 a introduit les traductions de base, avec des variables binaires :

| Règle métier | Contrainte linéaire |
|---|---|
| au plus K éléments | `Σ x_i ≤ K` |
| exactement K éléments | `Σ x_i = K` |
| i et j incompatibles | `x_i + x_j ≤ 1` |
| j exige i (j ⇒ i) | `x_j ≤ x_i` |
| exactement un dans le groupe | `Σ_{i∈G} x_i = 1` |
| au plus un dans le groupe | `Σ_{i∈G} x_i ≤ 1` |

Ce module va plus loin : il traite des règles qui **dépendent d'une décision** et des liens entre variables binaires et variables **continues**.

## 2. Les variables indicatrices

Une **variable indicatrice** est une binaire `y` qui ne représente pas forcément un objet sélectionné. Elle indique un **état** du système : la machine est allumée, l'usine est ouverte, le groupe G est activé.

L'idée centrale est la suivante : quand `y = 0`, certaines contraintes doivent **s'appliquer** (par exemple « production nulle ») ; quand `y = 1`, d'autres prennent le relais (par exemple « production entre 10 et 100 »).

## 3. Lier une activité et une quantité

Une machine peut produire une quantité `q` (continue). Règles métier :

- si elle est arrêtée, elle ne produit **rien** ;
- si elle tourne, elle produit **au moins 10** (minimum technique) et **au plus 100** (capacité).

Avec `y ∈ {0,1}` l'indicatrice « la machine tourne », on écrit :

```
10·y ≤ q ≤ 100·y
```

Vérifions les deux cas :

| y | contrainte obtenue | sens |
|---|---|---|
| 0 | `0 ≤ q ≤ 0` | q = 0, la machine ne produit rien |
| 1 | `10 ≤ q ≤ 100` | production dans la plage technique |

Une seule paire d'inégalités **linéaires** encode donc une règle « si… alors… ».

> **Piège** : `q ≤ 100·y` seul ne suffit pas. Sans `10·y ≤ q`, le solveur pourrait allumer la machine (`y = 1`) et produire `q = 3`, ce que la règle métier interdit.

## 4. La technique Big-M

La forme générale est la suivante : pour désactiver une contrainte `q ≤ 0` quand `y = 1`, on écrit

```
q ≤ M·y
```

où **M** est une constante « assez grande » pour ne jamais gêner une solution légitime. Quand `y = 0`, cela force `q ≤ 0`. Quand `y = 1`, cela donne `q ≤ M`, qui ne doit **rien** interdire de légitime.

### Choisir M

M doit être :

1. **valide** : au moins aussi grand que la plus grande valeur que `q` peut légitimement prendre. Sinon, on interdit des solutions correctes.
2. **serré** : le plus petit possible parmi les valeurs valides.

Le bon M se **déduit des données** : capacité de la machine, demande totale, budget… Ici, `M = 100`, la capacité.

### Pourquoi un M trop grand est nuisible

Le solveur travaille sur la **relaxation** (module 2) : il remplace `y ∈ {0,1}` par `0 ≤ y ≤ 1`. Prenons `q = 40` :

| M | plus petit y autorisé par `q ≤ M·y` | lecture |
|---|---|---|
| 100 | 40 / 100 = **0,4** | la relaxation « paie » 40 % du coût fixe |
| 10 000 | 40 / 10 000 = **0,004** | la relaxation ne paie presque rien |

Si l'allumage coûte 500 €, la relaxation compte `500 × 0,4 = 200 €` avec M = 100, mais seulement `500 × 0,004 = 2 €` avec M = 10 000. La borne fournie par la relaxation est alors **très éloignée** de la réalité : le Branch and Bound (module 5) élague mal et explore beaucoup plus de nœuds.

S'y ajoutent des **difficultés numériques**. Les solveurs acceptent qu'une binaire vaille `1e-6` au lieu de 0 (tolérance d'intégralité). Avec M = 10⁹, `y = 1e-6` autorise `q ≤ 1000` : de la production « gratuite » avec une machine soi-disant éteinte.

> **Règle d'or** : n'écris jamais `M = 1e9` « pour être tranquille ». Calcule M à partir des bornes métier.

## 5. Le coût fixe

Beaucoup de problèmes réels ont une structure « on paie pour ouvrir, puis on paie à l'unité » :

```
coût = Σ_k ( F_k · y_k  +  c_k · q_k )
```

- `F_k` : coût fixe de l'usine k, payé si et seulement si elle est ouverte (`y_k = 1`) ;
- `c_k` : coût unitaire de production ;
- `q_k ≤ cap_k · y_k` : liaison Big-M, avec un M serré égal à la capacité.

Sans variable binaire, ce coût n'est pas linéaire : il « saute » de 0 à `F_k` dès que `q_k > 0`. La variable `y_k` rend ce saut exprimable de façon linéaire.

Exemple : la demande vaut 100 unités et trois usines sont disponibles. Ouvrir l'usine la moins chère à l'unité n'est pas forcément optimal si son coût fixe est élevé. L'exercice 4.3 le montre par énumération.

## 6. Activation conditionnelle

Règle : *si le groupe G est retenu, au moins deux items du groupe H doivent l'être.*

```
Σ_{j∈H} x_j ≥ 2·y_G
```

| y_G | contrainte | sens |
|---|---|---|
| 0 | `Σ x_j ≥ 0` | toujours vraie : aucune exigence |
| 1 | `Σ x_j ≥ 2` | au moins deux items de H |

Forme équivalente, souvent attendue par les solveurs avec les variables à gauche : `Σ_{j∈H} x_j − 2·y_G ≥ 0`.

Plus généralement, « si y = 1 alors `expr ≥ m` » s'écrit `expr ≥ m·y`, à condition que `expr ≥ 0` soit toujours vrai. Exemple : « si la machine tourne, elle produit au moins 10 » s'écrit `q ≥ 10·y`, valable parce que `q ≥ 0`. Sinon, il faut un Big-M : `expr ≥ m − M·(1 − y)`.

## 7. Disjonction « soit… soit… »

Une tâche doit être planifiée **soit** avant 10 h (`t ≤ 10`), **soit** après 14 h (`t ≥ 14`), avec `0 ≤ t ≤ 24`. On introduit `z ∈ {0,1}` (z = 1 : « avant 10 h ») :

```
t ≤ 10 + M·(1 − z)
t ≥ 14 − M·z
```

- `z = 1` : `t ≤ 10` est active ; la seconde devient `t ≥ 14 − M`, toujours vraie si M ≥ 14.
- `z = 0` : `t ≥ 14` est active ; la première devient `t ≤ 10 + M`, toujours vraie si M ≥ 14.

Le M serré se lit sur les bornes : il faut `10 + M ≥ 24` et `14 − M ≤ 0`, donc **M = 14** suffit.

## 8. Validateur TypeScript ≠ formulation MILP

Deux outils complémentaires, à ne pas confondre :

| | Validateur TS | Formulation MILP |
|---|---|---|
| Entrée | **une** solution déjà construite | les données |
| Rôle | dire **quelles règles** sont violées | décrire **l'ensemble** des solutions permises au solveur |
| Écriture | `if (selectedSet.has("C") && !selectedSet.has("A"))` | `x_C − x_A ≤ 0` |
| Usage | tests, contrôle post-résolution | résolution |

Le validateur est écrit indépendamment de la formulation. Si les deux sont d'accord sur tous les cas de test, on a une bonne confiance dans la traduction. S'ils divergent, l'un des deux contient une erreur. C'est la base du diagnostic du module 7.

Une bonne pratique consiste à vérifier qu'une formulation est **exacte** en énumérant toutes les valeurs 0/1 des variables concernées et en comparant avec la règle logique : c'est une **table de vérité**.

## 9. Exemple commenté : un vérificateur indépendant de contraintes

Avant de confier un modèle au solveur, on se dote d'un **vérificateur** : une fonction qui prend une sélection déjà construite et renvoie un message pour **chaque** règle violée. Il servira à tester les formulations, avant puis après la résolution (§8).

Le script `exemples/04-verificateur-contraintes.ts` contrôle trois règles sur des éléments A, B, C : cardinalité exacte (2 éléments), incompatibilité A–B, dépendance « C exige A ». Les règles sont des **données** (objet `RULES`) : le vérificateur ne contient aucun identifiant en dur.

```ts
// Retourne toutes les erreurs plutôt que de s'arrêter à la première.
// Set rend les tests d'appartenance explicites.
// Tableau vide = sélection valide.
function validateSelection(selectedIds: string[], rules: Rules): string[] {
  const selectedSet = new Set(selectedIds);
  return [
    ...findCardinalityErrors(selectedIds, rules),
    ...findIncompatibilityErrors(selectedSet, rules),
    ...findDependencyErrors(selectedSet, rules)
  ];
}
```

Chaque règle est une petite fonction pure qui renvoie `[]` si elle est respectée, ou un message sinon. Les commentaires rappellent la contrainte linéaire correspondante (`x_A + x_B ≤ 1`, `x_C ≤ x_A`).

Lancer depuis la racine du projet :

```bash
npm run tp4
# ou
node modules/module-04-modelisation-avancee/exemples/04-verificateur-contraintes.ts
```

Sortie attendue :

```
[]
[ 'A et B sont incompatibles' ]
[ 'C exige A' ]
```

`["A", "C"]` est valide ; `["A", "B"]` viole l'incompatibilité ; `["B", "C"]` viole la dépendance.

## 10. Vérification et points de vigilance

- **Ne confonds pas** un test TypeScript de validation avec la formulation MILP : le premier sert à **tester** les règles sur une solution, la seconde les **transmet** au solveur (§8).
- Une activation sans le facteur `y_G` (`Σ_H x ≥ 2`) s'applique même quand G est absent : vérifie toujours le cas `y = 0`.
- Une implication écrite dans le mauvais sens (`x_A ≤ x_C` au lieu de `x_C ≤ x_A`) passe souvent inaperçue : une table de vérité la détecte immédiatement.
- M se **déduit** des bornes métier ; jamais de `M = 1e9` par confort (§4).

---

## Exercices

| Fichier | Thème | Niveau |
|---|---|---|
| `ex4-1-validateur-regles.ts` | Validateur générique : cardinalité, exclusion, dépendance, activation (inclut l'« À toi de jouer ») | ★★☆ |
| `ex4-2-big-m-activation.ts` | Liaison y/q, choix de M, effet sur la relaxation | ★★☆ |
| `ex4-3-cout-fixe.ts` | Ouverture d'usines avec coût fixe, énumération | ★★★ |

Lancer un exercice depuis la racine du projet :

```bash
node modules/module-04-modelisation-avancee/exercices/ex4-1-validateur-regles.ts
```

Tant que les `TODO` ne sont pas complétés, l'auto-vérification affiche des ✘. Les corrigés commentés sont dans `modules/module-04-modelisation-avancee/corriges/` (même nom de fichier).

> **« À toi de jouer » du cours d'origine** : « ajoute une condition de type **activation** : si le groupe G est sélectionné, au moins deux items du groupe H doivent l'être. Écris l'inégalité et un test. » Cet exercice est entièrement couvert par l'**exercice 4.1** (`ex4-1-validateur-regles.ts`) : la règle `activation_G_H` (TODO 4) généralise le vérificateur de l'exemple, son inégalité `Σ_{j∈H} x_j ≥ 2·x_G` est écrite au TODO 6, et l'auto-vérification teste les cas « G avec un seul H » (invalide), « G avec deux H » (valide) et « H sans G » (aucune exigence). Une table de vérité sur les 128 sélections prouve que l'inégalité traduit exactement la règle.

## Ce qu'il faut retenir

1. Une indicatrice binaire `y` active ou désactive des contraintes.
2. `qmin·y ≤ q ≤ qmax·y` encode « arrêté ⇒ 0, en marche ⇒ dans la plage ».
3. Big-M : M doit être **valide** (ne coupe aucune solution légitime) et **serré** (le plus petit possible). On le déduit des données.
4. Un M trop grand affaiblit la relaxation et crée des problèmes numériques.
5. Activation : `Σ_H x ≥ m·y_G`. Disjonction : deux contraintes Big-M et une binaire de choix.
6. Le validateur teste une solution ; la formulation définit l'espace de recherche. Il faut les deux.

## À la fin du module

Tu sais formaliser des contraintes conditionnelles (indicatrices, Big-M, coût fixe, activation, disjonction) et vérifier leur sens avec un validateur et une table de vérité. Le [module 5](../module-05-algorithmes-resolution/module-05-algorithmes-resolution.md) montre comment le solveur exploite la relaxation, et pourquoi une formulation serrée accélère le Branch and Bound.
