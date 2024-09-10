import * as status from '@gptmmo/status';
import * as schema from '@gptmmo/validation';
import * as bson from 'bson';

import type * as paginationSpec from '@/docdb/pagination/PaginationSpec';
import type * as mongodb from 'mongodb';

/**
 * Serialized cursors are opaque strings, not intended for deserialized by any
 * other logic outside of the pagination helpers.
 */
export type SerializedCursor = string;

/**
 * Decoded version of `SerializedCursor`. Identifies a document by its sort
 * property and an optional discriminator, as defined in the `PaginationSpec`.
 */
export type DeserializedCursor<
  T extends bson.Document,
  S extends keyof mongodb.WithId<T> & string,
  D extends keyof mongodb.WithId<T> & string,
> = {
  sortValue: mongodb.WithId<T>[S];
  discriminatorValue?: mongodb.WithId<T>[D];
};

/**
 * Gets the pagination cursor for a mongodb Document.
 *
 * @param spec - The pagination spec.
 * @param document - The document.
 *
 * @returns The DeserializedCursor representing the document.
 */
export const getCursor = <
  T extends bson.Document,
  S extends keyof mongodb.WithId<T> & string,
  D extends keyof mongodb.WithId<T> & string,
>(
  spec: paginationSpec.PaginationSpec<T, S, D>,
  document: mongodb.WithId<T>,
): DeserializedCursor<T, S, D> => {
  const sortValue = document[spec.sort.property];

  if (spec.discriminator == null) {
    return { sortValue };
  }

  const discriminatorValue = document[spec.discriminator.property];
  return { sortValue, discriminatorValue };
};

/**
 * Given a cursor, serializes it for transport.
 *
 * @param deserializedCursor - The cursor.
 *
 * @returns SerializedCursor.
 */
export const serializeCursor = <
  T extends bson.Document,
  S extends keyof mongodb.WithId<T> & string,
  D extends keyof mongodb.WithId<T> & string,
>(
  deserializedCursor: DeserializedCursor<T, S, D>,
): status.StatusOr<SerializedCursor> =>
  status.tryCatch(
    () => bson.serialize(deserializedCursor).toString('hex'),
    (error) =>
      status.fromError(
        `Failed to serialize cursor with error ${error.message}`,
      ),
  );

/**
 * Given a cursor, deserializes it.
 *
 * @param spec - The pagination spec defining how to deserialize the cursor.
 * @param serializedCursor - The serialized cursor.
 *
 * @returns DeserializedCursor.
 */
export const deserializeCursor = <
  T extends bson.Document,
  S extends keyof mongodb.WithId<T> & string,
  D extends keyof mongodb.WithId<T> & string,
>(
  spec: paginationSpec.PaginationSpec<T, S, D>,
  serializedCursor: SerializedCursor,
): status.StatusOr<DeserializedCursor<T, S, D>> => {
  const maybeCursorBson = status.tryCatch(
    () => bson.deserialize(Buffer.from(serializedCursor, 'hex')),
    (error) =>
      status.fromError(
        `Failed to deserialize bson with error ${error.message}`,
      ),
  );
  if (!status.isOk(maybeCursorBson)) {
    return maybeCursorBson;
  }
  const cursorBson = maybeCursorBson.value;

  // Before we can use the validators in the pagination spec to validate cursor
  // parts, we need to validate the structure of the cursor.

  const maybeUnsafeCursor = schema.validate<{
    sortValue: unknown;
    discriminatorValue?: unknown;
  }>(
    schema.getOrCompile(
      schema.createCompiler({ useDefaults: true }),
      // Unfortunately, `ajv`'s typesafety does not support unknown types
      // despite this JSONSchema being the recommended schema for unknown types.
      //
      // @ts-ignore
      {
        type: 'object',
        properties: {
          sortValue: {},
          discriminatorValue: {},
        },
        required: ['sortValue'],
        additionalProperties: false,
      },
    ),
    cursorBson,
  );
  if (!status.isOk(maybeUnsafeCursor)) {
    return maybeUnsafeCursor;
  }
  const unsafeCursor = maybeUnsafeCursor.value;

  /// Validate the sort value.

  const maybeSortValue = schema.validate(
    spec.sort.validator,
    unsafeCursor.sortValue,
  );
  if (!status.isOk(maybeSortValue)) {
    return maybeSortValue;
  }
  const sortValue = maybeSortValue.value;

  /// Validate the discriminator value.

  if (spec.discriminator == null) {
    return status.fromValue({ sortValue });
  }

  if (!('discriminatorValue' in unsafeCursor)) {
    return status.fromError(`Expected discriminator value in cursor.`);
  }

  const maybeDiscriminatorValue = schema.validate(
    spec.discriminator.validator,
    unsafeCursor.discriminatorValue,
  );
  if (!status.isOk(maybeDiscriminatorValue)) {
    return maybeDiscriminatorValue;
  }
  const discriminatorValue = maybeDiscriminatorValue.value;

  return status.fromValue({ sortValue, discriminatorValue });
};
