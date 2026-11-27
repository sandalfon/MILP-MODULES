// Emplacement des copies vierges des exercices.
//
// Chaque exercice modules/<module>/exercices/<nom>.ts a une copie vierge
// lib/clean/modules/<module>/exercices/<nom>-clean.ts : même arborescence,
// sous lib/clean/, avec le suffixe « -clean ».
//
// Une copie vierge n'est jamais exécutée sur place : ses imports relatifs
// (« ../../../lib/verif.ts ») ne sont valables que dans le dossier exercices/.

import { join, relative } from "node:path";

export const CLEAN_COPY_SUFFIX = "-clean.ts";
const CLEAN_COPIES_DIR = join("lib", "clean");

// Chemin de la copie vierge d'un exercice, à partir de la racine du projet.
export const cleanCopyPath = (rootDir: string, exercisePath: string): string =>
  join(rootDir, CLEAN_COPIES_DIR, relative(rootDir, exercisePath)).replace(/\.ts$/, CLEAN_COPY_SUFFIX);
