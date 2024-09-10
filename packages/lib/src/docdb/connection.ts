/**
 * Contains helpers related to establishing/maintaining/monitoring MongoDB
 * connections.
 */

import * as status from '@gptmmo/status';
import * as mongodb from 'mongodb';

/**
 * Creates a DocDB client and waits until it successfully connects to the
 * provided cluster.
 *
 * @param args Named arguments. See properties for details.
 * @param args.url The cluster URL.
 * @param args.connectionOptions Options describing how we should connect. See
 *   https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
 *
 * @returns StatusOr<mongodb.MongoClient>
 */
export const connect = async (args: {
  url: string;
  connectionOptions?: mongodb.MongoClientOptions;
}): Promise<status.StatusOr<mongodb.MongoClient>> => {
  const { url, connectionOptions } = args;

  const maybeMongoClient = await status.tryCatchAsync(
    async () =>
      await new mongodb.MongoClient(url, connectionOptions).connect(),
    (error) =>
      status.fromError(`Failed to connect mongo client with error ${error}.`),
  );
  if (!status.isOk(maybeMongoClient)) {
    return maybeMongoClient;
  }
  const mongoClient = maybeMongoClient.value;

  return status.fromValue(mongoClient);
};
