/**
 * This file exports a function that determines which environment a node
 * binary is operating in.
 */

import * as status from '@gptmmo/status';

import * as types from '@/types';

/**
 * Loads the current environment from an environment string (typically passed
 * using environment variables).
 *
 * @param environmentString A string matching one of `Environment`.
 *
 * @returns StatusOr<Environment> Will return an error if the environment string
 *   was not one of the known environment strings listed in `Environment`.
 */
export const parseEnvironment = (
  environmentString: string,
): status.StatusOr<types.Environment> => {
  switch (environmentString.toLowerCase()) {
    case 'local':
      return status.fromValue(types.Environment.LOCAL);
    case 'dev':
    case 'development':
      return status.fromValue(types.Environment.DEV);
    case 'staging':
      return status.fromValue(types.Environment.STAGING);
    case 'prod':
    case 'production':
      return status.fromValue(types.Environment.PRODUCTION);
  }

  return status.fromError(
    `Value ${environmentString} is not a valid environment.`,
  );
};
