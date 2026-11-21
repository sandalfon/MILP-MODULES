# Cours MILP en TypeScript

Programmation linéaire en nombres entiers mixtes (*Mixed-Integer Linear Programming*), des bases jusqu'à l'assemblage de tests IRT 2PL, en huit modules. Chaque module réunit un cours, des exemples commentés à exécuter, des exercices à compléter et leurs corrigés.

## Prérequis

- Node.js 22.18 ou plus récent : Node exécute directement les fichiers TypeScript (`.ts`), sans étape de compilation.
- Un terminal.
- Notions élémentaires de JavaScript. Les types TypeScript sont expliqués au fil du code.

## Installation

```bash
# depuis la racine du projet (dossier qui contient package.json)
npm install
```

Les modules 6 à 8 utilisent le solveur GLPK via `glpk.js`. Sous Node, il faut l'importer avec `import GLPK from "glpk.js/node"` (voir le module 6).

## Organisation

```
modules/
└── module-0N-<thème>/
    ├── module-0N-<thème>.md  cours : notions, exemples, formulations, exercices
    ├── exemples/             scripts commentés à lire et à exécuter (npm run tpN)
    ├── exercices/            fichiers à compléter (consigne, données, squelette, TODO)
    └── corriges/             mêmes fichiers, complets, avec explications détaillées
lib/
├── verif.ts               auto-vérification utilisée par les exercices (check, printSummary…)
├── verifier-tout.ts       lance tous les exercices, corrigés ou exemples
├── verifier-exercices.ts  prouve que chaque exercice est faisable (voir plus bas)
└── nettoyer-exercices.ts  remet à zéro les exercices d'un module (npm run nettoyer -- N)
CONVENTIONS.md             règles de nommage et de structure communes à tout le cours
```

Chaque exercice est structuré de la même façon :

1. **En-tête** : objectif, prérequis, consigne pas à pas, résultat attendu.
2. **Données** : fournies, à ne pas modifier.
3. **Outils fournis** : code issu des exercices précédents.
4. **Fonctions à compléter** : squelettes avec des `TODO` numérotés ; chaque TODO décrit en détail l'objectif de la fonction (entrée, sortie, exemple, cas particuliers).
5. **Programme principal** : fourni. Il affiche les résultats et pose des **questions** de réflexion.
6. **Auto-vérification** : des tests marqués ✔ / ✘ qui indiquent ce qui reste à faire.
7. **Indices** : regroupés tout en bas du fichier, numérotés comme les TODO. Ne les lis que si tu bloques.

Le corrigé porte le **même nom** dans `corriges/`. Son bloc `EXPLICATIONS` détaille le raisonnement, les pièges fréquents et les réponses aux questions.

## Méthode de travail conseillée

1. Lis le cours du module (`module-0N-<thème>.md`).
2. Exécute et lis l'exemple commenté du module (`npm run tp1`, `npm run tp2`…).
3. Ouvre un exercice, lance-le une première fois : tout est ✘, c'est normal.
4. Complète les `TODO` dans l'ordre, en relançant après chacun.
5. Quand tout est ✔, réponds aux questions, **puis** compare ton code au corrigé.

```bash
node modules/module-01-fondamentaux/exercices/ex1-1-evaluer-decision.ts   # un exercice
npm run progression           # bilan de tous tes exercices
npm run typecheck:exercices   # erreurs de type restantes dans tes exercices
```

### Repartir de zéro : les copies `-clean`

Chaque exercice a une copie vierge à côté de lui, avec le suffixe `-clean` (par exemple `ex1-1-evaluer-decision-clean.ts`). Tu travailles dans le fichier sans suffixe ; la copie reste intacte.

Pour recommencer **tous les exercices d'un module** :

```bash
npm run nettoyer -- module-02     # ou simplement : npm run nettoyer -- 2
```

Le script remet chaque exercice commencé dans son état vierge et indique ceux qui l'étaient déjà. Ton travail n'est pas perdu : avant d'écraser un fichier, il en garde une copie dans `sauvegardes/<module>/<date-heure>/`.

Pour recommencer **un seul exercice**, recopie sa version vierge :

```bash
cp modules/module-01-fondamentaux/exercices/ex1-1-evaluer-decision-clean.ts \
   modules/module-01-fondamentaux/exercices/ex1-1-evaluer-decision.ts
```

`npm run progression` et `npm run typecheck:exercices` ignorent les copies `-clean` : ils ne regardent que ton travail.

### TypeScript et exercices

Chaque fonction à compléter a déjà sa signature typée, par exemple `function totalCost(x: Decision): number`. Tant qu'un `TODO` renvoie encore `undefined`, le script se lance quand même (Node ne vérifie pas les types), mais `npm run typecheck:exercices` et l'éditeur signalent l'erreur à cet endroit : c'est un second indicateur de ce qu'il reste à écrire, en plus des ✘ de l'auto-vérification.

