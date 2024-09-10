/**
 * This file is the entrypoint for creating persistence clients. Notably these
 * API's are NOT exposed by default to clients of
 * `@gptmmo/persistence`. Instead look at `index.ts` to see which
 * symbols are exported outside of the wider package.
 */

import * as status from '@gptmmo/status';
import * as lib from '@gptmmo/lib';

import * as collections from '@/collections';
import * as schema from '@/schema';

import type * as types from '@/types';

/**
 * The Persistence Client. Through this interface typesafe GPTMMO data can be
 * read/written.
 */
export type Client = {
  /**
   * A session has unique caching and authorization behaviors.
   *
   * ## Caching
   *
   * Data is cached within the lifetime of a session so that fetching a document
   * by ID will always return the same document regardless of the database's
   * value. This is done both to optimize reads and to ensure data consistency
   * within a Session. Fortunately, constructing a Session is very cheap, so
   * feel free to do so as fresh data is needed.
   */
  createSession: () => Session;

  /**
   * Cleanly shuts down the client.
   *
   * Note that this will also shutdown the DocDB client used to create the
   * client. If you're using the DocDB client for other uses besides the
   * Persistence Client consider shutting them down first. No errors will occur
   * if DocDB clients are closed multiple times.
   */
  shutdown: () => Promise<void>;
};

export type CollectionTypes = {
  Room: types.Room;
};

/**
 * A session is the primary interface through which GPTMMO data can be read and
 * written. It contains several collections for each of GPTMMO's data types.
 */
export type Session = {
  [key in keyof CollectionTypes]: Collection<CollectionTypes[key]>;
};

/**
 * Represents a DocDB Collection.
 */
export type Collection<T extends lib.docdb.BaseDocument> = {
  // A data source caches data within it's lifetime and batches parallel calls
  // into a single network request. For this reason, subsequent calls to methods
  // on the data source will read from the cache and deduplicate work.
  //
  // See documentation for `@gptmmo/lib`'s DataSource for more
  // information.
  dataSource: lib.docdb.DataSource<T>;

  // The typed collection provides typesafe access to the underlying DocDB
  // collection. This is very useful for mutations, but for reads you should
  // almost always prefer `dataSource` which enables caching and batching
  // optimizations.
  collection: lib.docdb.PermissionedCollection<T>;
};

/**
 * Creates a new Persistence Client.
 *
 * @param args -
 * @param args.docDBClient - A client for accessing DocDB data.
 * @param args.databaseName - The DocDB database used for persistence data.
 *
 * @returns A Persistence Client.
 */
export const createClient = (args: {
  docDBClient: lib.docdb.Client;
  databaseName: string;
}): Client => {
  const { docDBClient, databaseName } = args;

  const database = docDBClient.db(databaseName);

  // It's critical that we create all of these validators when the client is
  // created and *NOT* when a session is created so that we frontload the work
  // of JSON Schema parsing to client creation making `createSession` cheap to
  // call.
  //
  // For example, creating these validators takes ~500ms. If we do that work in
  // `createSession`, we increase the latency of every user request which
  // requires RBAC persistence by 500ms.
  const typedCollectionValidators = createTypedCollectionValidators();

  const createSession: Client['createSession'] = () => {
    return {
      Room: createCollection<types.Room>({
        database,
        collectionName: 'Room',
        validators: typedCollectionValidators.Room,
        canAccessDocument: collections.Room.createAccessControlFunction(),
      }),
    };
  };

  const shutdown = async () => {
    await docDBClient.close();
  };

  return { createSession, shutdown };
};

const createCollection = <T extends lib.docdb.BaseDocument>(args: {
  database: lib.docdb.Database;
  collectionName: string;
  validators: lib.docdb.TypedCollectionValidators<T>;
  canAccessDocument: lib.docdb.CanAccessDocumentFunction<T> | null;
}) => {
  const { database, collectionName, validators, canAccessDocument } = args;

  const unsafeCollection = database.collection<T>(collectionName);

  const typedCollection = new lib.docdb.TypedCollection({
    untypedCollection: unsafeCollection,
    validators,
  });

  const typedDataSource = lib.docdb.createTypedDataSource(
    validators.withId,
    unsafeCollection,
  );

  const canAccessDocumentWithDefault =
    canAccessDocument ?? (() => status.fromValue(true));

  return {
    dataSource: lib.docdb.createPermissionedDataSource({
      dataSource: typedDataSource,
      canAccessDocument: canAccessDocumentWithDefault,
    }),

    collection: lib.docdb.createPermissionedCollection({
      collection: typedCollection,
      canAccessDocument: canAccessDocumentWithDefault,
    }),
  };
};

const createTypedCollectionValidators = () => ({
  Room: lib.docdb.createTypedCollectionValidators({
    compiler: schema.getSchemaCompiler(),
    schema: schema.ROOM,
  }),
});
