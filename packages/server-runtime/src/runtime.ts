import * as collections from '@gptmmo/collections';
import * as status from '@gptmmo/status';
import * as serverEnvironment from '@gptmmo/server-environment';

import * as ajvProvider from '@/ajv/provider';
import * as constantsSelector from '@/constants/selector';
import * as docDBProvider from '@/docdb/provider';
import * as persistenceProvider from '@/persistence/provider';

import type * as constants from '@/constants';
import type * as lib from '@gptmmo/lib';
import type * as validation from '@gptmmo/validation';
import type * as persistence from '@gptmmo/persistence';

/**
 * Describes the runtime of a GPTMMO server. Note that almost all data in the
 * runtime is accessible via lazily evaluated singleton getters. This is so that
 * a server using the GPTMMO runtime does not need to initialize every feature of
 * the GPTMMO runtime and instead will only initialize features which are used.
 */
export type Runtime = {
  environment: serverEnvironment.Environment;

  // Several constants are always made available to GPTMMO servers such as the
  // list of SQS Queue URLs, or S3 bucket names. Generally speaking, the clients
  // below are already configured to operate on these constants, so usage of
  // this field tends to be for specialized purposes.
  constants: constants.Constants;

  // AJV is a JSON Schema Validator. See https://ajv.js.org
  getAjvCompiler: collections.singleton.Getter<validation.Compiler>;

  // Docdb is our primary metadata storage solution. See
  // https://docs.aws.amazon.com/documentdb/latest/developerguide/what-is.html
  //
  // Almost always prefer to use `getPersistenceClient` which wraps the raw
  // DocDB client with typesafe and permission-abiding helpers for managing GPTMMO
  // specific data. The raw DocDB client should be used with caution, it allows
  // creating malformed data unlike the PersistenceClient.
  getDocDBClient: collections.singleton.AsyncGetter<
    status.StatusOr<lib.docdb.Client>
  >;

  // The persistence client is our own custom wrapper around DocDB which exposes
  // typesafe and permission-abiding helpers for managing GPTMMO specific data.
  getPersistenceClient: collections.singleton.AsyncGetter<
    status.StatusOr<persistence.Client>
  >;
};

/**
 * Given a GPTMMO server environment name, constructs the runtime for that
 * environment.
 *
 * @param environmentString A case insensitive string representation of the
 *   environment. Should be one of `local`, `dev`, `staging`, or `production`.
 *
 * @returns The GPTMMO Server Runtime.
 */
export const getRuntime = async (
  environmentString: string,
): Promise<status.StatusOr<Runtime>> => {
  const maybeEnvironment =
    serverEnvironment.parseEnvironment(environmentString);
  if (!status.isOk(maybeEnvironment)) {
    return maybeEnvironment;
  }
  const environment = maybeEnvironment.value;

  const getAjvCompiler = ajvProvider.getAjvSingleton;

  const getDocDBClient = collections.singleton.fromFactory(() =>
    docDBProvider.connect(environment, getAjvCompiler()),
  );

  const getPersistenceClient = collections.singleton.fromFactory(async () => {
    const maybeDocDBClient = await getDocDBClient();
    if (!status.isOk(maybeDocDBClient)) {
      return maybeDocDBClient;
    }
    const docDBClient = maybeDocDBClient.value;

    return status.fromValue(
      persistenceProvider.createClient({
        environment,
        docDBClient,
      }),
    );
  });

  return status.fromValue({
    environment,
    constants: constantsSelector.getConstants(environment),
    getAjvCompiler,
    getDocDBClient,
    getPersistenceClient,
  });
};
