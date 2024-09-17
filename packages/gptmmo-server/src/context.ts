import * as serverRuntime from '@gptmmo/server-runtime';
import * as status from '@gptmmo/status';
import type * as persistence from '@gptmmo/persistence';

export type ServerContext = {
  persistenceSession: persistence.Session;
};

export const createServerContext = async (args: {
  runtime: serverRuntime.Runtime;
}): Promise<status.StatusOr<ServerContext>> => {
  const { runtime } = args;

  const maybePersistenceClient = await runtime.getPersistenceClient();
  if (!status.isOk(maybePersistenceClient)) {
    console.error('Fatal: could not get persistence client.');
    return status.fromError('Could not get persistence client.');
  }
  const persistenceClient = maybePersistenceClient.value;
  const persistenceSession = persistenceClient.createSession();

  return status.fromValue({
    persistenceSession,
  });
};
