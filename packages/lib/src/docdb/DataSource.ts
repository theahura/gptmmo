/**
 * The idea of "DataSource" originates from the Apollo GraphQL DataSource (See
 * https://www.apollographql.com/docs/apollo-server/v2/data/data-sources). They
 * act as thin wrappers around databases that batch together queries where
 * possible and debounce duplicate queries. For example, this data source
 * exposes methods to fetch MongoDB documents by ID and will debounce subsequent
 * requests for the same ID as well as batch together parallel requests for IDs.
 *
 * Note that IDs are debounced within the lifespan of `DataSource`. Meaning that
 * once you lookup an ID once with a data source, it will always use the cached
 * result for that ID in the future. To load fresh data create a new
 * `DataSource` instance (this is a cheap operation). This is intended behavior
 * with the mindset that you should create a new `DataSource` instance for each
 * incoming server request. This ensures data consistency within your request
 * and debounces duplicate ID lookups within the request. If cross-request
 * debouncing is desired, another layer of abstraction should be developed in
 * addition to this data source.
 *
 * Note that it does not batch nor parallelize non-ID lookups because unlike
 * primary key lookups, other queries are often non-exhaustive and return mongo
 * primitives such as Cursors which break when batched. For example, if I query
 * for `{ dateCreated: { $lt: Date.now() - DURATION } }` I would expect to use
 * the returned cursor to traverse data before `DURATION`. If instead we had
 * interally batched this query with another, the cursor would actually traverse
 * the joined queries (meaning it would include documents which don't match the
 * above filter).
 */

import * as status from '@gptmmo/status';
import * as bson from 'bson';
import DataLoader from 'dataloader';
import hash from 'object-hash';

import type * as mongodb from 'mongodb';

/**
 * Thin wrapper around a MongoDB Collection which optimizes lookup by primary
 * key. For more complex queries, operate on the MongoDB Collection instance
 * directly.
 *
 * Example Usage:
 *
 * ```ts
 * const dataSource = createDataSource<TestDocument>(db.collect('test'));
 * const maybeResult = await dataSource.findOneById('MY_ID');
 * ```
 */
export type DataSource<T extends bson.Document> = {
  /**
   * Fetches a document given its ID. Will return null if the document does not
   * exist.
   *
   * Note that this method caches its results, once an ID is fetched, subsequent
   * fetches of that ID will return the cached result. To access fresh data,
   * create a new `DataSource` instance.
   *
   * Note that if multiple calls to `findOneById` are made in parallel such as
   * in the below example, they will be batched under the hood.
   *
   * ```ts
   * const results = await Promise.all([
   *   dataSource.findOneById(ID_FOO),
   *   dataSource.findOneById(ID_BAR),
   *   dataSource.findOneById(ID_BAZ),
   * ]);
   * ```
   *
   * @param id The document ID.
   *
   * @returns StatusOr<WithId<T>>
   */
  findOneById(
    id: mongodb.InferIdType<T>,
  ): Promise<status.StatusOr<mongodb.WithId<T> | null>>;

  /**
   * Given a list of ids, fetch the associated documents. This method just
   * delegates to `findOneById`. See it for more details on behavior and usage.
   *
   * @param ids The document IDs.
   *
   * @returns Array<StatusOr<WithId<T>>
   */
  findManyByIds(
    ids: Array<mongodb.InferIdType<T>>,
  ): Promise<Array<status.StatusOr<mongodb.WithId<T> | null>>>;
};

export const createDataSource = <T extends bson.Document>(
  collection: mongodb.Collection<T>,
): DataSource<T> => {
  const loader = new DataLoader<
    mongodb.InferIdType<T>,
    status.StatusOr<mongodb.WithId<T> | null>,
    string
  >((ids) => batchedFindById(collection, ids), {
    name: `${collection.dbName}.${collection.collectionName}`,
    cacheKeyFn: createCacheKey,
  });

  return {
    findOneById: async (id) => loader.load(id),

    findManyByIds: async (ids) =>
      Promise.all(ids.map((id) => loader.load(id))),
  };
};

/**
 * Given a MongoDB collection and list of primary keys, fetch all documents
 * matching those primary keys and return the results in the same order as the
 * given primary keys. Note that missing documents will be represented with
 * null.
 *
 * @param collection The MongoDB collection to search.
 * @param ids The primary keys to locate.
 *
 * @returns An array of documents or null if the document doesn't exist.
 */
const batchedFindById = async <T extends bson.Document>(
  collection: mongodb.Collection<T>,
  ids: Readonly<Array<mongodb.InferIdType<T>>>,
): Promise<Array<status.StatusOr<mongodb.WithId<T> | null>>> => {
  // We have a painful type problem here. The property `_id` expects a type
  // matching `(EnhancedOmit<T, '_id'> & { _id: InferIdType<T> })['_id']`.
  // As a human we can trivially identify that this means the type HAS to be
  // `InferIdType<T>` but the typescript compiler doesn't fully expand the
  // templates (we think as some kinda of compiler optimization) and as a
  // result thinks that the type is
  // `EnhancedOmit<T, '_id'>['_id'] & InferIdType<T>` which is unassignable
  // from `InferIdType<T>`. To solve this, we coerce the type.
  const maybeResults = await status.tryCatchAsync(
    () =>
      collection
        .find({
          _id: {
            // TODO(SOO-847): Large $in filters are known to have bad
            // performance, consider optimizing this.
            $in: ids as Array<
              mongodb.EnhancedOmit<T, '_id'>['_id'] & mongodb.InferIdType<T>
            >,
          },
        })
        .toArray(),
    (error) =>
      status.fromError(
        `Failed to fetch ids "${ids.join(',')}" with error: ${error.message}`,
      ),
  );
  if (!status.isOk(maybeResults)) {
    return ids.map(() => maybeResults);
  }
  const results = maybeResults.value;

  // The dataloader contract expects batched requests to return results in the
  // same order as the results. For example, `[REQ_A, REQ_B, REQ_C]` must
  // return `[RES_A, RES_B, RES_C]`. The below logic reorders the documents
  // returned by MongoDB to meet this contract.

  // 1. Index the returned documents by ID.

  const resultsById: Record<string, mongodb.WithId<T>> = {};
  for (const result of results) {
    resultsById[createCacheKey(result._id)] = result;
  }

  // 2. Iterate over the requested IDs and fetch the document for each.
  // Thereby ensuring that we respond with documents in the same order as they
  // were requested.

  return ids.map((id) => {
    const cacheKey = createCacheKey(id);

    if (!(cacheKey in resultsById)) {
      return status.fromValue(null);
    }

    return status.fromValue(resultsById[cacheKey]);
  });
};

// For the dataloader to debounce queries, it needs a cache key for each
// query. This method converts MongoDB ID's into a stable hash so that we can
// support sub-fields on our IDs.
//
// See https://www.mongodb.com/docs/manual/core/document/#the-_id-field
const createCacheKey = <T>(id: mongodb.InferIdType<T>): string => {
  return hash(bson.EJSON.serialize(id));
};
