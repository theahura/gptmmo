import '@shelf/jest-mongodb/lib/types';

import * as status from '@gptmmo/status';
import * as schema from '@gptmmo/validation';
import * as mongodb from 'mongodb';

import { createTypedDataSource } from '@/docdb/TypedDataSource';

// Setup an in-memory MongoDB server + client.
//
// See https://github.com/shelfio/jest-mongodb

let mongoClient: mongodb.MongoClient;
let db: mongodb.Db;

type Document = { _id: string; value: number };
const SCHEMA: schema.Schema<Document> = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
    },
    value: {
      type: 'number',
    },
  },
  required: ['_id', 'value'],
  additionalProperties: false,
};

beforeAll(async () => {
  mongoClient = await new mongodb.MongoClient(global.__MONGO_URI__).connect();
  db = await mongoClient.db(global.__MONGO_DB_NAME__);
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
    const unsafeCollection = db.collection<Document>('test');
    const dataSource = createTypedDataSource(
      schema.compile(schema.createCompiler({ useDefaults: true }), SCHEMA),
      unsafeCollection,
    );

    expect(await dataSource.findOneById('foo')).toStrictEqual(
      status.fromValue(null),
    );
  });

  test('Returns a document for a known id with valid schema.', async () => {
    const unsafeCollection = db.collection<Document>('test');
    const dataSource = createTypedDataSource(
      schema.compile(schema.createCompiler({ useDefaults: true }), SCHEMA),
      unsafeCollection,
    );

    await unsafeCollection.insertOne({
      _id: 'foo',
      value: 100,
    });

    expect(await dataSource.findOneById('foo')).toStrictEqual(
      status.fromValue({
        _id: 'foo',
        value: 100,
      }),
    );
  });

  test('Returns an error for document which fails validation.', async () => {
    const unsafeCollection = db.collection<Document>('test');
    const dataSource = createTypedDataSource(
      schema.compile(schema.createCompiler({ useDefaults: true }), SCHEMA),
      unsafeCollection,
    );

    await unsafeCollection.insertOne({
      _id: 'foo',
      value: 100,
      unknownProperty: 150,
    } as Document);

    expect(await dataSource.findOneById('foo')).toMatchObject({
      error: expect.any(String),
    });
  });

  test('Serialized calls result in multiple network requests.', async () => {
    const unsafeCollection = db.collection<Document>('test');
    const dataSource = createTypedDataSource(
      schema.compile(schema.createCompiler({ useDefaults: true }), SCHEMA),
      unsafeCollection,
    );

    jest.spyOn(unsafeCollection, 'find');

    await dataSource.findOneById('foo');
    await dataSource.findOneById('bar');
    await dataSource.findOneById('baz');

    expect(unsafeCollection.find).toHaveBeenCalledTimes(3);
  });

  test('Batches parallel calls into a single network request.', async () => {
    const unsafeCollection = db.collection<Document>('test');
    const dataSource = createTypedDataSource(
      schema.compile(schema.createCompiler({ useDefaults: true }), SCHEMA),
      unsafeCollection,
    );

    jest.spyOn(unsafeCollection, 'find');

    await unsafeCollection.insertMany([
      {
        _id: 'foo',
        value: 100,
      },
      {
        _id: 'baz',
        value: 300,
        unknownProperty: 350,
      } as Document,
    ]);

    const results = await Promise.all([
      dataSource.findOneById('foo'),
      dataSource.findOneById('bar'),
      dataSource.findOneById('baz'),
    ]);

    expect(unsafeCollection.find).toHaveBeenCalledTimes(1);

    expect(results).toStrictEqual([
      status.fromValue({
        _id: 'foo',
        value: 100,
      }),
      status.fromValue(null),
      expect.objectContaining({
        error: expect.any(String),
      }),
    ]);
  });

  test('Debounces duplicate, serialized ID lookups.', async () => {
    const unsafeCollection = db.collection<Document>('test');
    const dataSource = createTypedDataSource(
      schema.compile(schema.createCompiler({ useDefaults: true }), SCHEMA),
      unsafeCollection,
    );

    jest.spyOn(unsafeCollection, 'find');

    await unsafeCollection.insertOne({ _id: 'foo', value: 100 });

    await dataSource.findOneById('foo');
    await dataSource.findOneById('foo');
    await dataSource.findOneById('foo');
    expect(unsafeCollection.find).toHaveBeenCalledTimes(1);
    expect(unsafeCollection.find).toHaveBeenCalledWith({
      _id: { $in: ['foo'] },
    });
  });

  test('Debounces duplicate, parallelized ID lookups.', async () => {
    const unsafeCollection = db.collection<Document>('test');
    const dataSource = createTypedDataSource(
      schema.compile(schema.createCompiler({ useDefaults: true }), SCHEMA),
      unsafeCollection,
    );

    jest.spyOn(unsafeCollection, 'find');

    await unsafeCollection.insertOne({ _id: 'foo', value: 100 });

    await Promise.all([
      dataSource.findOneById('foo'),
      dataSource.findOneById('bar'),
      dataSource.findOneById('foo'),
    ]);
    expect(unsafeCollection.find).toHaveBeenCalledTimes(1);
    expect(unsafeCollection.find).toHaveBeenCalledWith({
      _id: { $in: ['foo', 'bar'] },
    });
  });
});

describe('findManyByIds', () => {
  test('Returns documents in the same order as the given ids.', async () => {
    const unsafeCollection = db.collection<Document>('test');
    const dataSource = createTypedDataSource(
      schema.compile(schema.createCompiler({ useDefaults: true }), SCHEMA),
      unsafeCollection,
    );

    jest.spyOn(unsafeCollection, 'find');

    const DOCUMENT_FOO = {
      _id: 'foo',
      value: 100,
    };
    const DOCUMENT_BAR = {
      _id: 'bar',
      value: 200,
      unknownProperty: 250,
    } as Document;
    const DOCUMENT_BAZ = {
      _id: 'baz',
      value: 300,
    };

    await unsafeCollection.insertMany([
      DOCUMENT_FOO,
      DOCUMENT_BAR,
      DOCUMENT_BAZ,
    ]);

    const results = await dataSource.findManyByIds([
      'baz',
      'foo',
      'qux',
      'bar',
    ]);

    expect(results).toStrictEqual([
      status.fromValue(DOCUMENT_BAZ),
      status.fromValue(DOCUMENT_FOO),
      status.fromValue(null),
      expect.objectContaining({
        error: expect.any(String),
      }),
    ]);
  });

  test('Issues a single network request.', async () => {
    const unsafeCollection = db.collection<Document>('test');
    const dataSource = createTypedDataSource(
      schema.compile(schema.createCompiler({ useDefaults: true }), SCHEMA),
      unsafeCollection,
    );

    jest.spyOn(unsafeCollection, 'find');

    await unsafeCollection.insertMany([
      {
        _id: 'foo',
        value: 100,
      },
      {
        _id: 'baz',
        value: 300,
        unknownProperty: 350,
      } as Document,
    ]);

    await dataSource.findManyByIds(['baz', 'foo', 'bar']);

    expect(unsafeCollection.find).toHaveBeenCalledTimes(1);
  });
});
