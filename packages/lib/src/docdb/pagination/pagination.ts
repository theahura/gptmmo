import * as status from '@gptmmo/status';

import * as cursors from '@/docdb/pagination/cursors';

import type * as paginationSpec from '@/docdb/pagination/PaginationSpec';
import type * as permissionedCollection from '@/docdb/PermissionedCollection';
import type * as bson from 'bson';
import type * as mongodb from 'mongodb';

/**
 * Defines a single page of data.
 *
 * Note that cursors are intentionally opaque strings. Clients should not rely
 * on specific formatting and/or characteristics of cursors.
 *
 * @see https://graphql.org/learn/pagination/#pagination-and-edges
 */
export type Page<T> = {
  // How many documents are contained by this page.
  totalCount: number;

  edges: Array<Edge<T>>;

  // Describes metadata related to this page.
  pageInfo: {
    // The last cursor contained by this page. Can be used to request additional
    // pages.
    endCursor: string | null;

    // Whether there exist more documents to paginate through at the time this
    // page was created.
    hasNextPage: boolean;
  };
};

export type Edge<T> = {
  node: T;
  cursor: string;
};

export type PaginationOptions<T> = {
  // Additional property filters constraining the pagination.
  filter?: mongodb.Filter<T> | null;

  // A cursor after which documents will be fetched. This is used to fetch
  // additional pages after the first.
  after?: string | null;

  // The number of documents to fetch in this page, will be constrainted to be
  // at most `PaginationSpec.limit`.
  first?: number | null;
};

/**
 * Fetches a single page from a connection and can be subsequently used to fetch
 * additional pages.
 *
 * https://engage.so/blog/a-deep-dive-into-offset-and-cursor-based-pagination-in-mongodb/
 * Describes mongodb cursor pagination very well and has the same (but not
 * generic) implementation detail as we do. Consider reading it as a primary on
 * our logic.
 *
 * Note that for pagination to be stable, new documents added to the connection
 * must contain cursors which strictly increase or decrease from the last cursor
 * in the connection, otherwise pagination will result in interleaved data with
 * skips and duplicates.
 *
 * @param collection - The collection to paginate over.
 * @param spec - The pagination spec.
 * @param options - Additional pagination options.
 *
 * @returns A single page of data.
 *
 * @see https://graphql.org/learn/pagination/#pagination-and-edges
 */
export const paginate = async <
  T extends bson.Document,
  S extends keyof mongodb.WithId<T> & string,
  D extends keyof mongodb.WithId<T> & string,
>(
  collection: permissionedCollection.PermissionedCollection<T>,
  spec: paginationSpec.PaginationSpec<T, S, D>,
  options?: PaginationOptions<T> | null,
): Promise<status.StatusOr<Page<mongodb.WithId<T>>>> => {
  const desiredPageSize = Math.min(options?.first ?? spec.limit, spec.limit);

  const maybePaginationFilter = createPaginationFilter(spec, options);
  if (!status.isOk(maybePaginationFilter)) {
    return maybePaginationFilter;
  }
  const paginationFilter = maybePaginationFilter.value;

  const docdbCursor = collection.find(paginationFilter, {
    sort: createPaginationSort(spec),
    // We fetch one more than required so that we can identify if additional
    // pages of data exist. This extra document is removed from page we're
    // currently computing.
    limit: desiredPageSize + 1,
  });

  const maybeDocuments = await Promise.all(await docdbCursor.toArray());
  const hasNextPage = maybeDocuments.length > desiredPageSize;
  const page = status.filterOk(maybeDocuments.slice(0, desiredPageSize));

  const edges = status.filterOk(
    page.map((document) => {
      const maybeSerializedCursor = cursors.serializeCursor(
        cursors.getCursor(spec, document),
      );
      if (!status.isOk(maybeSerializedCursor)) {
        return maybeSerializedCursor;
      }
      const serializedCursor = maybeSerializedCursor.value;

      return status.fromValue({
        node: document,
        cursor: serializedCursor,
      });
    }),
  );

  const lastEdge = edges.slice(-1)[0] ?? null;

  return status.fromValue({
    totalCount: edges.length,
    edges,
    pageInfo: {
      endCursor: lastEdge?.cursor ?? null,
      hasNextPage,
    },
  });
};

/**
 * Creates a `mongodb.Filter` which will isolate a single page of data.
 *
 * @param spec - The pagination spec.
 * @param options - Additional pagination options.
 *
 * @returns A MongoDB Filter.
 */
const createPaginationFilter = <
  T extends bson.Document,
  S extends keyof mongodb.WithId<T> & string,
  D extends keyof mongodb.WithId<T> & string,
