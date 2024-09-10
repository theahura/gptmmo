/**
 * This file directly implements the same interface as `DataSource` in
 * `./DataSource.ts` however with additional typesafety. Readers should defer to
 * documentation there to understand behavior and motivations for `DataSource`
 * which all transfer to `TypedDataSource`.
 */

import * as status from '@gptmmo/status';
import * as schema from '@gptmmo/validation';

import * as dataSource from '@/docdb/DataSource';

import type * as bson from 'bson';
import type * as mongodb from 'mongodb';

/**
 * Note that `createTypedDataSource` differs from `createDataSource` in that it
 * accepts a validator which is used to ensure that all data returned by this
 * data source matches the validator. This is useful when you want to ensure
 * that malformed data is not available in the binary from your data source. See
 * `TypedCollection` for more detail.
 *
 * Example Usage:
 *
 * ```ts
 * const dataSource = createTypedDataSource(validator, db.collect('test'));
 * const maybeResult = await dataSource.findOneById('MY_ID');
 * ```
 *
 * @param validator The validator used to ensure that all data returned by this
 *   data source matches the expected types.
 * @param collection The collection backing our data fetches.
 *
 * @returns A DataSource which enforces typesafety via schema validation.
 */
export const createTypedDataSource = <T extends bson.Document>(
  validator: schema.Validator<mongodb.WithId<T>>,
  collection: mongodb.Collection<T>,
): dataSource.DataSource<T> => {
  const unsafeDataSource = dataSource.createDataSource(collection);

  return {
    findOneById: async (id) =>
      validateDocument(validator, await unsafeDataSource.findOneById(id)),

    findManyByIds: async (ids) => {
      const unsafeDocuments = await unsafeDataSource.findManyByIds(ids);
      return unsafeDocuments.map((maybeDocument) =>
        validateDocument(validator, maybeDocument),
      );
    },
  };
};

/**
 * Given a bson Document and validator for that document, ensure that the
 * document's contents match the validator.
 *
 * @param validator The schema validator used.
 * @param maybeDocument The document or maybe an error which will be passed
 *   through.
 *
 * @returns The validated document or an error.
 */
const validateDocument = <T extends bson.Document>(
  validator: schema.Validator<mongodb.WithId<T>>,
  maybeDocument: status.StatusOr<mongodb.WithId<T> | null>,
): status.StatusOr<mongodb.WithId<T> | null> => {
  if (!status.isOk(maybeDocument)) {
    return maybeDocument;
  }
  const document = maybeDocument.value;

  if (document == null) {
    return status.fromValue(null);
  }

  return schema.validate(validator, document);
};
