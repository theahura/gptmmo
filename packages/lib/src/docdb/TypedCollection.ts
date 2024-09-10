import * as status from '@gptmmo/status';
import * as validation from '@gptmmo/validation';

import type * as bson from 'bson';
import type * as mongodb from 'mongodb';

export type TypedCollectionValidators<T extends bson.Document> = {
  withId: validation.Validator<mongodb.WithId<T>>;
  withoutId: validation.Validator<mongodb.WithoutId<T>>;
  optionalId: validation.Validator<mongodb.OptionalUnlessRequiredId<T>>;
};

/**
 * TypedCollection requires a number of validators. For convenience this method
 * can create all of the required validators from a single schema.
 *
 * @param args -
 * @param args.compiler - JSON Schema compiler.
 * @param args.schema - JSON Schema.
 *
 * @returns The TypedCollection validators.
 */
export const createTypedCollectionValidators = <
  T extends bson.Document,
>(args: {
  compiler: validation.Compiler;
  schema: validation.Schema<mongodb.WithId<T>>;
}): TypedCollectionValidators<T> => {
  const { compiler, schema } = args;

  return {
    withId: validation.getOrCompile(compiler, schema),

    // Unfortunately for both of these validators we need to coerce the types
    // because schema manipulation does not play nice with mongodb type
    // expansion. Fortunately we unit test this heavily.
    withoutId: validation.getOrCompile(
      compiler,
      validation.omit(schema, '_id'),
    ) as validation.Validator<mongodb.WithoutId<T>>,
    optionalId: validation.getOrCompile(
      compiler,
      validation.optional(schema, '_id'),
    ) as validation.Validator<mongodb.OptionalUnlessRequiredId<T>>,
  };
};

/**
 * By default the MongoDB Node driver parameterizes collections (e.g.
 * `mongodb.Collection<T>`) and it uses this parameterization to enforce
 * type-safety on query + mutation filters. However, it does not enforce that
 * this type definition is adhered to when fetching data. It just casts
 * `document as T`.
 *
 * `TypedCollection<T>` acts differently in that it accepts a JSON Schema for
 * the parameterized type `T` which it uses to validate all reads from MongoDB
 * and will optimistically apply the same validation to writes. This has the
 * benefit of safe-guarding us against operating on malformed data. As a
 * byproduct, we also wrap all MongoDB collection methods to return `StatusOr`
 * instead of throwing exceptions.
 *
 * Example Usage:
 *
 * ```ts
 * const collection = new TypedCollection({
 *   untypedCollection: db.collection('Foo'),
 *   validators: ...,
 * });
 *
 * const maybeDocument = await collection.findOne({ _id: 'bar' });
 * if (!status.isOk(maybeDocument)) {
 *   return maybeDocument;
 * }
 * const document = maybeDocument.value;
 *
 * console.log('Document:', maybeDocument);
 * ```
 *
 * Note that this approach does prevent us from using projections. To support
 * projections we'd need to dynamically modify the JSON Schema to match the
 * projection. This is not impossible, but currently not trivial to represent in
 * our type system so for the time being we've elided it.
 */
export class TypedCollection<T extends bson.Document> {
  #untypedCollection: mongodb.Collection<T>;
  #validators: TypedCollectionValidators<T>;

  constructor(args: {
    untypedCollection: mongodb.Collection<T>;
    validators: TypedCollectionValidators<T>;
  }) {
    const { untypedCollection, validators } = args;

    this.#untypedCollection = untypedCollection;
    this.#validators = validators;
  }

  /**
   * @returns The database name containing this collection.
   */
  get dbName(): string {
    return this.#untypedCollection.dbName;
  }

  /**
   * @returns The name of this collection.
   */
  get collectionName(): string {
    return this.#untypedCollection.dbName;
  }

  /**
   * Inserts a single document into MongoDB. If documents passed in do not
   * contain the _id field, one will be added to each of the documents missing
   * it by the driver, mutating the document.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#insertOne
   *
   * @param untypedDocument The document to insert.
   * @param options Insertion options.
   *
   * @returns The insertion result.
   */
  async insertOne(
    untypedDocument: mongodb.OptionalUnlessRequiredId<T>,
    options?: mongodb.InsertOneOptions,
  ): Promise<status.StatusOr<mongodb.InsertOneResult<T>>> {
    const maybeDocument = validation.validate(
      this.#validators.optionalId,
      untypedDocument,
    );
    if (!status.isOk(maybeDocument)) {
      return maybeDocument;
    }
    const document = maybeDocument.value;

    return await status.tryCatchAsync(
      () => this.#untypedCollection.insertOne(document, options || {}),
      (error) =>
        status.fromError(`Failed to insertOne with error: ${error.message}`),
    );
  }

