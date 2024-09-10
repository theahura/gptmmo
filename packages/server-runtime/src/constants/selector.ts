import * as awsConstants from '@/constants/aws';
import * as endpointConstants from '@/constants/endpoints';

import type { Constants } from '@/constants';
import type * as serverEnvironment from '@gptmmo/server-environment';

/**
 * For a given environment, selects the public `Constants` for that environment
 * to expose to clients.
 *
 * @param environment The environment.
 *
 * @returns Constants.
 */
export const getConstants = (
  environment: serverEnvironment.Environment,
): Constants => ({
  docDB: {
    databaseName: awsConstants.DOCDB_DATABASE_NAME[environment],
  },
  endpoints: {
    apiServer: endpointConstants.API_SERVER[environment],
    frontendClients: endpointConstants.FRONTEND_CLIENTS[environment],
  },
});
