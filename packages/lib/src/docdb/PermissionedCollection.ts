import * as status from '@gptmmo/status';

import * as accessControl from '@/docdb/AccessControl';

import type * as typedCollection from '@/docdb/TypedCollection';
import type * as bson from 'bson';
import type * as mongodb from 'mongodb';

/**
 * A PermissionedCollection is designed to be a more constrained version of
 * `TypedCollection` because it allows you to define an access function: a
 * function which evaluate access control rules for each document. Using this,
 * clients can protect code from inadvertantly modifying documents that should
 * not be editable. For example, one could imagine an access function which
 * ensures only the User which owns a document can modify it.
 *
 * Note that this is not a full replacement for endpoint permission logic. Using
 * `PermissionedCollection` we can safeguard data access which can be expressed
 * at the database layer, but we often cannot reconstruct product-level intent
 * from database commands. So we can write a rule here to disallow modifications
 * to a document a User doesn't own, but we can't write rules to only disallow
 * edits for specific product actions.
 *
 * It's very important that methods like `updateOne` and `replaceOne` which use
 * a filter to describe which document to modify internally use `findOne` to
 * locate the document, determine permissions based on that document, and then
 * rewrite the filter to target that document by ID. This is done to ensure that
 * we only modify documents which have been allowed by the access function
 * Otherwise we'd inadvertantly allow modifications to documents which have not
 * been allowed in cases where data shifted between the `findOne` and the
 * modification.
 */
export type PermissionedCollection<T extends bson.Document> = {
  /**
   * The database name containing this collection.
   */
  dbName: string;

  /**
   * The name of this collection.
   */
  collectionName: string;

  /**
   * Inserts a single document into MongoDB. If documents passed in do not
   * contain the _id field, one will be added to each of the documents missing
   * it by the driver, mutating the document.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#insertOne
   *
   * @param document The document to insert.
   * @param options Insertion options.
   *
   * @returns The insertion result.
   */
  insertOne: (
    document: mongodb.OptionalUnlessRequiredId<T>,
    options?: mongodb.InsertOneOptions,
  ) => Promise<status.StatusOr<mongodb.InsertOneResult<T>>>;

  /**
   * Inserts an array of documents into MongoDB. If documents passed in do not
   * contain the _id field, one will be added to each of the documents missing
   * it by the driver, mutating the document.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#insertMany
   *
   * @param documents The documents to insert.
   * @param options Insertion options.
   *
   * @returns The batch insertion result.
   */
  insertMany: (
    documents: Array<mongodb.OptionalUnlessRequiredId<T>>,
    options?: mongodb.BulkWriteOptions,
  ) => Promise<status.StatusOr<mongodb.InsertManyResult<T>>>;

  /**
   * Update a single document in a collection.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#updateOne
   *
   * @param filter Filter to select which document to update.
   * @param update The update to apply.
   * @param options Additional update options.
   *
   * @returns The update result.
   */
  updateOne: (
    filter: mongodb.Filter<T>,
    update: mongodb.UpdateFilter<T> | Partial<T>,
    options?: Omit<mongodb.UpdateOptions, 'upsert'>,
  ) => Promise<status.StatusOr<mongodb.UpdateResult>>;

  /**
   * Update multiple documents in a collection.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#updateMany
   *
   * @param filter Filter to select which documents to update.
   * @param update The update to apply.
   * @param options Additional update options.
   *
   * @returns The update result.
   */
  updateMany: (
    filter: mongodb.Filter<T>,
    update: mongodb.UpdateFilter<T>,
    options?: Omit<mongodb.UpdateOptions, 'upsert'>,
  ) => Promise<status.StatusOr<mongodb.UpdateResult | bson.Document>>;

  /**
   * Replace a document in a collection with another document.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#replaceOne
   *
   * @param filter Filter to select which document to replace.
   * @param replacement The replacement document.
   * @param options Additional replace options.
   *
   * @returns The update result.
   */
  replaceOne: (
    filter: mongodb.Filter<T>,
    replacement: mongodb.WithoutId<T>,
    options?: Omit<mongodb.ReplaceOptions, 'upsert'>,
  ) => Promise<status.StatusOr<mongodb.UpdateResult | bson.Document>>;

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
  deleteOne: (
    filter: mongodb.Filter<T>,
    options?: mongodb.DeleteOptions,
  ) => Promise<status.StatusOr<mongodb.DeleteResult>>;

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
  deleteMany: (
    filter: mongodb.Filter<T>,
    options?: mongodb.DeleteOptions,
  ) => Promise<status.StatusOr<mongodb.DeleteResult>>;

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
  findOne: (
    filter: mongodb.Filter<T>,
    options?: Omit<mongodb.FindOptions, 'projection'>,
  ) => Promise<status.StatusOr<mongodb.WithId<T> | null>>;

  /**
   * Creates a cursor for a filter that can be used to iterate over results from
   * MongoDB.
   *
   * __Note:__ documents returned by the cursor will be evaluated against the
   * access function as they are loaded by the cursor. However, cursor methods may
   * throw errors when fetching data so it's important to use
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
  find: (
    filter: mongodb.Filter<T>,
    options?: Omit<mongodb.FindOptions, 'projection'>,
  ) => mongodb.FindCursor<Promise<status.StatusOr<mongodb.WithId<T>>>>;

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
  findOneAndDelete: (
    filter: mongodb.Filter<T>,
    options?: Omit<mongodb.FindOneAndDeleteOptions, 'projection'>,
  ) => Promise<status.StatusOr<typedCollection.ModifyResult<T>>>;

  /**
   * Find a document and replace it in one atomic operation. Requires a write
   * lock for the duration of the operation.
   *
   * See https://mongodb.github.io/node-mongodb-native/5.4/classes/Collection.html#findOneAndReplace
   *
   * @param filter Identifies which document to find and replace.
   * @param replacement The replacement document.
   * @param options Find and replcae options.
   *
   * @returns The modification result.
   */
  findOneAndReplace: (
    filter: mongodb.Filter<T>,
    replacement: mongodb.WithoutId<T>,
    options?: Omit<mongodb.FindOneAndReplaceOptions, 'projection' | 'upsert'>,
  ) => Promise<status.StatusOr<typedCollection.ModifyResult<T>>>;

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
  findOneAndUpdate: (
    filter: mongodb.Filter<T>,
    update: mongodb.UpdateFilter<T>,
    options?: Omit<mongodb.FindOneAndUpdateOptions, 'projection' | 'upsert'>,
  ) => Promise<status.StatusOr<typedCollection.ModifyResult<T>>>;

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
  createIndex: (
    indexSpec: mongodb.IndexSpecification,
    options?: mongodb.CreateIndexesOptions,
  ) => Promise<status.StatusOr<string>>;
};

