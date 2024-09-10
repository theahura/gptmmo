/**
 * Exposes helpers necessary to construct a DocDB client authorized as GPTMMO. We
 * use DocDB at GPTMMO as our primary metadata storage solution. To learn more
 * about it, visit the below documentation.
 *
 * https://docs.aws.amazon.com/documentdb/latest/developerguide/what-is.html
 */

import * as status from '@gptmmo/status';
import * as lib from '@gptmmo/lib';
import * as validation from '@gptmmo/validation';
import * as serverEnvironment from '@gptmmo/server-environment';

import * as awsConstants from '@/constants/aws';
import * as docDBCredentials from '@/docdb/credentials';

const getConnectionOptions = async (
  environment: serverEnvironment.Environment,
  schemaCompiler: validation.Compiler,
): Promise<status.StatusOr<lib.docdb.ConnectionOptions>> => {
  switch (environment) {
    case serverEnvironment.Environment.LOCAL:
      return status.fromValue({
        directConnection: true,
      });
    case serverEnvironment.Environment.DEV:
    case serverEnvironment.Environment.STAGING:
    case serverEnvironment.Environment.PRODUCTION:
      const maybeCredentials = await docDBCredentials.getCredentials(
        environment,
        schemaCompiler,
      );
      if (!status.isOk(maybeCredentials)) {
        return maybeCredentials;
      }
      const credentials = maybeCredentials.value;

      return status.fromValue({
        replicaSet: 'rs0',
        readPreference: 'primaryPreferred',
        retryWrites: false,
        auth: {
          username: credentials.username,
          password: credentials.password,
        },
      });
  }
};

export const connect = async (
  environment: serverEnvironment.Environment,
  schemaCompiler: validation.Compiler,
): Promise<status.StatusOr<lib.docdb.Client>> => {
  const maybeConnectionOptions = await getConnectionOptions(
    environment,
    schemaCompiler,
  );
  if (!status.isOk(maybeConnectionOptions)) {
    return maybeConnectionOptions;
  }
  const connectionOptions = maybeConnectionOptions.value;

  const connectionUrl = awsConstants.DOCDB_URL[environment];
  console.info(`Connecting to docdb cluster at ${connectionUrl}`);
  return lib.docdb.connect({
    url: connectionUrl,
    connectionOptions,
  });
};
