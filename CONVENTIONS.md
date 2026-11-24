# Conventions du cours

Ces règles s'appliquent à tout le code (`modules/*/exemples`, `exercices`, `corriges`, `lib/`) et aux extraits de code des cours (`modules/*/module-0N-*.md`). Elles garantissent qu'un même concept porte le même nom d'un module à l'autre.

## Langue

- **Les identifiants sont en anglais** : variables, fonctions, types, champs de données, constantes, fonctions de `lib/verif.ts`.
- **Tout le reste est en français** : commentaires, consignes, en-têtes, indices, messages affichés (`console.log`), libellés des tests (`check("coût de (A,B,D) = 100", …)`), cours `.md`, noms de fichiers.
- Exceptions aux identifiants anglais : les noms imposés par une bibliothèque (`glpk.solve`, `name`, `coef`, `bnds`, `lb`, `ub`, `vars`, `subjectTo`, `binaries`, `result`, `status`, `z`…) — déjà anglais — et les notations mathématiques ci-dessous.

## Notations mathématiques autorisées

Ces noms courts reprennent les formules du cours et sont donc explicites dans ce contexte :

| Nom | Sens |
|---|---|
| `x`, `y` | décision (vecteur de variables, ex. `x: Decision`) ou coordonnées d'un point du plan (module 2) |
| `z` | variable auxiliaire du maximin (module 8) |
| `a`, `b` | paramètres IRT 2PL : discrimination et difficulté (champs de `Item`, module 8) |
| `theta` | niveau de compétence θ |
| `M` | constante du Big-M (module 4) |
| `D` | facteur d'échelle IRT (module 8) |
| `i`, `j`, `k` | indices de boucle ou de tableau |

**Tout autre nom d'une lettre est interdit**, y compris dans les fonctions fléchées : on écrit `products.map(product => product.cost)`, pas `p => p.cost` ; `constraints.filter(constraint => …)`, pas `c => …`. L'accumulateur d'un `reduce` s'appelle `sum`, `total` ou porte le nom de ce qu'il construit (`countByDomain`).

## Forme des noms

| Élément | Forme | Exemples |
|---|---|---|
| Données de module (fournies, constantes) | `UPPER_SNAKE_CASE` | `PRODUCTS`, `BUDGET`, `ITEMS`, `THETA_GRID`, `RULES` |
| Variables et paramètres | `camelCase`, nom explicite | `selectedProducts`, `totalCost`, `remainingCapacity` |
| Fonctions | `camelCase`, verbe ou question | `computeCost`, `buildModel`, `isFeasible`, `fitsBudget` |
| Booléens | préfixe `is`, `has`, `can`, `satisfies`, `fits` | `isFeasible`, `satisfiesQuotas` |
| Types | `PascalCase`, nom au singulier | `Product`, `Decision`, `Constraint` |

## Glossaire : un concept, un nom

| Concept | Type | Données / champs |
|---|---|---|
| Produit du fil rouge (A, B, C, D) | `Product` | `PRODUCTS`, `BUDGET` ; champs `id`, `cost`, `value` |
| Objet d'une instance de sac à dos générée (module 5) | `KnapsackItem` | champs `id`, `cost`, `value` ; `capacity` |
| Décision (valeur de chaque variable) | `Decision = Record<string, number>` | `x` |
| Solution retenue | `Solution` | `selectedIds: string[]`, `value`, et `cost` si utile |
| Sélection en cours d'examen | `string[]` ou `Set<string>` | `selectedIds` |
| Contrainte écrite sous forme de données (modules 2-3) | `Constraint` | `name`, `coefs`, `sense`, `rhs` |
| Membre de gauche / second membre | — | `lhs` / `rhs` |
| Écart d'une contrainte | — | `slack` |
| Règles métier d'un validateur | `Rules` | `RULES` |
| Item de banque IRT | `Item` | `ITEMS` ; champs `id`, `a`, `b`, `domain` |
| Item enrichi de son coefficient | `ScoredItem = Item & { score: number }` | |
| Modèle GLPK | `Model` | `model` |
| Terme `coef · variable` d'un modèle GLPK | `Term` | `{ name, coef }` |
| Contrainte d'un modèle GLPK | `GlpkConstraint` (ou `Constraint` si le fichier n'a pas d'autre sorte de contrainte) | |
| Réponse de `glpk.solve` | `SolverOutput` | `solverOutput` ; on lit `solverOutput.result.status`, `solverOutput.result.vars` |
| Instance GLPK initialisée | — | `glpk` |
| Constantes GLPK dont une fonction pure a besoin | `GlpkConstants` | sous-ensemble de `GLP_MAX`, `GLP_UP`, `GLP_FX`… |
| Relaxation continue | `Relaxation` | `bound`, `fractions` |
| Meilleure solution entière connue | `Incumbent` | |
| Auto-vérification (`lib/verif.ts`) | — | `check`, `checkAsync`, `printTitle`, `printSummary` |

Quand un type de la bibliothèque existe (`LP`, `Result` de `glpk.js/node`), on le réutilise au lieu de le redéfinir : `type Model = LP`, `type SolverOutput = Result`.

## Valeurs absentes (`null`)

- Une fonction qui peut ne rien trouver le dit dans son type (`Solution | null`) et le cas est **traité** par l'appelant : test explicite, message ou `throw new Error("…")` qui explique pourquoi la situation est impossible.
- L'opérateur `!` (« je garantis que ce n'est pas null ») est évité. S'il reste indispensable, une ligne de commentaire juste au-dessus justifie la garantie.

## Structure des fichiers

**Exercice et corrigé** portent le même nom et les mêmes sections, dans cet ordre :

