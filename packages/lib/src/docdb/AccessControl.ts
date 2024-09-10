/**
 * Contains types and helpers which describe access control patterns for data in
 * DocDB.
 */

import * as status from '@gptmmo/status';

import type * as bson from 'bson';
import type * as mongodb from 'mongodb';
import type * as tsEssentials from 'ts-essentials';

/**
 * Determines if an attempted document access is permitted or denied.
 *
 * @param event - The document access event.
 *
 * @returns True if the event is allowed, false otherwise. Any errors should be
 *   treated as denial to err on the side of caution.
 */
export type CanAccessDocumentFunction<T extends bson.Document> = (
  event: DocumentAccessEvent<T>,
) => tsEssentials.AsyncOrSync<status.StatusOr<boolean>>;

export type DocumentAccessEvent<T extends bson.Document> =
  | DocumentReadEvent<T>
  | DocumentInsertEvent<T>
  | DocumentUpdateEvent<T>
  | DocumentDeleteEvent<T>;

export enum DocumentAccessType {
  READ = 'READ',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

/**
 * Indicates that the given document is being read.
 */
export type DocumentReadEvent<T extends bson.Document> = {
  type: DocumentAccessType.READ;
  document: mongodb.WithId<T>;
};

/**
 * Indicates that the given document is being inserted for the first time.
 */
export type DocumentInsertEvent<T extends bson.Document> = {
  type: DocumentAccessType.INSERT;
  document: mongodb.OptionalUnlessRequiredId<T>;
};

/**
 * Indicates that the given document is being updated or replaced.
 */
export type DocumentUpdateEvent<T extends bson.Document> = {
  type: DocumentAccessType.UPDATE;
  document: mongodb.WithId<T>;
};

/**
 * Indicates that the given document is being deleted.
 */
export type DocumentDeleteEvent<T extends bson.Document> = {
  type: DocumentAccessType.DELETE;
  document: mongodb.WithId<T>;
};

/**
 * Given an access function and access event, returns OK if the document can be
 * accessed and an error otherwise.
 *
 * This is often convenient so that can quickly turn a document access event
 * into an `ErrorStatusOr` if the access is denied.
 *
 * @param args -
 * @param args.canAccessDocument - Access function which approves access events.
 * @param args.event - The access event.
 *
 * @returns OK if the document can be accessed, an error otherwise.
 */
export const approveDocumentAccess = async <T extends mongodb.Document>(args: {
  event: DocumentAccessEvent<T>;
  canAccessDocument: CanAccessDocumentFunction<T>;
}): Promise<status.Status> => {
  const { event, canAccessDocument } = args;

  const maybeApproval = await canAccessDocument(event);
  if (!status.isOk(maybeApproval)) {
    return maybeApproval;
  }
  const approval = maybeApproval.value;

  if (!approval) {
    return status.fromError(`Access ${event.type} denied.`);
  }

  return status.okStatus();
};
