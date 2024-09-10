import '@shelf/jest-mongodb/lib/types';

import * as status from '@gptmmo/status';
import * as mongodb from 'mongodb';

import { createDataSource } from '@/docdb/DataSource';
import { createPermissionedDataSource } from '@/docdb/PermissionedDataSource';

import type { DataSource } from '@/docdb/DataSource';

// Setup an in-memory MongoDB server + client.
//
// See https://github.com/shelfio/jest-mongodb

let mongoClient: mongodb.MongoClient;
let db: mongodb.Db;

beforeAll(async () => {
  mongoClient = await new mongodb.MongoClient(global.__MONGO_URI__).connect();
  db = await mongoClient.db(global.__MONGO_DB_NAME__);
});

type Document = {
  _id: string;
  value: number;
  readable: boolean;
};

let collection: mongodb.Collection<Document>;
let dataSource: DataSource<Document>;

beforeEach(() => {
  collection = db.collection<Document>('test');

  dataSource = createPermissionedDataSource({
    dataSource: createDataSource(collection),
    canAccessDocument: (event) => status.fromValue(event.document.readable),
  });
});

afterEach(async () => {
  await db.dropDatabase();
});

afterAll(async () => {
  await mongoClient.close();
});

// Tests.

describe('findOneById', () => {
  test('Returns null for an unknown id.', async () => {
    expect(await dataSource.findOneById('foo')).toStrictEqual(
      status.fromValue(null),
    );
  });

  test('Fails if document is disallowed by the gatekeeper.', async () => {
    await collection.insertOne({
      _id: 'foo',
      value: 100,
      readable: false,
    });

    expect(await dataSource.findOneById('foo')).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Succeeds when the document is permitted.', async () => {
    const DOCUMENT: Document = {
      _id: 'foo',
      value: 100,
      readable: true,
    };

    await collection.insertOne(DOCUMENT);

    expect(
      status.throwIfError(await dataSource.findOneById('foo')),
    ).toStrictEqual(DOCUMENT);
  });
});

describe('findManyByIds', () => {
  test('Fails only documents disallowed by the gatekeeper.', async () => {
    const DOCUMENT_FOO = {
      _id: 'foo',
      value: 100,
      readable: false,
    };
    const DOCUMENT_BAR = {
      _id: 'bar',
      value: 200,
      readable: true,
    };
    const DOCUMENT_BAZ = {
      _id: 'baz',
      value: 300,
      readable: true,
    };

    await collection.insertMany([DOCUMENT_FOO, DOCUMENT_BAR, DOCUMENT_BAZ]);

    const results = await dataSource.findManyByIds([
      'baz',
      'foo',
      'qux',
      'bar',
    ]);

    expect(results).toStrictEqual([
      status.fromValue(DOCUMENT_BAZ),
      expect.objectContaining({
        error: expect.any(String),
      }),
      status.fromValue(null),
      status.fromValue(DOCUMENT_BAR),
    ]);
  });
});
