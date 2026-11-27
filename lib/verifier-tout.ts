// Exécute tous les fichiers d'un type (corriges par défaut) dans tous les
// modules et affiche le bilan d'auto-vérification de chacun.
//
//   node lib/verifier-tout.ts             → tous les corrigés
//   node lib/verifier-tout.ts exercices   → ta progression
//   node lib/verifier-tout.ts exemples    → les exemples commentés (doivent s'exécuter sans erreur)
//   node lib/verifier-tout.ts corriges module-03   → un seul module

import { readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

// Noms des sous-dossiers d'un module (noms de dossiers, donc en français).
type FileKind = "corriges" | "exercices" | "exemples";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const modulesDir = join(rootDir, "modules");
const fileKind = (process.argv[2] ?? "corriges") as FileKind;
const moduleFilter = process.argv[3] ?? "module-";

const files = readdirSync(modulesDir)
  .filter(moduleName => moduleName.startsWith("module-") && moduleName.startsWith(moduleFilter))
  .sort()
  .map(moduleName => join(modulesDir, moduleName, fileKind))
  .filter(folder => existsSync(folder))
  .flatMap(folder =>
    readdirSync(folder)
      .filter(fileName => fileName.endsWith(".ts"))
      .sort()
      .map(fileName => join(folder, fileName))
  );

let failedCount = 0;
for (const file of files) {
  const run = spawnSync(process.execPath, [file], { encoding: "utf8", cwd: rootDir });
  const summaryLine = run.stdout.split("\n").find(outputLine => outputLine.startsWith("Auto-vérification :"));
  const isSuccess = run.status === 0;
  if (!isSuccess) failedCount++;
  const detail = summaryLine ?? (isSuccess ? "exécution sans erreur" : run.stderr.split("\n")[0]);
  console.log(`${isSuccess ? "✔" : "✘"} ${relative(modulesDir, file).padEnd(66)} ${detail}`);
}
console.log(`\n${files.length - failedCount} / ${files.length} fichiers entièrement validés.`);
if (failedCount > 0) process.exitCode = 1;