  /**
   * Inserts an array of documents into MongoDB. If documents passed in do not
   * contain the _id field, one will be added to each of the documents missing
   * it by the driver, mutating the document.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#insertMany
   *
   * @param untypedDocuments The documents to insert.
   * @param options Insertion options.
   *
   * @returns The batch insertion result.
   */
  async insertMany(
    untypedDocuments: Array<mongodb.OptionalUnlessRequiredId<T>>,
    options?: mongodb.BulkWriteOptions,
  ): Promise<status.StatusOr<mongodb.InsertManyResult<T>>> {
    const maybeDocuments = validation.validateMany(
      this.#validators.optionalId,
      untypedDocuments,
    );
    if (!status.isOk(maybeDocuments)) {
      return maybeDocuments;
    }
    const documents = maybeDocuments.value;

    return await status.tryCatchAsync(
      () => this.#untypedCollection.insertMany(documents, options || {}),
      (error) =>
        status.fromError(`Failed to insertMany with error: ${error.message}`),
    );
  }

  /**
   * Update a single document in a collection.
   *
   * __Note:__ that this method does NOT validate the update filter against the
   * collection's validation. This is because the update filter can describe
   * runtime-expressions and partial document updates which are near-impossible
   * to validate with JSON schema for the entire document. Unlike other methods
   * on TypedCollection which protect the user from creating invalid documents,
   * this method can easily create malformed documents so use it with care.
   * Fortunately, the MongoDB Node Driver has excellent type definitions and
   * should protect you.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#updateOne
   *
   * @param filter Filter to select which document to update.
   * @param update The update to apply.
   * @param options Additional update options.
   *
   * @returns The update result.
   */
  async updateOne(
    filter: mongodb.Filter<T>,
    update: mongodb.UpdateFilter<T> | Partial<T>,
    options?: Omit<mongodb.UpdateOptions, 'upsert'>,
  ): Promise<status.StatusOr<mongodb.UpdateResult>> {
    return await status.tryCatchAsync(
      () => this.#untypedCollection.updateOne(filter, update, options || {}),
      (error) =>
        status.fromError(`Failed to updateOne with error: ${error.message}`),
    );
  }

  /**
   * Update multiple documents in a collection.
   *
   * __Note:__ that this method does NOT validate the update filter against the
   * collection's validation. This is because the update filter can describe
   * runtime-expressions and partial document updates which are near-impossible
   * to validate with JSON schema for the entire document. Unlike other methods
   * on TypedCollection which protect the user from creating invalid documents,
   * this method can easily create malformed documents so use it with care.
   * Fortunately, the MongoDB Node Driver has excellent type definitions and
   * should protect you.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#updateMany
   *
   * @param filter Filter to select which documents to update.
   * @param update The update to apply.
   * @param options Additional update options.
   *
   * @returns The update result.
   */
  async updateMany(
    filter: mongodb.Filter<T>,
    update: mongodb.UpdateFilter<T>,
    options?: Omit<mongodb.UpdateOptions, 'upsert'>,
  ): Promise<status.StatusOr<mongodb.UpdateResult | bson.Document>> {
    return await status.tryCatchAsync(
      () => this.#untypedCollection.updateMany(filter, update, options || {}),
      (error) =>
        status.fromError(`Failed to updateMany with error: ${error.message}`),
    );
  }

  /**
   * Replace a document in a collection with another document.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#replaceOne
   *
   * @param filter Filter to select which document to replace.
   * @param untypedReplacement The replacement document.
   * @param options Additional replace options.
   *
   * @returns The update result.
   */
  async replaceOne(
    filter: mongodb.Filter<T>,
    untypedReplacement: mongodb.WithoutId<T>,
    options?: Omit<mongodb.ReplaceOptions, 'upsert'>,
  ): Promise<status.StatusOr<mongodb.UpdateResult | bson.Document>> {
    const maybeReplacement = validation.validate(
      this.#validators.withoutId,
      untypedReplacement,
    );
    if (!status.isOk(maybeReplacement)) {
      return maybeReplacement;
    }
    const replacement = maybeReplacement.value;

    return await status.tryCatchAsync(
      () =>
        this.#untypedCollection.replaceOne(filter, replacement, options || {}),
      (error) =>
        status.fromError(`Failed to replaceOne with error: ${error.message}`),
    );
  }