/**
 * Creates a permissioned collection.
 *
 * @param args -
 * @param args.collection - The underlying TypedCollection used to read/write
 *   data.
 * @param args.canAccessDocument - The access function used to approve document
 *   access events.
 *
 * @returns PermissionedCollection.
 */
export const createPermissionedCollection = <T extends bson.Document>(args: {
  collection: typedCollection.TypedCollection<T>;
  canAccessDocument: accessControl.CanAccessDocumentFunction<T>;
}) => {
  const { collection, canAccessDocument } = args;

  return {
    get dbName() {
      return collection.dbName;
    },

    get collectionName() {
      return collection.dbName;
    },

    insertOne: async (
      document: mongodb.OptionalUnlessRequiredId<T>,
      options?: mongodb.InsertOneOptions,
    ): Promise<status.StatusOr<mongodb.InsertOneResult<T>>> => {
      const approval = await accessControl.approveDocumentAccess({
        canAccessDocument,
        event: {
          type: accessControl.DocumentAccessType.INSERT,
          document,
        },
      });
      if (!status.isOk(approval)) {
        return approval;
      }

      return collection.insertOne(document, options);
    },

    insertMany: async (
      documents: Array<mongodb.OptionalUnlessRequiredId<T>>,
      options?: mongodb.BulkWriteOptions,
    ): Promise<status.StatusOr<mongodb.InsertManyResult<T>>> => {
      const approvals = await Promise.all(
        documents.map((document) =>
          accessControl.approveDocumentAccess({
            canAccessDocument,
            event: {
              type: accessControl.DocumentAccessType.INSERT,
              document,
            },
          }),
        ),
      );
      for (const approval of approvals) {
        if (!status.isOk(approval)) {
          return approval;
        }
      }

      return collection.insertMany(documents, options);
    },

    updateOne: async (
      filter: mongodb.Filter<T>,
      update: mongodb.UpdateFilter<T> | Partial<T>,
      options?: Omit<mongodb.UpdateOptions, 'upsert'>,
    ): Promise<status.StatusOr<mongodb.UpdateResult>> => {
      const maybeDocument = await collection.findOne(filter, {
        readConcern: options?.readConcern,
        collation: options?.collation,
        hint: options?.hint,
        let: options?.let,
      });
      if (!status.isOk(maybeDocument)) {
        return maybeDocument;
      }
      const document = maybeDocument.value;

      if (document == null) {
        return status.fromValue({
          acknowledged: true,
          matchedCount: 0,
          modifiedCount: 0,
          upsertedCount: 0,
          // `mongodb.UpdateResult` does not allow `upsertedId` to be null, but
          // it's only set when data is upserted. After testing with mongosh we
          // found that `null` was used when `options.upsert` was false despite
          // the type disallowing  Here we emulate that behavior for
          // consistency.
          upsertedId: null as unknown as mongodb.ObjectId,
        });
      }

      const approval = await accessControl.approveDocumentAccess({
        canAccessDocument,
        event: {
          type: accessControl.DocumentAccessType.UPDATE,
          document,
        },
      });
      if (!status.isOk(approval)) {
        return approval;
      }

      return collection.updateOne(getDocumentFilter(document), update, {
        ...(options || {}),
        hint: undefined,
      });
    },

    updateMany: async (
      filter: mongodb.Filter<T>,
      update: mongodb.UpdateFilter<T>,
      options?: Omit<mongodb.UpdateOptions, 'upsert'>,
    ): Promise<status.StatusOr<mongodb.UpdateResult | bson.Document>> => {
      const cursor = collection.find(filter, {
        readConcern: options?.readConcern,
        collation: options?.collation,
        hint: options?.hint,
        let: options?.let,
      });

      const documents = status.filterOk(await cursor.toArray());

      if (documents.length === 0) {
        return status.fromValue({
          acknowledged: true,
          matchedCount: 0,
          modifiedCount: 0,
          upsertedCount: 0,
          // `mongodb.UpdateResult` does not allow `upsertedId` to be null, but
          // it's only set when data is upserted. After testing with mongosh we
          // found that `null` was used when `options.upsert` was false despite
          // the type disallowing  Here we emulate that behavior for
          // consistency.
          upsertedId: null as unknown as mongodb.ObjectId,
        });
      }

      const approvals = await Promise.all(
        documents.map((document) =>
          accessControl.approveDocumentAccess({
            canAccessDocument,
            event: {
              type: accessControl.DocumentAccessType.UPDATE,
              document,
            },
          }),
        ),
      );
      for (const approval of approvals) {
        if (!status.isOk(approval)) {
          return approval;
        }
      }

      // TODO(SOO-847): Large $in filters are known to have bad performance,
      // consider optimizing
      return collection.updateMany(getDocumentsFilter(documents), update, {
        ...(options || {}),
        hint: undefined,
      });
    },

    replaceOne: async (
      filter: mongodb.Filter<T>,
      replacement: mongodb.WithoutId<T>,
      options?: Omit<mongodb.ReplaceOptions, 'upsert'>,
    ): Promise<status.StatusOr<mongodb.UpdateResult | bson.Document>> => {
      const maybeDocument = await collection.findOne(filter, {
        readConcern: options?.readConcern,
        collation: options?.collation,
        hint: options?.hint,
        let: options?.let,
      });
      if (!status.isOk(maybeDocument)) {
        return maybeDocument;
      }
      const document = maybeDocument.value;

      if (document == null) {
        return status.fromValue({
          acknowledged: true,
          matchedCount: 0,
          modifiedCount: 0,
          upsertedCount: 0,
          // `mongodb.UpdateResult` does not allow `upsertedId` to be null, but
          // it's only set when data is upserted. After testing with mongosh we
          // found that `null` was used when `options.upsert` was false despite
          // the type disallowing  Here we emulate that behavior for
          // consistency.
          upsertedId: null as unknown as mongodb.ObjectId,
        });
      }

      const approval = await accessControl.approveDocumentAccess({
        canAccessDocument,
        event: {
          type: accessControl.DocumentAccessType.UPDATE,
          document,
        },
      });
      if (!status.isOk(approval)) {
        return approval;
      }

      return collection.replaceOne(getDocumentFilter(document), replacement, {
        ...(options || {}),
        hint: undefined,
      });
    },

    deleteOne: async (
      filter: mongodb.Filter<T>,
      options?: mongodb.DeleteOptions,
    ): Promise<status.StatusOr<mongodb.DeleteResult>> => {
      const maybeDocument = await collection.findOne(filter, {
        readConcern: options?.readConcern,
        collation: options?.collation,
        hint: options?.hint,
        let: options?.let,
      });
      if (!status.isOk(maybeDocument)) {
        return maybeDocument;
      }
      const document = maybeDocument.value;

      if (document == null) {
        return status.fromValue({
          acknowledged: true,
          deletedCount: 0,
        });
      }

      const approval = await accessControl.approveDocumentAccess({
        canAccessDocument,
        event: {
          type: accessControl.DocumentAccessType.DELETE,
          document,
        },
      });
      if (!status.isOk(approval)) {
        return approval;
      }

      return collection.deleteOne(getDocumentFilter(document), {
        ...options,
        hint: undefined,
      });
    },

    deleteMany: async (
      filter: mongodb.Filter<T>,
      options?: mongodb.DeleteOptions,
    ): Promise<status.StatusOr<mongodb.DeleteResult>> => {
      const cursor = collection.find(filter, {
        readConcern: options?.readConcern,
        collation: options?.collation,
        hint: options?.hint,
        let: options?.let,
      });

      const documents = status.filterOk(await cursor.toArray());

      if (documents.length === 0) {
        return status.fromValue({
          acknowledged: true,
          deletedCount: 0,
        });
      }

      const approvals = await Promise.all(
        documents.map((document) =>
          accessControl.approveDocumentAccess({
            canAccessDocument,
            event: {
              type: accessControl.DocumentAccessType.DELETE,
              document,
            },
          }),
        ),
      );
      for (const approval of approvals) {
        if (!status.isOk(approval)) {
          return approval;
        }
      }

      // TODO(SOO-847): Large $in filters are known to have bad performance,
      // consider optimizing
      return collection.deleteMany(getDocumentsFilter(documents), {
        ...options,
        hint: undefined,
      });
    },

    findOne: async (
      filter: mongodb.Filter<T>,
      options?: Omit<mongodb.FindOptions, 'projection'>,
    ): Promise<status.StatusOr<mongodb.WithId<T> | null>> => {
      const maybeDocument = await collection.findOne(filter, options);
      if (!status.isOk(maybeDocument)) {
        return maybeDocument;
      }
      const document = maybeDocument.value;

      if (document == null) {
        return status.fromValue(null);
      }

      const approval = await accessControl.approveDocumentAccess({
        canAccessDocument,
        event: {
          type: accessControl.DocumentAccessType.READ,
          document,
        },
      });
      if (!status.isOk(approval)) {
        return approval;
      }

      return status.fromValue(document);
    },

    find: (
      filter: mongodb.Filter<T>,
      options?: Omit<mongodb.FindOptions, 'projection'>,
    ): mongodb.FindCursor<Promise<status.StatusOr<mongodb.WithId<T>>>> => {
      const cursor = collection.find(filter, options);

      return cursor.map(async (maybeDocument) => {
        if (!status.isOk(maybeDocument)) {
          return maybeDocument;
        }
        const document = maybeDocument.value;

        const approval = await accessControl.approveDocumentAccess({
          canAccessDocument,
          event: {
            type: accessControl.DocumentAccessType.READ,
            document,
          },
        });
        if (!status.isOk(approval)) {
          return approval;
        }

        return status.fromValue(document);
      });
    },

    findOneAndDelete: async (
      filter: mongodb.Filter<T>,
      options?: Omit<mongodb.FindOneAndDeleteOptions, 'projection'>,
    ): Promise<status.StatusOr<typedCollection.ModifyResult<T>>> => {
      const maybeDocument = await collection.findOne(filter, {
        readConcern: options?.readConcern,
        collation: options?.collation,
        hint: options?.hint,
        sort: options?.sort,
        let: options?.let,
      });
      if (!status.isOk(maybeDocument)) {
        return maybeDocument;
      }
      const document = maybeDocument.value;

      if (document == null) {
        return status.fromValue({
          ok: 1,
          document: status.fromValue(null),
        });
      }

      const approvals = await Promise.all([
        accessControl.approveDocumentAccess({
          canAccessDocument,
          event: {
            type: accessControl.DocumentAccessType.DELETE,
            document,
          },
        }),
        accessControl.approveDocumentAccess({
          canAccessDocument,
          event: {
            type: accessControl.DocumentAccessType.READ,
            document,
          },
        }),
      ]);
      for (const approval of approvals) {
        if (!status.isOk(approval)) {
          return approval;
        }
      }

      return collection.findOneAndDelete(getDocumentFilter(document), {
        ...(options || {}),
        hint: undefined,
      });
    },

    findOneAndReplace: async (
      filter: mongodb.Filter<T>,
      replacement: mongodb.WithoutId<T>,
      options?: Omit<
        mongodb.FindOneAndReplaceOptions,
        'projection' | 'upsert'
      >,
    ): Promise<status.StatusOr<typedCollection.ModifyResult<T>>> => {
      const maybeDocument = await collection.findOne(filter, {
        readConcern: options?.readConcern,
        collation: options?.collation,
        hint: options?.hint,
        sort: options?.sort,
        let: options?.let,
      });
      if (!status.isOk(maybeDocument)) {
        return maybeDocument;
      }
      const document = maybeDocument.value;

      if (document == null) {
        return status.fromValue({
          ok: 1,
          document: status.fromValue(null),
        });
      }

      const approvals = await Promise.all([
        accessControl.approveDocumentAccess({
          canAccessDocument,
          event: {
            type: accessControl.DocumentAccessType.UPDATE,
            document,
          },
        }),
        accessControl.approveDocumentAccess({
          canAccessDocument,
          event: {
            type: accessControl.DocumentAccessType.READ,
            document,
          },
        }),
      ]);
      for (const approval of approvals) {
        if (!status.isOk(approval)) {
          return approval;
        }
      }

      return collection.findOneAndReplace(
        getDocumentFilter(document),
        replacement,
        {
          ...(options || {}),
          hint: undefined,
        },
      );
    },

    findOneAndUpdate: async (
      filter: mongodb.Filter<T>,
      update: mongodb.UpdateFilter<T>,
      options?: Omit<mongodb.FindOneAndUpdateOptions, 'projection' | 'upsert'>,
    ): Promise<status.StatusOr<typedCollection.ModifyResult<T>>> => {
      const maybeDocument = await collection.findOne(filter, {
        readConcern: options?.readConcern,
        collation: options?.collation,
        hint: options?.hint,
        sort: options?.sort,
        let: options?.let,
      });
      if (!status.isOk(maybeDocument)) {
        return maybeDocument;
      }
      const document = maybeDocument.value;

      if (document == null) {
        return status.fromValue({
          ok: 1,
          document: status.fromValue(null),
        });
      }

      const approvals = await Promise.all([
        accessControl.approveDocumentAccess({
          canAccessDocument,
          event: {
            type: accessControl.DocumentAccessType.UPDATE,
            document,
          },
        }),
        accessControl.approveDocumentAccess({
          canAccessDocument,
          event: {
            type: accessControl.DocumentAccessType.READ,
            document,
          },
        }),
      ]);
      for (const approval of approvals) {
        if (!status.isOk(approval)) {
          return approval;
        }
      }

      return collection.findOneAndUpdate(getDocumentFilter(document), update, {
        ...(options || {}),
        hint: undefined,
      });
    },

    createIndex: async (
      indexSpec: mongodb.IndexSpecification,
      options?: mongodb.CreateIndexesOptions,
    ): Promise<status.StatusOr<string>> =>
      collection.createIndex(indexSpec, options),
  };
};

