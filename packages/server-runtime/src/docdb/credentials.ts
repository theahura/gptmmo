/**
 * DocDB requires a username and password to connect to the database. This file
 * exposes helpers to load those values based on the target environment.
 */

import * as validation from '@gptmmo/validation';

import type * as status from '@gptmmo/status';
import type * as serverEnvironment from '@gptmmo/server-environment';

export type Credentials = {
  username: string;
  password: string;
};

/**
 * Fetches the authorization credentials for DocDB based on the server
 * environment.
 *
 * @param environment The server environment.
 * @param schemaCompiler The schema compiler used to build the credentials
 *   validator.
 *
 * @returns The DocDB credentials.
 */
export const getCredentials = async (
  environment: serverEnvironment.DeployedEnvironment,
  schemaCompiler: validation.Compiler,
): Promise<status.StatusOr<Credentials>> => {
  throw new Error('Not implemented');
};
