// Vérifie que chaque exercice est faisable, c'est-à-dire qu'il suffit de
// compléter ses TODO pour que toute son auto-vérification passe.
//
//   node lib/verifier-exercices.ts             → tous les modules
//   node lib/verifier-exercices.ts module-03   → un seul module
//
// Pour chaque exercice :
//   1. l'exercice tel quel doit s'exécuter jusqu'à son bilan (✘ attendus, pas de plantage) ;
//   2. on construit une version « complétée » : chaque bloc de premier niveau
//      marqué TODO (commentaire « TODO » au-dessus, ou « ← à … » dans le code)
//      est remplacé par le bloc de même nom du corrigé ; le reste de l'exercice
//      (données, outils fournis, programme principal, tests) est conservé ;
//   3. cette version complétée doit passer TOUTE son auto-vérification ;
//   4. elle doit aussi être correctement typée (aucune erreur TypeScript).
//
// Quand un exercice a une copie vierge « …-clean.ts », c'est elle qui est
// vérifiée : le fichier de travail peut déjà contenir les réponses de l'élève.

import ts from "typescript";
import { readdirSync, readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

type Summary = { passed: number; failed: number };

type Report = {
  exercise: string;
  problems: string[];
  completedBlockCount: number;
  rawSummary: Summary | null;
  completedSummary: Summary | null;
};

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const modulesDir = join(rootDir, "modules");
const TEMPORARY_PREFIX = "__complete__";
const CLEAN_COPY_SUFFIX = "-clean.ts";

// Noms des exercices d'un dossier, sans les copies vierges ni les fichiers temporaires.
const listExerciseNames = (folder: string): string[] =>
  readdirSync(folder)
    .filter(fileName =>
      fileName.endsWith(".ts") &&
      !fileName.endsWith(CLEAN_COPY_SUFFIX) &&
      !fileName.startsWith(TEMPORARY_PREFIX))
    .sort();

// Version de référence de l'exercice : sa copie vierge si elle existe.
function getReferencePath(folder: string, exerciseName: string): string {
  const cleanCopy = join(folder, exerciseName.replace(/\.ts$/, CLEAN_COPY_SUFFIX));
  return existsSync(cleanCopy) ? cleanCopy : join(folder, exerciseName);
}

// Une consigne s'écrit toujours sur une ligne qui commence par « // TODO »
// (« // TODO 1 — … », « // TODO 2b — … »). Les phrases qui ne font que
// mentionner les TODO (en-tête, « tant que les TODO ne sont pas faits ») ne comptent pas.
const TODO_INSTRUCTION = /^\s*\/\/\s*TODO\b/m;

// Un bloc est « à compléter » s'il contient un marqueur « ← à … », une consigne
// TODO dans son corps, ou s'il est précédé d'une consigne TODO.
function isTodoBlock(statement: ts.Statement, sourceText: string): boolean {
  if (ts.isImportDeclaration(statement)) return false;
  const code = statement.getText();
  if (code.includes("← à ") || TODO_INSTRUCTION.test(code)) return true;
  const leadingComments = ts.getLeadingCommentRanges(sourceText, statement.getFullStart()) ?? [];
  return leadingComments.some(comment => TODO_INSTRUCTION.test(sourceText.slice(comment.pos, comment.end)));
}

// Noms déclarés par une instruction de premier niveau (fonction, constante, type...).
function getDeclaredNames(statement: ts.Statement): string[] {
  if (ts.isFunctionDeclaration(statement) || ts.isTypeAliasDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) || ts.isClassDeclaration(statement)) {
    return statement.name ? [statement.name.text] : [];
  }
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .flatMap(declaration => (ts.isIdentifier(declaration.name) ? [declaration.name.text] : []));
  }
  return [];
}

const readSource = (path: string): ts.SourceFile =>
  ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);

// Construit le texte de l'exercice complété avec les blocs du corrigé.
function completeWithSolution(
  exercise: ts.SourceFile,
  solution: ts.SourceFile
): { text: string; completedBlockCount: number; problems: string[] } {
  const solutionBlocks = new Map<string, ts.Statement>();
  for (const statement of solution.statements) {
    for (const name of getDeclaredNames(statement)) solutionBlocks.set(name, statement);
  }

  const problems: string[] = [];
  const replacements: { start: number; end: number; text: string }[] = [];

  for (const statement of exercise.statements) {
    if (!isTodoBlock(statement, exercise.text)) continue;
    const names = getDeclaredNames(statement);
    const solutionBlock = names.map(name => solutionBlocks.get(name)).find(Boolean);
    const lineNumber = exercise.getLineAndCharacterOfPosition(statement.getStart()).line + 1;
    if (!solutionBlock) {
      problems.push(`ligne ${lineNumber} : bloc TODO sans équivalent nommé dans le corrigé (${names.join(", ") || "sans nom"})`);
      continue;
    }
    replacements.push({ start: statement.getStart(), end: statement.getEnd(), text: solutionBlock.getText() });
  }

  // Remplacement de la fin vers le début pour conserver les positions.
  const text = replacements
    .sort((first, second) => second.start - first.start)
    .reduce((source, replacement) =>
      source.slice(0, replacement.start) + replacement.text + source.slice(replacement.end), exercise.text);

  if (replacements.length === 0 && problems.length === 0) {
    problems.push("aucun bloc TODO détecté");
  }
  return { text, completedBlockCount: replacements.length, problems };
}