  /**
   * Delete a document from a collection
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#deleteOne
   *
   * @param filter Filters which document to delete.
   * @param options Delete options.
   *
   * @returns The deletion result.
   */
  async deleteOne(
    filter: mongodb.Filter<T>,
    options?: mongodb.DeleteOptions,
  ): Promise<status.StatusOr<mongodb.DeleteResult>> {
    return await status.tryCatchAsync(
      () => this.#untypedCollection.deleteOne(filter, options || {}),
      (error) =>
        status.fromError(`Failed to deleteOne with error: ${error.message}`),
    );
  }

  /**
   * Deletes multiple documents from a collection
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#deleteMany
   *
   * @param filter Filters which documents to delete.
   * @param options Delete options.
   *
   * @returns The batch deletion result.
   */
  async deleteMany(
    filter: mongodb.Filter<T>,
    options?: mongodb.DeleteOptions,
  ): Promise<status.StatusOr<mongodb.DeleteResult>> {
    return await status.tryCatchAsync(
      () => this.#untypedCollection.deleteMany(filter, options || {}),
      (error) =>
        status.fromError(`Failed to deleteMany with error: ${error.message}`),
    );
  }

  /**
   * Fetches the first document that matches the filter.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#findOne
   *
   * @param filter Identifies which document to retrieve.
   * @param options Find options.
   *
   * @returns The found document or null.
   */
  async findOne(
    filter: mongodb.Filter<T>,
    options?: Omit<mongodb.FindOptions, 'projection'>,
  ): Promise<status.StatusOr<mongodb.WithId<T> | null>> {
    const maybeDocument = await status.tryCatchAsync(
      () => this.#untypedCollection.findOne(filter, options || {}),
      (error) =>
        status.fromError(`Failed to findOne with error: ${error.message}`),
    );
    if (!status.isOk(maybeDocument)) {
      return maybeDocument;
    }
    const document = maybeDocument.value;

    if (document == null) {
      return status.fromValue(null);
    }

    return validation.validate(this.#validators.withId, document);
  }

  /**
   * Creates a cursor for a filter that can be used to iterate over results from
   * MongoDB.
   *
   * __Note:__ documents returned by the cursor will be validated against the
   * collection's schema as they are loaded by the cursor. However, cursor
   * methods may throw errors when fetching data so it's important to use
   * `status.tryCatchAsync` when handling cursors despite `cursor.next`
   * returning a `StatusOr` due to validation.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#find
   *
   * @param filter Identifies which documents to retrieve.
   * @param options Find options.
   *
   * @returns A MongoDB cursor.
   */
  find(
    filter: mongodb.Filter<T>,
    options?: Omit<mongodb.FindOptions, 'projection'>,
  ): mongodb.FindCursor<status.StatusOr<mongodb.WithId<T>>> {
    // We don't wrap `find` with `status.tryCatch` because mongodb cursors don't
    // actually throw errors during construction. They are initialized on the
    // first call to `next()` after that point every data-access method on the
    // cursor may throw an error.
    const cursor = this.#untypedCollection.find(filter, options || {});

    return cursor.map((document) =>
      validation.validate(this.#validators.withId, document),
    );
  }

  /**
   * Find a document and delete it in one atomic operation. Requires a write
   * lock for the duration of the operation.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#findOneAndDelete
   *
   * @param filter Identifies which document to find and delete.
   * @param options Find one and delete options.
   *
   * @returns The modification result.
   */
  async findOneAndDelete(
    filter: mongodb.Filter<T>,
    options?: Omit<mongodb.FindOneAndDeleteOptions, 'projection'>,
  ): Promise<status.StatusOr<ModifyResult<T>>> {
    const maybeResult = await status.tryCatchAsync(
      () => this.#untypedCollection.findOneAndDelete(filter, options || {}),
      (error) =>
        status.fromError(
          `Failed to findOneAndDelete with error: ${error.message}`,
        ),
    );
    if (!status.isOk(maybeResult)) {
      return maybeResult;
    }
    const result = maybeResult.value;

    return status.fromValue(
      validateModifyResult(result, this.#validators.withId),
    );
  }

  /**
   * Find a document and replace it in one atomic operation. Requires a write
   * lock for the duration of the operation.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#findOneAndReplace
   *
   * @param filter Identifies which document to find and replace.
   * @param untypedReplacement The replacement document.
   * @param options Find and replcae options.
   *
   * @returns The modification result.
   */
  async findOneAndReplace(
    filter: mongodb.Filter<T>,
    untypedReplacement: mongodb.WithoutId<T>,
    options?: Omit<mongodb.FindOneAndReplaceOptions, 'projection' | 'upsert'>,
  ): Promise<status.StatusOr<ModifyResult<T>>> {
    const maybeReplacement = validation.validate(
      this.#validators.withoutId,
      untypedReplacement,
    );
    if (!status.isOk(maybeReplacement)) {
      return maybeReplacement;
    }
    const replacement = maybeReplacement.value;

    const maybeResult = await status.tryCatchAsync(
      () =>
        this.#untypedCollection.findOneAndReplace(
          filter,
          replacement,
          options || {},
        ),
      (error) =>
        status.fromError(
          `Failed to findOneAndReplace with error: ${error.message}`,
        ),
    );
    if (!status.isOk(maybeResult)) {
      return maybeResult;
    }
    const result = maybeResult.value;

    return status.fromValue(
      validateModifyResult(result, this.#validators.withId),
    );
  }

  /**
   * Find a document and update it in one atomic operation. Requires a write
   * lock for the duration of the operation.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#findOneAndUpdate
   *
   * @param filter Identifies which document to find and replace.
   * @param update The update operation to apply to the found document.
   * @param options Find one and update options.
   *
   * @returns A modification result.
   */
  async findOneAndUpdate(
    filter: mongodb.Filter<T>,
    update: mongodb.UpdateFilter<T>,
    options?: Omit<mongodb.FindOneAndUpdateOptions, 'projection' | 'upsert'>,
  ): Promise<status.StatusOr<ModifyResult<T>>> {
    const maybeResult = await status.tryCatchAsync(
      () =>
        this.#untypedCollection.findOneAndUpdate(
          filter,
          update,
          options || {},
        ),
      (error) =>
        status.fromError(
          `Failed to findOneAndUpdate with error: ${error.message}`,
        ),
    );
    if (!status.isOk(maybeResult)) {
      return maybeResult;
    }
    const result = maybeResult.value;

    return status.fromValue(
      validateModifyResult(result, this.#validators.withId),
    );
  }

  /**
   * Creates an index on the db and collection.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#createIndex
   *
   * @param indexSpec Required configuration for the new index.
   * @param options Additional create index options.
   *
   * @returns The name of the index.
   */
  async createIndex(
    indexSpec: mongodb.IndexSpecification,
    options?: mongodb.CreateIndexesOptions,
  ): Promise<status.StatusOr<string>> {
    return await status.tryCatchAsync(
      () => this.#untypedCollection.createIndex(indexSpec, options || {}),
      (error) =>
        status.fromError(`Failed to createIndex with error: ${error.message}`),
    );
  }
}

/**
 * Unfortunately we need to create our own analog of `mongodb.ModifyResult<T>`
 * to deeply nest `StatusOr` as the `document`. This allows us to return
 * modifications that do succeed as OK (such as `findOneAndDelete`) while still
 * indicating that the returned data failed validation. Otherwise it'd be
 * ambiguous if `findOneAndDelete` succeeded in deleting any documents.
 */
export type ModifyResult<T> = {
  ok: 0 | 1;
  document: status.StatusOr<mongodb.WithId<T> | null>;
  lastErrorObject?: bson.Document;
};

/**
 * Given a MongoDB modify result, validates the document contained within and
 * transforms the type into our custom `ModifyResult` type.
 *
 * @param result MongoDB modify result.
 * @param validator Validator for validating the modified document.
 *
 * @returns The validated modification result.
 */
const validateModifyResult = <T extends bson.Document>(
  result: mongodb.ModifyResult<T>,
  validator: validation.Validator<mongodb.WithId<T>>,
): ModifyResult<T> => {
  const { value: _, ...resultWithoutValue } = result;

  if (result.value == null) {
    return {
      ...resultWithoutValue,
      document: status.fromValue(null),
    };
  }

  return {
    ...resultWithoutValue,
    document: validation.validate(validator, result.value),
  };
};