La configuration (`tsconfig.json`) n'autorise que la syntaxe TypeScript que Node sait retirer : pas d'`enum` ni de `namespace`.

### Lire le code commenté

- Les noms du code (fonctions, variables, types) sont en **anglais**, comme dans la plupart des projets et des bibliothèques ; les commentaires, consignes et messages sont en français.

- Les commentaires `//` décrivent la ligne ou le bloc qui suit. Ceux placés à côté d'une expression expliquent le rôle précis d'un opérateur ou d'un paramètre. Ils ne changent pas l'exécution.
- Les commentaires « En MILP » font le lien entre le contrôle TypeScript et l'inégalité mathématique correspondante.
- `filter()` conserve uniquement les éléments qui satisfont une condition. Dans une condition composée, `&&` exige que toutes les sous-conditions soient vraies, `||` qu'au moins l'une le soit, et `!` inverse un booléen.
- Les exemples séparent les **données** (constantes en majuscules), les **calculs** (fonctions pures, qui ne modifient rien et n'affichent rien) et l'**affichage** (en fin de script).

## Parcours

| Module | Thème | Niveau | Notions clés | Exemple |
|---|---|---|---|---|
| [1](modules/module-01-fondamentaux/module-01-fondamentaux.md) | Fondamentaux de l'optimisation | ★☆☆ | données, variables, objectif, contraintes, énumération 2ⁿ | `npm run tp1` |
| [2](modules/module-02-programmation-lineaire/module-02-programmation-lineaire.md) | Programmation linéaire (LP) | ★☆☆ | linéarité, région réalisable, sommets, relaxation, arrondi | `npm run tp2` |
| [3](modules/module-03-variables-binaires/module-03-variables-binaires.md) | Variables entières et binaires | ★★☆ | cardinalité, exclusion, implication, quotas, logique → inégalités | `npm run tp3` |
| [4](modules/module-04-modelisation-avancee/module-04-modelisation-avancee.md) | Modélisation avancée | ★★☆ | indicatrices, Big-M, coût fixe, activation conditionnelle | `npm run tp4` |
| [5](modules/module-05-algorithmes-resolution/module-05-algorithmes-resolution.md) | Algorithmes de résolution | ★★★ | relaxation, Branch and Bound, incumbent, gap, coupes | `npm run tp5` |
| [6](modules/module-06-glpk/module-06-glpk.md) | MILP avec glpk.js | ★★☆ | modèle glpk, bornes, statuts, modèle construit depuis les données | `npm run tp6` |
| [7](modules/module-07-diagnostic-qualite/module-07-diagnostic-qualite.md) | Diagnostic et qualité | ★★★ | tests, infaisabilité, relaxation élastique, formulation forte | `npm run tp7` |
| [8](modules/module-08-selection-items-irt/module-08-selection-items-irt.md) | Sélection d'items IRT 2PL | ★★★ | information de Fisher, objectif moyen, maximin, TIF cible | `npm run tp8`, `npm run tp8-solveur` |

Les modules 1 à 5 n'utilisent que TypeScript, sans solveur : on y comprend **ce que fait** un solveur. À partir du module 6, on délègue la résolution à GLPK et on se concentre sur la **modélisation** et la **validation**.

## Vérifier le cours

Ces commandes servent à qui maintient le cours. Avant de modifier ou d'ajouter du code, lis [CONVENTIONS.md](CONVENTIONS.md) : langue, nommage, glossaire et structure des fichiers.

```bash
npm run typecheck            # types : lib, exemples, corrigés (aucune erreur attendue)
npm run exemples             # tous les exemples s'exécutent sans erreur
npm run corriges             # tous les corrigés passent leur auto-vérification
npm run verifier:exercices   # chaque exercice est faisable (voir ci-dessous)
```

`npm run verifier:exercices` contrôle, pour chaque exercice :

1. qu'il s'exécute tel quel jusqu'à son bilan (✘ attendus, mais aucun plantage) ;
2. qu'en remplaçant chacun de ses blocs `TODO` par le bloc de même nom du corrigé, sans toucher au reste (données, programme principal, tests), **toute** son auto-vérification passe ;
3. que cette version complétée est correctement typée.

Autrement dit : un élève qui écrit ce que demandent les `TODO` obtient forcément ✔ partout.

## Avertissements

- L'énumération exhaustive des premiers modules ne sert qu'à de très petits exemples pédagogiques. Elle ne remplace pas un solveur pour des centaines ou des milliers de variables.
- Le module 8 utilise une banque d'items **synthétique** et la convention 2PL **sans** facteur D. Vérifie la convention de calibration avant d'appliquer ces formules à une banque réelle.
- Les scripts sont des supports pédagogiques. Pour un vrai projet, ajoute des tests automatisés, contrôle les données en entrée et conserve la formulation mathématique à côté du code.
