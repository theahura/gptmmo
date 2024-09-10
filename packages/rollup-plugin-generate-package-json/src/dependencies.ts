/**
 * Contains helpers for managing node dependencies.
 */

import * as logging from '@/logging';

/**
 * Dependencies represented as a mapping of module name to version string. This
 * is the same format as you see in package.json.
 *
 * For Example:
 *
 * ```
 * {
 *   "@apollo/server": "1.0.2",
 *   "express": "4.5.1",
 * }
 * ```
 */
export type PackageJsonDependencies = Record<string, string>;

/**
 * Merges two dependency lists. Will log warnings if depdendency conflicts
 * exist.
 *
 * @param a The first dependency list.
 * @param b The second dependency list.
 *
 * @returns A new dependency list with both a and b's dependencies.
 */
export const merge = (
  a: PackageJsonDependencies,
  b: PackageJsonDependencies,
): PackageJsonDependencies => {
  const result: PackageJsonDependencies = { ...a };

  for (const name of Object.keys(b)) {
    if (name in a && name in b && a[name] !== b[name]) {
      logging.warn(
        `The dependency ${name} has conflicting versions ${a[name]} and ` +
          `${b[name]}. Using ${b[name]}.`,
      );
    }
    result[name] = b[name];
  }

  return result;
};

/**
 * Given a string representing an external package (e.g. `@gptmmo/lib` or
 * `@apollo/server/expressMiddleware`), this method extracts the node module
 * name for that import.
 *
 * Examples:
 *
 * - `@gptmmo/lib` => `@gptmmo/lib`
 * - `@apollo/server/expressMiddleware` => `@apollo/server`
 *
 * This works because we know that node modules are named as either `/^[^/]+/`
 * or `/^@[^/]+\/[^/]+/`. See https://docs.npmjs.com/cli/v9/configuring-npm/package-json
 *
 * @param importPath The import path of the external package.
 *
 * @returns The node module name.
 */
export const getModuleNameFromImportPath = (importPath: string) => {
  const pathParts = importPath.split(/[/\\]/);
  return importPath.startsWith('@')
    ? `${pathParts[0]}/${pathParts[1]}`
    : pathParts[0];
};