/**
 * Returns a filter that will uniquely select the given document.
 *
 * @param document - The document.
 *
 * @returns Filter.
 */
const getDocumentFilter = <T extends bson.Document>(
  document: mongodb.WithId<T>,
): mongodb.Filter<T> => {
  const untypedFilter = { _id: document._id };

  // This is unfortunately one of those places where TypeScript just can't
  // figure out that `untypedFilter` is actually a valid `mongodb.Filter<T>` so
  // we have to cast it.
  //
  // We know that `mongodb.WithId<T>["_id"]` is
  // `T["_id"] | mongodb.InferIdType<T>` and that `mongodb.Filter<T>` accepts
  // that type, but it seems like the type resolution tree is a little too deep
  // and as a result TypeScript refuses to traverse deep enough to realize that.
  return untypedFilter as unknown as mongodb.Filter<T>;
};

/**
 * Returns a filter that will uniquely select the given documents.
 *
 * @param documents - The documents.
 *
 * @returns Filter.
 */
const getDocumentsFilter = <T extends bson.Document>(
  documents: Array<mongodb.WithId<T>>,
): mongodb.Filter<T> => {
  const untypedFilter = {
    _id: { $in: documents.map((document) => document._id) },
  };

  // This is unfortunately one of those places where TypeScript just can't
  // figure out that `untypedFilter` is actually a valid `mongodb.Filter<T>` so
  // we have to cast it.
  //
  // We know that `mongodb.WithId<T>["_id"]` is
  // `T["_id"] | mongodb.InferIdType<T>` and that `mongodb.Filter<T>` accepts
  // that type, but it seems like the type resolution tree is a little too deep
  // and as a result TypeScript refuses to traverse deep enough to realize that.
  return untypedFilter as unknown as mongodb.Filter<T>;
};