>(
  spec: paginationSpec.PaginationSpec<T, S, D>,
  options?: PaginationOptions<T> | null,
): status.StatusOr<mongodb.Filter<T>> => {
  const additionalFilter: mongodb.Filter<T> = options?.filter ?? {};

  /// Deserialize the `options.after` cursor.

  const maybeAfterCursor = deserializeAfterCursor(spec, options?.after);
  if (!status.isOk(maybeAfterCursor)) {
    return maybeAfterCursor;
  }
  const afterCursor = maybeAfterCursor.value;

  if (afterCursor == null) {
    return status.fromValue(additionalFilter);
  }

  /// Attempt to create a discrimination filter for distinguishing documents
  /// with the same sorted value. If the pagination spec hasn't define a
  /// discriminator, this will just be null.

  const maybeDiscriminatorFilter = createDiscriminatorPropertyFilter(
    spec,
    afterCursor,
  );
  if (!status.isOk(maybeDiscriminatorFilter)) {
    return maybeDiscriminatorFilter;
  }
  const discriminatorFilter = maybeDiscriminatorFilter.value;

  /// Compose together the additional filter, discrimination filter, and sort
  /// property filter into a single result.

  if (discriminatorFilter == null) {
    // Unfortunately mongodb.Filter does not play well with generics whatsoever
    // so we need a cast here despite our generic types being correct.
    return status.fromValue({
      $and: [additionalFilter, createSortPropertyFilter(spec, afterCursor)],
    } as mongodb.Filter<T>);
  }

  // Unfortunately mongodb.Filter does not play well with generics whatsoever
  // so we need a cast here despite our generic types being correct.
  return status.fromValue({
    $and: [
      additionalFilter,
      {
        $or: [
          createSortPropertyFilter(spec, afterCursor),
          discriminatorFilter,
        ],
      },
    ],
  } as mongodb.Filter<T>);
};

const deserializeAfterCursor = <
  T extends bson.Document,
  S extends keyof mongodb.WithId<T> & string,
  D extends keyof mongodb.WithId<T> & string,
>(
  spec: paginationSpec.PaginationSpec<T, S, D>,
  cursor: cursors.SerializedCursor | null | undefined,
): status.StatusOr<cursors.DeserializedCursor<T, S, D> | null> => {
  if (cursor == null) {
    return status.fromValue(null);
  }

  return cursors.deserializeCursor(spec, cursor);
};

const createSortPropertyFilter = <
  T extends bson.Document,
  S extends keyof mongodb.WithId<T> & string,
  D extends keyof mongodb.WithId<T> & string,
>(
  spec: paginationSpec.PaginationSpec<T, S, D>,
  cursor: cursors.DeserializedCursor<T, S, D>,
): mongodb.Filter<T> => {
  // Unfortunately mongodb.Filter does not play well with generics whatsoever
  // so we need a cast in both of these returns despite our generic types being
  // correct.
  switch (spec.sort.direction) {
    case 'asc':
      return {
        [spec.sort.property]: { $gt: cursor.sortValue },
      } as mongodb.Filter<T>;
    case 'desc':
      return {
        [spec.sort.property]: { $lt: cursor.sortValue },
      } as mongodb.Filter<T>;
  }
};

const createDiscriminatorPropertyFilter = <
  T extends bson.Document,
  S extends keyof mongodb.WithId<T> & string,
  D extends keyof mongodb.WithId<T> & string,
>(
  spec: paginationSpec.PaginationSpec<T, S, D>,
  cursor: cursors.DeserializedCursor<T, S, D>,
): status.StatusOr<mongodb.Filter<T> | null> => {
  if (spec.discriminator == null) {
    return status.fromValue(null);
  }

  if (!('discriminatorValue' in cursor)) {
    return status.fromError(`Expected discriminator value in cursor.`);
  }

  // Unfortunately mongodb.Filter does not play well with generics whatsoever
  // so we need a cast in both of these returns despite our generic types being
  // correct.
  switch (spec.sort.direction) {
    case 'asc':
      return status.fromValue({
        [spec.sort.property]: cursor.sortValue,
        [spec.discriminator.property]: { $gt: cursor.discriminatorValue },
      } as mongodb.Filter<T>);
    case 'desc':
      return status.fromValue({
        [spec.sort.property]: cursor.sortValue,
        [spec.discriminator.property]: { $lt: cursor.discriminatorValue },
      } as mongodb.Filter<T>);
  }
};

/**
 * Creates a mongodb.Sort which adheres to a given pagination spec.
 *
 * @param spec - The pagination spec.
 *
 * @returns mongodb.Sort
 */
const createPaginationSort = <
  T extends bson.Document,
  S extends keyof mongodb.WithId<T> & string,
  D extends keyof mongodb.WithId<T> & string,
>(
  spec: paginationSpec.PaginationSpec<T, S, D>,
): mongodb.Sort => {
  if (spec.discriminator == null) {
    return { [spec.sort.property]: spec.sort.direction };
  }

  return {
    [spec.sort.property]: spec.sort.direction,
    [spec.discriminator.property]: spec.sort.direction,
  };
};
