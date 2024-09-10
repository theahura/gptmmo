/**
 * Because DocDB is compatible with MongoDB, we use the mongo client to
 * interface with it. This module wraps MongoDB interfaces in ways that make them
 * more ergonomic for use (e.g. applies `StatusOr<T>`) and wraps them so
 * that we can abstract away somewhat the detail that DocDB is accessed via a
 * Mongo client.
 *
 * See https://docs.aws.amazon.com/documentdb/latest/developerguide/compatibility.html
 */

import type * as bson from 'bson';
import type * as mongodb from 'mongodb';

export * from '@/docdb/AccessControl';
export * from '@/docdb/DataSource';
export * from '@/docdb/PermissionedCollection';
export * from '@/docdb/PermissionedDataSource';
export * from '@/docdb/TypedCollection';
export * from '@/docdb/TypedDataSource';
export * from '@/docdb/connection';
export * from '@/docdb/pagination';

// As a convenience we alias a few common mongo types here so that we can treat
// them as a DocDB interfaces without knowing the corresponding MongoDB type
// names. For example, we use `docdb.Client` instead of `mongodb.MongoClient` in
// our code.

export type BaseDocument = bson.Document;

export type Client = mongodb.MongoClient;
export type Database = mongodb.Db;
export type Collection<T extends BaseDocument> = mongodb.Collection<T>;
export type ConnectionOptions = mongodb.MongoClientOptions;

export type WithId<T extends BaseDocument> = mongodb.WithId<T>;
export type WithoutId<T extends BaseDocument> = mongodb.WithoutId<T>;
export type InferIdType<T extends BaseDocument> = mongodb.InferIdType<T>;