```
/** en-tête : MODULE N — Exercice N.k : titre
 *  Cours / Niveau / Durée / Lancer
 *  OBJECTIF · PRÉREQUIS · CONSIGNE · RÉSULTAT ATTENDU      (exercice)
 *  EXPLICATIONS · Pièges fréquents · Réponses aux questions (corrigé) */
// ─── 1. DONNÉES ───
// ─── 2. OUTILS FOURNIS ───            (seulement si le fichier en a)
// ─── n. FONCTIONS À COMPLÉTER ───     (exercice) / FONCTIONS (corrigé)
// ─── n. PROGRAMME PRINCIPAL ───
// ─── n. AUTO-VÉRIFICATION ───
// ─── INDICES ───                      (exercice seulement, tout en bas)
```

Les sections sont numérotées à la suite : sans « Outils fournis », les fonctions sont la section 2.

### Fonction à compléter

Chaque fonction à compléter est précédée d'un bloc qui commence par `// TODO n — titre` et qui en décrit **l'objectif en détail**, sans donner la solution :

```ts
// TODO 1 — Coût total d'une décision.
// Objectif : calculer Σ cost_i · x_i, la dépense engagée par la décision x.
// Entrée   : x, la valeur (0 ou 1) de la variable de chaque produit, ex. { A: 1, B: 1, C: 0, D: 1 }.
// Sortie   : un nombre, la somme des coûts des produits dont la variable vaut 1.
// Exemple  : totalCost({ A: 1, B: 1, C: 0, D: 1 }) → 30 + 50 + 20 = 100.
// Attention: la décision vide { A: 0, B: 0, C: 0, D: 0 } coûte 0.
// (Indice 1 en fin de fichier.)
function totalCost(x: Decision): number {
  return undefined; // ← à remplacer
}
```

Les lignes `Objectif`, `Entrée`, `Sortie`, `Exemple` sont obligatoires ; `Attention` (cas particuliers, pièges) quand c'est utile.

Dans `Entrée`, **un paramètre par ligne**, nom en tête, aligné sous le texte ; de même dans `Sortie`, un champ par ligne quand la fonction renvoie un objet à plusieurs champs. Quand l'objectif comporte plusieurs sous-tâches, elles sont listées en puces sous `Objectif`, dans l'ordre où la fonction doit les traiter :

```ts
// Objectif : valider une sélection et lister toutes ses violations, dans cet ordre :
//            - id présents plusieurs fois ;
//            - id absents de la banque.
// Entrée   : selectedIds, les id retenus, ex. ["a1", "a1", "x"] ;
//            items, la banque, ex. ITEMS.
```

### Indices

Les indices (méthode à employer, fonction JavaScript utile, schéma de code) ne sont **jamais** dans le bloc TODO : ils sont regroupés dans une dernière section `INDICES`, après l'auto-vérification, numérotés comme les TODO, pour que l'élève cherche d'abord seul :

```ts
// ─── INDICES (à lire seulement si tu bloques) ───────────────────
//
// Indice 1 (totalCost) — PRODUCTS.reduce((sum, product) => …, 0) ;
//   x[product.id] lit la variable du produit.
```

Une ligne d'indice ne commence jamais par `// TODO`.

### Exercice ≠ corrigé

Hors du bloc d'en-tête et du corps des fonctions à compléter, exercice et corrigé sont **identiques** : mêmes données, mêmes noms, même programme principal, mêmes tests. Seules différences admises :

- les titres de section de l'exercice précisent ce que l'élève ne doit pas toucher : `1. DONNÉES (fournies, ne pas modifier)`, `PROGRAMME PRINCIPAL (fourni)`, `AUTO-VÉRIFICATION (ne pas modifier)` ; le corrigé titre `FONCTIONS` là où l'exercice titre `FONCTIONS À COMPLÉTER` ;
- les blocs `// QUESTIONS :` (ou `// QUESTION`) et la section `INDICES` n'apparaissent que dans l'exercice ; le corrigé répond aux questions dans son en-tête, sous l'intitulé « Réponses aux questions » ;
- la ligne « (Indice n en fin de fichier.) » des blocs TODO n'existe que dans l'exercice.

On n'écrit jamais « // TODO » ailleurs que sur la première ligne d'un bloc de fonction à compléter.

**Noms de fichiers** : en français, en minuscules avec tirets (`ex2-3-relaxation-arrondi.ts`, `06-sac-a-dos-glpk.ts`).

**Copies vierges** : chaque exercice `exercices/exN-k-….ts` a une copie `exN-k-…-clean.ts`, jamais modifiée par l'élève. Quand on modifie l'énoncé d'un exercice, on modifie **les deux** fichiers. `npm run verifier:exercices` vérifie la copie vierge (le fichier de travail peut contenir des réponses) ; `progression` et `typecheck:exercices` l'ignorent.

**Exemple commenté** (`exemples/`) : première ligne `// Module N — Exemple commenté : …`, puis `// Lancer : npm run tpN`. Données en tête, calculs en fonctions pures, affichage à la fin.

**Le cours d'un module** (`module-0N-<thème>.md`, même nom que son dossier) suit ce plan :

```
# Module N — Titre
(niveau · durée · chemins des dossiers)
**Objectif pédagogique** : …
## Objectifs
### Comment travailler ce module
## 1. … ## k.   notions du module
## k+1. Exemple commenté      (un ### par script s'il y en a plusieurs)
## k+2. Vérification et points de vigilance
## Exercices                  (tableau + note « À toi de jouer » du cours d'origine)
## Ce qu'il faut retenir
## À la fin du module         (bilan + lien vers le module suivant)
```

## Vérifier

```bash
npm run typecheck && npm run exemples && npm run corriges && npm run verifier:exercices
```
