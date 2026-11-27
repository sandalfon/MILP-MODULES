// Remet les exercices d'un module dans leur état vierge, à partir de leurs
// copies « …-clean.ts », rangées dans lib/clean/ (même arborescence que modules/).
//
//   npm run nettoyer -- module-02     (ou : 02, ou : 2)
//   node lib/nettoyer-exercices.ts module-02
//
// Avant d'écraser un exercice déjà commencé, le script en garde une copie dans
// sauvegardes/<module>/<date-heure>/ : rien n'est perdu.
// Les exercices déjà vierges ne sont pas touchés.

import { readdirSync, existsSync, mkdirSync, copyFileSync, readFileSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanCopyPath } from "./copies-vierges.ts";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const modulesDir = join(rootDir, "modules");

// Accepte « module-02 », « module-02-programmation-lineaire », « 02 » ou « 2 ».
function findModuleName(argument: string): string | null {
  const moduleNames = readdirSync(modulesDir).filter(name => name.startsWith("module-"));
  const prefix = /^\d+$/.test(argument) ? `module-${argument.padStart(2, "0")}-` : argument;
  const matches = moduleNames.filter(name => name === prefix || name.startsWith(prefix));
  return matches.length === 1 ? matches[0] : null;
}

// Horodatage lisible et utilisable comme nom de dossier : 2026-11-19_14-05-32.
const formatTimestamp = (date: Date): string =>
  date.toISOString().slice(0, 19).replace("T", "_").replaceAll(":", "-");

const argument = process.argv[2];
if (!argument) {
  console.error("Indique le module à nettoyer, par exemple : npm run nettoyer -- module-02");
  process.exit(1);
}

const moduleName = findModuleName(argument);
if (!moduleName) {
  console.error(`Module introuvable ou ambigu : « ${argument} ».`);
  console.error("Modules disponibles : " + readdirSync(modulesDir).filter(name => name.startsWith("module-")).join(", "));
  process.exit(1);
}

const exercisesDir = join(modulesDir, moduleName, "exercices");
const backupDir = join(rootDir, "sauvegardes", moduleName, formatTimestamp(new Date()));

const exerciseNames = readdirSync(exercisesDir)
  .filter(fileName => fileName.endsWith(".ts"))
  .sort();

let resetCount = 0;
for (const exerciseName of exerciseNames) {
  const exercisePath = join(exercisesDir, exerciseName);
  const cleanPath = cleanCopyPath(rootDir, exercisePath);

  if (!existsSync(cleanPath)) {
    console.log(`⚠ ${exerciseName} : pas de copie vierge, exercice laissé tel quel.`);
    continue;
  }
  if (readFileSync(exercisePath, "utf8") === readFileSync(cleanPath, "utf8")) {
    console.log(`· ${exerciseName} : déjà vierge.`);
    continue;
  }

  mkdirSync(backupDir, { recursive: true });
  copyFileSync(exercisePath, join(backupDir, exerciseName));
  copyFileSync(cleanPath, exercisePath);
  resetCount++;
  console.log(`✔ ${exerciseName} : remis à zéro.`);
}

console.log(`\n${resetCount} exercice(s) remis à zéro dans ${moduleName}.`);
if (resetCount > 0) {
  console.log(`Ton travail précédent est sauvegardé dans ${relative(rootDir, backupDir)}/`);
}
