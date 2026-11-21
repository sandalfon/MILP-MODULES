// Utilitaire d'auto-vérification partagé par tous les exercices et corrigés.
//
// Usage :
//   import { check, printSummary, printTitle } from "../../../lib/verif.ts";
//   check("valeur totale", () => totalValue(x), 25);
//   printSummary();
//
// `check` accepte soit une valeur, soit une fonction : avec une fonction,
// une erreur levée par un code encore incomplet (TODO) est capturée et
// affichée comme un échec, au lieu de faire planter tout le script.
//
// Les valeurs comparées sont typées `unknown` : un exercice incomplet peut
// renvoyer undefined, et c'est justement ce que check doit signaler.

let passedCount = 0;
let failedCount = 0;

// Message lisible d'une erreur, quel que soit ce qui a été levé.
const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

// Compare deux valeurs : tolérance pour les nombres, comparaison
// structurelle (JSON) pour les tableaux et objets.
function isEqual(actual: unknown, expected: unknown, tolerance: number): boolean {
  if (typeof actual === "number" && typeof expected === "number") {
    return Math.abs(actual - expected) <= tolerance;
  }
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export function check(
  label: string,
  valueOrFunction: unknown,
  expected: unknown,
  tolerance = 1e-6
): boolean {
  let actual: unknown;
  try {
    actual = typeof valueOrFunction === "function" ? valueOrFunction() : valueOrFunction;
  } catch (error) {
    failedCount++;
    console.log(`  ✘ ${label}\n      erreur : ${errorMessage(error)}`);
    return false;
  }
  if (isEqual(actual, expected, tolerance)) {
    passedCount++;
    console.log(`  ✔ ${label}`);
    return true;
  }
  failedCount++;
  console.log(`  ✘ ${label}`);
  console.log(`      attendu : ${JSON.stringify(expected)}`);
  console.log(`      obtenu  : ${JSON.stringify(actual)}`);
  return false;
}

// Version asynchrone de check, pour les exercices qui appellent GLPK.
export async function checkAsync(
  label: string,
  asyncFunction: () => unknown,
  expected: unknown,
  tolerance = 1e-6
): Promise<boolean> {
  let actual: unknown;
  try {
    actual = await asyncFunction();
  } catch (error) {
    failedCount++;
    console.log(`  ✘ ${label}\n      erreur : ${errorMessage(error)}`);
    return false;
  }
  return check(label, actual, expected, tolerance);
}

export function printTitle(text: string): void {
  console.log("\n" + "─".repeat(64) + "\n" + text + "\n" + "─".repeat(64));
}

export function printSummary(): void {
  console.log(`\nAuto-vérification : ${passedCount} réussi(s), ${failedCount} échec(s).`);
  if (failedCount === 0) {
    console.log("Bravo, tout est correct !");
  } else {
    console.log("Relis les TODO correspondant aux lignes ✘ ci-dessus.");
    process.exitCode = 1;
  }
}
