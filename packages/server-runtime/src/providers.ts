import * as collections from '@gptmmo/collections';
import * as status from '@gptmmo/status';

import type * as constants from '@/constants';
import type { Runtime } from '@/runtime';
import type * as lib from '@gptmmo/lib';
import type * as validation from '@gptmmo/validation';
import type * as persistence from '@gptmmo/persistence';
import type * as serverEnvironment from '@gptmmo/server-environment';

/**
 * All providers accessible from Runtime.
 */
export type AllProviders = {
  environment: serverEnvironment.Environment;
  constants: constants.Constants;
  ajvCompiler: validation.Compiler;
  docDBClient: lib.docdb.Client;
  persistenceClient: persistence.Client;
};

/**
 * A utility type for narrowing `AllProviders` down to a subset.
 *
 * Example:
 *
 * ```ts
 * Providers<'s3Client' | 'taskClient'>
 * ```
 */
export type Providers<K extends keyof AllProviders> = Pick<AllProviders, K>;

/**
 * Initializes the desired providers from the runtime.
 *
 * The Runtime provides lazily-loaded infra resources to minimize over-fetching.
 * However, to mitigate cold-start latency, it's common to fetch required
 * providers immediately. This function facilitates this by initializing the
 * requested providers.
 *
 * Example:
 *
 * ```ts
 * const runtime = serverRuntime.getRuntime('DEV');
 *
 * const providers = serverRuntime.getProviders(runtime, [
 *   'constants',
 *   's3Client',
 *   'persistenceClient',
 *   'taskClient',
 * ]);
 * ```
 *
 * @param runtime - The source runtime for initializing providers.
 * @param providerNames - List of provider names to initialize.
 *
 * @returns An object containing each initialized provider.
 */
export const getProviders = async <K extends keyof AllProviders>(
  runtime: Runtime,
  providerNames: Array<K>,
): Promise<status.StatusOr<Providers<K>>> => {
  const providers: Partial<AllProviders> = {};

  for (const providerName of providerNames) {
    switch (providerName) {
      case 'environment':
        providers['environment'] = runtime.environment;
        break;
      case 'constants':
        providers['constants'] = runtime.constants;
        break;
      case 'ajvCompiler':
        providers['ajvCompiler'] = runtime.getAjvCompiler();
        break;
      case 'docDBClient':
        const maybeDocDBClient = await runtime.getDocDBClient();
        if (!status.isOk(maybeDocDBClient)) {
          return maybeDocDBClient;
        }
        providers['docDBClient'] = maybeDocDBClient.value;
        break;
      case 'persistenceClient':
        const maybePersistenceClient = await runtime.getPersistenceClient();
        if (!status.isOk(maybePersistenceClient)) {
          return maybePersistenceClient;
        }
        providers['persistenceClient'] = maybePersistenceClient.value;
        break;
    }
  }

  // TypeScript cannot automatically infer that `Partial<AllProviders>` can be
  // narrowed down to `Providers<K>` based on the context. As a result, we need
  // to perform an unsafe cast. To mitigate potential issues, we verify that
  // each requested provider is populated before performing the cast.
  const missingKeys = collections.set.difference(
    new Set(providerNames),
    new Set(Object.keys(providers)),
  );
  if (missingKeys.size > 0) {
    return status.fromError(
      `getProviders response is missing keys ${Array.from(missingKeys).join(
        ', ',
      )}`,
    );
  }

  return status.fromValue(providers as Providers<K>);
};
