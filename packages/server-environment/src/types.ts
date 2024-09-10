/**
 * The binaries alter their behavior depending on which environment
 * (PROD / STAGING / etc...) they are deployed in. This module loads the target
 * environment from an environment string (typically provided as an
 * Environment variable).
 */

/**
 * Enumerates all execution environments.
 */
export enum Environment {
  LOCAL = 'LOCAL',
  DEV = 'DEV',
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION',
}

/**
 * Utility type for creating a "selector" AKA a mapping of environment to values
 * for the purpose of "selecting" a value based on the environment. Ensures that
 * all environments are mapped.
 *
 * Example Usage:
 *
 * ```ts
 * const PORT: EnvironmentSelector<number> = {
 *   [Environment.LOCAL]: 8080,
 *   [Environment.DEV]: 8081,
 *   [Environment.STAGING]: 8082,
 *   [Environment.PRODUCTION]: 8083,
 * }
 *
 * const port = PORT[environment];
 * ```
 */
export type EnvironmentSelector<T> = { [key in Environment]: T };

/**
 * Enumerates all environments which are deployed to AWS.
 */
export type DeployedEnvironment = Exclude<
  Environment,
  Environment.LOCAL
>;

/**
 * Utility type for creating a "selector" AKA a mapping of deployed environments
 * to values for the purpose of "selecting" a value based on the environment.
 *
 * See `EnvironmentSelector` for more details.
 */
export type DeployedEnvironmentSelector<T> = {
  [key in DeployedEnvironment]: T;
};
