import type * as schema from '@gptmmo/validation';
import type * as bson from 'bson';
import type * as mongodb from 'mongodb';

/**
 * Defines how to create pagination cursors from a collection. Using this
 * configuration, various cursor-based pagination strategies can be implemented.
 *
 * **Example 1:** Pagination by document ID (Max page size: 10)
 *
 * ```ts
 * const spec = {
 *   collection: ...,
 *   sort: {
 *     property: '_id',
 *     direction: 'asc',
 *     validator: ...,
 *   },
 *   limit: 10,
 * }
 * ```
 *
 * **Example 2:** Chronological pagination
 *
 * ```ts
 * const spec = {
 *   collection: ...,
 *   sort: {
 *     property: 'dateCreated',
 *     direction: 'desc',
 *     validator: ...,
 *   },
 *   // Fallback property to sort by when documents have the same `dateCreated`
 *   // value.
 *   discriminator: {
 *     property: '_id',
 *     validator: ...,
 *   },
 *   limit: 10,
 * }
 * ```
 *
 * Note: The `discriminator` field is necessary when sorting by properties which
 * are not unique. It acts as a fallback property to sort by for equivalent
 * documents.
 */
export type PaginationSpec<
  T extends bson.Document,
  S extends keyof mongodb.WithId<T> & string,
  D extends keyof mongodb.WithId<T> & string = S,
> = {
  // Ordering configuration is crucial for consistent pagination.
  sort: {
    // Which document property to sort the collection by.
    //
    // Note that this property will be serialized in cursors and exposed in
    // non-encrypted formats. Be mindful of using properties which contain PII
    // (Personal Identifiable Information).
    property: S;

    // Which direction the sort should apply in. For example, if asscending,
    // forward page traversal will ascend along the sorted property.
    direction: 'asc' | 'desc';

    // A validator for the property. This is used to enforce typesafety during
    // cursor deserialization.
    validator: schema.Validator<mongodb.WithId<T>[S]>;
  };

  // When the `sort` is applied to a property which is not unique for all
  // documents in the collection, we need a way to "discriminate" between
  // documents with equivalent sort values.
  //
  // For example, if we want to paginate by timestamps, we need some way to
  // order documents with the same timestamp.
  //
  // In these cases, the `discriminator` is used to define a second property
  // which is ensured to be unique. Often `_id` is a good choice.
  discriminator?: {
    property: D;
    validator: schema.Validator<mongodb.WithId<T>[D]>;
  };

  // The maxmimum number of documents one can fetch in a single page.
  limit: number;
};
