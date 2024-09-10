/**
 * The persistence layer is our own custom client for persisting DocDB data
 * within gptmmo.
 *
 * See `@gptmmo/libs.node.persistence`.
 */

import * as persistence from '@gptmmo/persistence';

import * as awsConstants from '@/constants/aws';

import type * as lib from '@gptmmo/lib';
import type * as serverEnvironment from '@gptmmo/server-environment';

export const createClient = (args: {
  environment: serverEnvironment.Environment;
  docDBClient: lib.docdb.Client;
}): persistence.Client => {
  const { environment, docDBClient } = args;

  return persistence.createClient({
    docDBClient,
    databaseName: awsConstants.DOCDB_DATABASE_NAME[environment],
  });
};