// Lance un fichier et lit sa ligne « Auto-vérification : X réussi(s), Y échec(s). »
function runFile(path: string): { summary: Summary | null; exitCode: number | null; error: string } {
  const run = spawnSync(process.execPath, [path], { encoding: "utf8", cwd: rootDir });
  const summaryLine = run.stdout.split("\n").find(outputLine => outputLine.startsWith("Auto-vérification :"));
  const counts = summaryLine?.match(/(\d+) réussi\(s\), (\d+) échec\(s\)/);
  const summary = counts ? { passed: Number(counts[1]), failed: Number(counts[2]) } : null;
  const failedChecks = run.stdout.split("\n").filter(outputLine => outputLine.trimStart().startsWith("✘")).join(" | ");
  return { summary, exitCode: run.status, error: failedChecks || run.stderr.split("\n")[0] || "" };
}

// Erreurs de type des fichiers complétés, avec les options de tsconfig.json.
function findTypeErrors(files: string[]): Map<string, string[]> {
  const config = ts.readConfigFile(join(rootDir, "tsconfig.json"), ts.sys.readFile);
  const options = ts.parseJsonConfigFileContent(config.config, ts.sys, rootDir).options;
  const program = ts.createProgram(files, options);
  const errorsByFile = new Map<string, string[]>();
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    const source = diagnostic.file;
    if (!source || !files.includes(source.fileName)) continue;
    const { line } = source.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
    errorsByFile.set(source.fileName, [
      ...(errorsByFile.get(source.fileName) ?? []),
      `ligne ${line + 1} : ${message}`
    ]);
  }
  return errorsByFile;
}

const moduleFilter = process.argv[2] ?? "module-";

const exerciseFolders = readdirSync(modulesDir)
  .filter(moduleName => moduleName.startsWith("module-") && moduleName.startsWith(moduleFilter))
  .sort()
  .map(moduleName => join(modulesDir, moduleName, "exercices"))
  .filter(folder => existsSync(folder));

const reports: Report[] = [];
const completedFiles = new Map<string, Report>();

try {
  for (const folder of exerciseFolders) {
    const solutionsFolder = join(dirname(folder), "corriges");
    for (const exerciseName of listExerciseNames(folder)) {
      const exercisePath = getReferencePath(folder, exerciseName);
      const solutionPath = join(solutionsFolder, exerciseName);
      const report: Report = {
        exercise: relative(modulesDir, exercisePath),
        problems: [], completedBlockCount: 0, rawSummary: null, completedSummary: null
      };
      reports.push(report);

      // 1. L'exercice tel quel doit aller jusqu'à son bilan.
      const rawRun = runFile(exercisePath);
      report.rawSummary = rawRun.summary;
      if (!rawRun.summary) report.problems.push(`l'exercice non complété plante avant son bilan : ${rawRun.error}`);

      if (!existsSync(solutionPath)) {
        report.problems.push("aucun corrigé du même nom");
        continue;
      }

      // 2 et 3. Version complétée avec les blocs du corrigé.
      const completion = completeWithSolution(readSource(exercisePath), readSource(solutionPath));
      report.completedBlockCount = completion.completedBlockCount;
      report.problems.push(...completion.problems);

      const completedPath = join(folder, TEMPORARY_PREFIX + exerciseName);
      writeFileSync(completedPath, completion.text);
      completedFiles.set(completedPath, report);

      const completedRun = runFile(completedPath);
      report.completedSummary = completedRun.summary;
      if (!completedRun.summary || completedRun.summary.failed > 0 || completedRun.exitCode !== 0) {
        report.problems.push(`la version complétée échoue : ${completedRun.error}`);
      }
    }
  }

  // 4. Typage des versions complétées.
  for (const [file, typeErrors] of findTypeErrors([...completedFiles.keys()])) {
    completedFiles.get(file)?.problems.push(
      ...typeErrors.map(typeError => `erreur de type une fois complété, ${typeError}`)
    );
  }
} finally {
  for (const file of completedFiles.keys()) rmSync(file, { force: true });
}

const formatSummary = (summary: Summary | null): string =>
  summary ? `${summary.passed}✔ ${summary.failed}✘` : "aucun bilan";

for (const report of reports) {
  const isOk = report.problems.length === 0;
  console.log(
    `${isOk ? "✔" : "✘"} ${report.exercise.padEnd(62)}` +
    ` tel quel : ${formatSummary(report.rawSummary).padEnd(9)}` +
    ` complété (${report.completedBlockCount} TODO) : ${formatSummary(report.completedSummary)}`
  );
  for (const problem of report.problems) console.log(`      ↳ ${problem}`);
}

const failingCount = reports.filter(report => report.problems.length > 0).length;
console.log(`\n${reports.length - failingCount} / ${reports.length} exercices faisables et vérifiés.`);
if (failingCount > 0) process.exitCode = 1;
